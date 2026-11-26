import test from 'node:test';
import assert from 'node:assert/strict';
import { JsonStateStore } from '../engine/client/state/JsonStateStore.js';

test('JsonStateStore returns a stable snapshot reference between updates', () => {
  const store = new JsonStateStore({ game: { sceneId: 'a' }, session: { chat: [] } });
  const first = store.getSnapshot();
  assert.strictEqual(store.getSnapshot(), first);
  store.update({ game: { sceneId: 'a' }, session: { chat: [] } });
  assert.strictEqual(store.getSnapshot(), first);
});

test('JsonStateStore structurally shares unchanged top-level domains', () => {
  const store = new JsonStateStore({ game: { sceneId: 'a' }, session: { chat: [] } });
  const previous = store.getSnapshot();
  store.update({ game: { sceneId: 'b' }, session: { chat: [] } });
  const next = store.getSnapshot();
  assert.notStrictEqual(next, previous);
  assert.notStrictEqual(next.game, previous.game);
  assert.strictEqual(next.session, previous.session);
  assert.strictEqual(next.game.sceneId, 'b');
});

test('JsonStateStore shares unchanged nested snapshot branches', () => {
  const store = new JsonStateStore({ presentation: { scene: { id: 'a' }, inventory: { items: [] } } });
  const oldScene = store.getSnapshot().presentation.scene;
  const oldInventory = store.getSnapshot().presentation.inventory;
  store.update({ presentation: { scene: { id: 'b' }, inventory: { items: [] } } });
  assert.notStrictEqual(store.getSnapshot().presentation.scene, oldScene);
  assert.strictEqual(store.getSnapshot().presentation.inventory, oldInventory);
});

test('JsonStateStore selector subscriptions notify only when selected value changes', () => {
  const store = new JsonStateStore({ game: { sceneId: 'a' }, session: { count: 1 } });
  let calls = 0;
  const unsubscribe = store.subscribeSelector(s => s.game.sceneId, () => calls++);
  store.update({ game: { sceneId: 'a' }, session: { count: 2 } });
  assert.equal(calls, 0);
  store.update({ game: { sceneId: 'b' }, session: { count: 2 } });
  assert.equal(calls, 1);
  unsubscribe();
});

test('JsonStateStore snapshots are immutable to consumers', () => {
  const store = new JsonStateStore({ game: { sceneId: 'a' } });
  assert.throws(() => { store.getSnapshot().game.sceneId = 'mutated'; }, TypeError);
  assert.equal(store.getSnapshot().game.sceneId, 'a');
});
