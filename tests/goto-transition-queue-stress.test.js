import test from 'node:test';
import assert from 'node:assert/strict';
import { importModules } from './imports/index.js';

const { GameEngine } = (await importModules(['GameEngine'])).GameEngine;
const { EffectSystem } = (await importModules(['EffectSystem'])).EffectSystem;
const { SceneSystem } = (await importModules(['SceneSystem'])).SceneSystem;

function makeNavigationQueueEngine() {
  const engine = new GameEngine();
  engine.api.presentation.navigation.setBlocking = () => {};
  engine.processRunnables = EffectSystem.processRunnables;
  engine.applyEffect = EffectSystem.applyEffect;
  engine.src = { templates: { effects: {} } };
  engine.pauseBackgroundTasks = () => {};
  engine.resumeBackgroundTasks = () => {};
  engine.checkHardLock = () => false;
  engine.runtime = engine.createRuntime?.() || engine.runtime;
  engine._lifecycleGeneration ||= 1;
  engine.runtime.effectQueuesPaused = false;
  engine.runtime.effectQueue ||= { sync: [], async: [] };
  engine.runtime.isSyncQueueRunning = false;
  engine.runtime.isAsyncQueueRunning = false;

  let currentScene = 'S0';
  let currentRouter = 'R0';
  let activeTransitions = 0;
  let maxTransitions = 0;
  let transitionCount = 0;
  const trace = [];
  engine.withNavigationTransition = SceneSystem.withNavigationTransition;
  engine._navigationQueue = Promise.resolve();
  engine._navigationOwner = null;
  engine.runtime = engine.runtime || {};
  engine.enterScene = async (target) => engine.withNavigationTransition(async () => {
    activeTransitions++;
    maxTransitions = Math.max(maxTransitions, activeTransitions);
    await new Promise(resolve => setImmediate(resolve));
    currentScene = target;
    currentRouter = 'R0';
    transitionCount++;
    trace.push(`scene:${target}`);
    activeTransitions--;
    return { success: true };
  });
  engine.enterRouter = async (target) => engine.withNavigationTransition(async () => {
    activeTransitions++;
    maxTransitions = Math.max(maxTransitions, activeTransitions);
    await new Promise(resolve => setImmediate(resolve));
    currentRouter = target;
    transitionCount++;
    trace.push(`router:${currentScene}/${target}`);
    activeTransitions--;
    return { success: true };
  });
  return { engine, trace, get currentScene() { return currentScene; }, get currentRouter() { return currentRouter; }, get transitionCount() { return transitionCount; }, get maxTransitions() { return maxTransitions; } };
}

const gotoScene = target => ({ type: 'goto', subtype: 'scene', target });
const gotoRouter = target => ({ type: 'goto', subtype: 'router', target });
const marker = name => ({ type: 'effect', inline: { type: 'notify', message: name } });
// Replace notification payload with a deterministic trace marker while retaining
// the real EffectSystem runnable/queue/goto dispatch path.
function installMarkerHandler(engine, trace) {
  engine.notify = async (eff) => trace.push(`marker:${eff.message}`);
  engine.applyEffect = async function(eff, context, key, list) {
    if (eff.type === 'notify' && eff.message !== undefined) {
      trace.push(`marker:${eff.message}`);
      return;
    }
    return EffectSystem.applyEffect.call(this, eff, context, key, list);
  };
}

test('stress: mixed scene/router goto chain inside one sync queue item serializes and continues', async () => {
  const harness = makeNavigationQueueEngine();
  const { engine, trace } = harness;
  installMarkerHandler(engine, trace);
  const list = [];
  for (let i = 1; i <= 250; i++) {
    list.push(gotoScene(`S${i}`), gotoRouter(`R${i}`), marker(`after-${i}`));
  }
  const result = await engine.pushToEffectQueue(list, {}, false);
  assert.equal(result.cancelled, false);
  assert.equal(result.error, undefined);
  assert.equal(harness.currentScene, 'S250');
  assert.equal(harness.currentRouter, 'R250');
  assert.equal(harness.transitionCount, 500);
  assert.equal(harness.maxTransitions, 1, 'navigation transition critical sections must not overlap');
  assert.equal(trace.filter(x => x.startsWith('marker:')).length, 250, 'post-goto effects should all continue');
  assert.equal(engine.runtime.isSyncQueueRunning, false);
  assert.equal(engine.runtime.effectQueue.sync.length, 0);
  engine.dispose();
});

