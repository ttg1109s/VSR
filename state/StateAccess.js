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
    const placeholder = segment.startsWith('[') && segment.endsWith(']') ? segment.slice(1, -1) : null;
    const isPlaceholder = placeholder !== null && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(placeholder);
    const key = isPlaceholder ? context[placeholder] : segment;
    if (isPlaceholder && (key === undefined || key === null || key === '')) {
      throw new StatePathError(`Missing context "${placeholder}" for path "${path}".`, 'MISSING_STATE_CONTEXT');
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
    if (current === null || typeof current !== 'object') {
      throw new StatePathError(`Cannot traverse non-object segment "${String(key)}".`, 'INVALID_STATE_PARENT');
    }
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

function reconcile(target, source) {
  if (Array.isArray(target) && Array.isArray(source)) {
    target.length = source.length;
    for (let index = 0; index < source.length; index++) {
      const current = target[index], next = source[index];
      if (current && next && typeof current === 'object' && typeof next === 'object' && Array.isArray(current) === Array.isArray(next)) reconcile(current, next);
      else target[index] = next;
    }
    return target;
  }
  for (const key of Object.keys(target)) if (!Object.prototype.hasOwnProperty.call(source, key)) delete target[key];
  for (const key of Object.keys(source)) {
    const current = target[key], next = source[key];
    if (current && next && typeof current === 'object' && typeof next === 'object' && Array.isArray(current) === Array.isArray(next)) reconcile(current, next);
    else target[key] = next;
  }
  return target;
}

function routerKey(context) {
  if (context.routerKey) return context.routerKey;
  if (context.sceneId === undefined || context.routerId === undefined) return undefined;
  return `${context.sceneId}_${context.routerId}`;
}

function actionId(context) {
  return context.id ?? context.actionId ?? context.actionKey;
}

function resolveContext(key, context, engine) {
  const next = { ...context };
  if (key.startsWith('router.')) next.routerKey = routerKey(next);
  if (key.startsWith('action.')) {
    const id = actionId(next);
    if (id !== undefined) next.id = id;
  }
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
    const resolvedPath = STATE_SCHEMA[path]?.[1] ?? path;
    if (namespace === 'session' && resolvedPath === 'chatState') { this.engine.chatState = value === undefined ? undefined : clone(value); this.engine.commitState?.('state.set'); return value; }
    if (namespace === 'session' && resolvedPath === 'pendingPasswordAction') { this.engine.pendingPasswordAction = value === undefined || value === null ? value : clone(value); this.engine.commitState?.('state.set'); return value; }
    const root = this.#root(namespace);
    const { parent, leaf } = parentFor(root, resolvedPath, resolveContext(path, context, this.engine), true);
    parent[leaf] = value !== undefined ? clone(value) : value;
    this.engine.commitState?.('state.set');
    return value;
  }

  update(path, updater, context = {}, options = {}) {
    if (typeof updater !== 'function') throw new TypeError('State updater must be a function.');
    const current = this.get(path, context, options);
    const draft = current === undefined ? undefined : clone(current);
    return this.set(path, updater(draft), context, options);
  }

  delete(path, context = {}, options = {}) {
    const namespace = options.namespace ?? STATE_SCHEMA[path]?.[0] ?? 'runtime';
    if (namespace === 'source') throw new StatePathError('Scenario source is read-only.', 'READ_ONLY_NAMESPACE');
    const resolvedPath = STATE_SCHEMA[path]?.[1] ?? path;
    if (namespace === 'session' && resolvedPath === 'chatState') { this.engine.chatState = undefined; this.engine.commitState?.('state.delete'); return true; }
    if (namespace === 'session' && resolvedPath === 'pendingPasswordAction') { this.engine.pendingPasswordAction = undefined; this.engine.commitState?.('state.delete'); return true; }
    const root = this.#root(namespace);
    const { parent, leaf } = parentFor(root, resolvedPath, resolveContext(path, context, this.engine));
    if (parent === null || typeof parent !== 'object') return false;
    const deleted = delete parent[leaf];
    if (deleted) this.engine.commitState?.('state.delete');
    return deleted;
  }

  async transaction(callback) {
    if (typeof callback !== 'function') throw new TypeError('Transaction callback must be a function.');
    const engine = this.engine;
    const previous = transactionQueues.get(engine) ?? Promise.resolve();
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    const queued = previous.then(() => gate);
    transactionQueues.set(engine, queued);
    await previous;
    try {
      const runtimeOriginal = engine.state;
      const sessionOriginal = {
        chatState: engine.chatState,
        pendingPasswordAction: engine.pendingPasswordAction
      };
      const runtimeBaseline = JSON.stringify(runtimeOriginal);
      const sessionBaseline = JSON.stringify(sessionOriginal);
      const runtimeDraft = clone(runtimeOriginal);
      const sessionDraft = clone(sessionOriginal);
      // A transaction owns detached drafts for every namespace. In particular, source
      // reads must never expose engine.src through a mutable object reference.
      const roots = { source: clone(engine.src ?? {}), runtime: runtimeDraft, session: sessionDraft };
      const tx = Object.freeze({
        get: (path, context = {}, options = {}) => {
          const namespace = options.namespace ?? STATE_SCHEMA[path]?.[0] ?? 'runtime';
          if (!roots[namespace]) throw new StatePathError(`Unknown state namespace "${namespace}".`);
          const value = readPath(roots[namespace], STATE_SCHEMA[path]?.[1] ?? path, resolveContext(path, context, engine));
          return value === undefined ? undefined : clone(value);
        },
        set: (path, value, context = {}, options = {}) => {
          const namespace = options.namespace ?? STATE_SCHEMA[path]?.[0] ?? 'runtime';
          if (namespace === "source") throw new StatePathError("Scenario source is read-only.", "READ_ONLY_NAMESPACE");
          if (!roots[namespace]) throw new StatePathError(`Unknown state namespace "${namespace}".`);
          const { parent, leaf } = parentFor(roots[namespace], STATE_SCHEMA[path]?.[1] ?? path, resolveContext(path, context, engine), true);
          parent[leaf] = value === undefined ? undefined : clone(value);
          return value;
        },
        delete: (path, context = {}, options = {}) => {
          const namespace = options.namespace ?? STATE_SCHEMA[path]?.[0] ?? 'runtime';
          if (namespace === "source") throw new StatePathError("Scenario source is read-only.", "READ_ONLY_NAMESPACE");
          if (!roots[namespace]) throw new StatePathError(`Unknown state namespace "${namespace}".`);
          const { parent, leaf } = parentFor(roots[namespace], STATE_SCHEMA[path]?.[1] ?? path, resolveContext(path, context, engine));
          return parent && delete parent[leaf];
        }
      });
      const result = await callback(tx);
      if (engine.state !== runtimeOriginal || engine.chatState !== sessionOriginal.chatState ||
          engine.pendingPasswordAction !== sessionOriginal.pendingPasswordAction ||
          JSON.stringify(runtimeOriginal) !== runtimeBaseline || JSON.stringify({ chatState: engine.chatState, pendingPasswordAction: engine.pendingPasswordAction }) !== sessionBaseline) {
        throw new StatePathError('Engine state changed outside the active transaction.', 'TRANSACTION_CONFLICT');
      }
      reconcile(runtimeOriginal, runtimeDraft);
      if (sessionOriginal.chatState && sessionDraft.chatState) reconcile(sessionOriginal.chatState, sessionDraft.chatState);
      else engine.chatState = sessionDraft.chatState;
      if (sessionOriginal.pendingPasswordAction && sessionDraft.pendingPasswordAction) reconcile(sessionOriginal.pendingPasswordAction, sessionDraft.pendingPasswordAction);
      else engine.pendingPasswordAction = sessionDraft.pendingPasswordAction;
      engine.commitState?.('state.transaction');
      return result;
    } finally {
      release();
      if (transactionQueues.get(engine) === queued) transactionQueues.delete(engine);
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
  // Legacy getters intentionally retain reference semantics for compatibility.
  // New module code should use the snapshot variants for all read-only access.
  getSource(path, context = {}) { return this.getFrom('source', path, context); }
  getRuntime(path, context = {}) { return this.getFrom('runtime', path, context); }
  getSession(path, context = {}) { return this.getFrom('session', path, context); }
  getSourceSnapshot(path, context = {}) {
    const value = this.getSource(path, context);
    return value === undefined ? undefined : clone(value);
  }
  getSessionSnapshot(path, context = {}) {
    const value = this.getSession(path, context);
    return value === undefined ? undefined : clone(value);
  }
  getSnapshot(path, context = {}, options = {}) {
    const namespace = options.namespace ?? STATE_SCHEMA[path]?.[0] ?? 'runtime';
    const value = this.get(path, context, options);
    return value === undefined ? undefined : clone(value);
  }
  getRuntimeSnapshot(path, context = {}) {
    const value = this.getRuntime(path, context);
    return value === undefined ? undefined : clone(value);
  }
}

export function createStateAccess(engine) {
  const access = new StateAccess(engine);
  return Object.freeze({
    get: (key, context = {}, options = {}) => access.get(key, context, options),
    getFrom: (namespace, path, context = {}) => access.getFrom(namespace, path, context),
    getSource: (path, context = {}) => access.getSource(path, context),
    getSourceSnapshot: (path, context = {}) => access.getSourceSnapshot(path, context),
    getRuntime: (path, context = {}) => access.getRuntime(path, context),
    getSession: (path, context = {}) => access.getSession(path, context),
    getSessionSnapshot: (path, context = {}) => access.getSessionSnapshot(path, context),
    getSnapshot: (path, context = {}, options = {}) => access.getSnapshot(path, context, options),
    getRuntimeSnapshot: (path, context = {}) => access.getRuntimeSnapshot(path, context),
    set: (path, value, context = {}, options = {}) => access.set(path, value, context, options),
    update: (path, updater, context = {}, options = {}) => access.update(path, updater, context, options),
    delete: (path, context = {}, options = {}) => access.delete(path, context, options),
    transaction: callback => access.transaction(callback),
    has: (key, context = {}, options = {}) => access.has(key, context, options),
    resolve: (path, context = {}, namespace = 'runtime') => access.resolve(path, context, namespace)
  });
}
