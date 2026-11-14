import test from 'node:test';
import assert from 'node:assert/strict';
import { createStateAccess } from '../state/StateAccess.js';
import { EffectHandlers } from '../engine/modules/effect/Strategies.js';

function makeEngine() {
  const engine = {
    src: {},
    state: {
      sceneId: 'hall',
      characters: { player: { set: { relationship: [], met: [] } } },
      routers: { 'hall_north': { actions: ['open'] } }
    },
    commitState() {}
  };
  engine.api = { engine: { state: createStateAccess(engine) } };
  return engine;
}

test('CMS effect handler awaits transactional character mutation', async () => {
  const engine = makeEngine();
  await EffectHandlers.cms.call(engine, {
    table: 'characters', id: 'player', column: 'relationship', method: 'add', value: ['npc', 'friend']
  });
  assert.deepEqual(engine.state.characters.player.set.relationship, [['npc', 'friend']]);
});

test('CMS effect handler awaits transactional router mutation', async () => {
  const engine = makeEngine();
  await EffectHandlers.cms.call(engine, {
    table: 'routers', id: 'north', column: 'actions', method: 'add', value: 'close'
  });
  assert.deepEqual(engine.state.routers['hall_north'].actions, ['open', 'close']);
});
