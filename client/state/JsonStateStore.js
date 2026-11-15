const clone = value => value == null ? value : structuredClone(value);
const same = (a, b) => {
  if (Object.is(a, b)) return true;
  if (a == null || b == null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ak = Object.keys(a), bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  return ak.every(key => Object.hasOwn(b, key) && same(a[key], b[key]));
};

/**
 * Small framework-agnostic external store: immutable JSON snapshots, selectors,
 * subscriptions, and change detection. No virtual DOM and no framework.
 */
export class JsonStateStore {
  constructor(snapshot = null) {
    this.snapshot = clone(snapshot);
    this.listeners = new Set();
  }
  getSnapshot() { return clone(this.snapshot); }
  select(selector) { return selector(this.snapshot); }
  update(snapshot, reason = 'state.changed') {
    const previous = this.snapshot;
    this.snapshot = clone(snapshot);
    const changes = [];
    const keys = new Set([...Object.keys(previous || {}), ...Object.keys(snapshot || {})]);
    for (const key of keys) if (!same(previous?.[key], snapshot?.[key])) changes.push(key);
    if (!changes.length) return;
    const update = { snapshot: this.snapshot, previous, changedKeys: changes, reason };
    for (const listener of this.listeners) listener(update);
  }
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
