import { importModules } from './imports/index.js';
const modules = await importModules(['Scenario','GameEngine','EffectStrategies','JsonClient']);
const { validateScenario } = modules.Scenario;
const { GameEngine } = modules.GameEngine;
const { SetStrategies } = modules.EffectStrategies;
const { JsonClient, evaluateSpriteEasing, sampleSpriteTrajectoryV2, getSpriteTrajectoryAck } = modules.JsonClient;
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Ajv from '../engine/schema/valid.js';
import { createBezierTrajectory, AuthoritativeSpriteSimulation } from '../engine/modules/sprite-motion-v2/index.js';

const fixture = () => JSON.parse(readFileSync(new URL('./fixtures/engine/minimal-scenario.json', import.meta.url), 'utf8'));
function spriteScenario({collision=false,physics=false}={}) {
  const s=fixture(); delete s.scenes.start.routers.main.actions;
  s.sprite={
    mover:{action:'test_action',layer:2,state:{idle:'mover.png'},position:[0,0,0],transform:{scale:1,rotate:0},collision:{enable:true,radius:10},physics:{mass:1,restitution:0.8,friction:0},motion:{enable:true,duration:1000,path:{point:[[],'geometry-preserving']},easing:'linear',impact:{enable:collision,physics},physics:{horizon:1,restitution:0.8,friction:0,gravity:[0,0,0]},effect:{start:[],end:[]}}},
    wall:{action:'test_action',layer:2,state:{idle:'wall.png'},position:[50,0,0],transform:{scale:1,rotate:0},collision:{enable:true,radius:10},physics:{mass:2,restitution:0.8,friction:0},motion:{enable:false,duration:0,path:{point:[[],'geometry-preserving']},easing:'linear'}}
  };
  s.scenes.start.routers.main.meta.sprite=true;s.scenes.start.routers.main.sprites=['mover','wall'];
  s.config.allDescRead=true;s.actions.test_action.meta.desc='Sprite action';s.actions.test_action.set.readDesc=true;
  s.actions.test_action.effect={normal:[{type:'set',subtype:'sprite',target:'mover',property:'state',value:'idle'}]};
  return s;
}

function dispatch(engine,command,payload={}) { return engine.protocol.dispatch(engine.protocol.createCommand(command,payload)); }

test('scenario schema accepts v2 collision and physics configuration and rejects invalid physical properties',()=>{
  const scenario=spriteScenario({collision:true,physics:true});assert.deepEqual(validateScenario(scenario),[]);
  scenario.sprite.mover.physics.mass=0;assert.ok(validateScenario(scenario).length>0);
});

test('Sprite teleport commits position directly while active motion keeps authoritative start position',async()=>{
  const engine=new GameEngine();
  try {
    const scenario=spriteScenario();scenario.sprite.mover.motion.enable=false;
    await engine.init(scenario,{enterScene:true});
    SetStrategies.sprite(engine,{target:'mover',property:'position',value:[null,7,null]});
    assert.deepEqual(engine.api.engine.state.getRuntimeSnapshot('sprites.[id]',{id:'mover'}).position,[0,7,0]);
    assert.deepEqual(engine.api.engine.state.getRuntimeSnapshot('sprites.[id]',{id:'mover'}).position,[0,7,0]);
  } finally {engine.dispose();}
});


test('Active trajectory preserves runtime start until validated presentation ACK',async()=>{
  const engine=new GameEngine();
  try {
    await engine.init(spriteScenario(),{enterScene:true});
    SetStrategies.sprite(engine,{target:'mover',property:'position',value:[100,0,0]});
    const start=engine.api.engine.state.getRuntimeSnapshot('sprites.[id]',{id:'mover'}).position;
    assert.deepEqual(start,[0,0,0]);
    const payload=engine.protocol.eventLog.find(e=>e.event==='presentation.sprite.trajectory.v2').payload;
    const ack=getSpriteTrajectoryAck(payload,'mover',payload.endTime,payload.presentation.requiredSegments);
    const result=await dispatch(engine,'sprite.motion.presentation.ack',ack);
    assert.equal(result.result.success,true);
    assert.deepEqual(engine.api.engine.state.getRuntimeSnapshot('sprites.[id]',{id:'mover'}).position,payload.finalPositions.mover);
  } finally {engine.dispose();}
});

