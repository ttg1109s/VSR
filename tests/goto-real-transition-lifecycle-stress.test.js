import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { importModules } from './imports/index.js';
const { GameEngine } = (await importModules(['GameEngine'])).GameEngine;

const minimalFixture = JSON.parse(await readFile(new URL('./fixtures/engine/minimal-scenario.json', import.meta.url), 'utf8'));

function makeScenario() {
  const scenario = structuredClone(minimalFixture);
  for (const sceneId of ['scene_b', 'scene_c', 'scene_d']) {
    scenario.scenes[sceneId] = { meta: { title: sceneId }, set: { activeRouterId: `main_${sceneId}`, transition: 'fade', transitionDuration: 0.001 }, routers: {
      [`main_${sceneId}`]: { meta: { subTitleStatus: 'Main' }, set: {}, actions: ['test_action'] },
      [`alternate_${sceneId}`]: { meta: { subTitleStatus: 'Alternate' }, set: {}, actions: ['test_action'] }
    } };
  }
  scenario.scenes.start.routers.start_alternate = { meta: { subTitleStatus: 'Alternate' }, set: {}, actions: ['test_action'] };
  return scenario;
}

function makeRealEngine({ transition, renderReady } = {}) {
  const engine = new GameEngine();
  const calls = [];
  const presentation = {
    scene: {
      transition: async (...args) => { calls.push(['transition', ...args]); return transition?.(...args); },
      render: () => {}, hideTimer: () => {}, updateTimer: () => {},
      renderReady: async (...args) => { calls.push(['renderReady', ...args]); return renderReady?.(...args) ?? { status: 'ready' }; },
      releaseTransitionBlock: async (...args) => { calls.push(['releaseBlock', ...args]); return { status: 'ready' }; }
    },
    navigation: { setBlocking: () => {} },
    vfx: { exec: () => {} },
    components: { updateCharacterList: () => {} },
    effects: { shake: () => {} }
  };
  engine.api.presentation = presentation;
  engine.render = () => {};
  engine.pauseBackgroundTasks = () => {};
  engine.resumeBackgroundTasks = () => {};
  return { engine, calls };
}

async function waitForQueues(engine, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const runtime = engine.runtime;
    if (!runtime?.isSyncQueueRunning && !runtime?.isAsyncQueueRunning &&
        runtime?.effectQueue?.sync?.length === 0 && runtime?.effectQueue?.async?.length === 0) return;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  throw new Error('Effect queues did not drain before timeout');
}

