import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthoritativeSpriteSimulation, createLinearPhysicsSegment, createPiecewiseBezierTrajectory, correctCirclePenetration, resolveCircleCollision } from '../engine/modules/sprite-motion-v2/index.js';

function pairRun(moverId,targetId,seed=1){
  const mover=createLinearPhysicsSegment({segmentId:'m',startTime:0,duration:2,position:[3+seed*.0001,0,0],velocity:[-1,0,0]});
  const target=createLinearPhysicsSegment({segmentId:'t',startTime:0,duration:2,position:[0,0,0],velocity:[0,0,0]});
  const bodies={};bodies[moverId]={id:moverId,layer:0,radius:1,mass:1,collisionEnabled:true,physicsEnabled:true,isMotionOwner:true};bodies[targetId]={id:targetId,layer:0,radius:1,mass:1,collisionEnabled:true,physicsEnabled:true};
  const trajectories=new Map([[moverId,mover],[targetId,target]]);
  const physics={};physics[moverId]={restitution:.8,friction:.2};physics[targetId]={};
  const result=new AuthoritativeSpriteSimulation({horizon:2,subdivisions:64,maxCollisionEvents:8}).run({bodies,initialTrajectories:trajectories,physicsByBody:physics});
  const impact=result.collisions[0];return impact?{restitution:impact.restitution,afterMover:impact.spriteA===moverId?impact.velocityAfterA:impact.velocityAfterB,afterTarget:impact.spriteA===moverId?impact.velocityAfterB:impact.velocityAfterA}:null;
}

test('hardening stress: pair material response is invariant across 500 lexical identity permutations',()=>{
  for(let i=0;i<500;i++){
    const forward=pairRun('a-mover','z-target',i),reverse=pairRun('z-mover','a-target',i);
    assert.ok(forward&&reverse,`missing impact at seed ${i}`);
    assert.equal(forward.restitution,reverse.restitution,`restitution mismatch seed ${i}`);
    assert.ok(Math.abs(forward.afterMover[0]-reverse.afterMover[0])<1e-9,`mover velocity mismatch seed ${i}`);
    assert.ok(Math.abs(forward.afterTarget[0]-reverse.afterTarget[0])<1e-9,`target velocity mismatch seed ${i}`);
  }
});

test('hardening stress: exact-center overlap always gets deterministic nonzero correction',()=>{
  for(let i=0;i<1000;i++){
    const r=correctCirclePenetration({position1:[0,0,0],position2:[0,0,0],radius1:1,radius2:1,mass1:1+(i%7),mass2:1+(i%11)});
    assert.ok(Math.hypot(...r.position1)>0||Math.hypot(...r.position2)>0);
    assert.ok(r.penetration>0);
  }
});

test('hardening stress: invalid CCD/simulation parameters fail closed',()=>{
  for(const subdivisions of [0,-1,1.2,NaN,Infinity])assert.throws(()=>new AuthoritativeSpriteSimulation({subdivisions}));
  for(const maxCollisionEvents of [0,-1,1.1,NaN])assert.throws(()=>new AuthoritativeSpriteSimulation({maxCollisionEvents}));
  for(const timeEpsilon of [0,-1,NaN,Infinity])assert.throws(()=>new AuthoritativeSpriteSimulation({timeEpsilon}));
  for(const gravity of [[],[1],[1,2,3,4],[NaN,0],[Infinity,0]])assert.throws(()=>new AuthoritativeSpriteSimulation({gravity}));
  const sim=new AuthoritativeSpriteSimulation();assert.throws(()=>sim.run({bodies:{},initialTrajectories:new Map(),startTime:NaN}));
});

test('hardening: piecewise spline passes through all authored waypoints',()=>{
  const points=[[0,0,0],[2,4,0],[4,-2,0],[6,3,0],[8,0,0]];
  const trajectory=createPiecewiseBezierTrajectory({points,duration:4});
  assert.equal(trajectory.segments.length,points.length-1);
  assert.deepEqual(trajectory.sample(trajectory.startTime),points[0]);
  for(let i=0;i<trajectory.segments.length;i++){
    const sampled=trajectory.sample(trajectory.segments[i].endTime);
    assert.ok(Math.hypot(...sampled.map((v,k)=>v-points[i+1][k]))<1e-8,`waypoint ${i+1} not passed`);
  }
});

