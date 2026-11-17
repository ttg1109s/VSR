import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_SCRIPT } from '../demo_script.js';
import { LoaderSystem } from '../engine/modules/Loader.js';
import { validateScenario } from '../engine/scenario/Scenario.js';
import { MoveAlgorithms } from '../engine/modules/entity/Movement.js';
import { EntitySystem } from '../engine/modules/Entity.js';
import { EffectSystem } from '../engine/modules/Effect.js';

test('Character moveList entries receive persistent visit counters at load', () => {
  const loaded = LoaderSystem.loadScript(structuredClone(DEMO_SCRIPT), {});
  const entries = Object.values(loaded.state.characters).flatMap(character => character.moveList || []);
  assert.ok(entries.length > 0);
  assert.ok(entries.every(entry => entry.countVisited === 0));
});

test('Character moveList schema accepts loop enter/leave/still and stillActive', () => {
  const scenario = structuredClone(DEMO_SCRIPT);
  const character = Object.values(scenario.characters).find(item => item.moveList?.length);
  character.moveList[0].stillActive = 4;
  character.moveList[0].loop = { enter: [], leave: [], still: [] };
  assert.deepEqual(validateScenario(scenario), []);
});

test('random_count selects without consuming count before a successful transition', () => {
  const moveList = [
    { scene_id: 'a', count: -1 },
    { scene_id: 'b', count: 2 }
  ];
  const result = MoveAlgorithms.random_count({
    moveList, currentScene: 'a', engine: { checkReq: () => ({ pass: true }) }
  });
  assert.equal(result.idx, 1);
  assert.equal(result.consumeCount, true);
  assert.equal(moveList[1].count, 2);
});

function createMovementHarness({ blockDestinationAfterLeave = false } = {}) {
  const character = {
    set: { moving: true, move: 'random_count' },
    place: { scene_id: 'a', currentIndex: 0 },
    moveList: [
      { scene_id: 'a', count: -1, countVisited: 0, loop: { leave: [{}] } },
      { scene_id: 'b', count: 1, countVisited: 0, loop: { enter: [{}] } }
    ],
    effect: { leave: {}, meeting: {} },
    met: []
  };
  const data = {
    characters: { npc: character },
    scenes: { a: { blocked: false, activeRouterId: '' }, b: { blocked: false, activeRouterId: '' } },
    sceneId: 'player-scene',
    entryCharacter: 'player',
    faker: { active: false, targetId: null },
    playerMoveHistory: []
  };
  const state = {
    getRuntimeSnapshot(path, params = {}) {
      if (path === 'characters') return data.characters;
      if (path === 'characters.[id]') return data.characters[params.id];
      if (path === 'scenes.[id]') return data.scenes[params.id];
      if (path === 'faker') return data.faker;
      if (path === 'playerMoveHistory') return data.playerMoveHistory;
      return undefined;
    },
    get(path, params = {}) {
      if (path === 'sceneId') return data.sceneId;
      if (path === 'entryCharacter') return data.entryCharacter;
      if (path === 'scene.blocked') return data.scenes[params.id]?.blocked;
      if (path === 'scene.activeRouterId') return data.scenes[params.id]?.activeRouterId;
      if (path === 'router.blocked') return false;
      return undefined;
    },
    has(path, params = {}) {
      return path === 'scene.blocked' && !!data.scenes[params.id];
    },
    update(path, updater, params = {}) {
      if (path === 'characters.[id]') {
        data.characters[params.id] = updater(data.characters[params.id]);
        return data.characters[params.id];
      }
      throw new Error('Unexpected state update: ' + path);
    }
  };
  const taskManager = {
    plan: {},
    kill(id) { delete this.plan[id]; },
    addNew(id, config) { this.plan[id] = config; },
    operator() {}
  };
  const engine = Object.assign({}, EntitySystem, {
    api: { engine: { state }, presentation: { components: { updateCharacterList() {} } } },
    taskManager,
    getConfig: () => 1,
    processRunnables: async (list, context) => {
      if (blockDestinationAfterLeave && context.hook === 'leave') data.scenes.b.blocked = true;
      if (context.shouldContinue && !context.shouldContinue()) return;
    },
    updateMetState() {}
  });
  return { engine, data };
}

test('successful Character transition commits location, countVisited and random_count together', async () => {
  const { engine, data } = createMovementHarness();
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    await engine.executeCharacterMove('npc');
  } finally {
    Math.random = originalRandom;
  }
  assert.equal(data.characters.npc.place.scene_id, 'b');
  assert.equal(data.characters.npc.place.currentIndex, 1);
  assert.equal(data.characters.npc.moveList[1].countVisited, 1);
  assert.equal(data.characters.npc.moveList[1].count, 0);
});

test('Leave effect blocking the destination cancels transition without consuming count', async () => {
  const { engine, data } = createMovementHarness({ blockDestinationAfterLeave: true });
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    await engine.executeCharacterMove('npc');
  } finally {
    Math.random = originalRandom;
  }
  assert.equal(data.characters.npc.place.scene_id, 'a');
  assert.equal(data.characters.npc.place.currentIndex, 0);
  assert.equal(data.characters.npc.moveList[1].countVisited, 0);
  assert.equal(data.characters.npc.moveList[1].count, 1);
});

test('Effect runner stops the remaining list as soon as the visit token becomes invalid', async () => {
  let valid = true;
  let calls = 0;
  const engine = Object.assign({}, EffectSystem, {
    api: { engine: { state: { getRuntimeSnapshot: () => ({}) } } },
    async processRunnable() {
      calls += 1;
      valid = false;
    }
  });
  await engine.processRunnables([{}, {}, {}], { shouldContinue: () => valid }, true, true);
  assert.equal(calls, 1);
});
