import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { importModules } from './imports/index.js';
const { GameEngine } = (await importModules(['GameEngine'])).GameEngine;
const { TaskManager } = (await importModules(['TaskManager'])).TaskManager;
const BASE = JSON.parse(await readFile(new URL('./fixtures/engine/minimal-scenario.json', import.meta.url), 'utf8'));

class FakeClock {
  time = 0; nextId = 0; timers = new Map();
  now = () => this.time;
  setTimeout = (cb, delay) => { const id = ++this.nextId; this.timers.set(id, { at: this.time + delay, cb }); return id; };
  clearTimeout = id => this.timers.delete(id);
  async advance(ms) {
    const target = this.time + ms;
    while (true) {
      const due = [...this.timers.entries()].filter(([, t]) => t.at <= target).sort((a,b)=>a[1].at-b[1].at)[0];
      if (!due) break;
      const [id, timer] = due; this.timers.delete(id); this.time = timer.at; timer.cb();
      await Promise.resolve(); await Promise.resolve(); await new Promise(r => setImmediate(r));
    }
    this.time = target; await Promise.resolve(); await new Promise(r => setImmediate(r));
  }
}
const char = (id, from, to, still = []) => ({
  meta: { name: id, desc: 'simultaneous lifecycle stress' },
  set: { linkEffect: false, alert: null, moving: true, move: 'list' },
  stats: {}, inventory: [], hand: [], met: [], relationship: [],
  place: { scene_id: from, currentIndex: 0 },
  moveList: [
    { entryId: `${id.replaceAll("_", "")}.from`, scene_id: from, count: -1, countVisited: 0, nextStep: 100, loop: { leave: [{ type: 'set', subtype: 'state', target: `${id}_leave`, value: true, dataType: 'bool' }], enter: [], still: [] } },
    { entryId: `${id.replaceAll("_", "")}.to`, scene_id: to, count: -1, countVisited: 0, nextStep: 100, stillActive: still.length ? 1 : undefined, loop: { leave: [], enter: [{ type: 'set', subtype: 'state', target: `${id}_enter`, value: true, dataType: 'bool' }], still } }
  ],
  effect: { leave: {} }
});
function makeScenario() {
  const s = structuredClone(BASE);
  for (const id of ['scene_a','scene_b','meeting']) {
    s.scenes[id] = { meta: { title: id }, set: { activeRouterId: `main_${id}`, transition: 'fade', transitionDuration: 0.001 }, routers: {
      [`main_${id}`]: { meta: { subTitleStatus: 'Main' }, set: { blocked: false, visited: false, countVisited: 0 }, actions: [] }
    }};
  }
  s.scenes.meeting.routers.main_meeting.set = { ...s.scenes.meeting.routers.main_meeting.set, timer: true, timerSeconds: 1.5, timerDisplay: 'dec', timerEnd: 'still' };
  s.scenes.meeting.routers.main_meeting.timer = { start: [], end: [{ type: 'set', subtype: 'state', target: 'timer_end_hit', value: true, dataType: 'bool' }] };
  s.characters ||= {};
  s.characters.npc_a = char('npc_a','scene_a','meeting',[{ type: 'set', subtype: 'state', target: 'still_a', value: true, dataType: 'bool' }]);
  s.characters.npc_b = char('npc_b','scene_b','meeting',[{ type: 'set', subtype: 'state', target: 'still_b', value: true, dataType: 'bool' }]);
  s.characters.player ||= char('player','meeting','meeting');
  s.characters.player.set.moving = false; s.characters.player.set.move = null;
  s.itemInfo.stress_item = { name: 'Stress Item', icon: 'test', desc: 'stress', category: 'tool', usage: { current: 0, max: 5, autoInc: true }, effect: {
    equip: [{ type: 'set', subtype: 'state', target: 'item_eq', value: true, dataType: 'bool' }],
    unequip: [{ type: 'set', subtype: 'state', target: 'item_uneq', value: true, dataType: 'bool' }],
    use: [{ type: 'set', subtype: 'state', target: 'item_use', value: true, dataType: 'bool' }]
  }};
  s.globalStates ||= {};
  for (const id of ['still_a','still_b','automation_tick','timer_end_hit','item_eq','item_uneq','item_use','npc_a_leave','npc_b_leave','npc_a_enter','npc_b_enter','player_leave','player_enter']) s.globalStates[id] = { type: 'boolean', value: false, title: id };
  s.templates.automation = { coincident: { set: { move: 'step_by_step', moveDirection: 'first', numberCycleAllow: 1, countCurrent: 0, runInfinity: false, banClick: false }, plan: [{ seconds: 1, effect: [{ type: 'set', subtype: 'state', target: 'automation_tick', value: true, dataType: 'bool' }] }] } };
  s.chat.chat_stress = { meta: { title: 'Stress Chat', loop: false, sender: 'npc_a', entry: 'block_1', to: ['player'] }, block: { block_1: { line: [{ char_id: 'npc_a', text: 'simultaneous chat trigger' }], choiced: false } }, choice: {} };
  return s;
}
async function createEngine(clock = null) {
  const tm = clock ? new TaskManager({}, 120, { clock }) : undefined;
  const e = new GameEngine({ taskManager: tm, clock: clock?.now });
  await e.init(makeScenario(), { enterScene: false });
  e.api.presentation.navigation.setBlocking = () => {};
  e.api.presentation.chat.toggleOverlay = () => {};
  e.api.presentation.chat.render = () => {};
  e.api.presentation.chat.hide = () => {};
  e.api.presentation.components.updateCharacterList = () => {};
  e.api.presentation.components.updateItemModal = () => {};
  e.api.presentation.components.explorer = () => {};
  e.api.presentation.scene.transition = async () => {};
  e.api.presentation.scene.renderReady = async () => ({ status: 'ready' });
  e.render = () => {};
  e.pauseBackgroundTasks = () => {};
  e.resumeBackgroundTasks = () => {};
  return e;
}
const state = e => e.api.engine.state;
async function drain(e, ms=4000) {
  const until = Date.now()+ms;
  while(Date.now()<until) {
    const r=e.runtime;
    if(!r?.isSyncQueueRunning&&!r?.isAsyncQueueRunning&&r?.effectQueue?.sync?.length===0&&r?.effectQueue?.async?.length===0) return;
    await new Promise(r=>setTimeout(r,5));
  }
  throw new Error('queue drain timeout');
}
function prepareMove(e,id) { e.taskManager.kill(`move_char_${id}`); e.invalidateCharacterVisit(id); return e.createCharacterVisitToken(id); }

