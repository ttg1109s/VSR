import { STATE_SCHEMA } from './schema.js';

const NAMESPACE_ROOTS = Object.freeze({
  source: engine => engine?.src,
  runtime: engine => engine?.state,
  session: engine => ({
    chatState: engine?.chatState,
    pendingPasswordAction: engine?.pendingPasswordAction
  })
});

export class StatePathError extends Error {
  constructor(message, code = 'INVALID_STATE_PATH') {
    super(message);
    this.name = 'StatePathError';
    this.code = code;
  }
}

function readPath(root, path, context = {}) {
  if (typeof path !== 'string' || !path.trim()) {
    throw new StatePathError('State path must be a non-empty string.');
  }
  let current = root;
  for (const segment of path.split('.')) {
    if (current === null || current === undefined) return undefined;
    const match = /^\[([A-Za-z_$][\w$]*)\]$/.exec(segment);
    const key = match ? context[match[1]] : segment;
    if (match && (key === undefined || key === null || key === '')) {
      throw new StatePathError(`Missing context "${match[1]}" for path "${path}".`, 'MISSING_STATE_CONTEXT');
    }
    current = current[key];
  }
  return current;
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

  has(key, context = {}, options = {}) {
    return this.get(key, context, options) !== undefined;
  }

  resolve(path, context = {}, namespace = 'runtime') {
    return this.getFrom(namespace, path, context);
  }

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
    has: (key, context = {}, options = {}) => access.has(key, context, options),
    resolve: (path, context = {}, namespace = 'runtime') => access.resolve(path, context, namespace)
  });
}
