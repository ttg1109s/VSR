import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scenarioSchema } from '../engine/scenario/ScenarioSchema.js';
import { validateScenario, normalizeScenario, ScenarioValidationError } from '../engine/scenario/Scenario.js';
import { LogicSystem } from '../engine/modules/Logic.js';
import { EffectSystem } from '../engine/modules/Effect.js';
import { EffectHandlers, CharacterStrategies, SetStrategies } from '../engine/modules/effect/Strategies.js';
import { StatsHelpers } from '../engine/modules/effect/strategies/Stats.js';
import { ItemStrategies } from '../engine/modules/effect/strategies/Item.js';
import { LoaderSystem } from '../engine/modules/Loader.js';
import { ActionSystem } from '../engine/modules/Action.js';
import { SceneSystem } from '../engine/modules/Scene.js';
import { AutomationSystem } from '../engine/modules/Automation.js';
import { GameEngine } from '../engine/GameEngine.js';
import { normalizeSaveEnvelope } from '../engine/persistence/SaveState.js';
import { JsonProtocol } from '../protocol/JsonProtocol.js';

function validScenario() {
  return JSON.parse(readFileSync(new URL('./fixtures/engine/minimal-scenario.json', import.meta.url), 'utf8'));
}

test('engine.init can load a scenario without entering its entry scene', async () => {
  const engine = new GameEngine();
  try {
    const command = engine.protocol.createCommand(
      'engine.init',
      { script: validScenario(), enterScene: false },
      { commandId: 'test-load-without-entry' }
    );
    const acknowledgement = await engine.dispatchProtocolCommand(command);
    assert.equal(acknowledgement.ok, true);
    assert.equal(acknowledgement.result.initialized, true);
    assert.equal(acknowledgement.result.sceneEntered, false);
    assert.equal(engine.state.sceneId, '');

    const snapshot = engine.protocol.createSnapshot(engine);
    assert.equal(snapshot.game.initialized, true);
    assert.equal(snapshot.game.sceneId, null);
    assert.equal(snapshot.game.routerId, null);
    assert.equal(snapshot.presentation.scene, null);
  } finally {
    engine.dispose();
  }
});

test('save envelope migrates the previous version and rejects unsupported versions', () => {
  const base = {
    protocol: 'vsr-save',
    saveVersion: 2,
    scenario: {},
    state: {},
    savedAt: new Date().toISOString()
  };
  const migrated = normalizeSaveEnvelope(base);
  assert.equal(migrated.saveVersion, 3);

  for (const saveVersion of [undefined, 1, 4]) {
    const legacyOrUnsupported = { ...base };
    if (saveVersion === undefined) delete legacyOrUnsupported.saveVersion;
    else legacyOrUnsupported.saveVersion = saveVersion;
    assert.throws(() => normalizeSaveEnvelope(legacyOrUnsupported), /Unsupported save version/);
  }
});

test('scenario validation enforces the complete V9.2 JSON Schema contract', () => {
  const errors = validateScenario({ scenes: {} });
  assert.ok(errors.some(error => error.includes('must have required property')));
});

test('normalization rejects inline Action definitions', () => {
  const scenario = validScenario();
  scenario.scenes.start.routers.main.actions = [{ meta: { title: 'Inline' }, set: { display: 'show' } }];
  assert.throws(() => normalizeScenario(scenario), /inline Action definitions are not supported/);
});

test('semantic validation rejects missing scene parents and global action references', () => {
  const scenario = validScenario();
  scenario.scenes.start.meta.parentScene = 'missing';
  scenario.scenes.start.routers.main.actions = ['missing_action'];
  const errors = validateScenario(scenario);
  assert.ok(errors.some(error => error.includes('meta.parentScene: references missing scene')));
  assert.ok(errors.some(error => error.includes("references missing global action 'missing_action'")));
});

test('invalid and unresolved requirements fail closed', () => {
  const engine = Object.assign({}, LogicSystem, { src: { templates: { requirements: {} } } });
  assert.equal(engine.checkReq({ logic: 'OR', check: [] }).pass, false);
  assert.equal(engine.checkReq({ ref: 'missing' }).pass, false);
  assert.equal(engine.checkReq(null).pass, false);
  assert.equal(engine.checkReq(false).pass, false);
  assert.equal(engine.checkReq({ check: [{ type: 'unknown', subtype: 'x', op: '==', value: 1 }] }).pass, false);
});

test('requirement template references resolve and evaluate against runtime state', () => {
  const engine = Object.assign({}, LogicSystem, {
    src: { templates: { requirements: { allow: { logic: null, check: [
      { type: 'state', property: 'flag', op: '==', value: 7 }
    ] } } } },
    api: { engine: { state: { get: () => 7 } } }
  });
  assert.equal(engine.checkReq({ ref: 'allow' }).pass, true);
});

test('schema requirement operators fail closed for invalid operands and NOT requires one check', () => {
  assert.equal(LogicSystem.compare('not-an-array', '!has', 'value'), false);
  assert.equal(LogicSystem.compare(['a'], '=', 'a'), false);
  const engine = Object.assign({}, LogicSystem, { src: {} });
  assert.equal(engine.checkReq({ logic: 'NOT', check: [
    { type: 'unknown', subtype: 'x', op: '==', value: 1 },
    { type: 'unknown', subtype: 'x', op: '==', value: 1 }
  ] }).pass, false);
});

test('semantic validation rejects empty automation plans', () => {
  const scenario = validScenario();
  scenario.templates.automation = {
    empty: { set: { move: 'step_by_step', moveDirection: 'first', numberCycleAllow: 1, countCurrent: 0, runInfinity: false, banClick: false }, plan: [] }
  };
  assert.ok(validateScenario(scenario).some(error => error.includes('must contain at least one step')));
});

test('scenario cloning rejects cyclic non-JSON input', () => {
  const scenario = validScenario();
  scenario.meta.self = scenario;
  assert.throws(() => normalizeScenario(scenario), ScenarioValidationError);
});

test('a global action cannot be triggered unless the active router references it', async () => {
  const state = {
    get(key) {
      if (key === 'sceneId') return 'start';
      if (key === 'scene.activeRouterId') return 'main';
      return undefined;
    }
  };
  const engine = {
    isActionProcessing: false,
    isTransitioning: false,
    api: { engine: { state } },
    src: {
      scenes: { start: { routers: { main: { actions: [] } } } },
      actions: { hidden: { meta: { title: 'Hidden' }, set: { display: 'show' } } }
    },
    getEffectiveActions: ActionSystem.getEffectiveActions,
    notifyActionFailure() {}
  };
  assert.deepEqual(await ActionSystem.handleAction.call(engine, 'hidden'), { success: false, reason: 'action_not_found' });
});

test('entering a locked scene is rejected by the engine', async () => {
  const engine = {
    api: { engine: { state: { getRuntimeSnapshot: () => ({}) } } },
    checkHardLock: () => true
  };
  assert.deepEqual(await SceneSystem.enterScene.call(engine, 'locked'), {
    success: false, reason: 'target_locked'
  });
});

