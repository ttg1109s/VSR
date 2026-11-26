import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCollisionTimeline, profileSpriteSimulation, AuthoritativeSpriteSimulation, createLinearPhysicsSegment } from '../engine/modules/sprite/index.js';

test('sprite diagnostics exposes ordered collision timeline and profiler counters',()=>{
  const a=createLinearPhysicsSegment({segmentId:'a',startTime:0,duration:2,position:[3,0,0],velocity:[-1,0,0]});
  const b=createLinearPhysicsSegment({segmentId:'b',startTime:0,duration:2,position:[0,0,0],velocity:[0,0,0]});
  const result=new AuthoritativeSpriteSimulation({horizon:2,subdivisions:32}).run({bodies:{a:{id:'a',layer:0,radius:1,collisionEnabled:true,physicsEnabled:true},b:{id:'b',layer:0,radius:1,collisionEnabled:true,physicsEnabled:true}},initialTrajectories:new Map([['a',a],['b',b]])});
  const timeline=buildCollisionTimeline(result),profile=profileSpriteSimulation(result);
  assert.ok(timeline.events.some(event=>event.kind==='collision'));
  assert.equal(profile.collisionCount,result.collisions.length);
  assert.ok(profile.narrowphaseChecks>=1);
  assert.ok(profile.segmentCount>=2);
});

test('failure snapshot captures reproducible simulation diagnostics and error context', async()=>{
 const {createFailureSnapshot}=await import('../engine/modules/sprite/diagnostics.js');
 const snapshot=createFailureSnapshot({scenarioId:'s',seed:12,input:{x:1},runtime:{},simulationResult:{startTime:0,endTime:1,simulationStatus:'completed',collisions:[],segments:new Map(),finalPositions:new Map(),profiler:{}},error:new Error('failure')});
 assert.equal(snapshot.format,'vsr.sprite.failure-snapshot.v1');assert.equal(snapshot.seed,12);assert.equal(snapshot.error.message,'failure');
});

test('deterministic replay reconstructs physics descriptors and yields same collision trace',async()=>{
 const {createSpriteReplay,replaySpriteSimulation,deterministicFingerprint}=await import('../engine/modules/sprite/replay.js');
 const {createLinearPhysicsSegment}=await import('../engine/modules/sprite/trajectory.js');
 const bodies={a:{layer:0,radius:.5,mass:1,collisionEnabled:true,physicsEnabled:true,isMotionOwner:true},b:{layer:0,radius:.5,mass:1,collisionEnabled:true,physicsEnabled:true}};
 const initialTrajectories=new Map([['a',createLinearPhysicsSegment({segmentId:'a',startTime:0,duration:2,position:[0,0,0],velocity:[2,0,0]})],['b',createLinearPhysicsSegment({segmentId:'b',startTime:0,duration:2,position:[3,0,0],velocity:[0,0,0]})]]);
 const replay=createSpriteReplay({simulationOptions:{horizon:2,maxCollisionEvents:8},bodies,initialTrajectories,physicsByBody:{a:{restitution:1},b:{restitution:1}},startTime:0,seed:42});
 const x=replaySpriteSimulation(replay),y=replaySpriteSimulation(replay);assert.deepEqual(x.collisions,y.collisions);assert.deepEqual([...x.finalPositions],[...y.finalPositions]);assert.equal(replay.fingerprint,deterministicFingerprint({seed:42,simulationOptions:{horizon:2,maxCollisionEvents:8},bodies,physicsByBody:{a:{restitution:1},b:{restitution:1}},startTime:0,trajectories:[...initialTrajectories].map(([id,t])=>[id,{type:t.type,segmentId:t.segmentId,startTime:t.startTime,duration:t.duration,initialPosition:t.initialPosition,initialVelocity:t.initialVelocity,acceleration:t.acceleration}])}));
});