function sceneId(engine) { return engine.api.engine.state.get('sceneId'); }
function routerId(engine, scene = sceneId(engine)) { return engine.api.engine.state.get('scene.activeRouterId', { id: scene }); }

 test('real lifecycle: repeated Scene and Router transitions use actual transition core and keep state coherent', async () => {
  const { engine, calls } = makeRealEngine();
  await engine.init(makeScenario());
  const baseTargets = ['scene_b', 'scene_c', 'scene_d', 'start', 'scene_b'];
  const sceneTargets = Array.from({ length: 10 }, () => baseTargets).flat();
  for (const target of sceneTargets) {
    await engine.enterScene(target, false);
    assert.equal(sceneId(engine), target, `Scene should commit to ${target}`);
    assert.ok(routerId(engine), `target Scene ${target} should have an active Router`);
  }
  await engine.enterRouter('alternate_scene_b', true, false, false);
  assert.equal(sceneId(engine), 'scene_b');
  assert.equal(routerId(engine), 'alternate_scene_b');
  await engine.enterRouter('main_scene_b', true, false, false);
  assert.equal(routerId(engine), 'main_scene_b');
  assert.ok(calls.length >= 8, 'real transition lifecycle should call presentation transition/render-ready adapters');
  engine.dispose();
 });

 test('real lifecycle: renderReady rejection rolls Router transition back and leaves queue/runtime recoverable', async () => {
  let rejectNextReady = false;
  const { engine } = makeRealEngine({ renderReady: async () => {
    if (rejectNextReady) { rejectNextReady = false; throw new Error('renderReady synthetic failure'); }
    return { status: 'ready' };
  }});
  await engine.init(makeScenario());
  await engine.enterScene('scene_b', true);
  const beforeScene = sceneId(engine);
  const beforeRouter = routerId(engine);
  rejectNextReady = true;
  await assert.rejects(engine.enterRouter('alternate_scene_b', true, false, false), /renderReady synthetic failure/);
  assert.equal(sceneId(engine), beforeScene);
  assert.equal(routerId(engine), beforeRouter);
  assert.equal(engine.isTransitioning, false);
  assert.equal(engine._transitionPhase, 'IDLE');
  await engine.enterRouter('alternate_scene_b', true, false, true);
  assert.equal(routerId(engine), 'alternate_scene_b', 'engine should recover after transition rollback');
  engine.dispose();
 });

 test('real lifecycle: Router enter hook can issue nested Scene goto and active async runnable continues', async () => {
  const { engine } = makeRealEngine();
  await engine.init(makeScenario());
  await engine.enterScene('scene_b', true);
  const router = engine.src.scenes.scene_b.routers.alternate_scene_b;
  router.loop ||= {};
  router.loop.enter = [
    { type: 'goto', subtype: 'scene', target: 'scene_c' },
    { type: 'effect', inline: { type: 'notify', title: 'stress-marker', text: 'after nested goto', level: 'info' } }
  ];
  let markerCount = 0;
  const originalNotify = engine.notifications.add.bind(engine.notifications);
  engine.notifications.add = (...args) => { if (args[0] === 'stress-marker') markerCount++; return originalNotify(...args); };
  await engine.enterRouter('alternate_scene_b', true, false, true);
  await waitForQueues(engine);
  assert.equal(sceneId(engine), 'scene_c', 'nested Scene goto from Router enter hook should commit');
  assert.equal(markerCount, 1, 'effect after nested goto should continue exactly once');
  assert.equal(engine.runtime.isAsyncQueueRunning, false);
  assert.equal(engine.runtime.effectQueue.async.length, 0);
  engine.dispose();
 });

 test('real lifecycle: runtime reset during an awaited renderReady does not resurrect navigation state', async () => {
  let gateStarted;
  const started = new Promise(resolve => { gateStarted = resolve; });
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let armed = false;
  const { engine } = makeRealEngine({ renderReady: async () => {
    if (armed) { gateStarted(); await gate; }
    return { status: 'ready' };
  }});
  await engine.init(makeScenario());
  await engine.enterScene('scene_b', true);
  armed = true;
  const transition = engine.enterRouter('alternate_scene_b', true, false, false);
  await started;
  engine.reset();
  release();
  await transition;
  assert.equal(sceneId(engine), '', 'reset Scene state must remain empty');
  assert.equal(engine.src, null, 'reset scenario source must not be restored by stale transition');
  assert.deepEqual(
    Object.keys(engine.api.engine.state.getRuntimeSnapshot('routers') || {}),
    [],
    'stale transition must not create Router runtime state'
  );
  assert.equal(engine._transitionPhase, 'IDLE');
  assert.equal(engine.isTransitioning, false);
  engine.dispose();
 });

 test('real lifecycle: Scene transition waits for target React render-ready before END', async () => {
  const { engine, calls } = makeRealEngine();
  const src = makeScenario();
  src.scenes.scene_b.set = { activeRouterId: 'main_scene_b', transition: 'fade', transitionDuration: 0.02 };
  await engine.init(src);
  calls.length = 0;
  let sceneAtStartRequest = null;
  let transitionActiveAtRelease = null;
  let tasksResumedAtRelease = false;
  engine.resumeBackgroundTasks = () => { tasksResumedAtRelease = true; };
  engine.api.presentation.scene.transition = async (...args) => {
    calls.push(['transition', ...args]);
    if (args[0] === 'start') sceneAtStartRequest = sceneId(engine);
    return { status: 'ready' };
  };
  engine.api.presentation.scene.releaseTransitionBlock = async () => {
    calls.push(['releaseBlock']);
    transitionActiveAtRelease = engine.isTransitioning;
    return { status: 'ready' };
  };

  await engine.enterScene('scene_b', false);

  const sequence = calls.map(call => call[0] === 'transition' ? `transition:${call[1]}` : call[0]);
  assert.deepEqual(sequence, ['transition:start', 'renderReady', 'transition:end', 'renderReady', 'releaseBlock']);
  assert.equal(sceneAtStartRequest, 'start', 'Engine must not mutate target Scene state before START peak ACK');
  assert.equal(transitionActiveAtRelease, false, 'Engine completes before releasing the UI block');
  assert.equal(tasksResumedAtRelease, true, 'background tasks resume before UI block release');
  assert.equal(sceneId(engine), 'scene_b');
  assert.equal(engine.isTransitioning, false);
  assert.equal(engine._transitionPhase, 'IDLE');
  engine.dispose();
 });