test('entering a scene containing a Character does not automatically mark them as met', async () => {
  const characters = {
    player: { place: { scene_id: 'start' }, met: [] },
    npc: { place: { scene_id: 'destination' }, met: [], effect: { meeting: { player: [] } } }
  };
  let sceneId = 'start';
  const state = {
    get(path) {
      if (path === 'sceneId') return sceneId;
      if (path === 'entryCharacter') return 'player';
      return undefined;
    },
    set(path, value) {
      if (path === 'sceneId') sceneId = value;
      if (path === 'char.scene_id') characters.player.place.scene_id = value;
    },
    getRuntimeSnapshot(path, params = {}) {
      if (path === 'scenes.[id]') return params.id === 'destination' ? { activeRouterId: 'main' } : undefined;
      if (path === 'faker') return { active: false };
      if (path === 'characters') return characters;
      if (path === 'characters.[id]') return characters[params.id];
      return undefined;
    }
  };
  const engine = {
    api: { engine: { state }, presentation: { components: { updateCharacterList() {} } } },
    src: { scenes: { destination: { routers: { main: {} } } } },
    checkHardLock: () => false,
    enterRouter: async () => {},
    processRunnables: async () => {},
    commitState() {}
  };

  await SceneSystem.enterScene.call(engine, 'destination');
  assert.equal(sceneId, 'destination');
  assert.deepEqual(characters.npc.met, []);
});

test('generated runtime schema stays identical to scenario.schema.json', () => {
  const sourceSchema = JSON.parse(readFileSync(new URL('../scenario.schema.json', import.meta.url), 'utf8'));
  assert.deepEqual(scenarioSchema, sourceSchema);
});

test('random automation stops after its configured number of complete cycles', async () => {
  const runtime = {
    active: true, move: 'random', moveDirection: 'first', stepIndex: -1,
    randomStepCount: 0, countCurrent: 0, banClick: false,
    runInfinity: false, numberCycleAllow: 1
  };
  let stopped = false;
  const access = {
    getRuntime: () => runtime,
    getSource: () => ({ plan: [{ seconds: 1 }] }),
    getSession: () => null,
    get(key) {
      if (key === 'automation.countCurrent') return runtime.countCurrent;
      if (key === 'automation.banClick') return runtime.banClick;
      if (key === 'automation.runInfinity') return runtime.runInfinity;
      if (key === 'automation.numberCycleAllow') return runtime.numberCycleAllow;
      if (key === 'automation.active') return runtime.active;
      return undefined;
    },
    set(key, value) {
      const field = key.split('.').at(-1);
      runtime[field] = value;
    }
  };
  const engine = {
    api: { engine: { state: access } },
    getConfig: () => 1,
    processRunnables: async () => {},
    taskManager: { addNew() {}, operator() {} },
    stopAutomation() { stopped = true; runtime.active = false; }
  };
  await AutomationSystem.processAutomationStep.call(engine, 'random');
  assert.equal(runtime.randomStepCount, 1);
  await AutomationSystem.processAutomationStep.call(engine, 'random');
  assert.equal(runtime.countCurrent, 1);
  assert.equal(stopped, true);
});

test('global state declarations require values that match their declared type', () => {
  const scenario = validScenario();
  scenario.globalStates.flag = { type: 'boolean', value: 1 };
  assert.ok(validateScenario(scenario).length > 0);
});

test('scenario entry scene must be explicit and resolvable', () => {
  const scenario = validScenario();
  delete scenario.meta.entryScene;
  assert.ok(validateScenario(scenario).some(error => error.includes('entryScene')));
  scenario.meta.entryScene = 'missing';
  assert.ok(validateScenario(scenario).some(error => error.includes("must reference an existing scene")));
});

test('router IDs must be globally unique because the loader indexes them globally', () => {
  const scenario = validScenario();
  scenario.scenes.other = {
    meta: { title: 'Other' },
    set: { activeRouterId: 'main' },
    routers: { main: { meta: {}, set: { blocked: false, visited: false, countVisited: 0 }, actions: [] } }
  };
  assert.ok(validateScenario(scenario).some(error => error.includes('router ID is not globally unique')));
});

test('chat entry, choice references, and jumps must resolve within the same chat', () => {
  const scenario = validScenario();
  scenario.chat.talk = {
    meta: { loop: false, entry: 'first' },
    block: { first: { line: [], choice_id: 'missing', choiced: false } },
    choice: {}
  };
  const errors = validateScenario(scenario);
  assert.ok(errors.some(error => error.includes("references missing choice group 'missing'")));
  scenario.chat.talk.block.first.choice_id = null;
  scenario.chat.talk.choice.answer = [{ text: 'Next', jump: 'missing' }];
  assert.ok(validateScenario(scenario).some(error => error.includes("references missing block 'missing'")));
});

test('choice IDs are unique within each chat while separate chats may reuse them', () => {
  const scenario = validScenario();
  const sharedChoices = [
    { id: 'shared_choice', text: 'Continue', jump: 'first' }
  ];
  scenario.chat.first = {
    meta: { loop: false, entry: 'first', to: ['player'] },
    block: { first: { line: [], choice_id: 'answer' } },
    choice: { answer: sharedChoices }
  };
  scenario.chat.second = {
    meta: { loop: false, entry: 'first', to: ['player'] },
    block: { first: { line: [], choice_id: 'answer' } },
    choice: { answer: sharedChoices.map(choice => ({ ...choice })) }
  };

  assert.deepEqual(validateScenario(scenario), []);

  scenario.chat.first.choice.other = [{ id: 'shared_choice', text: 'Duplicate', jump: 'first' }];
  const errors = validateScenario(scenario);
  assert.ok(errors.some(error =>
    error.includes("chat.first.choice.other[0].id") &&
    error.includes("choice ID 'shared_choice' is duplicated within this chat")
  ));
});

test('find-way paths must remain in bounds, begin at start, end at target, and use adjacent cells', () => {
  const scenario = validScenario();
  scenario.passwords.find_way = {
    maze: { desc: 'Maze', area: [3, 3], start: [0, 0], target: [2, 2], street: [[0, 0], [2, 2]] }
  };
  const errors = validateScenario(scenario);
  assert.ok(errors.some(error => error.includes('orthogonally adjacent')));
});

test('requirement checks read global-state IDs from the schema property field', () => {
  let requested;
  const engine = Object.assign({}, LogicSystem, {
    src: {},
    api: { engine: { state: { get: (key, args) => { requested = args.id; return true; } } } }
  });
  const result = engine.checkReq({ logic: 'AND', check: [
    { type: 'state', property: 'alarm', op: '==', value: true }
  ] });
  assert.equal(requested, 'alarm');
  assert.equal(result.pass, true);
});

test('unsupported runnable types fail instead of being silently ignored', async () => {
  const engine = Object.assign({}, EffectSystem, {
    src: { templates: { effects: {} } },
    api: { engine: { state: { getRuntimeSnapshot: () => ({}) } } }
  });
  await assert.rejects(() => engine.processRunnable({ type: 'automation' }), /Unsupported runnable wrapper type/);
});

test('effect wrappers reject unresolved template references', async () => {
  const engine = Object.assign({}, EffectSystem, {
    src: { templates: { effects: {} } },
    api: { engine: { state: { getRuntimeSnapshot: () => ({}) } } }
  });
  await assert.rejects(() => engine.processRunnable({ type: 'effect', ref: 'missing' }), /Unknown effect template reference/);
});