test('Engine generates authoritative first-impact and post-impact trajectories for both bodies',async()=>{
  const engine=new GameEngine();
  try {
    await engine.init(spriteScenario({collision:true,physics:true}),{enterScene:true});
    SetStrategies.sprite(engine,{target:'mover',property:'position',value:[100,0,0]});
    const event=engine.protocol.eventLog.filter(e=>e.event==='presentation.sprite.trajectory.v2').at(-1);assert.ok(event);
    const payload=event.payload;assert.equal(payload.protocolVersion,2);assert.equal(payload.impacts.length,1);
    const impact=payload.impacts[0];assert.ok(impact.time>0&&impact.time<1);assert.ok(impact.physicsEnabled);
    assert.ok(payload.trajectories.mover.some(seg=>seg.type==='physics'));
    assert.ok(payload.trajectories.wall.some(seg=>seg.type==='physics'));
    assert.notDeepEqual(payload.finalPositions.wall,[50,0,0]);
  } finally {engine.dispose();}
});

test('Impact-enabled motion with no collision ACKs at initial trajectory duration, not physics horizon',async()=>{
  const engine=new GameEngine();
  try {
    const scenario=spriteScenario({collision:true,physics:true});scenario.sprite.wall.position=[500,0,0];scenario.sprite.wall.collision.radius=1;
    await engine.init(scenario,{enterScene:true});SetStrategies.sprite(engine,{target:'mover',property:'position',value:[100,0,0]});
    const payload=engine.protocol.eventLog.find(e=>e.event==='presentation.sprite.trajectory.v2').payload;assert.equal(payload.impacts.length,0);assert.equal(payload.endTime,1);
    const ack=getSpriteTrajectoryAck(payload,'mover',payload.endTime,payload.presentation.requiredSegments);const result=await dispatch(engine,'sprite.motion.presentation.ack',ack);assert.equal(result.result.success,true);
  } finally {engine.dispose();}
});

test('Collision simulation uses moving target trajectory and supersedes target motion only when collision affects it',async()=>{
  const engine=new GameEngine();
  try {
    const scenario=spriteScenario({collision:true,physics:true});scenario.sprite.wall.motion={enable:true,duration:1000,path:{point:[[{x:50,y:20,z:0}],'absolute']},easing:'linear',impact:{enable:false,physics:false},physics:{horizon:1,restitution:0.5,friction:0,gravity:[0,0,0]},effect:{start:[],end:[]}};
    await engine.init(scenario,{enterScene:true});
    SetStrategies.sprite(engine,{target:'wall',property:'position',value:[80,0,0]});
    const wallMotion=engine.activeSpriteMotions.get('wall');assert.ok(wallMotion);
    SetStrategies.sprite(engine,{target:'mover',property:'position',value:[100,0,0]});
    const event=engine.protocol.eventLog.filter(e=>e.event==='presentation.sprite.trajectory.v2').at(-1);assert.ok(event);
    assert.ok(event.payload.impacts.some(impact=>impact.spriteA==='mover'||impact.spriteB==='mover'));
    assert.equal(engine.activeSpriteMotions.has('wall'),false);
    assert.ok(engine.protocol.eventLog.some(e=>e.event==='presentation.sprite.trajectory.cancelled'&&e.payload.reason==='collision-superseded'));
    assert.ok(event.payload.trajectories.wall);
    const wallInitial=event.payload.trajectories.wall.find(seg=>seg.type==='bezier');assert.ok(wallInitial);assert.ok(wallInitial.controlPoints.some(point=>Math.abs(point[1])>1e-3),'active curved target should preserve/rebase curvature instead of linear extrapolation');
  } finally {engine.dispose();}
});

test('Presentation ACK validates trajectory identity, all required segments and final time before runtime commit/end effects',async()=>{
  const engine=new GameEngine();
  try {
    await engine.init(spriteScenario({collision:true,physics:true}),{enterScene:true});
    SetStrategies.sprite(engine,{target:'mover',property:'position',value:[100,0,0]});
    const payload=engine.protocol.eventLog.find(e=>e.event==='presentation.sprite.trajectory.v2').payload;
    const ack=getSpriteTrajectoryAck(payload,'mover',payload.endTime,payload.presentation.requiredSegments);
    const premature=await dispatch(engine,'sprite.motion.presentation.ack',{...ack,presentedThroughTime:payload.endTime-0.1});
    assert.equal(premature.result.reason,'presentation_incomplete');
    const wrong=await dispatch(engine,'sprite.motion.presentation.ack',{...ack,trajectoryId:'stale'});assert.equal(wrong.result.reason,'stale_ack');
    const completed=await dispatch(engine,'sprite.motion.presentation.ack',ack);assert.equal(completed.result.success,true);
    const mover=engine.api.engine.state.getRuntimeSnapshot('sprites.[id]',{id:'mover'}).position;
    const wall=engine.api.engine.state.getRuntimeSnapshot('sprites.[id]',{id:'wall'}).position;
    assert.deepEqual(mover,payload.finalPositions.mover);assert.deepEqual(wall,payload.finalPositions.wall);
    const duplicate=await dispatch(engine,'sprite.motion.presentation.ack',ack);assert.equal(duplicate.result.duplicate,true);
    const alteredDuplicate=await dispatch(engine,'sprite.motion.presentation.ack',{...ack,spriteId:'wall'});assert.equal(alteredDuplicate.result.reason,'stale_ack');
  } finally {engine.dispose();}
});

