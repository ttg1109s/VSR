import test from 'node:test';
import assert from 'node:assert/strict';
import { createStateAccess } from '../state/StateAccess.js';

function makeEngine() {
  return {
    src: { meta: { title: 'Scenario' } },
    state: { sceneId: 'start', characters: { player: { inventory: ['key'] } } },
    chatState: null,
    pendingPasswordAction: null,
    commitState() {}
  };
}

test('runtime snapshots are detached from live state', () => {
  const engine = makeEngine();
  const state = createStateAccess(engine);
  const snapshot = state.getRuntimeSnapshot('characters.[id]', { id: 'player' });
  snapshot.inventory.push('tampered');
  assert.deepEqual(engine.state.characters.player.inventory, ['key']);
});

test('StateAccess updates runtime values through its write API', () => {
  const engine = makeEngine();
  const state = createStateAccess(engine);
  state.update('characters.[id].inventory', inventory => [...inventory, 'map'], { id: 'player' });
  assert.deepEqual(engine.state.characters.player.inventory, ['key', 'map']);
});

test('source namespace remains read-only', () => {
  const state = createStateAccess(makeEngine());
  assert.throws(() => state.set('meta.title', 'Changed', {}, { namespace: 'source' }), {
    code: 'READ_ONLY_NAMESPACE'
  });
});