test('normalization applies schema defaults before runtime use', () => {
  const normalized = normalizeScenario(validScenario());
  assert.equal(normalized.formatVersion, 1);
  assert.equal(normalized.meta.entryCharacter, 'player');
  assert.deepEqual(normalized.config.maxInventory, []);
  assert.equal(normalized.scenes.start.set.blocked, false);
  assert.equal(normalized.scenes.start.routers.main.set.blocked, false);
  assert.equal(normalized.scenes.start.routers.main.actions[0], 'test_action');
  assert.deepEqual(normalized.actions.test_action.count, { normal: 0, pass: 0, fail: 0, pwFailed: 0 });
});

test('loader keeps the normalized scenario separate from runtime-only indexes', () => {
  const loaded = LoaderSystem.loadScript(validScenario(), {});
  assert.equal(loaded.scenario.formatVersion, 1);
  assert.equal(loaded.scenario.meta.entryCharacter, 'player');
  assert.equal(Object.hasOwn(loaded.scenario, 'path'), false);
  assert.equal(Object.hasOwn(loaded.src, 'path'), true);
});

test('nested effect templates are valid runnable graphs and resolve their references', () => {
  const scenario = validScenario();
  scenario.templates.effects = {};
  scenario.templates.effects.base = [{ type: 'notify', text: 'Nested template' }];
  scenario.templates.effects.outer = [{ type: 'effect', ref: 'base' }];
  assert.deepEqual(validateScenario(scenario), []);
  scenario.templates.effects.outer[0].ref = 'missing';
  assert.ok(validateScenario(scenario).some(error => error.includes("references missing effect template 'missing'")));
  scenario.templates.effects.outer[0].ref = 'base';
  scenario.templates.effects.base[0] = { type: 'effect', ref: 'outer' };
  assert.ok(validateScenario(scenario).some(error => error.includes('recursive effect-template cycle')));
});

test('management effects validate their target namespace', () => {
  const scenario = validScenario();
  scenario.actions.test_action.effect = {
    normal: [{
      type: 'manage_effect',
      inline: { space: 'router', in: 'enter', subtype: 'locked', target: 'missing_router', index: [0] }
    }]
  };
  assert.ok(validateScenario(scenario).some(error => error.includes("references missing router target 'missing_router'")));
});

test('malformed collection shapes produce validation errors instead of crashing the validator', () => {
  const scenario = validScenario();
  scenario.characters.broken = { moveList: 7, inventory: 9, hand: null };
  scenario.chat.broken = { meta: { loop: false, entry: 'missing', to: 'not-an-array' }, block: {}, choice: {} };
  scenario.passwords.find_way = { broken: { desc: 'Broken', area: 3, start: null, target: null, street: [null] } };
  assert.doesNotThrow(() => validateScenario(scenario));
  assert.ok(validateScenario(scenario).length > 0);
});

test('scenario format version is explicit and must match the current contract', () => {
  const missingVersion = validScenario();
  delete missingVersion.formatVersion;
  assert.ok(validateScenario(missingVersion).some(error => error.includes('formatVersion')));

  for (const version of [0, 2]) {
    const scenario = validScenario();
    scenario.formatVersion = version;
    assert.ok(validateScenario(scenario).some(error => error.includes('must be equal to constant')));
    assert.throws(() => normalizeScenario(scenario), ScenarioValidationError);
  }
});

test('router actions accept only the canonical array representation', () => {
  const objectMap = validScenario();
  objectMap.scenes.start.routers.main.actions = {
    legacy: { meta: { title: 'Legacy' }, set: { display: 'show' } }
  };
  assert.ok(validateScenario(objectMap).length > 0);
  assert.throws(() => normalizeScenario(objectMap), ScenarioValidationError);

  const imported = validScenario();
  imported.scenes.start.routers.main.importAction = [{ of: 'main' }];
  assert.ok(validateScenario(imported).length > 0);
  assert.throws(() => normalizeScenario(imported), ScenarioValidationError);
});

test('character source must be provided as a separate field, not encoded in target', () => {
  const scenario = validScenario();
  scenario.characters = { source: {}, destination: {} };
  scenario.actions.test_action.effect = {
    normal: [{
      type: 'characters', subtype: 'mng_stats', exec: 'swap',
      target: 'destination:source'
    }]
  };
  assert.ok(validateScenario(scenario).some(error => error.includes('separate source field')));
});

test('schema-defined notify.toast is dispatched to the toast notification API', () => {
  const calls = [];
  const engine = {
    api: {
      notifications: {
        add: (...args) => calls.push({ kind: 'toast', args }),
        alert: (...args) => calls.push({ kind: 'modal', args })
      }
    }
  };

  EffectHandlers.notify.call(engine, {
    type: 'notify', subtype: 'toast', title: 'Toast', text: 'Message', level: 'success'
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].kind, 'toast');
  assert.deepEqual(calls[0].args.slice(0, 3), ['Toast', 'Message', 'success']);
});

test('runtime rejects notify subtypes that are not declared by the schema', () => {
  const engine = { api: { notifications: { add() {}, alert() {} } } };
  assert.throws(
    () => EffectHandlers.notify.call(engine, { type: 'notify', subtype: 'unknown', text: 'Message' }),
    /Unsupported notify subtype/
  );
});

test('runtime rejects characters.mng_stats operations outside the schema enum', async () => {
  await assert.rejects(
    () => EffectHandlers.characters.call({}, {
      type: 'characters', subtype: 'mng_stats', exec: 'add_stats', target: 'player', value: 'HP'
    }),
    /Unsupported characters.mng_stats operation/
  );
});

test('scenario schema rejects characters.mng_stats operations outside its contract', () => {
  const scenario = validScenario();
  scenario.actions.test_action.effect = {
    normal: [{
      type: 'characters', subtype: 'mng_stats', exec: 'add_stats',
      target: 'player', value: 'HP'
    }]
  };
  assert.ok(validateScenario(scenario).length > 0);
});

test('requirements require the canonical logic field and object references', () => {
  const engine = Object.assign({}, LogicSystem, {
    src: {
      templates: {
        requirements: { canonical: { logic: null, check: [
          { type: 'state', property: 'flag', op: '==', value: true }
        ] } },
        requirement: { legacy: { logic: null, check: [
          { type: 'state', property: 'flag', op: '==', value: true }
        ] } }
      }
    },
    api: { engine: { state: { get: () => true } } }
  });

  assert.equal(engine.checkReq({ ref: 'canonical' }).pass, true);
  assert.equal(engine.checkReq('canonical').pass, false);
  assert.equal(engine.checkReq({ ref: 'legacy' }).pass, false);
  assert.equal(engine.checkReq({ check: [
    { type: 'state', property: 'flag', op: '==', value: true }
  ] }).pass, false);
  assert.equal(engine.checkSingle(null).pass, false);
});

test('runtime rejects stat field and mode combinations excluded by the schema', () => {
  const target = { stats: { HP: { current: 5, max: 10 } } };
  const changed = StatsHelpers.edit_value(target, {
    property: 'HP', field: 'max', mode: 'full', value: 3
  }, false, 'item', {});
  assert.equal(changed, false);
  assert.equal(target.stats.HP.max, 10);
  assert.equal(StatsHelpers.edit_value(target, {
    property: 'HP', field: 'current', mode: 'unknown', value: 3
  }, false, 'item', {}), false);
});

