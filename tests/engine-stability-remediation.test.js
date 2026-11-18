import test from 'node:test';
import assert from 'node:assert/strict';
import { ActionSystem } from '../engine/modules/Action.js';
import { SetStrategies } from '../engine/modules/effect/Strategies.js';
import { LogicSystem } from '../engine/modules/Logic.js';
import { SceneSystem } from '../engine/modules/Scene.js';
import { normalizeScenario, validateScenario } from '../engine/scenario/Scenario.js';
import { scenarioSchema } from '../engine/scenario/ScenarioSchema.js';
import { normalizeSaveEnvelope } from '../engine/persistence/SaveState.js';
import { LocalEngineHost } from '../engine/LocalEngineHost.js';

test('Action exposes runtime-owned normal/pass/fail/pwFailed counters and removes legacy set fields', () => {
  const setProperties = scenarioSchema.definitions.action.properties.set.properties;
  for (const key of ['type', 'target', 'countClicks', 'countFails']) {
    assert.equal(Object.hasOwn(setProperties, key), false);
  }
  assert.equal(scenarioSchema.definitions.action.properties.count.readOnly, true);
  assert.deepEqual(Object.keys(scenarioSchema.definitions.action.properties.count.properties), ['normal', 'pass', 'fail', 'pwFailed']);
});

test('Action phase counters increment independently and preserve existing phases', () => {
  let runtime = { display: 'show', count: { normal: 2, pass: 1, fail: 0, pwFailed: 3 } };
  const state = {
    update(path, updater) {
      assert.equal(path, 'actions.[id]');
      runtime = updater(structuredClone(runtime));
    }
  };
  const engine = Object.assign({}, ActionSystem, { api: { engine: { state } } });
  engine.incrementActionCount('action_01', 'normal');
  engine.incrementActionCount('action_01', 'fail');
  engine.incrementActionCount('action_01', 'pass');
  engine.incrementActionCount('action_01', 'pwFailed');
  assert.deepEqual(runtime.count, { normal: 3, pass: 2, fail: 1, pwFailed: 4 });
});

test('set/action and set/action_count mutate one global Action runtime record', () => {
  const updates = {};
  const src = { actions: { action_01: {} }, scenes: {
    scene_a: { routers: { router_1: { actions: ['action_01'] } } },
    scene_b: { routers: { router_2: { actions: ['action_01'] } } }
  }};
  const state = {
    getRuntimeSnapshot(path) { return path === 'actions' ? updates : undefined; },
    getRuntime(path, { id } = {}) { return updates[id]; },
    update(path, updater, { id }) { updates[id] = updater(structuredClone(updates[id] || {})); },
    set(path, value, { id, property }) {
      updates[id] = { ...(updates[id] || {}), [property]: value };
    },
    getSession() { return null; },
    setSession() {}
  };
  updates.action_01 = { count: { normal: 0, pass: 0, fail: 0, pwFailed: 0 } };
  const engine = { src, api: { engine: { state } } };

  SetStrategies.action_count(engine, {
    target: 'action_01', phase: 'pass', value: 7
  });
  assert.equal(updates.action_01.count.pass, 7);
  assert.equal(Object.keys(updates).length, 1);

  SetStrategies.action(engine, {
    target: 'action_01', property: 'display', value: 'hide'
  });
  assert.equal(updates.action_01.display, 'hide');
});

test('set/action_count assigns a non-negative integer and rejects mode/add semantics', () => {
  for (const definition of ['runnable_wrapper', 'effect_details']) {
    const schemaRule = scenarioSchema.definitions[definition].allOf
      .find(rule => rule.if?.properties?.type?.const === 'set')
      .then.allOf.find(rule => rule.if?.properties?.subtype?.const === 'action_count').then;
    assert.deepEqual(schemaRule.required, ['target', 'phase', 'value']);
    assert.deepEqual(schemaRule.properties.value, { type: 'integer', minimum: 0 });
    assert.equal(Object.hasOwn(schemaRule.properties, 'mode'), false);
    assert.deepEqual(schemaRule.not, { required: ['mode'] });
  }
});

test('scenario normalization initializes counters only on global Actions', () => {
  const host = new LocalEngineHost();
  try {
    const scenario = JSON.parse(host.getDemoScenario());
    const globalId = Object.keys(scenario.actions)[0];
    const sceneId = Object.keys(scenario.scenes)[0];
    const routerId = Object.keys(scenario.scenes[sceneId].routers)[0];
    const router = scenario.scenes[sceneId].routers[routerId];
    router.actions = [globalId];
    delete scenario.actions[globalId].count;
    const normalized = normalizeScenario(scenario);
    assert.deepEqual(normalized.actions[globalId].count, { normal: 0, pass: 0, fail: 0, pwFailed: 0 });
    assert.deepEqual(normalized.scenes[sceneId].routers[routerId].actions, [globalId]);
  } finally {
    host.close();
  }
});

