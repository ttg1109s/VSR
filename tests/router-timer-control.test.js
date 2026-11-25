import { importModules } from './imports/index.js';
const __testModules = await importModules(["TaskManager","SceneSystem","Scenario","ActionSystem"]);
const { TaskManager } = __testModules.TaskManager;
const { SceneSystem } = __testModules.SceneSystem;
const { validateScenario } = __testModules.Scenario;
const { ActionSystem } = __testModules.ActionSystem;

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';




function fakeClock() {
  let now = 1000;
  const timers = new Map();
  let sequence = 0;
  return {
    now: () => now,
    setTimeout(fn, ms) { const id=++sequence; timers.set(id,{fn,ms}); return id; },
    clearTimeout(id) { timers.delete(id); },
    advance(ms) { now += ms; },
  };
}
function timerHarness({ loop = {}, timer = {} } = {}) {
  const clock = fakeClock();
  const taskManager = new TaskManager({}, 120, { clock });
  const sceneId='scene_a', routerId='router_a';
  const endId='timer_end_scene_a_router_a', uiId='timer_ui_scene_a_router_a';
  taskManager.addNew(endId,{time:30000,mode:'timeout',count:1,exe:()=>{}});
  taskManager.operator(endId,'enabled');
  taskManager.addNew(uiId,{time:1000,mode:'timeout',exe:()=>{}});
  taskManager.operator(uiId,'enabled');
  const events=[];
  const engine={
    taskManager,
    src:{path:{routers:{router_a:sceneId}},scenes:{scene_a:{routers:{router_a:{loop,timer}}}}},
    timerState:{active:true,sceneId,routerId,mode:'dec',maxSeconds:30,remainingSeconds:30,paused:false},
    api:{engine:{state:{get:(path,ctx)=>path==='sceneId'?sceneId:routerId}},presentation:{scene:{updateTimer(){},hideTimer(){}}}},
    protocol:{publish:(event,payload)=>events.push({event,payload})},
    updateTimerUI:SceneSystem.updateTimerUI
  };
  return {engine,taskManager,events,endId,uiId,clock};
}
test('router timer control pauses and resumes both timeout and UI tasks',()=>{
  const h=timerHarness();
  const pause=SceneSystem.controlRouterTimer.call(h.engine,'router_a','pause',{});
  assert.equal(pause.success,true);
  assert.equal(h.taskManager.plan[h.endId].isPaused,true);
  assert.equal(h.taskManager.plan[h.uiId].isPaused,true);
  assert.equal(h.engine.timerState.paused,true);
  const resume=SceneSystem.controlRouterTimer.call(h.engine,'router_a','resume',{});
  assert.equal(resume.success,true);
  assert.equal(h.taskManager.plan[h.endId].isPaused,false);
  assert.equal(h.taskManager.plan[h.uiId].isPaused,false);
  assert.equal(h.engine.timerState.paused,false);
  assert.equal(h.events.length,3);
  assert.equal(h.events[0].event,'router.timer.tick');
  assert.equal(h.events[1].event,'router.timer.control');
  assert.equal(h.events[2].event,'router.timer.control');
});
test('timer control is a no-op if the target timer is not active',()=>{
  const h=timerHarness();
  h.taskManager.kill(h.endId);
  const result=SceneSystem.controlRouterTimer.call(h.engine,'router_a','pause',{});
  assert.equal(result.success,false);
  assert.equal(result.reason,'timer_not_active');
});
test('timer control is forbidden from its own router loop and timer hooks',()=>{
  const h=timerHarness({loop:{enter:[{}]},timer:{start:[{}]}});
  assert.equal(SceneSystem.controlRouterTimer.call(h.engine,'router_a','pause',{sceneId:'scene_a',routerId:'router_a',hook:'enter'}).reason,'forbidden_self_hook');
  assert.equal(SceneSystem.controlRouterTimer.call(h.engine,'router_a','pause',{sceneId:'scene_a',routerId:'router_a',hook:'t_start'}).reason,'forbidden_self_hook');
});
test('timer hook guard does not block non-router hook contexts',()=>{
  const h=timerHarness({loop:{enter:[{}]}});
  const result=SceneSystem.controlRouterTimer.call(h.engine,'router_a','pause',{sceneId:'scene_a',routerId:'router_a',hook:'enter',charId:'npc_a'});
  assert.equal(result.success,true);
});
test('scenario schema accepts router timer-control effect syntax',()=>{
  const scenario=JSON.parse(readFileSync(new URL('./fixtures/engine/minimal-scenario.json',import.meta.url),'utf8'));
  scenario.scenes.start.routers.main.loop={enter:[{type:'timer',subtype:'router',target:'main',control:'pause'}]};
  assert.deepEqual(validateScenario(scenario),[]);
});


test('scenario schema accepts timer resume in action effects',()=>{
  const scenario=JSON.parse(readFileSync(new URL('./fixtures/engine/minimal-scenario.json',import.meta.url),'utf8'));
  scenario.actions.test_action.effect={normal:[],pass:[{type:'timer',subtype:'router',target:'main',control:'resume'}],fail:[]};
  assert.deepEqual(validateScenario(scenario),[]);
});

test('action cooldown control pauses and resumes only a real runtime cooldown',()=>{
  let runtime={cooldownEnd:Date.now()+5000,cooldownDuration:5};
  const engine={src:{actions:{action_a:{set:{cooldown:5}}}},api:{engine:{state:{getRuntimeSnapshot:()=>runtime,update:(path,fn)=>{runtime=fn(runtime);}}}},protocol:{publish(){}},commitState(){}};
  const pause=ActionSystem.controlActionCooldown.call(engine,'action_a','pause');
  assert.equal(pause.success,true); assert.equal(runtime.cooldownPaused,true); assert.equal(runtime.cooldownEnd,null);
  const resume=ActionSystem.controlActionCooldown.call(engine,'action_a','resume');
  assert.equal(resume.success,true); assert.equal(runtime.cooldownPaused,false); assert.ok(runtime.cooldownEnd>Date.now());
});
test('cooldown control refuses inactive cooldown and action without cooldown config',()=>{
  let runtime={cooldownEnd:0};
  const engine={src:{actions:{action_a:{set:{cooldown:5}},action_b:{set:{}}}},api:{engine:{state:{getRuntimeSnapshot:()=>runtime,update(){}}}},protocol:{publish(){}},commitState(){}};
  assert.equal(ActionSystem.controlActionCooldown.call(engine,'action_a','pause').reason,'cooldown_not_active');
  assert.equal(ActionSystem.controlActionCooldown.call(engine,'action_b','pause').reason,'cooldown_not_found');
});
