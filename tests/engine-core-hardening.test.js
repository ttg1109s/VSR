import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scenarioSchema } from '../engine/scenario/ScenarioSchema.js';
import { validateScenario, normalizeScenario, ScenarioValidationError } from '../engine/scenario/Scenario.js';
import { LogicSystem } from '../engine/modules/Logic.js';
import { ActionSystem } from '../engine/modules/Action.js';
import { SceneSystem } from '../engine/modules/Scene.js';

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
  assert.ok(errors.some(error => error.includes('parentScene references missing scene')));
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
      { type: 'state', subtype: 'global', target: 'flag', op: '==', value: 7 }
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
  assert.ok(validateScenario(scenario).some(error => error.includes('plan must contain at least one step')));
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