test('stress: concurrent scene/router requests serialize through navigation coordinator', async () => {
  const harness = makeNavigationQueueEngine();
  const { engine } = harness;
  const requests = [];
  for (let i = 0; i < 300; i++) {
    requests.push(i % 2 ? engine.enterRouter(`CR${i}`) : engine.enterScene(`CS${i}`));
  }
  const results = await Promise.all(requests);
  assert.ok(results.every(r => r?.success === true));
  assert.equal(harness.maxTransitions, 1);
  assert.equal(harness.transitionCount, 300);
  engine.dispose();
});

test('stress: goto scene clears queued async items while sync goto chain remains intact', async () => {
  const harness = makeNavigationQueueEngine();
  const { engine, trace } = harness;
  installMarkerHandler(engine, trace);
  let releaseAsync;
  engine.processRunnables = async function(list, context, isAsync, fromQueue) {
    if (isAsync && list[0]?.hold) await new Promise(resolve => { releaseAsync = resolve; });
    return EffectSystem.processRunnables.call(this, list, context, isAsync, fromQueue);
  };
  const asyncActive = engine.pushToEffectQueue([{ type: 'effect', inline: { type: 'notify', message: 'async-active' }, hold: true }], {}, true);
  await new Promise(resolve => setImmediate(resolve));
  const asyncPending = Array.from({ length: 80 }, (_, i) => engine.pushToEffectQueue([{ type: 'effect', inline: { type: 'notify', message: `pending-${i}` } }], {}, true));
  const syncGoto = engine.pushToEffectQueue([gotoScene('ASYNC_CLEAR_TARGET'), marker('sync-after-goto')], {}, false);
  await new Promise(resolve => setImmediate(resolve));
  engine.clearEffectQueue('async');
  releaseAsync?.();
  const [activeResult, pendingResults, syncResult] = await Promise.all([asyncActive, Promise.all(asyncPending), syncGoto]);
  assert.equal(activeResult.cancelled, false);
  assert.ok(pendingResults.every(r => r.cancelled === true));
  assert.equal(syncResult.cancelled, false);
  assert.equal(harness.currentScene, 'ASYNC_CLEAR_TARGET');
  assert.ok(trace.includes('marker:sync-after-goto'));
  assert.equal(engine.runtime.isSyncQueueRunning, false);
  assert.equal(engine.runtime.isAsyncQueueRunning, false);
  engine.dispose();
});

test('stress: 1000 goto operations from one effect list do not lose order or deadlock', async () => {
  const harness = makeNavigationQueueEngine();
  const { engine, trace } = harness;
  installMarkerHandler(engine, trace);
  const list = [];
  for (let i = 0; i < 1000; i++) list.push(i % 2 ? gotoRouter(`R${i}`) : gotoScene(`S${i}`));
  let timeoutId;
  const timeout = new Promise((_, reject) => { timeoutId = setTimeout(() => reject(new Error('goto stress timeout')), 15000); });
  const result = await Promise.race([engine.pushToEffectQueue(list, {}, false), timeout]);
  clearTimeout(timeoutId);
  assert.equal(result.cancelled, false);
  assert.equal(harness.transitionCount, 1000);
  assert.equal(harness.maxTransitions, 1);
  assert.equal(engine.runtime.isSyncQueueRunning, false);
  engine.dispose();
});

