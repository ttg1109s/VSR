import { importModules } from './imports/index.js';
const __testModules = await importModules(['GameEngine', 'ItemStrategies', 'JsonProtocol']);
const { GameEngine } = __testModules.GameEngine;
const { ItemStrategies } = __testModules.ItemStrategies;
const { JsonProtocol } = __testModules.JsonProtocol;
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const MINIMAL = JSON.parse(readFileSync(new URL('./fixtures/engine/minimal-scenario.json', import.meta.url), 'utf8'));

function baseScenario() {
  const script = structuredClone(MINIMAL);
  script.globalStates.clue_lantern = { type: 'boolean', value: false, title: 'Lantern clue' };
  script.globalStates.item_stress_flag = { type: 'boolean', value: false, title: 'Item stress flag' };
  const character = name => ({
    meta: { name, desc: null },
    set: { linkEffect: false, alert: null, moving: false, move: null },
    stats: {}, inventory: [], hand: [], relationship: [], met: [],
    place: { scene_id: 'start', currentIndex: 0 }, moveList: [], effect: { leave: {} }
  });
  script.characters = { player: character('Player'), mai: character('Mai') };
  script.itemInfo = {};
  for (let i = 0; i < 24; i++) {
    script.itemInfo[`item_${i}`] = {
      name: `Item ${i}`, icon: 'inventory', desc: 'Stress test item', category: 'tool',
      usage: { current: 0, max: 1, autoInc: true }, effect: { use: [] }
    };
  }
  script.itemInfo.lantern = {
    name: 'Lantern', icon: 'light', desc: 'Stress test lantern', category: 'tool',
    usage: { current: 0, max: 1, autoInc: true }, effect: { use: [] }
  };
  script.config.maxInventory = [[20, 'player'], [20, 'mai']];
  script.config.maxHandOn = 2;
  script.config.brokenDisable = false;
  return script;
}

function scenarioWithHookItem() {
  const script = baseScenario();
  script.itemInfo.stress_item = {
    name: 'Stress Item', icon: 'science', desc: 'Temporary test item', category: 'tool',
    usage: { current: 0, max: 2, autoInc: true },
    effect: {
      equip: [{ type: 'set', subtype: 'state', target: 'item_stress_flag', value: true, dataType: 'bool' }],
      unequip: [{ type: 'set', subtype: 'state', target: 'item_stress_flag', value: false, dataType: 'bool' }],
      use: [{ type: 'set', subtype: 'state', target: 'clue_lantern', value: true, dataType: 'bool' }]
    }
  };
  return script;
}

async function createEngine(script = baseScenario()) {
  const engine = new GameEngine();
  await engine.init(structuredClone(script), { enterScene: false });
  return engine;
}



test('item ownership and inventory projection follow entryCharacter without player fallback', async () => {
  const engine = await createEngine(baseScenario());
  const state = engine.api.engine.state;
  state.set('entryCharacter', 'mai');

  assert.equal(engine.getOwnerId(), 'mai');
  assert.equal(engine.addItem('lantern'), true);
  assert.deepEqual(engine.getInventory(), ['lantern']);
  assert.deepEqual(state.getRuntimeSnapshot('characters.[id].inventory', { id: 'player' }), []);

  const snapshot = new JsonProtocol().createSnapshot(engine);
  assert.equal(snapshot.presentation.inventory.ownerId, 'mai');
  assert.equal(snapshot.presentation.inventory.ownerName, 'Mai');
  assert.equal(snapshot.presentation.inventory.itemCount, 1);
  assert.equal(snapshot.presentation.inventory.items[0].id, 'lantern');
  assert.equal(snapshot.presentation.inventory.items[0].missingDefinition, false,
    'known item definitions must be resolved before itemInfo is removed from the public snapshot');
  assert.equal(snapshot.presentation.inventory.missingDefinitionCount, 0,
    'known items must not trigger the missing-definition warning');

  // A legacy/corrupt save can contain an item ID whose definition was removed.
  // Projection must retain a visible fallback card rather than dropping it.
  state.update('itemInfo', items => {
    const next = { ...items };
    delete next.lantern;
    return next;
  });
  const fallbackSnapshot = new JsonProtocol().createSnapshot(engine);
  assert.equal(fallbackSnapshot.presentation.inventory.items.length, 1);
  assert.equal(fallbackSnapshot.presentation.inventory.items[0].missingDefinition, true);
  assert.equal(fallbackSnapshot.presentation.inventory.items[0].canUse, false);
  assert.equal(fallbackSnapshot.presentation.inventory.missingDefinitionCount, 1);
  engine.dispose();
});