test('v2 trajectory protocol schema validates authoritative payload shape',async()=>{
  const engine=new GameEngine();
  try {
    await engine.init(spriteScenario({collision:true,physics:true}),{enterScene:true});SetStrategies.sprite(engine,{target:'mover',property:'position',value:[100,0,0]});
    const payload=engine.protocol.eventLog.find(e=>e.event==='presentation.sprite.trajectory.v2').payload;
    const schema=JSON.parse(readFileSync(new URL('../engine/protocol/sprite-trajectory-v2.schema.json',import.meta.url),'utf8'));
    const validate=new Ajv({allErrors:true,strict:false}).compile(schema);assert.equal(validate(payload),true,JSON.stringify(validate.errors));
  } finally {engine.dispose();}
});

test('Save/restore preserves active authoritative trajectory and republishes it for presentation recovery',async()=>{
  const engine=new GameEngine(),restored=new GameEngine();
  try {
    await engine.init(spriteScenario({collision:true,physics:true}),{enterScene:true});
    SetStrategies.sprite(engine,{target:'mover',property:'position',value:[100,0,0]});
    const saved=await dispatch(engine,'save.export');assert.equal(saved.ok,true);assert.equal(saved.result.save.saveVersion,5);
    const restore=await dispatch(restored,'save.restore',{save:saved.result.save});assert.equal(restore.ok,true);
    const event=restored.protocol.eventLog.find(e=>e.event==='presentation.sprite.trajectory.v2');assert.ok(event);
    const ack=getSpriteTrajectoryAck(event.payload,'mover',event.payload.endTime,event.payload.presentation.requiredSegments);
    const completed=await dispatch(restored,'sprite.motion.presentation.ack',ack);assert.equal(completed.result.success,true);
    assert.deepEqual(restored.api.engine.state.getRuntimeSnapshot('sprites.[id]',{id:'mover'}).position,event.payload.finalPositions.mover);
  } finally {engine.dispose();restored.dispose();}
});

test('Client samples Engine trajectory v2 and creates strict ACK payload',()=>{
  const p={protocolVersion:2,motionId:'m1',trajectoryId:'t1',spriteId:'a',startTime:0,endTime:1,presentation:{requiredSegments:['s1']},trajectories:{a:[{segmentId:'s1',type:'bezier',startTime:0,endTime:1,easing:'linear',controlPoints:[[0,0,0],[1,0,0],[2,0,0],[3,0,0]]}]}};
  assert.deepEqual(sampleSpriteTrajectoryV2(p,'a',0.5),[1.5,0,0]);
  assert.throws(()=>getSpriteTrajectoryAck(p,'a',1,[]),/Cannot ACK/);
  assert.deepEqual(getSpriteTrajectoryAck(p,'a',1,['s1']),{spriteId:'a',motionId:'m1',trajectoryId:'t1',status:'completed',lastSegmentId:'s1',presentedThroughTime:1,presentedSegmentIds:['s1']});
  assert.equal(evaluateSpriteEasing('ease_in',0.5),0.25);
});

test('CCD coordinator resolves multiple collision pairs in event-time order',()=>{
  const ta=createBezierTrajectory({points:[[0,0,0],[30,0,0],[70,0,0],[100,0,0]],duration:1});
  const tb=createBezierTrajectory({points:[[50,0,0],[50,0,0],[50,0,0],[50,0,0]],duration:1});
  const tc=createBezierTrajectory({points:[[80,0,0],[80,0,0],[80,0,0],[80,0,0]],duration:1});
  const result=new AuthoritativeSpriteSimulation({horizon:1,subdivisions:256,maxCollisionEvents:8}).run({bodies:{a:{id:'a',layer:1,radius:5,collisionEnabled:true,physicsEnabled:true,isMotionOwner:true,mass:1},b:{id:'b',layer:1,radius:5,collisionEnabled:true,mass:1},c:{id:'c',layer:1,radius:5,collisionEnabled:true,mass:1}},initialTrajectories:new Map([['a',ta],['b',tb],['c',tc]])});
  assert.ok(result.collisions.length>=2,'collision chain should include mover→body and body→body impact');assert.ok(result.collisions.every((event,index)=>index===0||event.time>=result.collisions[index-1].time));
});