test('character and management effect dispatchers await asynchronous handlers', async () => {
  let characterCompleted = false;
  const engine = {
    async handleManageEffect() {
      await Promise.resolve();
      characterCompleted = true;
    }
  };

  const manageResult = await EffectHandlers.manage_effect.call(engine, {
    inline: { space: 'router', in: 'enter', subtype: 'locked', target: 'main', index: [0] }
  });
  assert.equal(manageResult, undefined);
  assert.equal(characterCompleted, true);

  const originalCharacterHandler = CharacterStrategies.mng_items;
  CharacterStrategies.mng_items = async () => {
    await Promise.resolve();
    characterCompleted = true;
  };
  try {
    characterCompleted = false;
    await EffectHandlers.characters.call({}, { subtype: 'mng_items' });
    assert.equal(characterCompleted, true);
  } finally {
    CharacterStrategies.mng_items = originalCharacterHandler;
  }
});

test('skip_all evaluates its requirement before stopping the runnable list', async () => {
  const notices = [];
  const engine = Object.assign({}, EffectSystem, {
    checkReq: req => ({ pass: req.check[0].value === true }),
    api: {
      engine: { state: { getRuntimeSnapshot: () => ({}) } },
      notifications: { add: (...args) => notices.push(args) }
    }
  });

  const makeList = gate => [
    {
      type: 'skip_all',
      req: { logic: null, check: [
        { type: 'state', property: 'continue', op: '==', value: gate }
      ] }
    },
    { type: 'notify', subtype: 'toast', text: 'Reached next step' }
  ];

  await engine.processRunnables(makeList(false), {}, false, true);
  assert.equal(notices.length, 1);

  notices.length = 0;
  await engine.processRunnables(makeList(true), {}, false, true);
  assert.equal(notices.length, 0);
});

test('item stat requirements resolve IDs through safe state-path placeholders', () => {
  let requested;
  const engine = Object.assign({}, LogicSystem, {
    src: {},
    api: {
      engine: {
        state: {
          get: (path, params) => {
            requested = { path, params };
            return 9;
          }
        }
      }
    }
  });
  const result = engine.checkReq({ logic: null, check: [{
    type: 'stats', subtype: 'item', target: 'item.with.dot',
    property: 'damage.value', field: 'max', op: '==', value: 9
  }] });

  assert.equal(result.pass, true);
  assert.deepEqual(requested, {
    path: 'itemInfo.[id].stats.[statId].max',
    params: { id: 'item.with.dot', statId: 'damage.value' }
  });
});

test('characters.moving.replace supports every schema-valid index in an index array', () => {
  const character = {
    moveList: [
      { scene_id: 'old_a' },
      { scene_id: 'old_b' }
    ],
    place: { scene_id: 'current', currentIndex: 0 }
  };
  const engine = {
    redirectTarget: value => value,
    api: {
      engine: {
        state: {
          getRuntime: () => character,
          set() {}
        }
      }
    },
    taskManager: { kill() {} },
    validateMoveState: () => false
  };

  CharacterStrategies.moving(engine, {
    target: 'character', exec: 'replace', property: 'moveList',
    value: { scene_id: 'new_route' }, index: [0, 1]
  });

  assert.deepEqual(character.moveList, [
    { scene_id: 'new_route' },
    { scene_id: 'new_route' }
  ]);
});

test('inline character effects enforce the same subtype contract as runnable wrappers', () => {
  const scenario = validScenario();
  scenario.actions.test_action.effect = {
    normal: [
      {
        type: 'effect',
        inline: {
          type: 'characters', subtype: 'mng_items', target: 'character'
        }
      },
      {
        type: 'effect',
        inline: {
          type: 'characters', subtype: 'moving', target: 'character',
          exec: 'teleport', property: 'moveList', value: {}
        }
      }
    ]
  };
  const errors = validateScenario(scenario);
  assert.ok(errors.length > 0);
});

test('CMS implements schema-defined collection set and met insert operations', async () => {
  const store = {
    characters: {
      character: {
        relationship: [['old', 'friend']],
        met: ['first:2', 'last:1']
      }
    },
    routers: {
      scene_main: { actions: ['old_action'] }
    }
  };
  const state = {
    async transaction(callback) {
      return callback({
        get(path, params = {}) {
          if (path === 'characters.[id]') return store.characters[params.id];
          if (path === 'routers.[routerKey]') return store.routers[params.routerKey];
          if (path === 'sceneId') return 'scene';
          return undefined;
        },
        set(path, value, params = {}) {
          if (path === 'characters.[id]') store.characters[params.id] = value;
          if (path === 'routers.[routerKey]') store.routers[params.routerKey] = value;
        }
      });
    }
  };
  const engine = { api: { engine: { state } } };

  await EffectHandlers.cms.call(engine, {
    table: 'characters', id: 'character', column: 'relationship',
    method: 'set', value: [['new', 'ally']]
  });
  assert.deepEqual(store.characters.character.relationship, [['new', 'ally']]);

  await EffectHandlers.cms.call(engine, {
    table: 'characters', id: 'character', column: 'met',
    method: 'insert', value: 'middle:3', index: 1
  });
  assert.deepEqual(store.characters.character.met, ['first:2', 'middle:3', 'last:1']);

  await EffectHandlers.cms.call(engine, {
    table: 'routers', id: 'main', column: 'actions',
    method: 'set', value: ['inspect', 'talk']
  });
  assert.deepEqual(store.routers.scene_main.actions, ['inspect', 'talk']);
});

test('CMS schema constrains met insert indexes to a single integer', () => {
  const scenario = validScenario();
  scenario.actions.test_action.effect = {
    normal: [{
      type: 'cms', table: 'characters', id: 'character', column: 'met',
      method: 'insert', value: 'character:1', index: [0, 1]
    }]
  };
  assert.ok(validateScenario(scenario).length > 0);
});

test('manage_effect schema limits router, item, and chat hooks to runtime-supported forms', () => {
  const makeScenario = inline => {
    const scenario = validScenario();
    scenario.actions.test_action.effect = {
      normal: [{ type: 'manage_effect', inline }]
    };
    return scenario;
  };

  assert.ok(validateScenario(makeScenario({
    space: 'router', in: 'unknown_hook', subtype: 'locked',
    target: 'main', index: [0]
  })).length > 0);

  assert.ok(validateScenario(makeScenario({
    space: 'item', in: 'craft', subtype: 'locked',
    target: 'unknown_item', index: [0]
  })).length > 0);

  assert.ok(validateScenario(makeScenario({
    space: 'chat', in: 'block_without_choice', subtype: 'locked',
    target: 'unknown_chat', index: [0]
  })).length > 0);
});

test('set.state preserves the declared global-state type and numeric delta semantics', () => {
  const writes = [];
  const declarations = {
    coins: { type: 'number', value: 10 },
    alarm: { type: 'boolean', value: false },
    note: { type: 'string', value: 'old' }
  };
  const engine = {
    api: {
      engine: {
        state: {
          get(path, { id }) {
            if (path === 'globalState.type') return declarations[id]?.type;
            if (path === 'globalState.value') return declarations[id]?.value;
            return undefined;
          },
          set(path, value, { id }) {
            writes.push({ path, id, value });
            declarations[id].value = value;
          }
        }
      }
    }
  };

  SetStrategies.state(engine, { target: 'coins', value: 2 });
  SetStrategies.state(engine, { target: 'alarm', value: true });
  SetStrategies.state(engine, { target: 'note', value: 'new' });
  assert.deepEqual(writes.map(item => item.value), [12, true, 'new']);

  assert.throws(
    () => SetStrategies.state(engine, { target: 'coins', value: 'not-a-number' }),
    /finite numeric delta/
  );
  assert.equal(declarations.coins.value, 12);
});

