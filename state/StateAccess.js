import { STATE_SCHEMA } from './schema.js';

const NAMESPACE_ROOTS = Object.freeze({
  source: engine => engine?.src,
  runtime: engine => engine?.state,
  session: engine => ({
    chatState: engine?.chatState,
    pendingPasswordAction: engine?.pendingPasswordAction
  })
});
const transactionQueues = new WeakMap();
const FORBIDDEN_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor']);

export class StatePathError extends Error {
  constructor(message, code = 'INVALID_STATE_PATH') {
    super(message);
    this.name = 'StatePathError';
    this.code = code;
  }
}

function segmentsFor(path, context = {}) {
  if (typeof path !== 'string' || !path.trim()) {
    throw new StatePathError('State path must be a non-empty string.');
  }
  return path.split('.').map(segment => {
    const match = /^\\[([A-Za-z_$][\\w$]*)\\]$/.exec(segment);
    const key = match ? context[match[1]] : segment;
    if (match && (key === undefined || key === null || key === '')) {
      throw new StatePathError(`Missing context "${match[1]}" for path "${path}".`, 'MISSING_STATE_CONTEXT');
    }
    if (typeof key !== 'string' && typeof key !== 'number') {
      throw new StatePathError(`Invalid path segment in "${path}".`);
    }
    if (FORBIDDEN_SEGMENTS.has(String(key))) {
      throw new StatePathError(`Forbidden path segment "${String(key)}".`, 'UNSAFE_STATE_PATH');
    }
    return key;
  });
}

function readPath(root, path, context = {}) {
  let current = root;
  for (const key of segmentsFor(path, context)) {
    if (current === null || current === undefined) return undefined;
    current = current[key];
  }
  return current;
}

function parentFor(root, path, context = {}, create = false) {
  const segments = segmentsFor(path, context);
  const leaf = segments.pop();
  let current = root;
  for (const key of segments) {
    if (current[key] === undefined && create) current[key] = {};
    if (current[key] === null || typeof current[key] !== 'object') {
      throw new StatePathError(`Cannot traverse non-object segment "${String(key)}".`, 'INVALID_STATE_PARENT');
    }
    current = current[key];
  }
  return { parent: current, leaf };
}

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function replaceObject(target, source) {
  for (const key of Object.keys(target)) delete target[key];
  for (const key of Object.keys(source)) target[key] = source[key];
}

function routerKey(context) {
  if (context.routerKey) return context.routerKey;
  if (context.sceneId === undefined || context.routerId === undefined) return undefined;
  return `${context.sceneId}_${context.routerId}`;
}

function actionKey(context, engine) {
  if (context.actionKey) return context.actionKey;
  const sceneId = context.sceneId ?? engine?.state?.sceneId;
  const routerId = context.routerId ?? engine?.state?.scenes?.[sceneId]?.activeRouterId;
  if (context.id === undefined || sceneId === undefined || routerId === undefined) return undefined;
  return `${sceneId}_${routerId}_${context.id}`;
}

function resolveContext(key, context, engine) {
  const next = { ...context };
  if (key.startsWith('router.')) next.routerKey = routerKey(next);
  if (key.startsWith('action.')) next.actionKey = actionKey(next, engine);
  return next;
}

export class StateAccess {
  constructor(engine) {
    if (!engine) throw new TypeError('StateAccess requires an Engine instance.');
    this.engine = engine;
    Object.freeze(this);
  }

  get(key, context = {}, options = {}) {
    if (typeof key !== 'string' || !key.trim()) return undefined;
    const mapping = STATE_SCHEMA[key];
    const namespace = options.namespace ?? mapping?.[0] ?? 'runtime';
    const path = mapping?.[1] ?? key;
    return this.getFrom(namespace, path, resolveContext(key, context, this.engine));
  }

  getFrom(namespace, path, context = {}) {
    const rootFactory = NAMESPACE_ROOTS[namespace];
    if (!rootFactory) throw new StatePathError(`Unknown state namespace "${namespace}".`);
    return readPath(rootFactory(this.engine), path, context);
  }

  set(path, value, context = {}, options = {}) {
    const namespace = options.namespace ?? STATE_SCHEMA[path]?.[0] ?? 'runtime';
    if (namespace === 'source') throw new StatePathError('Scenario source is read-only.', 'READ_ONLY_NAMESPACE');
    const root = this.#root(namespace);
    const { parent, leaf } = parentFor(root, STATE_SCHEMA[path]?.[1] ?? path, resolveContext(path, context, this.engine), true);
    parent[leaf] = value;
    return value;
  }

  update(path, updater, context = {}, options = {}) {
    if (typeof updater !== 'function') throw new TypeError('State updater must be a function.');
    const current = this.get(path, context, options);
    return this.set(path, updater(current), context, options);
  }

  delete(path, context = {}, options = {}) {
    const namespace = options.namespace ?? STATE_SCHEMA[path]?.[0] ?? 'runtime';
    if (namespace === 'source') throw new StatePathError('Scenario source is read-only.', 'READ_ONLY_NAMESPACE');
    const root = this.#root(namespace);
    const { parent, leaf } = parentFor(root, STATE_SCHEMA[path]?.[1] ?? path, resolveContext(path, context, this.engine));
    if (parent === null || typeof parent !== 'object') return false;
    return delete parent[leaf];
  }