test('ACK multi-body commit transaction rolls back completely on injected commit failure',async()=>{
  const engine=new GameEngine();
  try{
    await engine.init(spriteScenario({collision:true,physics:true}),{enterScene:true});
    SetStrategies.sprite(engine,{target:'mover',property:'position',value:[100,0,0]});
    const payload=engine.protocol.eventLog.find(e=>e.event==='presentation.sprite.trajectory.v2').payload;
    const ack=getSpriteTrajectoryAck(payload,'mover',payload.endTime,payload.presentation.requiredSegments);
    const beforeMover=engine.api.engine.state.getRuntimeSnapshot('sprites.[id]',{id:'mover'}).position;
    const beforeWall=engine.api.engine.state.getRuntimeSnapshot('sprites.[id]',{id:'wall'}).position;
    const original=engine.commitState.bind(engine);let failOnce=true;
    engine.commitState=(reason)=>{if(reason==='state.transaction'&&failOnce){failOnce=false;throw new Error('injected atomic commit failure');}return original(reason);};
    const failed=await dispatch(engine,'sprite.motion.presentation.ack',ack);assert.equal(failed.ok,false);
    assert.deepEqual(engine.api.engine.state.getRuntimeSnapshot('sprites.[id]',{id:'mover'}).position,beforeMover);
    assert.deepEqual(engine.api.engine.state.getRuntimeSnapshot('sprites.[id]',{id:'wall'}).position,beforeWall);
    assert.ok(engine.activeSpriteMotions.has('mover'));
    engine.commitState=original;
    const recovered=await dispatch(engine,'sprite.motion.presentation.ack',ack);assert.equal(recovered.result.success,true);
    assert.deepEqual(engine.api.engine.state.getRuntimeSnapshot('sprites.[id]',{id:'mover'}).position,payload.finalPositions.mover);
    assert.deepEqual(engine.api.engine.state.getRuntimeSnapshot('sprites.[id]',{id:'wall'}).position,payload.finalPositions.wall);
  }finally{engine.dispose();}
});

test('ACK end-hook failure is retryable after authoritative commit and completion publication',async()=>{
  const engine=new GameEngine();
  try{
    const scenario=spriteScenario();scenario.sprite.mover.motion.effect.end=[{type:'set',subtype:'sprite',target:'mover',property:'state',value:'idle'}];
    await engine.init(scenario,{enterScene:true});SetStrategies.sprite(engine,{target:'mover',property:'position',value:[100,0,0]});
    const payload=engine.protocol.eventLog.find(e=>e.event==='presentation.sprite.trajectory.v2').payload;
    const ack=getSpriteTrajectoryAck(payload,'mover',payload.endTime,payload.presentation.requiredSegments);
    const original=engine.processRunnables.bind(engine);let attempts=0;
    engine.processRunnables=async(...args)=>{attempts++;if(attempts===1)throw new Error('injected end hook failure');return original(...args);};
    const first=await dispatch(engine,'sprite.motion.presentation.ack',ack);assert.equal(first.result.reason,'end_hook_failed');assert.equal(first.result.committed,true);
    assert.deepEqual(engine.api.engine.state.getRuntimeSnapshot('sprites.[id]',{id:'mover'}).position,payload.finalPositions.mover);
    assert.ok(engine.pendingSpriteMotionEndHooks.has(payload.motionId));
    const saveResult=await dispatch(engine,'save.export');assert.equal(saveResult.ok,true);
    const restored=new GameEngine();
    try{
      const restoreResult=await dispatch(restored,'save.restore',{save:saveResult.result.save});assert.equal(restoreResult.ok,true);
      assert.ok(restored.pendingSpriteMotionEndHooks.has(payload.motionId),'pending end-hook state must survive save/restore');
      const retry=await dispatch(restored,'sprite.motion.presentation.ack',ack);assert.equal(retry.result.success,true);assert.equal(retry.result.endHookRetried,true);
      assert.equal(restored.pendingSpriteMotionEndHooks.has(payload.motionId),false);
      assert.ok(restored.protocol.eventLog.some(e=>e.event==='presentation.sprite.trajectory.completed'&&e.payload.motionId===payload.motionId));
    }finally{restored.dispose();}
  }finally{engine.dispose();}
});
