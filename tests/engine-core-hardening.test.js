import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scenarioSchema } from '../engine/scenario/ScenarioSchema.js';
import { validateScenario, normalizeScenario, migrateScenario, ScenarioValidationError } from '../engine/scenario/Scenario.js';
import { LogicSystem } from '../engine/modules/Logic.js';
import { EffectSystem } from '../engine/modules/Effect.js';
import { EffectHandlers, CharacterStrategies, SetStrategies } from '../engine/modules/effect/Strategies.js';
import { StatsHelpers } from '../engine/modules/effect/strategies/Stats.js';
import { LoaderSystem } from '../engine/modules/Loader.js';
import { ActionSystem } from '../engine/modules/Action.js';
import { SceneSystem } from '../engine/modules/Scene.js';
import { AutomationSystem } from '../engine/modules/Automation.js';
import { DEMO_SCRIPT } from '../demo_script.js';

function validScenario() {
  return {
    meta: {
      title: 'Test', desc: 'Test scenario', version: '1.0.0',
      language: 'vi', writer: null, ageRating: '13+', tags: [], entryScene: 'start'
    },
    globalStates: {}, templates: {}, itemInfo: {}, passwords: {},
    scenes: {
      start: {
        meta: { title: 'Start' },
        set: { activeRouterId: 'main' },
        routers: {
          main: {
            meta: {},
            set: { blocked: false, visited: false, countVisited: 0 },
            actions: [{ meta: { title: 'Inline' }, set: { display: 'show' } }]
          }
        }
      }
    },
    actions: {}, chat: {}, characters: {}, endings: {}, config: {}
  };
}

test('scenario validation enforces the complete V9.2 JSON Schema contract', () => {
  const errors = validateScenario({ scenes: {} });
  assert.ok(errors.some(error => error.includes('must have required property')));
});

test('normalization assigns stable IDs to inline actions', () => {
  const first = normalizeScenario(validScenario()).scenes.start.routers.main.actions[0].id;
  const second = normalizeScenario(validScenario()).scenes.start.routers.main.actions[0].id;
  assert.equal(first, 'inline_start_main_0');
  assert.equal(first, second);
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
    getEffectiveActions: ActionSystem.getEffectiveActions
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


test('the canonical demo scenario satisfies the schema and semantic contract', () => {
  assert.deepEqual(validateScenario(DEMO_SCRIPT), []);
  const normalized = normalizeScenario(DEMO_SCRIPT);
  assert.equal(normalized.formatVersion, 1);
  assert.equal(normalized.meta.entryScene, 'scene_garden');
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
  assert.equal(normalized.scenes.start.routers.main.actions[0].id, 'inline_start_main_0');
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
  scenario.scenes.start.routers.main.actions[0].effect = {
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


test('scenario format migration rejects unsupported versions explicitly', () => {
  const oldFormat = validScenario();
  oldFormat.formatVersion = 0;
  assert.throws(() => migrateScenario(oldFormat), /unsupported scenario formatVersion '0'/);
  const futureFormat = validScenario();
  futureFormat.formatVersion = 2;
  assert.throws(() => migrateScenario(futureFormat), /newer than supported version/);
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
  scenario.scenes.start.routers.main.actions[0].effect = {
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
    target: 'npc', exec: 'replace', property: 'moveList',
    value: { scene_id: 'new_route' }, index: [0, 1]
  });

  assert.deepEqual(character.moveList, [
    { scene_id: 'new_route' },
    { scene_id: 'new_route' }
  ]);
});


test('inline character effects enforce the same subtype contract as runnable wrappers', () => {
  const scenario = validScenario();
  scenario.scenes.start.routers.main.actions[0].effect = {
    normal: [
      {
        type: 'effect',
        inline: {
          type: 'characters', subtype: 'mng_items', target: 'npc'
        }
      },
      {
        type: 'effect',
        inline: {
          type: 'characters', subtype: 'moving', target: 'npc',
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
      npc: {
        set: { relationship: [['old', 'friend']] },
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
    table: 'characters', id: 'npc', column: 'relationship',
    method: 'set', value: [['new', 'ally']]
  });
  assert.deepEqual(store.characters.npc.set.relationship, [['new', 'ally']]);

  await EffectHandlers.cms.call(engine, {
    table: 'characters', id: 'npc', column: 'met',
    method: 'insert', value: 'middle:3', index: 1
  });
  assert.deepEqual(store.characters.npc.met, ['first:2', 'middle:3', 'last:1']);

  await EffectHandlers.cms.call(engine, {
    table: 'routers', id: 'main', column: 'actions',
    method: 'set', value: ['inspect', 'talk']
  });
  assert.deepEqual(store.routers.scene_main.actions, ['inspect', 'talk']);
});

test('CMS schema constrains met insert indexes to a single integer', () => {
  const scenario = validScenario();
  scenario.scenes.start.routers.main.actions[0].effect = {
    normal: [{
      type: 'cms', table: 'characters', id: 'npc', column: 'met',
      method: 'insert', value: 'npc:1', index: [0, 1]
    }]
  };
  assert.ok(validateScenario(scenario).length > 0);
});


test('manage_effect schema limits router, item, and chat hooks to runtime-supported forms', () => {
  const makeScenario = inline => {
    const scenario = validScenario();
    scenario.scenes.start.routers.main.actions[0].effect = {
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
  const character = { set: { name: 'NPC' }, stats: {} };
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
    exec: 'add', target: 'npc', property: 'strength', value: '25:50:Strength:#ff5555'
  });

  assert.deepEqual(character.stats.strength, {
    current: 25, max: 50, label: 'Strength', color: '#ff5555'
  });
  assert.equal(persisted.path, 'characters.[id]');
  assert.equal(persisted.params.id, 'npc');
});
