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
      [`alt_${sid}`]: { meta: { subTitleStatus: 'Alt' }, set: { blocked: false, visited: false, countVisited: 0 }, actions: ['test_action'] }
    } };
  }
  src.scenes.start.set.transition = 'fade';
  src.scenes.start.set.transitionDuration = 0.001;
  src.scenes.start.routers.alt_start = { meta: { subTitleStatus: 'Alt' }, set: { blocked: false, visited: false, countVisited: 0 }, actions: ['test_action'] };
  src.characters.npc = {
    meta: { name: 'NPC', desc: 'Stress character' },
    set: { linkEffect: false, alert: null, moving: true, move: 'list' },
    stats: {}, inventory: [], met: [], relationship: [],
    place: { scene_id: 'scene_b', currentIndex: 0 },
    moveList: [
      { entryId: 'npc-b', scene_id: 'scene_b', count: -1, countVisited: 0, nextStep: 100, loop: { leave: [], enter: [] } },
      { entryId: 'npc-c', scene_id: 'scene_c', count: -1, countVisited: 0, nextStep: 100, loop: { leave: [], enter: [] } },
      { entryId: 'npc-d', scene_id: 'scene_d', count: -1, countVisited: 0, nextStep: 100, loop: { leave: [], enter: [] } }
    ],
    effect: { leave: {} }
  };
  return src;
}
function harness({ transition, ready } = {}) {
  const engine = new GameEngine();
  const calls = [];
  engine.api.presentation = {
    scene: {
      transition: async (phase, type, duration) => { calls.push(`transition:${phase}`); return transition?.(phase, type, duration); },
      render: () => {}, hideTimer: () => {}, updateTimer: () => {},
      renderReady: async (args, opts) => { calls.push('ready'); return ready?.(args, opts) ?? { status: 'ready' }; }
    }, navigation: { setBlocking: () => {} }, vfx: { exec: () => {} },
    components: { updateCharacterList: () => {} }, effects: { shake: () => {} }
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
function prepareNpcVisit(engine) {
  engine.taskManager.kill('move_char_npc');
  engine.invalidateCharacterVisit('npc');
  return engine.createCharacterVisitToken('npc');
}
async function moveNpc(engine) {
  const token = prepareNpcVisit(engine);
  return engine.performCharacterMove('npc', token);
}

test('real-core integration: Character Leave goto Scene cancels stale movement, marker continues once and recovery works', async () => {
  const { engine } = harness();
  await engine.init(scenario());
  await engine.enterScene('scene_b', true);
  let marker = 0;
  const apply = engine.applyEffect.bind(engine);
  engine.applyEffect = async function(eff, ...args) {
    if (eff?.type === 'notify' && eff.title === 'char-leave-scene-marker') { marker++; return; }
    return apply(eff, ...args);
  };
  const npcLeaveScene = state(engine).getRuntimeSnapshot('characters.[id]', { id: 'npc' });
  npcLeaveScene.moveList[0].loop.leave = [
    { type: 'goto', subtype: 'scene', target: 'scene_d' },
    { type: 'effect', inline: { type: 'notify', title: 'char-leave-scene-marker', text: 'continued' } }
  ];
  state(engine).set('characters.[id]', npcLeaveScene, { id: 'npc' });
  await moveNpc(engine);
  await drain(engine);
  assert.equal(scene(engine), 'scene_d');
  assert.equal(state(engine).getRuntimeSnapshot('characters.[id]', { id: 'npc' }).place.scene_id, 'scene_b', 'movement should not commit after nested Scene navigation changes player scene');
  assert.equal(marker, 1, 'post-goto Leave runnable should run exactly once');
  assert.equal(engine.isTransitioning, false);
  assert.equal(engine.runtime.isSyncQueueRunning, false);
  assert.equal(engine.runtime.effectQueue.sync.length, 0);
  engine.dispose();
});

test('real-core integration: Character Leave goto Router preserves movement commit and exactly-once continuation', async () => {
  const { engine } = harness();
  await engine.init(scenario());
  await engine.enterScene('start', true);
  let marker = 0;
  const apply = engine.applyEffect.bind(engine);
  engine.applyEffect = async function(eff, ...args) {
    if (eff?.type === 'notify' && eff.title === 'char-leave-router-marker') { marker++; return; }
    return apply(eff, ...args);
  };
  const npcLeaveRouter = state(engine).getRuntimeSnapshot('characters.[id]', { id: 'npc' });
  npcLeaveRouter.moveList[0].loop.leave = [
    { type: 'goto', subtype: 'router', target: 'alt_start' },
    { type: 'effect', inline: { type: 'notify', title: 'char-leave-router-marker', text: 'continued' } }
  ];
  state(engine).set('characters.[id]', npcLeaveRouter, { id: 'npc' });
  const result = await moveNpc(engine);
  await drain(engine);
  assert.equal(router(engine), 'alt_start');
  assert.equal(state(engine).getRuntimeSnapshot('characters.[id]', { id: 'npc' }).place.scene_id, 'scene_c');
  assert.equal(state(engine).getRuntimeSnapshot('characters.[id]', { id: 'npc' }).moveList[1].countVisited, 1);
  assert.equal(marker, 1);
  assert.equal(result?.status, 'moved');
  assert.equal(engine.isTransitioning, false);
  assert.equal(engine.runtime.effectQueue.sync.length, 0);
  engine.dispose();
});

test('real-core integration: Character Enter nested Router goto runs after movement commit', async () => {
  const { engine } = harness();
  await engine.init(scenario());
  await engine.enterScene('scene_c', true);
  let marker = 0;
  const apply = engine.applyEffect.bind(engine);
  engine.applyEffect = async function(eff, ...args) {
    if (eff?.type === 'notify' && eff.title === 'char-enter-router-marker') { marker++; return; }
    return apply(eff, ...args);
  };
  const npcEnterRouter = state(engine).getRuntimeSnapshot('characters.[id]', { id: 'npc' });
  npcEnterRouter.moveList[1].loop.enter = [
    { type: 'goto', subtype: 'router', target: 'alt_scene_c' },
    { type: 'effect', inline: { type: 'notify', title: 'char-enter-router-marker', text: 'continued' } }
  ];
  state(engine).set('characters.[id]', npcEnterRouter, { id: 'npc' });
  const result = await moveNpc(engine);
  await drain(engine);
  assert.equal(router(engine), 'alt_scene_c');
  const npc = state(engine).getRuntimeSnapshot('characters.[id]', { id: 'npc' });
  assert.equal(npc.place.scene_id, 'scene_c', 'Enter navigation is post-commit');
  assert.equal(npc.moveList[1].countVisited, 1);
  assert.equal(marker, 1);
  assert.equal(result?.status, 'moved');
  assert.equal(engine.isTransitioning, false);
  assert.equal(engine.runtime.isSyncQueueRunning, false);
  assert.equal(engine.runtime.effectQueue.sync.length, 0);
  engine.dispose();
});

test('real-core integration stress: Character Leave nested Scene/Router transitions repeated 30 times', async () => {
  const { engine } = harness();
  await engine.init(scenario());
  let sceneMarkers = 0, routerMarkers = 0;
  const apply = engine.applyEffect.bind(engine);
  engine.applyEffect = async function(eff, ...args) {
    if (eff?.type === 'notify' && eff.title === 'integration-scene-marker') { sceneMarkers++; return; }
    if (eff?.type === 'notify' && eff.title === 'integration-router-marker') { routerMarkers++; return; }
    return apply(eff, ...args);
  };
  for (let i = 0; i < 30; i++) {
    await engine.enterScene('start', true);
    let npc = state(engine).getRuntimeSnapshot('characters.[id]', { id: 'npc' });
    npc.moveList[0].loop.leave = [
      { type: 'goto', subtype: 'router', target: 'alt_start' },
      { type: 'effect', inline: { type: 'notify', title: 'integration-router-marker', text: 'ok' } }
    ];
    state(engine).set('characters.[id]', npc, { id: 'npc' });
    await moveNpc(engine);
    await drain(engine);
    assert.equal(router(engine), 'alt_start', `router round ${i}`);
    assert.equal(state(engine).getRuntimeSnapshot('characters.[id]', { id: 'npc' }).place.scene_id, 'scene_c');
    await engine.enterScene('scene_b', true);
    npc = state(engine).getRuntimeSnapshot('characters.[id]', { id: 'npc' });
    npc.place.scene_id = 'scene_b';
    npc.place.currentIndex = 0;
    npc.moveList[0].loop.leave = [
      { type: 'goto', subtype: 'scene', target: 'scene_d' },
      { type: 'effect', inline: { type: 'notify', title: 'integration-scene-marker', text: 'ok' } }
    ];
    state(engine).set('characters.[id]', npc, { id: 'npc' });
    await moveNpc(engine);
    await drain(engine);
    assert.equal(scene(engine), 'scene_d', `scene round ${i}`);
    assert.equal(state(engine).getRuntimeSnapshot('characters.[id]', { id: 'npc' }).place.scene_id, 'scene_b');
    assert.equal(engine.isTransitioning, false);
    assert.ok(['IDLE', 'ACTIVATE'].includes(engine._transitionPhase));
  }
  assert.equal(sceneMarkers, 30);
  assert.equal(routerMarkers, 30);
  assert.equal(engine.runtime.effectQueue.sync.length, 0);
  assert.equal(engine.runtime.effectQueue.async.length, 0);
  engine.dispose();
});