test('stress: async goto cancels pending async queue items but active runnable continues after transition', async () => {
  const harness = makeNavigationQueueEngine();
  const { engine, trace } = harness;
  installMarkerHandler(engine, trace);
  let processStarted;
  const started = new Promise(resolve => { processStarted = resolve; });
  let releaseProcess;
  const processGate = new Promise(resolve => { releaseProcess = resolve; });
  const originalProcess = engine.processRunnables;
  let holdFirstAsync = true;
  engine.processRunnables = async function(list, context, isAsync, fromQueue) {
    if (isAsync && holdFirstAsync) {
      holdFirstAsync = false;
      processStarted();
      await processGate;
    }
    return originalProcess.call(this, list, context, isAsync, fromQueue);
  };

  const active = engine.pushToEffectQueue([gotoScene('ASYNC_GOTO_ACTIVE'), marker('active-after-goto')], {}, true);
  await started;
  const pending = Array.from({ length: 200 }, (_, i) => engine.pushToEffectQueue([marker(`pending-${i}`)], {}, true));
  releaseProcess();
  const activeResult = await active;
  const pendingResults = await Promise.all(pending);

  assert.equal(activeResult.cancelled, false);
  assert.ok(pendingResults.every(result => result.cancelled === true), 'all pending async items should be cancelled by goto');
  assert.ok(trace.includes('marker:active-after-goto'), 'active async runnable must continue after awaited goto');
  assert.equal(trace.filter(value => value.startsWith('marker:pending-')).length, 0);
  assert.equal(harness.currentScene, 'ASYNC_GOTO_ACTIVE');
  assert.equal(engine.runtime.isAsyncQueueRunning, false);
  assert.equal(engine.runtime.effectQueue.async.length, 0);
  engine.dispose();
});

test('stress: failed scene/router goto results do not corrupt queue ownership or skip following effects', async () => {
  const harness = makeNavigationQueueEngine();
  const { engine, trace } = harness;
  installMarkerHandler(engine, trace);
  const originalEnterScene = engine.enterScene;
  const originalEnterRouter = engine.enterRouter;
  engine.enterScene = async target => target === 'FAIL_SCENE'
    ? { success: false, reason: 'target_locked' }
    : originalEnterScene(target);
  engine.enterRouter = async target => target === 'FAIL_ROUTER'
    ? { success: false, reason: 'target_locked' }
    : originalEnterRouter(target);

  const list = [
    marker('before-failure'), gotoScene('FAIL_SCENE'), marker('after-failed-scene'),
    gotoRouter('FAIL_ROUTER'), marker('after-failed-router'), gotoScene('RECOVERY'),
    gotoRouter('RECOVERY_ROUTER'), marker('after-recovery')
  ];
  const result = await engine.pushToEffectQueue(list, {}, false);
  assert.equal(result.cancelled, false);
  assert.equal(result.error, undefined);
  assert.deepEqual(trace.filter(value => value.startsWith('marker:')), [
    'marker:before-failure', 'marker:after-failed-scene', 'marker:after-failed-router', 'marker:after-recovery'
  ]);
  assert.equal(harness.currentScene, 'RECOVERY');
  assert.equal(harness.currentRouter, 'RECOVERY_ROUTER');
  assert.equal(harness.maxTransitions, 1);
  assert.equal(engine.runtime.isSyncQueueRunning, false);
  assert.equal(engine.runtime.effectQueue.sync.length, 0);
  engine.dispose();
});

test('stress: repeated 500-goto chains maintain serialization and exactly-once continuation markers', async () => {
  const rounds = 8;
  for (let round = 0; round < rounds; round++) {
    const harness = makeNavigationQueueEngine();
    const { engine, trace } = harness;
    installMarkerHandler(engine, trace);
    const list = [];
    for (let i = 0; i < 500; i++) {
      list.push(i % 2 ? gotoRouter(`RR${round}-${i}`) : gotoScene(`SS${round}-${i}`));
      if (i % 25 === 0) list.push(marker(`round-${round}-marker-${i}`));
    }
    const result = await engine.pushToEffectQueue(list, {}, false);
    assert.equal(result.cancelled, false, `round ${round} should not cancel`);
    assert.equal(result.error, undefined, `round ${round} should not error`);
    assert.equal(harness.transitionCount, 500, `round ${round} transition count`);
    assert.equal(harness.maxTransitions, 1, `round ${round} transition overlap`);
    assert.equal(trace.filter(value => value.startsWith('marker:')).length, 20, `round ${round} marker exactly-once`);
    assert.equal(engine.runtime.isSyncQueueRunning, false, `round ${round} runner cleanup`);
    assert.equal(engine.runtime.effectQueue.sync.length, 0, `round ${round} queue drain`);
    engine.dispose();
  }
});
