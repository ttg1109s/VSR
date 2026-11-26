import { importModules } from './imports/index.js';
const { EntitySystem } = await importModules(['EntitySystem']).then(x => x.EntitySystem);
import test from 'node:test';
import assert from 'node:assert/strict';

function makeHarness({ scenes = ['a', 'b', 'c'], onEffect = async () => {} } = {}) {
  const character = (start, targets) => ({
    set: { moving: true, move: 'list' }, place: { scene_id: start, currentIndex: 0 },
    moveList: [{ entryId: `${start}-0`, scene_id: start, count: -1, countVisited: 0, loop: { leave: [{}] } },
      ...targets.map((scene, i) => ({ entryId: `${start}-${i+1}`, scene_id: scene, count: -1, countVisited: 0, loop: { enter: [{}] } }))],
    effect: { leave: {}, meeting: {} }, met: []
  });
  const data = { characters: { npc: character('a', ['b', 'c']), npc2: character('a', ['b', 'c']) },
    scenes: Object.fromEntries(scenes.map(id => [id, { blocked: false, activeRouterId: '' }])), sceneId: 'player-scene',
    entryCharacter: 'player', faker: { active: false, targetId: null }, playerMoveHistory: [] };
  const state = {
    getRuntimeSnapshot(path, p = {}) { if (path === 'characters') return data.characters; if (path === 'characters.[id]') return data.characters[p.id]; if (path === 'scenes.[id]') return data.scenes[p.id]; if (path === 'faker') return data.faker; if (path === 'playerMoveHistory') return data.playerMoveHistory; },
    get(path, p = {}) { if (path === 'sceneId') return data.sceneId; if (path === 'entryCharacter') return data.entryCharacter; if (path === 'scene.blocked') return data.scenes[p.id]?.blocked; if (path === 'scene.activeRouterId') return data.scenes[p.id]?.activeRouterId; if (path === 'router.blocked') return false; },
    has(path, p = {}) { return path === 'scene.blocked' && !!data.scenes[p.id]; },
    update(path, updater, p = {}) { if (path !== 'characters.[id]') throw Error(`Unexpected update ${path}`); data.characters[p.id] = updater(data.characters[p.id]); return data.characters[p.id]; }
  };
  const taskManager = { plan: {}, kill(id) { delete this.plan[id]; }, addNew(id, config) { this.plan[id] = config; }, operator() {} };
  const engine = Object.assign({}, EntitySystem, { api: { engine: { state }, presentation: { components: { updateCharacterList() {} } } }, taskManager, getConfig: () => 0,
    processRunnables: async (_list, context) => onEffect(context, engine, data) });
  return { engine, data };
}

function fixedRandom(fn) { const old = Math.random; Math.random = () => 0; return Promise.resolve().then(fn).finally(() => { Math.random = old; }); }

test('C1: 100 leave-effect rejects cancel movement without committing counters; recovery succeeds', async () => {
  let rejectLeave = true;
  const { engine, data } = makeHarness({ onEffect: async context => { if (context.hook === 'leave' && rejectLeave) throw new Error('leave rejected'); } });
  const originalError = console.error; console.error = () => {};
  try {
    for (let i = 0; i < 100; i++) {
      const token = engine.createCharacterVisitToken('npc');
      await engine.performCharacterMove('npc', token);
      assert.equal(data.characters.npc.place.scene_id, 'a');
      assert.equal(data.characters.npc.moveList[1].countVisited, 0);
      assert.equal(data.characters.npc.moveList[1].count, -1);
    }
    rejectLeave = false;
    await fixedRandom(() => engine.executeCharacterMove('npc'));
    assert.equal(data.characters.npc.place.scene_id, 'b');
    assert.equal(data.characters.npc.moveList[1].countVisited, 1);
  } finally { console.error = originalError; }
});

test('C2: leave hook nested navigation invalidates source visit and cancels commit', async () => {
  let marker = 0;
  const { engine, data } = makeHarness({ onEffect: async (context, e, d) => { if (context.hook === 'leave') { d.sceneId = 'nested-scene'; e.invalidateCharacterVisit('npc'); marker++; } } });
  await fixedRandom(() => engine.executeCharacterMove('npc'));
  assert.equal(marker, 1);
  assert.equal(data.characters.npc.place.scene_id, 'a');
  assert.equal(data.characters.npc.moveList[1].countVisited, 0);
});

test('C3: nested navigation during enter invalidates visit token; committed move is retained and no stale tasks scheduled', async () => {
  const { engine, data } = makeHarness({ onEffect: async (context, e, d) => { if (context.hook === 'enter') { d.sceneId = 'nested-scene'; e.invalidateCharacterVisit('npc'); } } });
  await fixedRandom(() => engine.executeCharacterMove('npc'));
  assert.equal(data.characters.npc.place.scene_id, 'b');
  assert.equal(data.characters.npc.moveList[1].countVisited, 1);
  assert.equal(engine.getCharacterVisitToken('npc'), null);
  assert.equal(engine.taskManager.plan.move_char_npc, undefined);
});

test('C4: identity/Faker switch while leave effect awaits prevents stale commit', async () => {
  let release; const gate = new Promise(resolve => release = resolve);
  const { engine, data } = makeHarness({ onEffect: async context => { if (context.hook === 'leave') await gate; } });
  const token = engine.createCharacterVisitToken('npc');
  const moving = engine.performCharacterMove('npc', token);
  data.faker = { active: true, targetId: 'npc' };
  release(); await moving;
  assert.equal(data.characters.npc.place.scene_id, 'a');
  assert.equal(data.characters.npc.moveList[1].countVisited, 0);
});

test('C5: concurrent movements of two Characters complete independently and counters remain valid', async () => {
  const { engine, data } = makeHarness();
  await fixedRandom(() => Promise.all([engine.executeCharacterMove('npc'), engine.executeCharacterMove('npc2')]));
  for (const id of ['npc', 'npc2']) {
    assert.equal(data.characters[id].place.scene_id, 'b');
    assert.equal(data.characters[id].moveList[1].countVisited, 1);
    assert.ok(data.characters[id].moveList.every(entry => Number.isSafeInteger(entry.countVisited) && entry.countVisited >= 0));
  }
});

test('C6: runtime reset invalidation during enter await prevents continuation scheduling', async () => {
  let release; const gate = new Promise(resolve => release = resolve);
  const { engine, data } = makeHarness({ onEffect: async (context, e) => { if (context.hook === 'enter') { await gate; e.invalidateCharacterVisit('npc'); } } });
  const move = fixedRandom(() => engine.executeCharacterMove('npc'));
  await Promise.resolve(); await Promise.resolve();
  engine.invalidateCharacterVisit('npc'); release(); await move;
  assert.equal(data.characters.npc.place.scene_id, 'b');
  assert.equal(engine.getCharacterVisitToken('npc'), null);
  assert.equal(engine.taskManager.plan.move_char_npc, undefined);
});