  async transaction(callback) {
    if (typeof callback !== 'function') throw new TypeError('Transaction callback must be a function.');
    const engine = this.engine;
    const previous = transactionQueues.get(engine) ?? Promise.resolve();
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    transactionQueues.set(engine, previous.then(() => gate));
    await previous;
    try {
      const runtimeOriginal = engine.state;
      const sessionOriginal = {
        chatState: engine.chatState,
        pendingPasswordAction: engine.pendingPasswordAction
      };
      const runtimeDraft = clone(runtimeOriginal);
      const sessionDraft = clone(sessionOriginal);
      const roots = { runtime: runtimeDraft, session: sessionDraft };
      const tx = Object.freeze({
        get: (path, context = {}, options = {}) => {
          const namespace = options.namespace ?? STATE_SCHEMA[path]?.[0] ?? 'runtime';
          if (!roots[namespace]) throw new StatePathError(`Namespace "${namespace}" is not writable in a transaction.`);
          return readPath(roots[namespace], STATE_SCHEMA[path]?.[1] ?? path, resolveContext(path, context, engine));
        },
        set: (path, value, context = {}, options = {}) => {
          const namespace = options.namespace ?? STATE_SCHEMA[path]?.[0] ?? 'runtime';
          if (!roots[namespace]) throw new StatePathError(`Namespace "${namespace}" is not writable in a transaction.`);
          const { parent, leaf } = parentFor(roots[namespace], STATE_SCHEMA[path]?.[1] ?? path, resolveContext(path, context, engine), true);
          parent[leaf] = value;
          return value;
        },
        delete: (path, context = {}, options = {}) => {
          const namespace = options.namespace ?? STATE_SCHEMA[path]?.[0] ?? 'runtime';
          if (!roots[namespace]) throw new StatePathError(`Namespace "${namespace}" is not writable in a transaction.`);
          const { parent, leaf } = parentFor(roots[namespace], STATE_SCHEMA[path]?.[1] ?? path, resolveContext(path, context, engine));
          return parent && delete parent[leaf];
        }
      });
      const result = await callback(tx);
      if (engine.state !== runtimeOriginal || engine.chatState !== sessionOriginal.chatState ||
          engine.pendingPasswordAction !== sessionOriginal.pendingPasswordAction) {
        throw new StatePathError('Engine state changed outside the active transaction.', 'TRANSACTION_CONFLICT');
      }
      replaceObject(runtimeOriginal, runtimeDraft);
      if (sessionOriginal.chatState && sessionDraft.chatState) replaceObject(sessionOriginal.chatState, sessionDraft.chatState);
      else engine.chatState = sessionDraft.chatState;
      if (sessionOriginal.pendingPasswordAction && sessionDraft.pendingPasswordAction) replaceObject(sessionOriginal.pendingPasswordAction, sessionDraft.pendingPasswordAction);
      else engine.pendingPasswordAction = sessionDraft.pendingPasswordAction;
      engine.commitState?.('state.transaction');
      return result;
    } finally {
      release();
      if (transactionQueues.get(engine) === gate) transactionQueues.delete(engine);
    }
  }

  #root(namespace) {
    if (namespace === 'source') throw new StatePathError('Scenario source is read-only.', 'READ_ONLY_NAMESPACE');
    const root = NAMESPACE_ROOTS[namespace];
    if (!root) throw new StatePathError(`Unknown state namespace "${namespace}".`);
    const value = root(this.engine);
    if (!value || typeof value !== 'object') throw new StatePathError(`State namespace "${namespace}" is unavailable.`);
    return value;
  }

  has(key, context = {}, options = {}) { return this.get(key, context, options) !== undefined; }
  resolve(path, context = {}, namespace = 'runtime') { return this.getFrom(namespace, path, context); }
  getSource(path, context = {}) { return this.getFrom('source', path, context); }
  getRuntime(path, context = {}) { return this.getFrom('runtime', path, context); }
  getSession(path, context = {}) { return this.getFrom('session', path, context); }
}

export function createStateAccess(engine) {
  const access = new StateAccess(engine);
  return Object.freeze({
    get: (key, context = {}, options = {}) => access.get(key, context, options),
    getFrom: (namespace, path, context = {}) => access.getFrom(namespace, path, context),
    getSource: (path, context = {}) => access.getSource(path, context),
    getRuntime: (path, context = {}) => access.getRuntime(path, context),
    getSession: (path, context = {}) => access.getSession(path, context),
    set: (path, value, context = {}, options = {}) => access.set(path, value, context, options),
    update: (path, updater, context = {}, options = {}) => access.update(path, updater, context, options),
    delete: (path, context = {}, options = {}) => access.delete(path, context, options),
    transaction: callback => access.transaction(callback),
    has: (key, context = {}, options = {}) => access.has(key, context, options),
    resolve: (path, context = {}, namespace = 'runtime') => access.resolve(path, context, namespace)
  });
}
