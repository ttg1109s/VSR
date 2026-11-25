import { importModules } from './imports/index.js';
const __testModules = await importModules(["LoaderSystem","Scenario","MoveAlgorithms","EntitySystem","EffectSystem","SaveState","ManagementStrategies"]);
const { LoaderSystem } = __testModules.LoaderSystem;
const { validateScenario } = __testModules.Scenario;
const { MoveAlgorithms } = __testModules.MoveAlgorithms;
const { EntitySystem } = __testModules.EntitySystem;
const { EffectSystem } = __testModules.EffectSystem;
const { validateCharacterVisitCounters } = __testModules.SaveState;
const { EffectKeyStrategies, EffectScopeResolvers, StaticListResolvers } = __testModules.ManagementStrategies;

import test from 'node:test';
import assert from 'node:assert/strict';







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

function createMovementHarness({ blockDestinationAfterLeave = false, playerSceneId = 'player-scene' } = {}) {
  const character = {
    set: { moving: true, move: 'random_count' },
    place: { scene_id: 'a', currentIndex: 0 },
    moveList: [
      { entryId: 'move-a', scene_id: 'a', count: -1, countVisited: 0, loop: { leave: [{}] } },
      { entryId: 'move-b', scene_id: 'b', count: 1, countVisited: 0, loop: { enter: [{}] } }
    ],
    effect: { leave: {}, meeting: {} },
    met: []
  };
  const data = {
    characters: { npc: character },
    scenes: { a: { blocked: false, activeRouterId: '' }, b: { blocked: false, activeRouterId: '' } },
    sceneId: playerSceneId,
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

test('100 concurrent manual Character move requests serialize against fresh visit tokens', async () => {
  const { engine, data } = createMovementHarness();
  data.characters.npc.moveList[1].count = -1;
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    const results = await Promise.all(Array.from({ length: 100 }, () => engine.executeCharacterMove('npc')));
    assert.equal(results.filter(result => result?.status === 'moved').length, 100);
    assert.equal(data.characters.npc.moveList.reduce((sum, entry) => sum + entry.countVisited, 0), 100);
    assert.equal(data.characters.npc.place.currentIndex, 0);
  } finally {
    Math.random = originalRandom;
  }
});

test('entering the Player scene does not automatically mark a Character as met', async () => {
  const { engine, data } = createMovementHarness({ playerSceneId: 'b' });
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    await engine.executeCharacterMove('npc');
  } finally {
    Math.random = originalRandom;
  }

  assert.equal(data.characters.npc.place.scene_id, 'b');
  assert.deepEqual(data.characters.npc.met, []);
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

test('save restore requires canonical visit counters and rejects invalid values', () => {
  const missing = { npc: { moveList: [{ scene_id: 'a' }] } };
  assert.throws(
    () => validateCharacterVisitCounters(missing, { npc: { moveList: [{ scene_id: 'a' }] } }),
    /countVisited must be a non-negative safe integer/
  );

  for (const invalid of [-1, 1.5, '2', null, Number.MAX_SAFE_INTEGER + 1]) {
    const malformed = { npc: { moveList: [{ scene_id: 'a', countVisited: invalid }] } };
    assert.throws(
      () => validateCharacterVisitCounters(malformed, { npc: { moveList: [{ scene_id: 'a' }] } }),
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
    moveList: [{ entryId: 'identity-move', scene_id: 'a', countVisited: 0, nextStep: 10, stillActive: 5, loop: { still: [{}] } }]
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

  engine.scheduleCharacterStill('npc', 7);
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

test('Character Movement Effect Manager isolates each moveList entry by stable ID and hook', () => {
  const source = { characters: { npc: { effect: { still: [{ type: 'notify', text: 'character-level' }] }, moveList: [
    { entryId: 'route-0', loop: { still: [{ type: 'notify', text: 'entry-0' }] } },
    { entryId: 'route-1', loop: { still: [{ type: 'notify', text: 'entry-1' }] } }
  ] } } };
  assert.equal(EffectKeyStrategies.character_move({ cId: 'npc', moveEntryId: 'route-0', hook: 'still' }), 'char_move_npc_entry_route-0_still');
  assert.equal(EffectKeyStrategies.character_move({ cId: 'npc', moveEntryId: 'route-1', hook: 'still' }), 'char_move_npc_entry_route-1_still');
  assert.notEqual(EffectKeyStrategies.character_move({ cId: 'npc', moveEntryId: 'route-0', hook: 'still' }), EffectKeyStrategies.character({ cId: 'npc', hook: 'still' }));
  assert.deepEqual(StaticListResolvers.character_move(source, { cId: 'npc', moveEntryId: 'route-0', hook: 'still' }), source.characters.npc.moveList[0].loop.still);
  assert.deepEqual(StaticListResolvers.character_move(source, { cId: 'npc', moveEntryId: 'route-1', hook: 'still' }), source.characters.npc.moveList[1].loop.still);
  assert.deepEqual(StaticListResolvers.character_move(source, { cId: 'npc', moveEntryId: 'route-0', hook: 'enter' }), []);
  assert.throws(() => EffectScopeResolvers.character_move({ target: 'npc', moveEntryId: '', in: 'still' }), /valid stable moveEntryId/);
});

test('EffectSystem applies moveList-entry overrides without colliding with Character effects', async () => {
  const key = 'char_move_npc_entry_route-1_still';
  const original = [{ type: 'notify', text: 'original' }];
  const override = [{ type: 'notify', text: 'managed-override' }];
  const executed = [];
  const engine = Object.assign({}, EffectSystem, {
    api: {
      engine: {
        state: {
          getRuntimeSnapshot(path) {
            return path === 'effect_overrides' ? { [key]: override } : {};
          }
        }
      }
    },
    async processRunnable(wrapper) {
      executed.push(wrapper);
    }
  });

  await engine.processRunnables(original, {
    sceneId: 'scene_a',
    charId: 'npc',
    effectScope: 'character_move',
    moveEntryId: 'route-1',
    hook: 'still'
  }, true, true);

  assert.deepEqual(executed, override);
});

test('manage_effect can mutate one Character moveList entry without touching sibling entries', async () => {
  const overrides = {};
  const source = {
    characters: {
      npc: {
        moveList: [
          { entryId: 'first', loop: { still: [{ type: 'notify', text: 'first' }] } },
          { entryId: 'second', loop: { still: [{ type: 'notify', text: 'second' }] } }
        ]
      }
    }
  };
  const engine = Object.assign({}, EffectSystem, {
    src: source,
    api: {
      engine: {
        state: {
          getRuntime(path, params) {
            return path === 'effect_overrides.[key]' ? overrides[params.key] : undefined;
          },
          set(path, value, params) {
            if (path !== 'effect_overrides.[key]') throw new Error('Unexpected state write: ' + path);
            overrides[params.key] = value;
          }
        }
      }
    }
  });

  await engine.handleManageEffect({
    space: 'character_move',
    target: 'npc',
    moveEntryId: 'second',
    in: 'still',
    subtype: 'add_effect',
    content: { type: 'notify', text: 'managed' }
  }, {}, null, []);

  assert.deepEqual(overrides.char_move_npc_entry_second_still, [
    { type: 'notify', text: 'second' },
    { type: 'notify', text: 'managed' }
  ]);
  assert.equal(overrides.char_move_npc_0_still, undefined);
});

test('Character movement returns explicit disabled and no-destination classifications', async () => {
  const disabled = createMovementHarness();
  disabled.data.characters.npc.set.moving = false;
  const disabledResult = await disabled.engine.executeCharacterMove('npc');
  assert.deepEqual(disabledResult, { status: 'movement_disabled' });

  const blocked = createMovementHarness();
  blocked.data.characters.npc.moveList = blocked.data.characters.npc.moveList.map(item => ({ ...item, skip: true }));
  const blockedResult = await blocked.engine.executeCharacterMove('npc');
  assert.deepEqual(blockedResult, { status: 'no_valid_destination' });
});


test('Character move effect overrides require stable IDs and ignore positional legacy keys', async () => {
  const stableKey = 'char_move_npc_entry_route-A_still';
  const legacyKey = 'char_move_npc_2_still';
  const stableOverride = [{ type: 'notify', text: 'stable' }];
  const legacyOverride = [{ type: 'notify', text: 'legacy' }];
  const original = [{ type: 'notify', text: 'source' }];
  const executed = [];
  const engine = Object.assign({}, EffectSystem, {
    api: { engine: { state: { getRuntimeSnapshot(path) { return path === 'effect_overrides' ? { [stableKey]: stableOverride, [legacyKey]: legacyOverride } : {}; } } } },
    async processRunnable(wrapper) { executed.push(wrapper); }
  });
  assert.equal(EffectKeyStrategies.character_move({ cId: 'npc', moveEntryId: 'route-A', hook: 'still' }), stableKey);
  assert.deepEqual(StaticListResolvers.character_move({ characters: { npc: { moveList: [{ entryId: 'other', loop: { still: [{ type: 'notify', text: 'wrong' }] } }, { entryId: 'route-A', loop: { still: [{ type: 'notify', text: 'right' }] } }] } } }, { cId: 'npc', moveEntryId: 'route-A', hook: 'still' }), [{ type: 'notify', text: 'right' }]);
  assert.deepEqual(EffectScopeResolvers.character_move({ target: 'npc', moveEntryId: 'route-A', in: 'still' }), { scope: 'character_move', params: { cId: 'npc', moveEntryId: 'route-A', hook: 'still' } });
  await engine.processRunnables(original, { sceneId: 'scene_a', charId: 'npc', effectScope: 'character_move', moveEntryId: 'route-A', hook: 'still' }, true, true);
  assert.deepEqual(executed, stableOverride);
  executed.length = 0;
  engine.api.engine.state.getRuntimeSnapshot = path => path === 'effect_overrides' ? { [legacyKey]: legacyOverride } : {};
  await engine.processRunnables(original, { sceneId: 'scene_a', charId: 'npc', effectScope: 'character_move', moveEntryId: 'route-A', hook: 'still' }, true, true);
  assert.deepEqual(executed, original);
});

test('manage_effect uses only stable movement entry IDs for overrides', async () => {
  const overrides = { char_move_npc_entry_second_still: [{ type: 'notify', text: 'previously-managed' }] };
  const source = { characters: { npc: { moveList: [{ entryId: 'first', loop: { still: [{ type: 'notify', text: 'first' }] } }, { entryId: 'second', loop: { still: [{ type: 'notify', text: 'default-second' }] } }] } } };
  const engine = Object.assign({}, EffectSystem, { src: source, api: { engine: { state: { getRuntime(path, params) { return path === 'effect_overrides.[key]' ? overrides[params.key] : undefined; }, getRuntimeSnapshot(path) { return path === 'effect_overrides' ? overrides : {}; }, set(path, value, params) { if (path !== 'effect_overrides.[key]') throw new Error('Unexpected state write: ' + path); overrides[params.key] = value; } } } } });
  await engine.handleManageEffect({ space: 'character_move', target: 'npc', moveEntryId: 'second', in: 'still', subtype: 'add_effect', content: { type: 'notify', text: 'new' } }, {}, null, []);
  assert.deepEqual(overrides.char_move_npc_entry_second_still, [{ type: 'notify', text: 'previously-managed' }, { type: 'notify', text: 'new' }]);
  assert.equal(overrides.char_move_npc_1_still, undefined);
});

test('Scenario validation rejects duplicate stable movement entry IDs', () => {
  const scenario = { formatVersion: 1, meta: { title: 'Test', desc: 'Test scenario', version: '1.0.0', language: 'vi', writer: null, ageRating: '13+', tags: [], entryScene: 'start' }, globalStates: {}, templates: {}, itemInfo: {}, passwords: {}, scenes: { start: { meta: { title: 'Start' }, set: { activeRouterId: 'main' }, routers: { main: { meta: { subTitleStatus: 'Main' }, set: { blocked: false, visited: false, countVisited: 0 }, actions: [] } } } }, actions: {}, chat: {}, characters: { npc: { meta: { name: 'NPC', desc: '' }, set: { linkEffect: false, alert: null, moving: true, move: null }, stats: {}, inventory: [], moveList: [{ scene_id: 'start', entryId: 'duplicate' }, { scene_id: 'start', entryId: 'duplicate' }] } }, endings: {}, config: {} };
  const missingIdScenario = structuredClone(scenario);
  delete missingIdScenario.characters.npc.moveList[0].entryId;
  assert.ok(validateScenario(missingIdScenario).some(error => error.includes('required property') && error.includes('entryId')));
  const errors = validateScenario(scenario);
  assert.ok(errors.some(error => error.includes('duplicates movement entry ID duplicate')), errors.join('\\n'));
});

test('Chat effect resolver rejects positional choice lookup and requires stable IDs', () => {
  const source = { chat: { chatA: { block: { blockA: { choice_id: 'groupA' } }, choice: { groupA: [{ text: 'legacy-index', effect: [{ type: 'notify', text: 'wrong' }] }, { id: 'choice-1', text: 'stable', effect: [{ type: 'notify', text: 'right' }] }] } } } };
  assert.deepEqual(StaticListResolvers.chat(source, { chatId: 'chatA', blockId: 'blockA', choiceId: '0' }), []);
  assert.deepEqual(StaticListResolvers.chat(source, { chatId: 'chatA', blockId: 'blockA', choiceId: 'choice-1' }), [{ type: 'notify', text: 'right' }]);
});

test('movement effect scope without stable ID does not fall through to Character scope', async () => {
  const characterKey = 'char_npc_still';
  const characterOverride = [{ type: 'notify', text: 'character-level' }];
  const original = [{ type: 'notify', text: 'movement-source' }];
  const executed = [];
  const engine = Object.assign({}, EffectSystem, {
    api: { engine: { state: { getRuntimeSnapshot(path) { return path === 'effect_overrides' ? { [characterKey]: characterOverride } : {}; } } } },
    async processRunnable(wrapper) { executed.push(wrapper); }
  });
  await engine.processRunnables(original, { sceneId: 'scene_a', charId: 'npc', effectScope: 'character_move', hook: 'still' }, true, true);
  assert.deepEqual(executed, original);
});
