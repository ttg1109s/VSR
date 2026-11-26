import { importModules } from './imports/index.js';
const modules = await importModules(['Scenario','GameEngine','EffectStrategies','JsonClient']);
const { validateScenario } = modules.Scenario;
const { GameEngine } = modules.GameEngine;
const { SetStrategies } = modules.EffectStrategies;
const { JsonClient, evaluateSpriteEasing, sampleSpriteTrajectoryV2, getSpriteTrajectoryAck, sampleSpriteTransformTrajectoryV2 } = modules.JsonClient;
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Ajv from '../engine/schema/valid.js';
import { createBezierTrajectory, AuthoritativeSpriteSimulation } from '../engine/modules/sprite/index.js';

const fixture = () => JSON.parse(readFileSync(new URL('./fixtures/engine/minimal-scenario.json', import.meta.url), 'utf8'));
function spriteScenario({collision=false,physics=false}={}) {
  const s=fixture(); delete s.scenes.start.routers.main.actions;
  s.sprite={
    mover:{action:'test_action',layer:2,state:{idle:'mover.png'},position:[0,0,0],transform:{scale:1,rotate:0},collision:{enable:true,radius:10},physics:{mass:1,restitution:0.8,friction:0,horizon:1,gravity:[0,0,0]},motion:{enable:true,duration:1000,path:{point:[[],'geometry-preserving']},easing:'linear',impact:{enable:collision,physics},effect:{start:[],end:[]}}},
    wall:{action:'test_action',layer:2,state:{idle:'wall.png'},position:[50,0,0],transform:{scale:1,rotate:0},collision:{enable:true,radius:10},physics:{mass:2,restitution:0.8,friction:0},motion:{enable:false,duration:0,path:{point:[[],'geometry-preserving']},easing:'linear'}}
  };
  s.scenes.start.routers.main.meta.sprite=true;s.scenes.start.routers.main.sprites=['mover','wall'];
  s.config.allDescRead=true;s.actions.test_action.meta.desc='Sprite action';s.actions.test_action.set.readDesc=true;
  s.actions.test_action.effect={normal:[{type:'set',subtype:'sprite',target:'mover',property:'state',value:'idle'}]};
  return s;
}

function dispatch(engine,command,payload={}) { return engine.protocol.dispatch(engine.protocol.createCommand(command,payload)); }


test('client executes analytically solved linear-damping trajectory instead of constant-acceleration approximation',()=>{
  const payload={protocolVersion:2,trajectoryId:'damped-test',startTime:0,endTime:1,trajectories:{mover:[{segmentId:'d',type:'physics',startTime:0,endTime:1,duration:1,initialPosition:[0,0,0],initialVelocity:[10,0,0],acceleration:[0,0,0],linearDamping:2,finalPosition:[4.323323583816936,0,0],finalVelocity:[1.353352832366127,0,0],completion:'natural-equilibrium'}]},presentation:{requiredSegments:['d']}};
  const sampled=sampleSpriteTrajectoryV2(payload,'mover',0.5);
  assert.ok(Math.abs(sampled[0]-(10*(1-Math.exp(-1))/2))<1e-10);
});
test('motion.physics migrates Body fields and World fields to their canonical owners',()=>{
  const scenario=spriteScenario({collision:true,physics:true});
  delete scenario.sprite.mover.physics.gravity;
  delete scenario.sprite.mover.physics.friction;
  scenario.sprite.mover.motion.physics={horizon:3,restitution:0.25,friction:0.2,gravity:[0,-9.8,0]};
  const normalized=modules.Scenario.normalizeScenario(scenario);
  assert.deepEqual(validateScenario(normalized),[]);
  assert.equal(Object.hasOwn(normalized.sprite.mover.physics,'horizon'),false); // legacy endpoint control is removed
  assert.equal(normalized.sprite.mover.physics.restitution,0.8);
  assert.equal(normalized.sprite.mover.physics.friction,0.2);
  assert.equal(normalized.sprite.mover.physics.gravity,undefined);
  assert.deepEqual(normalized.config.physicsWorld.gravity,[0,-9.8,0]);
  assert.equal(Object.hasOwn(normalized.sprite.mover.motion,'physics'),false);
});