test('CharacterStrategies.mng_stats adds a stat through the shared stat helper', () => {
  const character = { set: { name: 'Character' }, stats: {} };
  let persisted;
  const state = {
    getRuntime(path) {
      if (path === 'meta.entryCharacter') return 'player';
      if (path === 'characters.[id]') return character;
      return undefined;
    },
    set(path, value, params) {
      persisted = { path, value, params };
    }
  };
  const engine = {
    redirectTarget: value => value,
    api: {
      engine: { state },
      notifications: { add() {} },
      presentation: { components: { updatePlayerCard() {} }, updateContactDetails() {} }
    }
  };

  CharacterStrategies.mng_stats(engine, {
    exec: 'add', target: 'character', property: 'strength', value: '25:50:Strength:#ff5555'
  });

  assert.deepEqual(character.stats.strength, {
    current: 25, max: 50, label: 'Strength', color: '#ff5555', unknown: false
  });
  assert.equal(persisted.path, 'characters.[id]');
  assert.equal(persisted.params.id, 'character');
});

test('action snapshot projection exposes stable identity and engine-evaluated availability', async () => {
  const scenario = validScenario();
  scenario.actions.readable = { meta: { title: 'Read first', desc: 'Details' }, set: { display: 'show', readDesc: true } };
  scenario.actions.locked = { meta: { title: 'Locked' }, set: { display: 'show' } };
  scenario.actions.hidden = { meta: { title: 'Hidden' }, set: { display: 'hide' } };
  scenario.scenes.start.routers.main.actions = ['readable', 'locked', 'hidden'];
  const engine = new GameEngine();
  try {
    await engine.init(scenario);
    engine.api.engine.state.update('actions.[id]', current => ({ ...(current || {}), display: 'locked' }), { id: 'locked' });
    engine.api.engine.state.update('actions.[id]', current => ({ ...(current || {}), readDesc: false }), { id: 'readable' });
    let snapshot = engine.protocol.createSnapshot(engine);
    const actions = snapshot.presentation.actions;
    assert.deepEqual(actions.map(action => action.id), ['readable', 'locked']);
    assert.equal(actions[0].key, 'start_main_readable');
    assert.equal(actions[0].presentation.readRequired, true);
    assert.equal(actions[0].presentation.read, false);
    assert.equal(actions[0].availability.reason, 'not_read');
    assert.equal(actions[0].availability.canTrigger, false);
    assert.deepEqual(actions[0].availability.checks, {
      permission: 'passed',
      requirement: 'not_required'
    });
    assert.equal(actions[1].presentation.display, 'locked');
    assert.equal(actions[1].availability.reason, 'locked');

    engine.markAsRead('start_main_readable');
    snapshot = engine.protocol.createSnapshot(engine);
    assert.equal(snapshot.presentation.actions[0].presentation.read, true);
    assert.equal(snapshot.presentation.actions[0].availability.reason, 'available');

    assert.deepEqual(await engine.handleAction('locked', 'start_main_locked'), {
      success: false, reason: 'locked'
    });
  } finally {
    engine.dispose();
  }
});

test('snapshot projection does not evaluate random requirement expressions', () => {
  let evaluations = 0;
  const action = {
    id: 'random_requirement',
    set: { display: 'show', requirement: true },
    requirement: {
      logic: null,
      check: [{ type: 'state', property: 'roll', op: '==', value: '$rdnumber(1, 6)' }]
    },
    meta: { title: 'Random requirement' }
  };
  const engine = {
    state: {
      sceneId: 'start',
      scenes: { start: { activeRouterId: 'main' } },
      actions: {},
      entryCharacter: 'player',
      faker: { active: false },
      session: {}
    },
    src: { scenes: { start: { routers: { main: {} } } } },
    getEffectiveActions: () => [action],
    getConfig: () => false,
    checkReq: () => { evaluations++; return { pass: true }; }
  };
  const snapshot = new JsonProtocol().createSnapshot(engine);
  const projection = snapshot.presentation.actions[0];

  assert.equal(evaluations, 0);
  assert.equal(projection.availability.reason, 'available');
  assert.equal(projection.availability.canTrigger, true);
  assert.equal(projection.availability.checks.requirement, 'not_evaluated');
});

test('random requirements remain triggerable and are evaluated only at execution time', () => {
  const requirement = {
    logic: null,
    check: [{ type: 'state', property: 'roll', op: '==', value: '$rdnumber(1, 6)' }]
  };
  const action = {
    id: 'random_requirement',
    set: { display: 'show', requirement: true },
    requirement,
    meta: { title: 'Random requirement' }
  };
  let randomCalls = 0;
  const originalRandom = Math.random;
  const protocol = new JsonProtocol();
  const engine = Object.assign({}, LogicSystem, {
    state: {
      sceneId: 'start',
      scenes: { start: { activeRouterId: 'main' } },
      actions: {},
      entryCharacter: 'player',
      faker: { active: false },
      session: {}
    },
    src: { scenes: { start: { routers: { main: {} } } } },
    getEffectiveActions: () => [action],
    getConfig: () => false,
    api: { engine: { state: { get: () => 99 } } }
  });
  Math.random = () => { randomCalls++; return 0; };
  try {
    const projection = protocol.createSnapshot(engine).presentation.actions[0];
    assert.equal(projection.availability.reason, 'available');
    assert.equal(projection.availability.canTrigger, true);
    assert.equal(projection.availability.checks.requirement, 'not_evaluated');
    assert.equal(randomCalls, 0);

    const evaluated = engine.checkReq(requirement);
    assert.equal(evaluated.pass, false);
    assert.equal(randomCalls, 1);
  } finally {
    Math.random = originalRandom;
  }
});

test('cooldown is enforced before action counters and normal effects are mutated', async () => {
  const scenario = validScenario();
  scenario.actions.cooldown_action = {
    meta: { title: 'Cooldown action' },
    set: { display: 'show', cooldown: 60 },
    effect: { normal: [{ type: 'notify', text: 'must-not-run' }] }
  };
  scenario.scenes.start.routers.main.actions = ['cooldown_action'];
  const engine = new GameEngine();
  try {
    await engine.init(scenario);
    const key = 'cooldown_action';
    engine.api.engine.state.update('actions.[id]', current => ({
      ...(current || {}), count: { normal: 4, pass: 0, fail: 0 }, cooldownEnd: Date.now() + 60000
    }), { id: key });
    const result = await engine.handleAction('cooldown_action', key);
    const runtime = engine.api.engine.state.getRuntimeSnapshot('actions.[id]', { id: key });
    assert.equal(result.reason, 'cooldown');
    assert.equal(runtime.count.normal, 4);
    assert.equal(engine.notifications.getPending().some(item => item.message === 'must-not-run'), false);
  } finally {
    engine.dispose();
  }
});