test('inventory add rejects unknown item IDs and enforces capacity without duplicates', async () => {
  const engine = await createEngine(baseScenario());
  assert.equal(engine.addItem('not_a_scenario_item'), false);
  assert.deepEqual(engine.getInventory(), []);

  const ids = Array.from({ length: 24 }, (_, i) => `item_${i}`);
  const outcomes = ids.map(id => engine.addItem(id));
  assert.equal(outcomes.filter(Boolean).length, 20);
  assert.equal(outcomes.filter(value => value === false).length, 4);
  assert.equal(engine.getInventory().length, 20);
  assert.equal(engine.addItem(ids[0]), false, 'duplicate item should not be added');
  assert.equal(engine.getInventory().length, 20);
});


test('24 add effects through EffectQueue obey inventory capacity and duplicate rules', async () => {
  const engine = await createEngine(baseScenario());
  const effects = Array.from({ length: 24 }, (_, i) => ({ type: 'item', subtype: 'add', target: `item_${i}` }));
  await engine.processRunnables(effects);
  assert.equal(engine.getInventory().length, 20);
  assert.equal(new Set(engine.getInventory()).size, 20);
  await engine.processRunnables([{ type: 'item', subtype: 'add', target: 'item_0' }]);
  assert.equal(engine.getInventory().length, 20);
});


test('interactive hand and use reject items not owned by active inventory', async () => {
  const engine = await createEngine(baseScenario());
  await engine.toggleHand('lantern');
  await engine.use('lantern');
  assert.deepEqual(engine.getHand(), []);
  assert.deepEqual(engine.getInventory(), []);
  assert.equal(engine.api.engine.state.getRuntime('global.clue_lantern')?.value, false);
});


test('use is rejected unless the item is equipped in hand, with no usage or effect mutation', async () => {
  const engine = await createEngine(scenarioWithHookItem());
  engine.addItem('stress_item');
  let useEffectCount = 0;
  const useNotifications = [];
  const originalNotify = engine.api.notifications.add.bind(engine.api.notifications);
  engine.api.notifications.add = (...args) => {
    useNotifications.push(args);
    return originalNotify(...args);
  };
  const originalProcess = engine.processRunnables.bind(engine);
  engine.processRunnables = async (list, context, isAsync, isFromQueue) => {
    if (context?.hook === 'use' && context.useId && isFromQueue) useEffectCount++;
    return originalProcess(list, context, isAsync, isFromQueue);
  };

  await engine.use('stress_item');
  assert.equal(engine.api.engine.state.getRuntimeSnapshot('itemInfo.[id].usage', { id: 'stress_item' }).current, 0);
  assert.equal(useEffectCount, 0);
  assert.equal(engine.api.engine.state.getRuntime('global.clue_lantern')?.value, false);
  assert.ok(useNotifications.some(args => args[3]?.category === 'inventory.use_not_equipped'), 'use without hand should emit the not-equipped notification');

  await engine.toggleHand('stress_item');
  await engine.use('stress_item');
  assert.equal(engine.api.engine.state.getRuntimeSnapshot('itemInfo.[id].usage', { id: 'stress_item' }).current, 1);
  assert.equal(useEffectCount, 1);
});

test('100 concurrent uses saturate usage at max while broken-use policy is respected', async () => {
  const engine = await createEngine(baseScenario());
  engine.addItem('lantern');
  await engine.toggleHand('lantern');
  engine.getConfig = key => key === 'brokenDisable' ? false : engine.src.config[key];
  let useEffectCount = 0;
  const originalProcess = engine.processRunnables.bind(engine);
  engine.processRunnables = async (list, context, isAsync, isFromQueue) => {
    if (context?.hook === 'use' && context.useId && !isFromQueue) useEffectCount++;
    return originalProcess(list, context, isAsync, isFromQueue);
  };
  await Promise.all(Array.from({ length: 100 }, () => engine.use('lantern')));
  assert.equal(engine.api.engine.state.getRuntime('itemInfo.[id].usage', { id: 'lantern' }).current, 1);
  assert.equal(useEffectCount, 100, 'brokenDisable=false permits use effects after breakage');

  const strict = await createEngine(baseScenario());
  strict.addItem('lantern');
  await strict.toggleHand('lantern');
  strict.getConfig = key => key === 'brokenDisable' ? true : strict.src.config[key];
  let strictEffects = 0;
  const strictProcess = strict.processRunnables.bind(strict);
  strict.processRunnables = async (list, context, isAsync, isFromQueue) => {
    if (context?.hook === 'use' && context.useId && !isFromQueue) strictEffects++;
    return strictProcess(list, context, isAsync, isFromQueue);
  };
  await Promise.all(Array.from({ length: 100 }, () => strict.use('lantern')));
  assert.equal(strict.api.engine.state.getRuntime('itemInfo.[id].usage', { id: 'lantern' }).current, 1);
  assert.equal(strictEffects, 1, 'brokenDisable=true permits only the use that reaches max');
});


