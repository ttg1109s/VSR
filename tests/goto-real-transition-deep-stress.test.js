import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { importModules } from './imports/index.js';
const { GameEngine } = (await importModules(['GameEngine'])).GameEngine;
const fixture = JSON.parse(await readFile(new URL('./fixtures/engine/minimal-scenario.json', import.meta.url), 'utf8'));

function scenario() {
  const src = structuredClone(fixture);
  for (const sid of ['scene_b', 'scene_c', 'scene_d']) {
    src.scenes[sid] = { meta: { title: sid }, set: { activeRouterId: `main_${sid}`, transition: 'fade', transitionDuration: 0.001 }, routers: {
      [`main_${sid}`]: { meta: { subTitleStatus: 'Main' }, set: { blocked: false, visited: false, countVisited: 0 }, actions: ['test_action'] },
      [`alt_${sid}`]: { meta: { subTitleStatus: 'Main' }, set: { blocked: false, visited: false, countVisited: 0 }, actions: ['test_action'] }
    } };
  }
  src.scenes.start.set.transition = 'fade';
  src.scenes.start.set.transitionDuration = 0.001;
  src.scenes.start.routers.alt_start = { meta: { subTitleStatus: 'Main' }, set: { blocked: false, visited: false, countVisited: 0 }, actions: ['test_action'] };
  return src;
}
function engineHarness({ transition, ready } = {}) {
  const engine = new GameEngine();
  const calls = [];
  engine.api.presentation = {
    scene: {
      transition: async (phase, type, duration) => { calls.push(`transition:${phase}`); return transition?.(phase, type, duration); },
      render: () => {}, hideTimer: () => {}, updateTimer: () => {},
      renderReady: async (args, opts) => { calls.push('ready'); return ready?.(args, opts) ?? { status: 'ready' }; },
      releaseTransitionBlock: async () => ({ status: 'ready' })
    }, navigation: { setBlocking: () => {} }, vfx: { exec: () => {} }, components: { updateCharacterList: () => {} }, effects: { shake: () => {} }
  };
  engine.render = () => {};
  engine.pauseBackgroundTasks = () => {};
  engine.resumeBackgroundTasks = () => {};
  return { engine, calls };
}
const state = e => e.api.engine.state;
const scene = e => state(e).get('sceneId');
const router = e => state(e).get('scene.activeRouterId', { id: scene(e) });
async function drain(e, timeoutMs = 6000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const r = e.runtime;
    if (!r?.isSyncQueueRunning && !r?.isAsyncQueueRunning && r?.effectQueue?.sync?.length === 0 && r?.effectQueue?.async?.length === 0) return;
    await new Promise(resolve => setTimeout(resolve, 4));
  }
  throw new Error('queue drain timeout');
}

 test('deep lifecycle: Scene mutation rollback after transition-end rejection recovers', async () => {
  let failEnd = false;
  const { engine } = engineHarness({ transition: async phase => { if (phase === 'end' && failEnd) { failEnd = false; throw new Error('scene end rejection'); } } });
  await engine.init(scenario());
  await engine.enterScene('scene_b', true);
  const oldScene = scene(engine), oldRouter = router(engine), oldEntryScene = state(engine).getRuntimeSnapshot('characters.[id]', { id: 'player' })?.place?.scene_id;
  failEnd = true;
  await assert.rejects(engine.enterScene('scene_c', false), /scene end rejection/);
  assert.equal(scene(engine), oldScene);
  assert.equal(router(engine), oldRouter);
  if (oldEntryScene !== undefined) assert.equal(state(engine).getRuntimeSnapshot('characters.[id]', { id: 'player' })?.place?.scene_id, oldEntryScene);
  assert.ok(['IDLE', 'ACTIVATE'].includes(engine._transitionPhase));
  assert.equal(engine.isTransitioning, false);
  await engine.enterScene('scene_c', true);
  assert.equal(scene(engine), 'scene_c');
  engine.dispose();
 });

 test('deep lifecycle: Router leave hook nested Scene goto serializes and preserves post-goto marker', async () => {
  const { engine } = engineHarness();
  await engine.init(scenario());
  await engine.enterScene('scene_b', true);
  const leave = engine.src.scenes.scene_b.routers.main_scene_b;
  leave.loop ||= {};
  leave.loop.leave = [
    { type: 'goto', subtype: 'scene', target: 'scene_c' },
    { type: 'effect', inline: { type: 'notify', message: 'leave-after-goto' } }
  ];
  let markers = 0;
  const apply = engine.applyEffect.bind(engine);
  engine.applyEffect = async function(eff, ...args) {
    if (eff?.type === 'notify' && eff.message === 'leave-after-goto') { markers++; return; }
    return apply(eff, ...args);
  };
  await engine.enterRouter('alt_scene_b', true, false, true);
  await drain(engine);
  assert.equal(scene(engine), 'scene_c');
  assert.equal(markers, 1, 'leave runnable continuation after nested goto should execute once');
  assert.ok(['IDLE', 'ACTIVATE'].includes(engine._transitionPhase));
  engine.dispose();
 });

 test('deep lifecycle: concurrent Sync goto cancels pending Async items while active Async item remains coherent', async () => {
  const { engine } = engineHarness();
  await engine.init(scenario());
  await engine.enterScene('scene_b', true);
  let gateResolve;
  const gate = new Promise(resolve => { gateResolve = resolve; });
  let activeStarted;
  const started = new Promise(resolve => { activeStarted = resolve; });
  const original = engine.processRunnables;
  let first = true;
  engine.processRunnables = async function(list, context, isAsync, fromQueue) {
    if (isAsync && first) { first = false; activeStarted(); await gate; }
    return original.call(this, list, context, isAsync, fromQueue);
  };
  const asyncActive = engine.pushToEffectQueue([{ type: 'effect', inline: { type: 'notify', message: 'async-active' } }], {}, true);
  await started;
  const asyncPending = Array.from({ length: 120 }, (_, i) => engine.pushToEffectQueue([{ type: 'effect', inline: { type: 'notify', message: `async-pending-${i}` } }], {}, true));
  const syncNavigation = engine.pushToEffectQueue([{ type: 'goto', subtype: 'scene', target: 'scene_c' }], {}, false);
  gateResolve();
  const [activeResult, pendingResults, syncResult] = await Promise.all([asyncActive, Promise.all(asyncPending), syncNavigation]);
  await drain(engine);
  assert.equal(activeResult.cancelled, false);
  assert.ok(pendingResults.every(x => x.cancelled === true));
  assert.equal(syncResult.cancelled, false);
  assert.equal(scene(engine), 'scene_c');
  assert.equal(engine.runtime.isSyncQueueRunning, false);
  assert.equal(engine.runtime.isAsyncQueueRunning, false);
  assert.equal(engine.runtime.effectQueue.sync.length, 0);
  assert.equal(engine.runtime.effectQueue.async.length, 0);
  engine.dispose();
 });

 test('deep lifecycle stress: 20 rounds of Scene/Router transitions with queue drain and state invariants', async () => {
  const { engine } = engineHarness();
  await engine.init(scenario());
  const targets = ['scene_b', 'scene_c', 'scene_d', 'start'];
  for (let round = 0; round < 20; round++) {
    for (const target of targets) {
      await engine.enterScene(target, true);
      assert.equal(scene(engine), target);
      assert.ok(router(engine));
      const currentRouter = router(engine);
      const alt = target === 'start' ? 'alt_start' : `alt_${target}`;
      const main = target === 'start' ? 'main' : `main_${target}`;
      if (engine.src.scenes[target].routers[alt]) {
        await engine.enterRouter(alt, true, false, true);
        assert.equal(router(engine), alt);
        await engine.enterRouter(main, true, false, true);
        assert.equal(router(engine), main);
      }
      assert.equal(engine.isTransitioning, false);
      assert.ok(['IDLE', 'ACTIVATE'].includes(engine._transitionPhase));
    }
  }
  await drain(engine);
  engine.dispose();
 });