test('mark-as-read only mutates actions in the active router', async () => {
  const scenario = validScenario();
  scenario.actions.readable = { meta: { title: 'Readable', desc: 'Read me' }, set: { display: 'show', readDesc: true } };
  scenario.scenes.start.routers.main.actions = ['readable'];
  const engine = new GameEngine();
  try {
    await engine.init(scenario);
    assert.deepEqual(engine.markAsRead('forged_action_key'), { success: false, reason: 'action_not_found' });
    assert.equal(engine.markAsRead('start_main_readable').success, true);
    assert.equal(engine.api.engine.state.getRuntimeSnapshot('actions.[id]', { id: 'readable' }).readDesc, true);
  } finally {
    engine.dispose();
  }
});

test('runtime Action requirement overrides are projected into subsequent effective Action definitions', () => {
  const runtime = { requirement: true, count: { normal: 1, pass: 1, fail: 0, pwFailed: 0 } };
  const engine = {
    src: {
      scenes: { start: { routers: { main: { actions: ['notice'] } } } },
      actions: { notice: { meta: { title: 'Notice' }, set: { display: 'show', requirement: false } } }
    },
    api: {
      engine: {
        state: {
          getRuntimeSnapshot(path, params) {
            assert.equal(path, 'actions.[id]');
            assert.equal(params.id, 'notice');
            return runtime;
          }
        }
      }
    }
  };

  const enabled = ActionSystem.getEffectiveActions.call(engine, 'start', 'main')[0];
  assert.equal(enabled.set.requirement, true);
  assert.deepEqual(enabled.count, { normal: 1, pass: 1, fail: 0, pwFailed: 0 });

  runtime.requirement = false;
  const disabled = ActionSystem.getEffectiveActions.call(engine, 'start', 'main')[0];
  assert.equal(disabled.set.requirement, false);

  delete runtime.requirement;
  const sourceDefault = ActionSystem.getEffectiveActions.call(engine, 'start', 'main')[0];
  assert.equal(sourceDefault.set.requirement, false);
});

test('set.action dispatches through the wired strategy and updates runtime action state', () => {
  const action = { display: 'show' };
  const writes = [];
  const state = {
    sceneId: 'start',
    get(key) {
      if (key === 'scene.activeRouterId') return 'main';
      return undefined;
    },
    getRuntime(path, context) {
      if (path === 'actions.[id]') return context.id === 'action_read_notice' ? action : undefined;
      return undefined;
    },
    getSession() { return null; },
    set(path, value, context) {
      writes.push({ path, value, context });
      if (path === 'actions.[id].[property]' && context.id === 'action_read_notice') {
        action[context.property] = value;
      }
    }
  };
  const engine = { src: { actions: { action_read_notice: {} } }, api: { engine: { state } } };

  assert.doesNotThrow(() => EffectHandlers.set.call(engine, {
    type: 'set', subtype: 'action', target: 'action_read_notice',
    property: 'display', value: 'hide'
  }));

  assert.equal(action.display, 'hide');
  assert.equal(writes.length, 1);
  assert.equal(writes[0].path, 'actions.[id].[property]');
});

test('set dispatcher rejects unknown subtypes explicitly', () => {
  assert.throws(
    () => EffectHandlers.set.call({}, { type: 'set', subtype: 'not_supported' }),
    /Unsupported set subtype: not_supported/
  );
});

test('item hide only occurs after a successful item operation in action context', () => {
  const action = { display: 'show' };
  const inventory = [];
  const hand = [];
  const itemInfo = {
    valid: { usage: { current: 1, max: 3 } },
    no_usage: {}
  };
  const state = {
    getRuntimeSnapshot(path, params = {}) {
      if (path === 'actions.[id]') return params.id === 'action' ? action : undefined;
      if (path === 'characters.[id]') return { inventory, hand };
      if (path === 'itemInfo.[id]') return itemInfo[params.id];
      return undefined;
    },
    update(path, updater) {
      if (path === 'characters.[id].inventory') inventory.splice(0, inventory.length, ...updater(inventory));
      if (path === 'characters.[id].hand') hand.splice(0, hand.length, ...updater(hand));
      if (path === 'actions.[id].display') action.display = updater(action.display);
    },
    set(path, value, params) {
      if (path === 'itemInfo.[id]') itemInfo[params.id] = value;
    },
    getRuntime(path) {
      if (path === 'meta.entryCharacter') return 'player';
      return undefined;
    }
  };
  const engine = {
    api: {
      engine: { state },
      notifications: { add() {} },
      presentation: { components: { explorer() {} } }
    },
    addItem(id) {
      if (inventory.includes(id)) return false;
      inventory.push(id);
      return true;
    },
    getOwnerId: () => 'player',
    getConfig: () => 1
  };
  const context = { sceneId: 'scene', routerId: 'router', actionId: 'action' };

  ItemStrategies.add(engine, { target: 'valid', hide: true }, context);
  assert.equal(action.display, 'hide');

  action.display = 'show';
  ItemStrategies.add(engine, { target: 'valid', hide: true }, context);
  assert.equal(action.display, 'show');

  ItemStrategies.hand_on(engine, { target: 'absent', hide: true }, context);
  assert.equal(action.display, 'show');

  inventory.push('valid');
  ItemStrategies.hand_on(engine, { target: 'valid', hide: true }, context);
  assert.equal(action.display, 'hide');

  action.display = 'show';
  ItemStrategies.usage(engine, { target: 'no_usage', value: 1, hide: true }, context);
  assert.equal(action.display, 'show');

  ItemStrategies.usage(engine, { target: 'valid', value: -1, hide: true }, context);
  assert.equal(action.display, 'hide');
});

test('item hide is ignored outside action context', () => {
  const action = { display: 'show' };
  const inventory = [];
  const state = {
    getRuntimeSnapshot(path, params = {}) {
      if (path === 'actions.[id]') return action;
      if (path === 'characters.[id]') return { inventory, hand: [] };
      return undefined;
    },
    update(path, updater) {
      if (path === 'characters.[id].inventory') inventory.splice(0, inventory.length, ...updater(inventory));
    }
  };
  const engine = {
    api: {
      engine: { state },
      notifications: { add() {} },
      presentation: { components: { explorer() {} } }
    },
    addItem(id) { inventory.push(id); return true; },
    getOwnerId: () => 'player'
  };

  ItemStrategies.add(engine, { target: 'item', hide: true }, { itemId: 'item', hook: 'use' });
  assert.equal(action.display, 'show');
});