test('hardening: exact-center approaching pair receives impulse with deterministic axis fallback',()=>{
  const r=resolveCircleCollision({position1:[0,0,0],position2:[0,0,0],velocity1:[1,0,0],velocity2:[-1,0,0],mass1:1,mass2:1,restitution:.5});
  assert.deepEqual(r.normal,[1,0,0]);assert.equal(r.approaching,true);assert.ok(r.impulseMagnitude>0);
  assert.deepEqual(r.velocity1,[-0.5,0,0]);assert.deepEqual(r.velocity2,[0.5,0,0]);
  const separating=resolveCircleCollision({position1:[0,0,0],position2:[0,0,0],velocity1:[-1,0,0],velocity2:[1,0,0],mass1:1,mass2:1,restitution:.5});
  assert.equal(separating.approaching,false);assert.equal(separating.impulseMagnitude,0);
  assert.deepEqual(separating.velocity1,[-1,0,0]);assert.deepEqual(separating.velocity2,[1,0,0]);
});

test('hardening: exact-center authoritative simulation resolves approaching collision impulse',()=>{
  const a=createLinearPhysicsSegment({segmentId:'a',startTime:0,duration:1,position:[0,0,0],velocity:[1,0,0]});
  const b=createLinearPhysicsSegment({segmentId:'b',startTime:0,duration:1,position:[0,0,0],velocity:[-1,0,0]});
  const result=new AuthoritativeSpriteSimulation({horizon:1,subdivisions:16,maxCollisionEvents:8}).run({bodies:{a:{id:'a',layer:0,radius:1,mass:1,collisionEnabled:true,physicsEnabled:true},b:{id:'b',layer:0,radius:1,mass:1,collisionEnabled:true,physicsEnabled:true}},initialTrajectories:new Map([['a',a],['b',b]])});
  assert.equal(result.collisions.length,1);
  const collision=result.collisions[0];assert.deepEqual(collision.normal,[1,0,0]);
  assert.deepEqual(collision.velocityAfterA,[-0.5,0,0]);assert.deepEqual(collision.velocityAfterB,[0.5,0,0]);
  assert.ok(result.finalPositions.get('a')[0]<result.finalPositions.get('b')[0]);
});


test('hardening: collision event limit is explicit when another collision remains',()=>{
  const trajectories=new Map([
    ['a',createLinearPhysicsSegment({segmentId:'a',startTime:0,duration:4,position:[0,0,0],velocity:[3,0,0]})],
    ['b',createLinearPhysicsSegment({segmentId:'b',startTime:0,duration:4,position:[3,0,0],velocity:[0,0,0]})],
    ['c',createLinearPhysicsSegment({segmentId:'c',startTime:0,duration:4,position:[6,0,0],velocity:[0,0,0]})]
  ]);
  const bodies={};for(const id of trajectories.keys())bodies[id]={id,layer:0,radius:1,mass:1,collisionEnabled:true,physicsEnabled:true};
  const result=new AuthoritativeSpriteSimulation({horizon:4,subdivisions:64,maxCollisionEvents:1}).run({bodies,initialTrajectories:trajectories});
  assert.equal(result.collisionLimitReached,true);assert.equal(result.simulationStatus,'collision-event-limit');
});


test('hardening: exact-center overlap resolves in authoritative simulation, not only correction helper',()=>{
  const a=createLinearPhysicsSegment({segmentId:'a',startTime:0,duration:1,position:[0,0,0],velocity:[-1,0,0]});
  const b=createLinearPhysicsSegment({segmentId:'b',startTime:0,duration:1,position:[0,0,0],velocity:[1,0,0]});
  const result=new AuthoritativeSpriteSimulation({horizon:1,subdivisions:16,maxCollisionEvents:8}).run({bodies:{a:{id:'a',layer:0,radius:1,mass:1,collisionEnabled:true,physicsEnabled:true},b:{id:'b',layer:0,radius:1,mass:1,collisionEnabled:true,physicsEnabled:true}},initialTrajectories:new Map([['a',a],['b',b]])});
  assert.equal(result.collisions.length,1);assert.ok(result.finalPositions.get('a')[0]<result.finalPositions.get('b')[0]);assert.ok(result.collisions[0].normal.every(Number.isFinite));
});
