import { importModules } from './imports/index.js';
const __testModules = await importModules(["StateAccess"]);
const { createStateAccess } = __testModules.StateAccess;

import test from 'node:test';
import assert from 'node:assert/strict';

function makeEngine() {
  return {
    src: { meta: { title: 'Scenario' } },
    state: { sceneId: 'start', characters: { player: { inventory: ['key'] } }, global: { clue: { title: 'Clue title', type: 'boolean', value: false } } },
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

test('global state title is available through StateAccess', () => {
  const engine = makeEngine();
  const state = createStateAccess(engine);
  assert.equal(state.get('globalState.title', { id: 'clue' }), 'Clue title');
});

test('source namespace remains read-only', () => {
  const state = createStateAccess(makeEngine());
  assert.throws(() => state.set('meta.title', 'Changed', {}, { namespace: 'source' }), {
    code: 'READ_ONLY_NAMESPACE'
  });
});


test('StateAccess transaction rolls back runtime and session when commit hook throws', async () => {
  const engine = makeEngine();
  engine.chatState = { active: false, history: [] };
  engine.pendingPasswordAction = { status: 'pending' };
  const state = createStateAccess(engine);
  const originalCommit = engine.commitState;
  engine.commitState = (reason) => { if (reason === 'state.transaction') throw new Error('commit fault'); };
  await assert.rejects(state.transaction(tx => {
    tx.set('global.counter', 9);
    tx.set('chatState', { active: true, history: ['changed'] }, {}, { namespace: 'session' });
    tx.set('pendingPasswordAction', { status: 'done' }, {}, { namespace: 'session' });
  }), /commit fault/);
  assert.equal(state.get('global.counter'), undefined);
  assert.deepEqual(engine.chatState, { active: false, history: [] });
  assert.deepEqual(engine.pendingPasswordAction, { status: 'pending' });
  engine.commitState = originalCommit;
});