test('100 usage effects are serialized and clamp item usage to the configured maximum', async () => {
  const engine = await createEngine(baseScenario());
  const effects = Array.from({ length: 100 }, () => ({ type: 'item', subtype: 'usage', target: 'lantern', value: 1, notify: false }));
  await engine.processRunnables(effects);
  const usage = engine.api.engine.state.getRuntimeSnapshot('itemInfo.[id].usage', { id: 'lantern' });
  assert.equal(usage.current, 1);
  assert.equal(usage.max, 1);
});


test('concurrent equip requests respect ownership and hand capacity', async () => {
  const engine = await createEngine(baseScenario());
  for (const id of ['item_0', 'item_1', 'item_2']) engine.addItem(id);
  await Promise.all(Array.from({ length: 90 }, (_, i) => engine.toggleHand(['item_0', 'item_1', 'item_2'][i % 3])));
  const hand = engine.getHand();
  assert.ok(hand.length <= 2, `hand capacity exceeded: ${hand.length}`);
  assert.ok(hand.every(id => engine.getInventory().includes(id)), 'hand must be a subset of inventory');
  assert.equal(new Set(hand).size, hand.length, 'hand must not contain duplicates');
});


test('concurrent remove is atomic and leaves inventory/hand consistent', async () => {
  const engine = await createEngine(baseScenario());
  engine.addItem('item_0');
  await engine.toggleHand('item_0');
  const results = await Promise.allSettled(Array.from({ length: 25 }, () => engine.removeFromInventory('item_0')));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.filter(r => r.status === 'rejected').length, 24);
  assert.deepEqual(engine.getInventory(), []);
  assert.deepEqual(engine.getHand(), []);
});


test('concurrent transfer is atomic and enforces target inventory ownership', async () => {
  const engine = await createEngine(scenarioWithHookItem());
  engine.addItem('stress_item');
  await engine.toggleHand('stress_item');
  const results = await Promise.allSettled(Array.from({ length: 25 }, () => engine.transferItem('stress_item', 'mai')));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.filter(r => r.status === 'rejected').length, 24);
  assert.deepEqual(engine.getInventory(), []);
  assert.deepEqual(engine.api.engine.state.getRuntimeSnapshot('characters.[id].inventory', { id: 'mai' }), ['stress_item']);
  assert.deepEqual(engine.getHand(), []);
  assert.equal(engine.api.engine.state.getRuntime('global.item_stress_flag')?.value, false);
});


test('interactive remove of equipped item runs unequip hook and commits consistent state', async () => {
  const engine = await createEngine(scenarioWithHookItem());
  engine.addItem('stress_item');
  await engine.toggleHand('stress_item');
  assert.equal(engine.api.engine.state.getRuntime('global.item_stress_flag')?.value, true);
  await engine.removeFromInventory('stress_item');
  assert.deepEqual(engine.getInventory(), []);
  assert.deepEqual(engine.getHand(), []);
  assert.equal(engine.api.engine.state.getRuntime('global.item_stress_flag')?.value, false);
});


test('transfer of equipped item runs unequip hook and atomically moves inventory ownership', async () => {
  const engine = await createEngine(scenarioWithHookItem());
  engine.addItem('stress_item');
  await engine.toggleHand('stress_item');
  assert.equal(engine.api.engine.state.getRuntime('global.item_stress_flag')?.value, true);
  const result = await engine.transferItem('stress_item', 'mai');
  assert.equal(result.transferred, true);
  assert.deepEqual(engine.getInventory(), []);
  assert.deepEqual(engine.getHand(), []);
  assert.deepEqual(engine.api.engine.state.getRuntimeSnapshot('characters.[id].inventory', { id: 'mai' }), ['stress_item']);
  assert.equal(engine.api.engine.state.getRuntime('global.item_stress_flag')?.value, false);
});