test('scenario schema accepts v2 collision and physics configuration and rejects invalid physical properties',()=>{
  const scenario=spriteScenario({collision:true,physics:true});assert.deepEqual(validateScenario(scenario),[]);
  scenario.sprite.mover.physics.mass=0;assert.ok(validateScenario(scenario).length>0);
});

test('scenario schema accepts shared World config and per-Sprite Body/Collider fields',()=>{
  const scenario=spriteScenario();const p=scenario.sprite.mover.physics;delete p.gravity;delete p.horizon;
  Object.assign(scenario.config,{physicsWorld:{dimension:'3D',plane:'XZ',planeOffset:4,dimensionPolicy:'reject',gravity:[0,-9.81,0],fixedDt:1/120,velocityIterations:8,positionIterations:3,maxSubsteps:8}});
  Object.assign(p,{bodyType:'kinematic',velocity:[1,2,3],angularVelocity:[0,1,0],orientation:[1,0,0,0],linearDamping:0.1,angularDamping:0.2});
  Object.assign(scenario.sprite.mover.collision,{shape:'box',halfExtents:[1,2,3],offset:[0,0,0],ccd:true});
  assert.deepEqual(validateScenario(scenario),[]);
  scenario.config.physicsWorld.dimension='4D';assert.ok(validateScenario(scenario).length>0);
});

