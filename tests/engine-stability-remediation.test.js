import test from 'node:test';
import assert from 'node:assert/strict';
import { ActionSystem } from '../engine/modules/Action.js';
import { SetStrategies } from '../engine/modules/effect/Strategies.js';
import { LogicSystem } from '../engine/modules/Logic.js';
import { SceneSystem } from '../engine/modules/Scene.js';
import { validateScenario } from '../engine/scenario/Scenario.js';
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
  engine.incrementActionCount('scene_router_action', 'normal');
  engine.incrementActionCount('scene_router_action', 'fail');
  engine.incrementActionCount('scene_router_action', 'pass');
  engine.incrementActionCount('scene_router_action', 'pwFailed');
  assert.deepEqual(runtime.count, { normal: 3, pass: 2, fail: 1, pwFailed: 4 });
});

test('set/action and set/action_count resolve Action IDs across every Scene and Router', () => {
  const updates = {};
  const src = { scenes: {
    scene_a: { routers: { router_1: { actions: ['action_01'] } } },
    scene_b: { routers: { router_2: { actions: ['action_01'] } } }
  }};
  const state = {
    getRuntimeSnapshot(path) { return path === 'actions' ? updates : undefined; },
    getRuntime(path, { actionKey } = {}) { return updates[actionKey]; },
    update(path, updater, { id }) { updates[id] = updater(structuredClone(updates[id] || {})); },
    set(path, value, { actionKey, property }) {
      updates[actionKey] = { ...(updates[actionKey] || {}), [property]: value };
    },
    getSession() { return null; },
    setSession() {}
  };
  updates['scene_a_router_1_action_01'] = { count: { normal: 0, pass: 0, fail: 0, pwFailed: 0 } };
  updates['scene_b_router_2_action_01'] = { count: { normal: 0, pass: 0, fail: 0, pwFailed: 0 } };
  const engine = { src, api: { engine: { state } } };

  SetStrategies.action_count(engine, {
    target: 'action_01', phase: 'pass', mode: 'add', value: 1
  });
  assert.equal(updates['scene_a_router_1_action_01'].count.pass, 1);
  assert.equal(updates['scene_b_router_2_action_01'].count.pass, 1);

  SetStrategies.action(engine, {
    target: 'action_01', property: 'display', value: 'hide'
  });
  assert.equal(updates['scene_a_router_1_action_01'].display, 'hide');
  assert.equal(updates['scene_b_router_2_action_01'].display, 'hide');
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
