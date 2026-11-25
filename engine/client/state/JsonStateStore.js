const clone = value => value == null ? value : structuredClone(value);
const same = (a, b) => {
  if (Object.is(a, b)) return true;
  if (a == null || b == null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ak = Object.keys(a), bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  return ak.every(key => Object.hasOwn(b, key) && same(a[key], b[key]));
};
const shareUnchanged = (previous, next) => {
  if (same(previous, next)) return previous;
  if (!previous || !next || typeof previous !== 'object' || typeof next !== 'object' || Array.isArray(previous) !== Array.isArray(next)) return next;
  for (const key of Object.keys(next)) {
    if (Object.hasOwn(previous, key)) next[key] = shareUnchanged(previous[key], next[key]);
  }
  return next;
};
const freeze = value => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const key of Object.keys(value)) freeze(value[key]);
  return value;
};

/** Framework-agnostic immutable snapshot store with stable references and selectors. */
export class JsonStateStore {
  constructor(snapshot = null) {
    this.snapshot = freeze(clone(snapshot));
    this.listeners = new Set();
    this.selectorListeners = new Set();
  }
  // Stable reference until a real snapshot update occurs; required by external-store APIs.
  getSnapshot() { return this.snapshot; }
  select(selector) { return selector(this.snapshot); }
  update(snapshot, reason = 'state.changed') {
    this.lastUpdate = null;
    const previous = this.snapshot;
    if (same(previous, snapshot)) return false;
    const incoming = shareUnchanged(previous, clone(snapshot));
    const changes = [];
    const keys = new Set([...Object.keys(previous || {}), ...Object.keys(incoming || {})]);
    for (const key of keys) {
      if (!same(previous?.[key], incoming?.[key])) changes.push(key);
      else if (incoming && previous) incoming[key] = previous[key];
    }
    if (!changes.length) return false;
    this.snapshot = freeze(incoming);
    const update = { snapshot: this.snapshot, previous, changedKeys: changes, reason };
    this.lastUpdate = update;
    for (const listener of [...this.listeners]) listener(update);
    for (const entry of [...this.selectorListeners]) {
      const nextValue = entry.selector(this.snapshot);
      if (!entry.equalityFn(entry.value, nextValue)) {
        const oldValue = entry.value;
        entry.value = nextValue;
        entry.listener(nextValue, oldValue, update);
      }
    }
    return update;
  }
  subscribe(listener) {
    if (typeof listener !== 'function') throw new TypeError('Listener must be a function.');
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  subscribeSelector(selector, listener, equalityFn = Object.is) {
    if (typeof selector !== 'function' || typeof listener !== 'function') throw new TypeError('Selector and listener must be functions.');
    if (typeof equalityFn !== 'function') throw new TypeError('Equality function must be a function.');
    const entry = { selector, listener, equalityFn, value: selector(this.snapshot) };
    this.selectorListeners.add(entry);
    return () => this.selectorListeners.delete(entry);
  }
}

export { same as jsonStateEqual };