test('Player Entry exposes current controlled identity across save restoration', async () => {
  const scenario = validScenario();
  scenario.meta.entryCharacter = 'hero';
  scenario.characters.hero = {
    meta: { name: 'Hero', desc: 'Initial protagonist.', avatar: 'https://example.test/hero.png' },
    set: { linkEffect: false, alert: null, moving: false, move: null },
    stats: { hp: { current: 75, max: 100, label: 'HP' } },
    inventory: [],
    relationship: [['ally', 'character']]
  };
  scenario.characters.character = {
    meta: { name: 'Character', desc: 'Current controlled character.' },
    set: { linkEffect: false, alert: null, moving: false, move: null },
    stats: { hp: { current: 30, max: 40, label: 'HP' } },
    inventory: []
  };

  const engine = new GameEngine();
  try {
    await engine.init(scenario);
    assert.equal(engine.state.originalEntryCharacter, 'hero');
    assert.equal(engine.state.entryCharacter, 'hero');

    const initial = engine.protocol.createSnapshot(engine);
    assert.equal(initial.presentation.player.id, 'hero');
    assert.equal(initial.presentation.player.name, 'Hero');
    assert.equal(initial.presentation.player.stats.hp.current, 75);
    assert.equal(initial.presentation.player.relationship[0].characterName, 'Character');
    assert.equal(initial.presentation.player.identityMode, null);

    engine.api.engine.state.set('entryCharacter', 'character');
    assert.equal(engine.api.engine.state.get('entryCharacter'), 'character');
    assert.equal(engine.api.engine.state.get('scenarioEntryCharacter'), 'hero');
    const changed = engine.protocol.createSnapshot(engine);
    assert.equal(changed.presentation.player.id, 'character');
    assert.equal(changed.presentation.player.name, 'Character');
    assert.equal(changed.presentation.player.stats.hp.current, 30);

    engine.api.engine.state.set('faker', { active: true, targetId: 'hero', mode: 'soul', backupPlayer: { entryCharacter: 'character' } });
    const fakerSnapshot = engine.protocol.createSnapshot(engine);
    assert.equal(fakerSnapshot.presentation.player.id, 'character');
    assert.equal(fakerSnapshot.presentation.player.name, 'Character');
    assert.equal(fakerSnapshot.presentation.player.identityTarget.id, 'hero');
    assert.equal(fakerSnapshot.presentation.player.identityMode, 'soul');

    const save = engine.exportSave();
    const restored = new GameEngine();
    try {
      await restored.restoreSave(save);
      assert.equal(restored.state.originalEntryCharacter, 'hero');
      assert.equal(restored.state.entryCharacter, 'character');
      const restoredSnapshot = restored.protocol.createSnapshot(restored);
      assert.equal(restoredSnapshot.presentation.player.id, 'character');
      assert.equal(restoredSnapshot.presentation.player.name, 'Character');
      assert.equal(restoredSnapshot.presentation.player.identityTarget.id, 'hero');
      assert.equal(restoredSnapshot.presentation.player.identityMode, 'soul');
    } finally {
      restored.dispose();
    }
  } finally {
    engine.dispose();
  }
});

test('loader rejects a configured entry character that is absent from scenario characters', () => {
  const scenario = validScenario();
  scenario.meta.entryCharacter = 'missing';
  assert.throws(
    () => LoaderSystem.loadScript(scenario, {}),
    /meta\.entryCharacter.*references missing character 'missing'/
  );
});

test('Contact snapshot projects only characters met by the current Player Entry', async () => {
  const scenario = validScenario();
  scenario.meta.entryCharacter = 'hero';
  scenario.actions.test_action.set.charAllow = ['ally'];
  const characterSet = { moving: false, alert: null, move: null, linkEffect: false };
  scenario.scenes.elsewhere = {
    meta: { title: 'Elsewhere' },
    set: { activeRouterId: 'away' },
    routers: {
      away: {
        meta: { subTitleStatus: 'Away' },
        set: { blocked: false, visited: false, countVisited: 0 },
        actions: []
      }
    }
  };
  scenario.characters = {
    hero: { meta: { name: 'Hero', desc: 'Current identity' }, set: { ...characterSet }, stats: { hp: { current: 8, max: 10, label: 'HP' } }, inventory: [], relationship: [], place: { scene_id: 'start', currentIndex: 0 }, met: ['ally:3'], moveList: [] },
    ally: { meta: { name: 'Ally', desc: 'Known ally' }, set: { ...characterSet }, stats: {}, inventory: [], relationship: [['friend', 'hero']], place: { scene_id: 'start', currentIndex: 0 }, met: ['hero:2'], moveList: [] },
    stranger: { meta: { name: 'Stranger', desc: 'Unknown stranger' }, set: { ...characterSet }, stats: {}, inventory: [], relationship: [], place: { scene_id: 'elsewhere', currentIndex: 0 }, met: [], moveList: [] },
    unseenPresent: { meta: { name: 'Unseen Present', desc: 'Not yet met, but in this scene' }, set: { ...characterSet }, stats: {}, inventory: [], relationship: [], place: { scene_id: 'start', currentIndex: 0 }, met: [], moveList: [] }
  };
  const engine = new GameEngine();
  try {
    await engine.init(scenario);
    const snapshot = engine.protocol.createSnapshot(engine);
    assert.equal(snapshot.presentation.player.id, 'hero');
    assert.equal(snapshot.presentation.player.name, 'Hero');
    assert.deepEqual(snapshot.presentation.contacts.map(contact => contact.id), ['ally']);
    assert.equal(snapshot.presentation.contacts.some(contact => contact.id === 'unseenPresent'), false);
    assert.equal(snapshot.presentation.contacts[0].presence, 'present');
    assert.equal(snapshot.presentation.contacts[0].metCount, 3);
    assert.deepEqual(snapshot.presentation.contacts[0].relationshipWithPlayer, { hasRelationship: true, tag: 'friend' });

    const save = engine.exportSave();
    const restored = new GameEngine();
    try {
      await restored.restoreSave(save);
      const restoredContacts = restored.protocol.createSnapshot(restored).presentation.contacts;
      assert.equal(restoredContacts.find(contact => contact.id === 'ally').metCount, 3);
    } finally {
      restored.dispose();
    }
    engine.api.engine.state.set('faker', { active: true, targetId: 'ally', mode: 'mask', backupPlayer: { entryCharacter: 'hero' } });
    engine.api.engine.state.set('config.fakerMode', 'soul');
    const maskedSnapshot = engine.protocol.createSnapshot(engine);
    assert.equal(maskedSnapshot.presentation.player.id, 'hero');
    assert.equal(maskedSnapshot.presentation.player.name, 'Ally');
    assert.equal(maskedSnapshot.presentation.player.identityMode, 'mask');
    assert.equal(maskedSnapshot.presentation.player.identityTarget.id, 'ally');
    assert.deepEqual(maskedSnapshot.presentation.player.identityContext, {
      mode: 'mask',
      originalIdentity: { id: 'hero', name: 'Hero', avatar: null },
      currentBody: { id: 'hero', name: 'Hero', avatar: null },
      activePersona: { id: 'ally', name: 'Ally', avatar: null },
      statsOwner: { id: 'hero', name: 'Hero', avatar: null },
      relationshipOwner: { id: 'ally', name: 'Ally', avatar: null }
    });
    assert.deepEqual(maskedSnapshot.presentation.player.relationship.map(item => [item.tag, item.characterId]), [['friend', 'hero']]);
    assert.equal(engine.checkReq({
      logic: null,
      check: [{ type: 'relationship', target: 'hero', character: 'hero', op: 'has', value: 'friend' }]
    }).pass, true);

    engine.api.engine.state.set('faker', {
      active: true, targetId: 'ally', mode: 'soul',
      backupPlayer: { characterId: 'hero', entryCharacter: 'hero' }
    });
    const soulSnapshot = engine.protocol.createSnapshot(engine);
    assert.deepEqual(soulSnapshot.presentation.player.identityContext, {
      mode: 'soul',
      originalIdentity: { id: 'hero', name: 'Hero', avatar: null },
      currentBody: { id: 'ally', name: 'Ally', avatar: null },
      activePersona: { id: 'hero', name: 'Hero', avatar: null },
      statsOwner: { id: 'hero', name: 'Hero', avatar: null },
      relationshipOwner: { id: 'hero', name: 'Hero', avatar: null }
    });

    engine.api.engine.state.set('entryCharacter', 'ally');
    engine.api.engine.state.set('faker', {
      active: true, targetId: 'ally', mode: 'swap',
      backupPlayer: { characterId: 'hero', entryCharacter: 'hero' }
    });
    const swapSnapshot = engine.protocol.createSnapshot(engine);
    assert.deepEqual(swapSnapshot.presentation.player.identityContext, {
      mode: 'swap',
      originalIdentity: { id: 'hero', name: 'Hero', avatar: null },
      currentBody: { id: 'ally', name: 'Ally', avatar: null },
      activePersona: { id: 'ally', name: 'Ally', avatar: null },
      statsOwner: { id: 'ally', name: 'Ally', avatar: null },
      relationshipOwner: { id: 'ally', name: 'Ally', avatar: null }
    });
    assert.equal(maskedSnapshot.presentation.actions[0].availability.checks.permission, 'passed');
  } finally {
    engine.dispose();
  }
});