test('Hard Lock ignores non-navigation goto subtypes', () => {
  const engine = Object.assign({}, LogicSystem, {
    src: { path: { routers: {} } },
    api: { engine: { state: { get() { throw new Error('must not read navigation state'); } } } }
  });
  assert.equal(engine.checkHardLock('chat', 'thread_1'), false);
  assert.equal(engine.checkHardLock('end', 'ending_1'), false);
  assert.equal(engine.checkHardLock('in_faker', 'character_1'), false);
});

test('enterScene rejects an invalid active Router before mutating current scene', async () => {
  const writes = [];
  const state = {
    getRuntimeSnapshot(path, { id } = {}) {
      if (path === 'scenes.[id]' && id === 'target') return { activeRouterId: 'missing' };
      return undefined;
    },
    get() { throw new Error('current scene must not be read before target validation'); },
    set(...args) { writes.push(args); }
  };
  const engine = Object.assign({}, SceneSystem, {
    api: { engine: { state } },
    src: { scenes: { target: { routers: {} } } },
    checkHardLock: () => false
  });
  const result = await engine.enterScene('target');
  assert.deepEqual(result, { success: false, reason: 'invalid_target_router' });
  assert.equal(writes.length, 0);
});

test('Save envelope accepts persisted Router timer tasks', () => {
  const save = normalizeSaveEnvelope({
    protocol: 'vsr-save',
    saveVersion: 2,
    scenario: {},
    state: {},
    taskRemainingMs: { timer_end_scene_router: 1250, router_still_scene_router: 500 },
    pausedTasks: ['timer_end_scene_router', 'router_still_scene_router'],
    savedAt: new Date().toISOString()
  });
  assert.equal(save.taskRemainingMs.timer_end_scene_router, 1250);
  assert.deepEqual(save.pausedTasks, ['timer_end_scene_router', 'router_still_scene_router']);
});

test('Scenario validator rejects removed legacy Action fields with a migration diagnostic', () => {
  const host = new LocalEngineHost();
  try {
    const scenario = JSON.parse(host.getDemoScenario());
    scenario.actions.legacy_action = {
      meta: { title: 'Legacy action' },
      set: { display: 'show', type: 'to_scene', target: 'start' }
    };
    const errors = validateScenario(scenario);
    assert.ok(errors.some(error => String(error).includes('removed Action fields')));
  } finally {
    host.close();
  }
});

test('Requirement action_count reads the global Action phase counter', () => {
  const runtime = { action_01: { count: { normal: 3, pass: 5, fail: 1, pwFailed: 0 } } };
  const state = {
    sceneId: 'scene_a',
    get(path, { id } = {}) {
      if (path === 'scene.activeRouterId' && id === 'scene_a') return 'router_1';
      return undefined;
    },
    getRuntime(path, { id } = {}) {
      return path === 'actions.[id]' ? runtime[id] : undefined;
    }
  };
  const engine = Object.assign({}, LogicSystem, { src: { actions: { action_01: {} } }, api: { engine: { state } } });
  const check = (phase, op, value) => engine.checkSingle({
    type: 'action_count', target: 'action_01', phase, op, value
  }).pass;
  assert.equal(check('pass', '>=', 5), true);
  assert.equal(check('pass', '>', 5), false);
  assert.equal(check('normal', '==', 3), true);
  assert.equal(check('fail', '<=', 1), true);
  assert.equal(check('pwFailed', '!=', 0), false);
  assert.equal(check('unknown', '==', 0), false);
  assert.equal(check('pass', '>=', -1), false);
  assert.equal(engine.checkSingle({
    type: 'action_count', target: 'missing_action', phase: 'pass', op: '>=', value: 0
  }).pass, false);
});

test('Requirement schema validates action_count phase and non-negative integer threshold', () => {
  const checkSchema = scenarioSchema.definitions.requirement_check;
  assert.ok(checkSchema.properties.type.enum.includes('action_count'));
  const rule = checkSchema.allOf.find(item => item.if?.properties?.type?.const === 'action_count').then;
  assert.deepEqual(rule.required, ['target', 'phase']);
  assert.deepEqual(rule.properties.op.enum, ['==', '!=', '>', '>=', '<', '<=']);
  assert.deepEqual(rule.properties.value, { type: 'integer', minimum: 0 });
  assert.deepEqual(checkSchema.properties.phase.enum, ['normal', 'pass', 'fail', 'pwFailed']);
});
