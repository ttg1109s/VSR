import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importModules } from './imports/index.js';

const { GameEngine } = (await importModules(['GameEngine'])).GameEngine;
const { TaskManager } = (await importModules(['TaskManager'])).TaskManager;
const MINIMAL = JSON.parse(readFileSync(new URL('./fixtures/engine/minimal-scenario.json', import.meta.url), 'utf8'));

class FakeClock {
  constructor() { this.time = 0; this.nextId = 0; this.timers = new Map(); }
  now = () => this.time;
  setTimeout = (callback, delay) => { const id = ++this.nextId; this.timers.set(id, { at: this.time + delay, callback }); return id; };
  clearTimeout = id => { this.timers.delete(id); };
  async advance(ms) {
    const target = this.time + ms;
    while (true) {
      const next = [...this.timers.entries()].filter(([, t]) => t.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      const [id, timer] = next; this.timers.delete(id); this.time = timer.at; timer.callback();
      await Promise.resolve(); await Promise.resolve(); await new Promise(resolve => setImmediate(resolve));
    }
    this.time = target; await Promise.resolve();
  }
}

function itemScenario() {
  const scenario = structuredClone(MINIMAL);
  scenario.config.minAutomationNextStep = 1;
  scenario.config.maxHandOn = 2;
  scenario.config.maxInventory = [[10, 'player'], [10, 'mai']];
  scenario.characters ||= {};
  const char = name => ({ meta: { name, desc: '' }, set: { moving: false, alert: null, move: null, linkEffect: false }, relationship: [], place: { scene_id: 'start', currentIndex: 0 }, stats: {}, effect: { leave: {} }, moveList: [], met: [], inventory: [], hand: [] });
  scenario.characters.player = char('Player');
  scenario.characters.mai = char('Mai');
  scenario.itemInfo ||= {};
  scenario.itemInfo.race_item = {
    name: 'Race Item', icon: 'science', desc: 'Race test', category: 'tool',
    usage: { current: 0, max: 3, autoInc: true },
    effect: {
      equip: [{ type: 'set', subtype: 'state', target: 'race_equip', value: true, dataType: 'bool' }],
      unequip: [{ type: 'set', subtype: 'state', target: 'race_equip', value: false, dataType: 'bool' }],
      use: [{ type: 'set', subtype: 'state', target: 'race_use', value: true, dataType: 'bool' }]
    }
  };
  scenario.globalStates ||= {};
  scenario.globalStates.race_equip = { type: 'boolean', value: false, title: 'Equipped hook' };
  scenario.globalStates.race_use = { type: 'boolean', value: false, title: 'Use hook' };
  scenario.templates ||= {};
  scenario.templates.automation = {
    timed: {
      set: { move: 'step_by_step', moveDirection: 'first', numberCycleAllow: 1, countCurrent: 0, runInfinity: false, banClick: false },
      plan: [
        { seconds: 1, effect: [{ type: 'set', subtype: 'state', target: 'automation_tick_1', value: true, dataType: 'bool' }] },
        { seconds: 1, effect: [{ type: 'set', subtype: 'state', target: 'automation_tick_2', value: true, dataType: 'bool' }] }
      ]
    }
  };
  scenario.globalStates.automation_tick_1 = { type: 'boolean', value: false, title: 'Automation tick 1' };
  scenario.globalStates.automation_tick_2 = { type: 'boolean', value: false, title: 'Automation tick 2' };
  return scenario;
}

async function createEngine(clock = null) {
  const taskManager = clock ? new TaskManager({}, 120, { clock }) : undefined;
  const engine = new GameEngine({ taskManager, clock: clock?.now });
  await engine.init(itemScenario(), { enterScene: false });
  engine.api.presentation.navigation.setBlocking = () => {};
  engine.api.presentation.components.explorer = () => {};
  engine.api.presentation.components.updateItemModal = () => {};
  return engine;
}

function deferred() { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; }
async function tick() { await Promise.resolve(); await new Promise(resolve => setImmediate(resolve)); }

// Automation effects use the Async queue; a blocked queue delays effect completion
// and therefore delays creation of the next automation timer.
test('automation next-step timer starts after its queued effect completes, not while Async queue is blocked', async () => {
  const clock = new FakeClock();
  const engine = await createEngine(clock);
  const hold = deferred();
  // Wrap the real processor: hold one queue item, but preserve queue routing for automation effects.
  const originalProcess = engine.processRunnables.bind(engine);
  engine.processRunnables = async (list, context, isAsync, fromQueue) => {
    if (fromQueue && list[0]?.hold) await hold.promise;
    else return originalProcess(list, context, isAsync, fromQueue);
  };
  engine.clearEffectQueue('async');
  const held = engine.pushToEffectQueue([{ hold: true }], {}, true);
  await tick();
  engine.runAutomation('timed');
  await tick();
  await clock.advance(5000);
  assert.equal(engine.api.engine.state.getRuntime('global.automation_tick_1')?.value, false, 'automation step effect must remain queued behind blocker');
  assert.equal(engine.taskManager.plan.auto_timed, undefined, 'no next-step timer is scheduled until effect finishes');
  hold.resolve();
  await held;
  await tick();
  assert.ok(engine.taskManager.plan.auto_timed, 'automation schedules its delay after effect completion');
  await clock.advance(999);
  assert.equal(engine.api.engine.state.getRuntime('global.automation_tick_1')?.value, true);
  assert.equal(engine.api.engine.state.getRuntime('global.automation_tick_2')?.value, false, 'second step must wait the configured one-second interval after step one completes');
  await clock.advance(1);
  await tick();
  assert.equal(engine.api.engine.state.getRuntime('global.automation_tick_2')?.value, true);
  engine.stopAutomation('timed');
  engine.dispose();
});

async function prepareQueuedUse() {
  const engine = await createEngine();
  engine.addItem('race_item');
  await engine.toggleHand('race_item');
  const hold = deferred();
  const originalProcess = engine.processRunnables.bind(engine);
  engine.processRunnables = async (list, context, isAsync, fromQueue) => {
    if (fromQueue && list[0]?.hold) await hold.promise;
    else return originalProcess(list, context, isAsync, fromQueue);
  };
  const active = engine.pushToEffectQueue([{ hold: true }], {}, false);
  await tick();
  const use = engine.use('race_item');
  await tick();
  return { engine, hold, active, use };
}


test('item use registers use_id and emits Using then Used only after queue execution succeeds', async () => {
  const h = await prepareQueuedUse();
  const notificationsBefore = h.engine.notifications.history.length;
  const usePromise = h.use;
  assert.equal(h.engine.api.engine.state.getRuntime('global.race_use')?.value, false, 'effect remains pending while queue is blocked');
  h.hold.resolve();
  await Promise.all([h.active, usePromise]);
  const notices = h.engine.notifications.history.slice(notificationsBefore).filter(n => ['inventory.using', 'inventory.used'].includes(n.category));
  assert.deepEqual(notices.map(n => n.category), ['inventory.using', 'inventory.used']);
  assert.ok(notices[0].metadata.useId);
  assert.equal(notices[0].metadata.useId, notices[1].metadata.useId, 'start and success notifications share use_id');
  assert.equal(h.engine.api.engine.state.getRuntimeSnapshot('itemInfo.[id].usage', { id: 'race_item' }).current, 1);
  h.engine.dispose();
});

test('queued item use is cancelled if hand_off unequips before commit and emits cancellation notification', async () => {
  const h = await prepareQueuedUse();
  assert.equal(h.engine.api.engine.state.getRuntime('global.race_use')?.value, false);
  const handOff = h.engine.toggleHand('race_item'); // hand_off mutation is immediate; unequip hook is queued behind use
  assert.deepEqual(h.engine.getHand(), []);
  h.hold.resolve();
  await Promise.all([h.active, h.use, handOff]);
  assert.equal(h.engine.api.engine.state.getRuntime('global.race_use')?.value, false, 'queued use effect is cancelled after unequip');
  assert.equal(h.engine.api.engine.state.getRuntimeSnapshot('itemInfo.[id].usage', { id: 'race_item' }).current, 0, 'usage is not committed for cancelled use');
  assert.equal(h.engine.api.engine.state.getRuntime('global.race_equip')?.value, false, 'unequip hook runs');
  assert.ok(h.engine.notifications.history.some(n => n.category === 'inventory.use_cancelled' && n.metadata?.useId), 'cancellation notification includes registered use_id');
  h.engine.dispose();
});

test('queued item use is cancelled if transfer changes ownership before commit', async () => {
  const h = await prepareQueuedUse();
  const transferPromise = h.engine.transferItem('race_item', 'mai');
  assert.deepEqual(h.engine.getInventory(), []);
  assert.deepEqual(h.engine.api.engine.state.getRuntimeSnapshot('characters.[id].inventory', { id: 'mai' }), ['race_item']);
  h.hold.resolve();
  const transfer = await transferPromise;
  assert.equal(transfer.transferred, true);
  await Promise.all([h.active, h.use]);
  assert.equal(h.engine.api.engine.state.getRuntime('global.race_use')?.value, false, 'use effect is cancelled after ownership transfer');
  assert.equal(h.engine.api.engine.state.getRuntimeSnapshot('itemInfo.[id].usage', { id: 'race_item' }).current, 0, 'usage is not committed after ownership transfer');
  assert.equal(h.engine.api.engine.state.getRuntime('global.race_equip')?.value, false, 'transfer unequip hook runs');
  assert.ok(h.engine.notifications.history.some(n => n.category === 'inventory.use_cancelled' && n.metadata?.useId), 'transfer cancellation emits a use_id notification');
  h.engine.dispose();
});

test('queued item use is cancelled if remove deletes it before commit', async () => {
  const h = await prepareQueuedUse();
  const removePromise = h.engine.removeFromInventory('race_item');
  assert.deepEqual(h.engine.getInventory(), []);
  assert.deepEqual(h.engine.getHand(), []);
  h.hold.resolve();
  const removed = await removePromise;
  assert.equal(removed.removed, true);
  await Promise.all([h.active, h.use]);
  assert.equal(h.engine.api.engine.state.getRuntime('global.race_use')?.value, false, 'use effect is cancelled after item removal');
  assert.equal(h.engine.api.engine.state.getRuntimeSnapshot('itemInfo.[id].usage', { id: 'race_item' }).current, 0, 'usage is not committed after item removal');
  assert.equal(h.engine.api.engine.state.getRuntime('global.race_equip')?.value, false, 'remove unequip hook runs');
  assert.ok(h.engine.notifications.history.some(n => n.category === 'inventory.use_cancelled' && n.metadata?.useId), 'remove cancellation emits a use_id notification');
  h.engine.dispose();
});