test('relationship requirements match relationship tags and character IDs', () => {
  const characters = {
    player: {
      relationship: [
        ['friend', 'ally'],
        { tag: 'enemy', characterId: 'rival' }
      ]
    },
    ally: { relationship: [] },
    rival: { relationship: [] }
  };
  const engine = Object.assign({}, LogicSystem, {
    src: {},
    redirectTarget: id => id,
    api: {
      engine: {
        state: {
          getRuntime(path, { id }) {
            return path === 'characters.[id]' ? characters[id] : undefined;
          }
        }
      }
    }
  });

  assert.equal(engine.checkReq({
    logic: null,
    check: [{ type: 'relationship', target: 'player', character: 'ally', op: 'has', value: 'friend' }]
  }).pass, true);
  assert.equal(engine.checkReq({
    logic: null,
    check: [{ type: 'relationship', target: 'player', character: 'rival', op: 'has', value: 'enemy' }]
  }).pass, true);
  assert.equal(engine.checkReq({
    logic: null,
    check: [{ type: 'relationship', target: 'player', character: 'ally', op: 'has', value: 'enemy' }]
  }).pass, false);
  assert.equal(engine.checkReq({
    logic: null,
    check: [{ type: 'relationship', target: 'player', character: 'stranger', op: '!has', value: 'friend' }]
  }).pass, true);
});

test('relationship requirements read only the canonical root relationship collection', () => {
  const characters = {
    hero: { relationship: [['ally', 'companion']] },
    companion: {}
  };
  const engine = Object.assign({}, LogicSystem, {
    src: {},
    redirectTarget: id => id,
    api: {
      engine: {
        state: {
          getRuntime(path, { id }) {
            return path === 'characters.[id]' ? characters[id] : undefined;
          }
        }
      }
    }
  });

  assert.equal(engine.checkReq({
    logic: null,
    check: [{ type: 'relationship', target: 'hero', character: 'companion', op: 'has', value: 'ally' }]
  }).pass, true);
});

test('Mask relationship requirements use the borrowed identity without overwriting Player relationships', () => {
  const characters = {
    player: { relationship: [['friend', 'ally']] },
    masked: { relationship: [['enemy', 'rival']] },
    ally: {},
    rival: {}
  };
  const faker = { active: true, mode: 'mask', targetId: 'masked' };
  const state = {
    getRuntime(path) {
      return path === 'entryCharacter' ? 'player' : undefined;
    },
    getRuntimeSnapshot(path) {
      return path === 'faker' ? faker : undefined;
    },
    getRuntime(path, params) {
      if (path === 'entryCharacter') return 'player';
      if (path === 'characters.[id]') return characters[params?.id];
      return undefined;
    }
  };
  const engine = Object.assign({}, LogicSystem, {
    src: {},
    redirectTarget: id => id === 'masked' ? 'player' : id,
    api: { engine: { state } }
  });

  assert.equal(engine.checkReq({
    logic: null,
    check: [{ type: 'relationship', target: 'player', character: 'rival', op: 'has', value: 'enemy' }]
  }).pass, true);
  assert.equal(engine.checkReq({
    logic: null,
    check: [{ type: 'relationship', target: 'masked', character: 'rival', op: 'has', value: 'enemy' }]
  }).pass, true);
  assert.equal(engine.checkReq({
    logic: null,
    check: [{ type: 'relationship', target: 'player', character: 'ally', op: 'has', value: 'friend' }]
  }).pass, false);
  assert.deepEqual(characters.player.relationship, [['friend', 'ally']]);
});

test('requirement failure publishes an unlocked Action snapshot after notify effects', async () => {
  const scenario = validScenario();
  scenario.globalStates.clue_tunnel = { type: 'boolean', value: false };
  scenario.actions.map_check = {
    meta: { title: 'Map overlay' },
    set: { display: 'show', requirement: true },
    requirement: { logic: 'AND', check: [
      { type: 'state', property: 'clue_tunnel', op: '==', value: true }
    ] },
    effect: { fail: [
      { type: 'notify', subtype: 'toast', level: 'warning', text: 'Map clues are incomplete.' }
    ] }
  };
  scenario.scenes.start.routers.main.actions = ['test_action', 'map_check'];
  const engine = new GameEngine();
  const snapshots = [];
  const unsubscribe = engine.protocol.subscribe(event => {
    if (event.event === 'state.snapshot') snapshots.push(event.payload.snapshot);
  });
  try {
    await engine.init(scenario);
    snapshots.length = 0;
    const command = engine.protocol.createCommand(
      'action.trigger',
      { actionId: 'map_check', uniqueId: 'start_main_map_check' },
      { commandId: 'test-map-requirement-fail' }
    );
    const acknowledgement = await engine.dispatchProtocolCommand(command);
    assert.equal(acknowledgement.ok, true);
    assert.equal(acknowledgement.result.reason, 'requirement_failed');
    assert.equal(engine.isActionProcessing, false);
    assert.ok(snapshots.length > 0);
    const latest = snapshots.at(-1);
    assert.equal(latest.presentation.actions.find(action => action.id === 'test_action').availability.reason, 'available');
    assert.notEqual(latest.presentation.actions.find(action => action.id === 'test_action').availability.reason, 'busy');
  } finally {
    unsubscribe();
    engine.dispose();
  }
});

test('LogicSystem evaluates nested requirement groups recursively', () => {
  const fake = {
    src: {},
    checkSingle(check) { return { pass: check.pass === true }; },
    evaluateRequirementNode: LogicSystem.evaluateRequirementNode
  };
  const requirement = {
    logic: 'AND',
    check: [
      { type: 'mock', pass: true },
      { logic: 'OR', check: [
        { type: 'mock', pass: false },
        { logic: 'AND', check: [
          { type: 'mock', pass: true },
          { type: 'mock', pass: true }
        ] }
      ] }
    ]
  };
  assert.deepEqual(LogicSystem.checkReq.call(fake, requirement), { pass: true });
  requirement.check[1].check[1].check[1].pass = false;
  assert.deepEqual(LogicSystem.checkReq.call(fake, requirement), { pass: false });
});

test('LogicSystem preserves single-level requirement behavior', () => {
  const fake = {
    src: {},
    checkSingle(check) { return { pass: check.pass === true }; },
    evaluateRequirementNode: LogicSystem.evaluateRequirementNode
  };
  assert.deepEqual(LogicSystem.checkReq.call(fake, {
    logic: 'OR', check: [{ type: 'mock', pass: false }, { type: 'mock', pass: true }]
  }), { pass: true });
});

