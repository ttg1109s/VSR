// Backward-compatible entry point. The canonical implementation lives in /state.
import { StateAccess, StatePathError, createStateAccess } from '../state/StateAccess.js';
export { StateAccess, StatePathError, createStateAccess } from '../state/StateAccess.js';
export { STATE_SCHEMA } from '../state/schema.js';

export default class State {
  static getFor(engine, key, context = {}, options = {}) {
    return new StateAccess(engine).get(key, context, options);
  }

  static _resolve(root, path, context = {}) {
    const access = new StateAccess({ state: root });
    return access.getFrom('runtime', path, context);
  }
}
