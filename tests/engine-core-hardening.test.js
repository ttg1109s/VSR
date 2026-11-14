import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scenarioSchema } from '../engine/scenario/ScenarioSchema.js';
import { validateScenario, normalizeScenario, migrateScenario, ScenarioValidationError } from '../engine/scenario/Scenario.js';
import { LogicSystem } from '../engine/modules/Logic.js';
import { EffectSystem } from '../engine/modules/Effect.js';
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
  assert.equal(engine.checkReq({ check: [{ type: 'unknown', subtype: 'x', op: '==', value: 1 }] }).pass, false);
});

test('requirement template references resolve and evaluate against runtime state', () => {
  const engine = Object.assign({}, LogicSystem, {
    src: { templates: { requirements: { allow: { check: [
      { type: 'state', property: 'flag', op: '==', value: 7 }
    ] } } } },
    api: { engine: { state: { get: () => 7 } } }
  });
  assert.equal(engine.checkReq({ ref: 'allow' }).pass, true);
});

test('not_has rejects non-array values and NOT requirements require exactly one check', () => {
  assert.equal(LogicSystem.compare('not-an-array', 'not_has', 'value'), false);
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
  assert.equal(await ActionSystem.handleAction.call(engine, 'hidden'), undefined);
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