test('Engine API runs scenario physics from shared World config and publishes unified Sprite protocol',()=>{
  const engine=new GameEngine();try{const result=engine.api.spritePhysics.runScenario({config:{physicsWorld:{dimension:'2D',gravity:[0,0,0]}},sprite:{ball:{position:[0,1,0],collision:{enable:true,shape:'sphere',radius:0.25},physics:{bodyType:'dynamic'}}}},{maxTicks:20,simulationId:'api-test'});assert.equal(result.payload.protocolVersion,2);assert.ok(engine.protocol.eventLog.some(e=>e.event==='presentation.sprite.simulation'&&e.payload.simulationId==='api-test'));}finally{engine.dispose();}
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


test('Position effect during active motion rebases from sampled presentation position',async()=>{
  const engine=new GameEngine();
  try {
    const scenario=spriteScenario({collision:false,physics:false});scenario.sprite.wall.position=[500,0,0];scenario.sprite.wall.collision.radius=1;
    await engine.init(scenario,{enterScene:true});
    SetStrategies.sprite(engine,{target:'mover',property:'position',value:[100,0,0]});
    const active=engine.activeSpriteMotions.get('mover');assert.ok(active);
    // Simulate effect firing 300 ms into the active 1 s linear trajectory.
    active.startedAt=Date.now()-300;
    SetStrategies.sprite(engine,{target:'mover',property:'position',value:[20,10,0]});
    const payload=engine.protocol.eventLog.filter(e=>e.event==='presentation.sprite.simulation').at(-1).payload;
    const start=payload.initialTrajectory[0].controlPoints[0];
    const end=payload.initialTrajectory[0].controlPoints[3];
    assert.ok(Math.abs(start[0]-30)<0.15,`expected sampled x≈30, got ${start[0]}`);
    assert.ok(Math.abs(start[1])<0.1);
    assert.deepEqual(end,[20,10,0]);
    assert.ok(engine.protocol.eventLog.some(e=>e.event==='presentation.sprite.trajectory.cancelled'&&e.payload.reason==='superseded'));
  } finally {engine.dispose();}
});

test('Active trajectory preserves runtime start until validated presentation ACK',async()=>{
  const engine=new GameEngine();
  try {
    await engine.init(spriteScenario(),{enterScene:true});
    SetStrategies.sprite(engine,{target:'mover',property:'position',value:[100,0,0]});
    const start=engine.api.engine.state.getRuntimeSnapshot('sprites.[id]',{id:'mover'}).position;
    assert.deepEqual(start,[0,0,0]);
    const payload=engine.protocol.eventLog.find(e=>e.event==='presentation.sprite.simulation').payload;
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
    const event=engine.protocol.eventLog.filter(e=>e.event==='presentation.sprite.simulation').at(-1);assert.ok(event);
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
    const payload=engine.protocol.eventLog.find(e=>e.event==='presentation.sprite.simulation').payload;assert.equal(payload.impacts.length,0);assert.equal(payload.endTime,1);
    const ack=getSpriteTrajectoryAck(payload,'mover',payload.endTime,payload.presentation.requiredSegments);const result=await dispatch(engine,'sprite.motion.presentation.ack',ack);assert.equal(result.result.success,true);
  } finally {engine.dispose();}
});


test('Static bodies remain immovable after collision and settling criteria end zero-velocity physics early',async()=>{
  const engine=new GameEngine();
  try {
    const scenario=spriteScenario({collision:true,physics:true});
    scenario.sprite.wall.physics.bodyType='static';
    scenario.sprite.mover.physics.restitution=0;
    scenario.sprite.mover.physics.maxPhysicsDuration=4;
    delete scenario.sprite.mover.physics.horizon;
    scenario.sprite.mover.physics.settlingVelocityThreshold=0.05;
    scenario.sprite.mover.physics.settlingDuration=0.2;
    await engine.init(scenario,{enterScene:true});
    SetStrategies.sprite(engine,{target:'mover',property:'position',value:[100,0,0]});
    const payload=engine.protocol.eventLog.filter(e=>e.event==='presentation.sprite.simulation').at(-1).payload;
    assert.equal(payload.impacts.length,1);
    assert.ok(payload.endTime<2,`settled physics should stop early; endTime=${payload.endTime}`);
    assert.deepEqual(payload.finalPositions.wall,[50,0,0]);
    const impact=payload.impacts[0];
    assert.ok(Math.hypot(...impact.velocityAfterA)<0.05,'zero restitution against static wall should settle mover');
  } finally {engine.dispose();}
});

test('Static wall receives no collision impulse or penetration correction',()=>{
  const a=createBezierTrajectory({points:[[0,0,0],[33.333,0,0],[66.667,0,0],[100,0,0]],duration:1,easing:'linear'});
  const wall={type:'physics',segmentId:'wall-static',startTime:0,endTime:2,duration:2,initialPosition:[50,0,0],initialVelocity:[0,0,0],acceleration:[0,0,0],sample:t=>[50,0,0],velocity:t=>[0,0,0]};
  const sim=new AuthoritativeSpriteSimulation({horizon:2,subdivisions:192,maxCollisionEvents:8});
  const result=sim.run({bodies:{a:{id:'a',layer:1,radius:10,collisionEnabled:true,physicsEnabled:true,isMotionOwner:true,mass:1,bodyType:'dynamic'},wall:{id:'wall',layer:1,radius:10,collisionEnabled:true,physicsEnabled:true,mass:2,bodyType:'static'}},initialTrajectories:new Map([['a',a],['wall',wall]]),physicsByBody:{a:{mass:1,restitution:0.8,bodyType:'dynamic'},wall:{mass:2,restitution:0.8,bodyType:'static'}}});
  assert.equal(result.collisions.length,1);
  assert.deepEqual(result.finalPositions.get('wall'),[50,0,0]);
  assert.ok(Math.abs(result.collisions[0].velocityAfterA[0]+80)<0.001);
  assert.deepEqual(result.collisions[0].velocityAfterB,[0,0,0]);
});

test('Collision simulation uses moving target trajectory and supersedes target motion only when collision affects it',async()=>{
  const engine=new GameEngine();
  try {
    const scenario=spriteScenario({collision:true,physics:true});scenario.sprite.wall.motion={enable:true,duration:1000,path:{point:[[{x:50,y:20,z:0}],'absolute']},easing:'linear',impact:{enable:false,physics:false},effect:{start:[],end:[]}};
    await engine.init(scenario,{enterScene:true});
    SetStrategies.sprite(engine,{target:'wall',property:'position',value:[80,0,0]});
    const wallMotion=engine.activeSpriteMotions.get('wall');assert.ok(wallMotion);
    SetStrategies.sprite(engine,{target:'mover',property:'position',value:[100,0,0]});
    const event=engine.protocol.eventLog.filter(e=>e.event==='presentation.sprite.simulation').at(-1);assert.ok(event);
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
    const payload=engine.protocol.eventLog.find(e=>e.event==='presentation.sprite.simulation').payload;
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

test('unified Sprite protocol schema validates authoritative trajectory payload shape',async()=>{
  const engine=new GameEngine();
  try {
    await engine.init(spriteScenario({collision:true,physics:true}),{enterScene:true});SetStrategies.sprite(engine,{target:'mover',property:'position',value:[100,0,0]});
    const payload=engine.protocol.eventLog.find(e=>e.event==='presentation.sprite.simulation').payload;
    const schema=JSON.parse(readFileSync(new URL('../engine/protocol/protocol.schema.json',import.meta.url),'utf8'));
    const trajectorySchema=structuredClone(schema.$defs.spriteTrajectory);const rewriteRefs=obj=>{if(!obj||typeof obj!=='object')return;for(const key of Object.keys(obj)){if(key==='$ref'&&typeof obj[key]==='string')obj[key]=obj[key].replace('#/$defs/spriteTrajectory/definitions/','#/definitions/');else rewriteRefs(obj[key]);}};rewriteRefs(trajectorySchema);const validate=new Ajv({allErrors:true,strict:false}).compile(trajectorySchema);assert.equal(validate(payload),true,JSON.stringify(validate.errors));
  } finally {engine.dispose();}
});

test('Save/restore preserves active authoritative trajectory and republishes it for presentation recovery',async()=>{
  const engine=new GameEngine(),restored=new GameEngine();
  try {
    await engine.init(spriteScenario({collision:true,physics:true}),{enterScene:true});
    SetStrategies.sprite(engine,{target:'mover',property:'position',value:[100,0,0]});
    const saved=await dispatch(engine,'save.export');assert.equal(saved.ok,true);assert.equal(saved.result.save.saveVersion,5);
    const restore=await dispatch(restored,'save.restore',{save:saved.result.save});assert.equal(restore.ok,true);
    const event=restored.protocol.eventLog.find(e=>e.event==='presentation.sprite.simulation');assert.ok(event);
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
    const payload=engine.protocol.eventLog.find(e=>e.event==='presentation.sprite.simulation').payload;
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
    const payload=engine.protocol.eventLog.find(e=>e.event==='presentation.sprite.simulation').payload;
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

test('Sprite transform trajectory interpolates rotation shortest-path and scale',()=>{
  const trajectory={endTime:1,transformTrajectory:[{time:0,rotate:350,scale:1},{time:1,rotate:370,scale:2}]};
  assert.deepEqual(sampleSpriteTransformTrajectoryV2(trajectory,0.5),{rotate:360,scale:1.5});
});
test('Scenario waypoint r/s values validate and are serialized into transform trajectory',async()=>{
  const engine=new GameEngine();
  try {
    const scenario=spriteScenario();
    scenario.sprite.mover.motion.path.point[0]=[{x:25,y:10,z:0,r:45,s:1.25}];
    assert.deepEqual(validateScenario(scenario),[]);
    await engine.init(scenario,{enterScene:true});
    SetStrategies.sprite(engine,{target:'mover',property:'position',value:[100,0,0]});
    const payload=engine.protocol.eventLog.find(e=>e.event==='presentation.sprite.simulation').payload;
    assert.ok(Array.isArray(payload.transformTrajectory));
    assert.equal(payload.transformTrajectory[1].rotate,45);
    assert.equal(payload.transformTrajectory[1].scale,1.25);
  } finally {engine.dispose();}
});

test('Sprite trajectory payload exposes analytical post-impact final position and duration',async()=>{
 const engine=new GameEngine();
 try{
  const scenario=spriteScenario({collision:true,physics:true});
  scenario.sprite.wall.physics={bodyType:'static',mass:2,restitution:0.8,friction:0};
  scenario.sprite.mover.physics.linearDamping=4;
  assert.deepEqual(validateScenario(scenario),[]);
  await engine.init(scenario,{enterScene:true});
  SetStrategies.sprite(engine,{target:'mover',property:'position',value:[100,0,0]});
  const payload=engine.protocol.eventLog.filter(e=>e.event==='presentation.sprite.simulation').at(-1).payload;
  const solved=payload.postImpactResults.mover;
  assert.ok(solved,'mover should have post-impact result');
  assert.ok(solved.duration>0,`duration=${solved.duration}`);
  assert.ok(Number.isFinite(solved.to[0]),`final x=${solved.to[0]}`);
  assert.ok(Math.hypot(...solved.finalVelocity)<=0.021);
  assert.equal(solved.completion,'natural-equilibrium');
 }finally{engine.dispose();}
});
