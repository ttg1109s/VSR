import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_SCRIPT } from '../demo_script.js';
import { LoaderSystem } from '../engine/modules/Loader.js';
import { validateScenario } from '../engine/scenario/Scenario.js';
import { MoveAlgorithms } from '../engine/modules/entity/Movement.js';
import { EntitySystem } from '../engine/modules/Entity.js';
import { EffectSystem } from '../engine/modules/Effect.js';
import { normalizeCharacterVisitCounters } from '../engine/persistence/SaveState.js';

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


test('save migration defaults missing visit counters and rejects invalid values', () => {
  const saved = { npc: { moveList: [{ scene_id: 'a' }, { scene_id: 'b', countVisited: 4 }] } };
  normalizeCharacterVisitCounters(saved, { npc: { moveList: [{ scene_id: 'a' }, { scene_id: 'b' }] } });
  assert.equal(saved.npc.moveList[0].countVisited, 0);
  assert.equal(saved.npc.moveList[1].countVisited, 4);

  for (const invalid of [-1, 1.5, '2', null, Number.MAX_SAFE_INTEGER + 1]) {
    const malformed = { npc: { moveList: [{ scene_id: 'a', countVisited: invalid }] } };
    assert.throws(
      () => normalizeCharacterVisitCounters(malformed, { npc: { moveList: [{ scene_id: 'a' }] } }),
      /countVisited must be a non-negative safe integer/
    );
  }
});

test('Enter Effect failure does not roll back the committed Character visit', async () => {
  const { engine, data } = createMovementHarness();
  engine.processRunnables = async (_list, context) => {
    if (context.hook === 'enter') throw new Error('enter failure');
  };
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

test('simultaneous movement requests for one Character are serialized', async () => {
  const { engine, data } = createMovementHarness();
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    await Promise.all([
      engine.executeCharacterMove('npc'),
      engine.executeCharacterMove('npc')
    ]);
  } finally {
    Math.random = originalRandom;
  }
  assert.equal(data.characters.npc.place.scene_id, 'a');
  assert.equal(data.characters.npc.place.currentIndex, 0);
  assert.equal(data.characters.npc.moveList[0].countVisited, 1);
  assert.equal(data.characters.npc.moveList[1].countVisited, 1);
});

test('identity changes invalidate the old visit and restart Still with a fresh token', async () => {
  const character = {
    set: { moving: true, move: 'list' },
    place: { scene_id: 'a', currentIndex: 0 },
    moveList: [{ scene_id: 'a', nextStep: 10, stillActive: 5, loop: { still: [{}] } }]
  };
  const data = { characters: { npc: character }, faker: { active: true, targetId: 'npc' }, entryCharacter: 'player' };
  const state = {
    getRuntimeSnapshot(path, params = {}) {
      if (path === 'characters') return data.characters;
      if (path === 'characters.[id]') return data.characters[params.id];
      if (path === 'faker') return data.faker;
      return undefined;
    },
    get(path) { return path === 'entryCharacter' ? data.entryCharacter : undefined; }
  };
  const taskManager = {
    plan: { move_char_npc: {}, move_still_npc_7: {} },
    kill(id) { delete this.plan[id]; },
    addNew(id, config) { this.plan[id] = config; },
    operator(id) { this.plan[id].enabled = true; }
  };
  const engine = Object.assign({}, EntitySystem, {
    api: { engine: { state } },
    taskManager,
    characterVisitTokens: new Map([['npc', 7]]),
    characterVisitSequence: 7,
    characterStillTaskIds: new Map([['npc', 'move_still_npc_7']]),
    getConfig: () => 1
  });

  const oldStillTask = taskManager.plan.move_still_npc_7;
  engine.syncCharacterMovementIdentity();
  assert.equal(engine.getCharacterVisitToken('npc'), null);
  assert.equal(taskManager.plan.move_char_npc, undefined);
  assert.equal(taskManager.plan.move_still_npc_7, undefined);

  data.faker = { active: false, targetId: null };
  engine.syncCharacterMovementIdentity();
  const newToken = engine.getCharacterVisitToken('npc');
  assert.ok(newToken > 7);
  assert.ok(taskManager.plan[`move_still_npc_${newToken}`]);
  assert.ok(taskManager.plan.move_char_npc);
  await oldStillTask.exe();
  assert.ok(taskManager.plan[`move_still_npc_${newToken}`], 'a stale Still callback must not kill the new visit task');
});