// Two NPCs arrive at the same location concurrently, execute Leave/Enter, and are then
// checked for encounter/meeting-hook behavior. The existing engine intentionally does
// not auto-mark met or dispatch meeting effects from a movement commit.
test('simultaneous Character meeting arrivals and departures serialize per Character and commit shared destination', async (t) => {
  const e = await createEngine(); t.after(() => e.dispose()); await e.enterScene('meeting', true);
  let leaveA=0,leaveB=0,enterA=0,enterB=0;
  const effectCounts = { npc_a_leave: 0, npc_a_enter: 0, npc_b_leave: 0, npc_b_enter: 0 };
  const originalApply = e.applyEffect.bind(e);
  e.applyEffect = async function(eff,...args) { if (Object.hasOwn(effectCounts, eff?.target)) effectCounts[eff.target]++; return originalApply(eff,...args); };
  const original=e.processRunnables.bind(e);
  e.processRunnables=async (list,ctx,...args)=>{
    if(ctx?.charId==='npc_a'&&ctx.hook==='leave')leaveA++;
    if(ctx?.charId==='npc_b'&&ctx.hook==='leave')leaveB++;
    if(ctx?.charId==='npc_a'&&ctx.hook==='enter')enterA++;
    if(ctx?.charId==='npc_b'&&ctx.hook==='enter')enterB++;
    return original(list,ctx,...args);
  };
  const ta=prepareMove(e,'npc_a'),tb=prepareMove(e,'npc_b');
  const results=await Promise.all([e.performCharacterMove('npc_a',ta),e.performCharacterMove('npc_b',tb)]);
  await drain(e);
  assert.deepEqual(results.map(r=>r?.status),['moved','moved']);
  for(const id of ['npc_a','npc_b']) { const c=state(e).getRuntimeSnapshot('characters.[id]',{id}); assert.equal(c.place.scene_id,'meeting'); assert.equal(c.moveList[1].countVisited,1); }
  assert.deepEqual([leaveA,leaveB,enterA,enterB],[2,2,2,2], 'outer enqueue and queued execution both pass through the wrapper');
  assert.deepEqual(effectCounts,{npc_a_leave:1,npc_a_enter:1,npc_b_leave:1,npc_b_enter:1},'actual runnable effects execute exactly once on first arrival');
  for (const key of ['npc_a_leave','npc_b_leave','npc_a_enter','npc_b_enter']) assert.equal(state(e).getRuntime(`global.${key}`)?.value,true,key);
  assert.deepEqual(state(e).getRuntimeSnapshot('characters.[id]',{id:'npc_a'}).met,[]);
  assert.deepEqual(state(e).getRuntimeSnapshot('characters.[id]',{id:'npc_b'}).met,[]);
  for (const id of ['npc_a','npc_b']) {
    const c=state(e).getRuntimeSnapshot('characters.[id]',{id});
    c.moveList[1].loop.leave = [{type:'set',subtype:'state',target:`${id}_leave`,value:true,dataType:'bool'}];
    c.moveList.push({entryId:`${id.replaceAll('_','')}.exit`,scene_id:id==='npc_a'?'scene_a':'scene_b',count:-1,countVisited:0,nextStep:100,loop:{leave:[],enter:[{type:'set',subtype:'state',target:`${id}_enter`,value:true,dataType:'bool'}],still:[]}});
    state(e).set('characters.[id]',c,{id});
  }
  const exitTokens=['npc_a','npc_b'].map(id=>prepareMove(e,id));
  const exits=await Promise.all(['npc_a','npc_b'].map((id,i)=>e.performCharacterMove(id,exitTokens[i])));
  await drain(e);
  assert.deepEqual(exits.map(r=>r?.status),['moved','moved']);
  assert.equal(state(e).getRuntimeSnapshot('characters.[id]',{id:'npc_a'}).place.scene_id,'scene_a');
  assert.equal(state(e).getRuntimeSnapshot('characters.[id]',{id:'npc_b'}).place.scene_id,'scene_b');
  assert.equal(effectCounts.npc_a_leave,2); assert.equal(effectCounts.npc_a_enter,2);
  assert.equal(effectCounts.npc_b_leave,2); assert.equal(effectCounts.npc_b_enter,2);
  e.dispose();
});