test('effect-driven hand_on, hand_off and remove run equip/unequip hooks', async () => {
  const engine = await createEngine(scenarioWithHookItem());
  engine.addItem('stress_item');

  const handOn = await ItemStrategies.hand_on(engine, { target: 'stress_item', notify: false }, {});
  assert.equal(handOn.reason, 'equipped');
  assert.equal(engine.api.engine.state.getRuntime('global.item_stress_flag')?.value, true);

  const handOff = await ItemStrategies.hand_off(engine, { target: 'stress_item', notify: false }, {});
  assert.equal(handOff.reason, 'unequipped');
  assert.equal(engine.api.engine.state.getRuntime('global.item_stress_flag')?.value, false);

  await ItemStrategies.hand_on(engine, { target: 'stress_item', notify: false }, {});
  const removed = await ItemStrategies.remove(engine, { target: 'stress_item', notify: false }, {});
  assert.equal(removed.reason, 'removed_equipped');
  assert.deepEqual(engine.getInventory(), []);
  assert.deepEqual(engine.getHand(), []);
  assert.equal(engine.api.engine.state.getRuntime('global.item_stress_flag')?.value, false);
});


test('effect-driven hand_on refuses unowned item and removal does not remove absent item', async () => {
  const engine = await createEngine(scenarioWithHookItem());
  const handOn = await ItemStrategies.hand_on(engine, { target: 'stress_item', notify: false }, {});
  assert.equal(handOn.reason, 'not_owned');
  const remove = await ItemStrategies.remove(engine, { target: 'stress_item', notify: false }, {});
  assert.equal(remove.reason, 'not_owned');
  assert.deepEqual(engine.getHand(), []);
  assert.deepEqual(engine.getInventory(), []);
});


test('20 concurrent equip toggles with hooks serialize state changes without transaction conflicts', async () => {
  const engine = await createEngine(scenarioWithHookItem());
  engine.addItem('stress_item');
  await Promise.all(Array.from({ length: 20 }, () => engine.toggleHand('stress_item')));
  assert.deepEqual(engine.getHand(), [], 'even number of toggles ends unequipped');
  assert.equal(engine.api.engine.state.getRuntime('global.item_stress_flag')?.value, false);
});


test('25 concurrent remove requests for an equipped hook item have one winner and no transaction conflict', async () => {
  const engine = await createEngine(scenarioWithHookItem());
  engine.addItem('stress_item');
  await engine.toggleHand('stress_item');
  const results = await Promise.allSettled(Array.from({ length: 25 }, () => engine.removeFromInventory('stress_item')));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.filter(r => r.status === 'rejected').length, 24);
  assert.deepEqual(engine.getInventory(), []);
  assert.deepEqual(engine.getHand(), []);
  assert.equal(engine.api.engine.state.getRuntime('global.item_stress_flag')?.value, false);
});


test('item effects through the real EffectQueue await hand_on, hand_off and remove hooks', async () => {
  const engine = await createEngine(scenarioWithHookItem());
  engine.addItem('stress_item');
  await engine.processRunnables([{ type: 'item', subtype: 'hand_on', target: 'stress_item', notify: false }]);
  assert.deepEqual(engine.getHand(), ['stress_item']);
  assert.equal(engine.api.engine.state.getRuntime('global.item_stress_flag')?.value, true);

  await engine.processRunnables([{ type: 'item', subtype: 'hand_off', target: 'stress_item', notify: false }]);
  assert.deepEqual(engine.getHand(), []);
  assert.equal(engine.api.engine.state.getRuntime('global.item_stress_flag')?.value, false);

  await engine.processRunnables([{ type: 'item', subtype: 'hand_on', target: 'stress_item', notify: false }]);
  await engine.processRunnables([{ type: 'item', subtype: 'remove', target: 'stress_item', notify: false }]);
  assert.deepEqual(engine.getInventory(), []);
  assert.deepEqual(engine.getHand(), []);
  assert.equal(engine.api.engine.state.getRuntime('global.item_stress_flag')?.value, false);
});