test('Character Still loop and Automation effect fire on the same fake-clock tick while arrivals are co-located', async (t) => {
  const clock=new FakeClock(),e=await createEngine(clock); t.after(() => e.dispose()); await e.enterScene('meeting',true);
  for(const id of ['npc_a','npc_b']) { const token=prepareMove(e,id); await e.performCharacterMove(id,token); }
  await drain(e);
  e.runAutomation('coincident');
  await clock.advance(1000); await drain(e);
  assert.equal(state(e).getRuntime('global.still_a')?.value,true);
  assert.equal(state(e).getRuntime('global.still_b')?.value,true);
  assert.equal(state(e).getRuntime('global.automation_tick')?.value,true);
  assert.equal(e.runtime.isAsyncQueueRunning,false);
  assert.equal(e.runtime.effectQueue.async.length,0);
  e.stopAutomation('coincident'); e.dispose();
});

test('Router timer-end, Item equip/unequip/use effects execute in overlapping lifecycle window', async (t) => {
  const clock=new FakeClock(),e=await createEngine(clock); t.after(() => e.dispose()); await e.enterScene('meeting',true);
  e.addItem('stress_item');
  await e.toggleHand('stress_item');
  await e.toggleHand('stress_item');
  await e.toggleHand('stress_item');
  await e.use('stress_item');
  await drain(e);
  await clock.advance(1500); await drain(e);
  assert.equal(state(e).getRuntime('global.timer_end_hit')?.value,true);
  assert.equal(state(e).getRuntime('global.item_eq')?.value,true);
  assert.equal(state(e).getRuntime('global.item_uneq')?.value,true);
  assert.equal(state(e).getRuntime('global.item_use')?.value,true);
  assert.equal(state(e).getRuntimeSnapshot('itemInfo.[id].usage',{id:'stress_item'}).current,1);
  assert.equal(e.runtime.effectQueue.sync.length,0); assert.equal(e.runtime.effectQueue.async.length,0);
  e.dispose();
});

test('goto chat from runnable starts real Chat lifecycle while Character and queue stress is active', async (t) => {
  const e=await createEngine(); t.after(() => e.dispose()); await e.enterScene('meeting',true);
  const p=e.processRunnables([{type:'goto',subtype:'chat',target:'chat_stress'}],{sceneId:'meeting'},false);
  await p; await drain(e);
  const chatState=state(e).getSession('chatState');
  assert.equal(chatState?.active,true);
  assert.equal(chatState?.id,'chat_stress');
  assert.equal(state(e).getSnapshot('chat.history',{id:'chat_stress'}).length,1);
  assert.equal(e.runtime.isSyncQueueRunning,false);
  assert.equal(e.runtime.effectQueue.sync.length,0);
  e.dispose();
});
