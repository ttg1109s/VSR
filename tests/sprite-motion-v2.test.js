import test from 'node:test';
import assert from 'node:assert/strict';
import {createBezierTrajectory,createLinearPhysicsSegment,resolveCircleCollision,correctCirclePenetration,firstCircleImpact,AuthoritativeSpriteSimulation} from '../engine/modules/sprite/index.js';

test('v2 Bezier trajectory samples endpoints and computes velocity',()=>{
 const t=createBezierTrajectory({points:[[0,0],[1,0],[2,0],[3,0]],duration:2});
 assert.deepEqual(t.sample(0),[0,0,0]);assert.deepEqual(t.sample(2),[3,0,0]);assert.ok(Math.abs(t.velocity(1)[0]-1.5)<1e-6);
});

test('Bezier trajectory derives velocity using schema easing time mapping',()=>{
 const easeIn=createBezierTrajectory({points:[[0,0],[1,0],[2,0],[3,0]],duration:1,easing:'ease_in'});
 assert.ok(Math.abs(easeIn.velocity(0)[0])<1e-4);assert.ok(Math.abs(easeIn.velocity(0.5)[0]-3)<1e-3);
 const sine=createBezierTrajectory({points:[[0,0],[1,0],[2,0],[3,0]],duration:1,easing:'sin_in'});assert.ok(Math.abs(sine.velocity(0)[0])<1e-4);
});

test('v2 physics segment applies acceleration',()=>{
 const s=createLinearPhysicsSegment({segmentId:'p',startTime:1,duration:2,position:[0,0],velocity:[2,0],acceleration:[0,2]});
 assert.deepEqual(s.sample(2),[2,1,0]);assert.deepEqual(s.velocity(2),[2,2,0]);
});
test('impulse collision conserves momentum for unequal masses',()=>{
 const r=resolveCircleCollision({position1:[0,0],position2:[1,0],velocity1:[2,0],velocity2:[0,0],mass1:2,mass2:1,restitution:1});
 assert.deepEqual(r.velocity1,[0.6666666666666667,0,0]);assert.deepEqual(r.velocity2,[2.6666666666666665,0,0]);
 const momentumBefore=4,momentumAfter=2*r.velocity1[0]+r.velocity2[0];assert.ok(Math.abs(momentumBefore-momentumAfter)<1e-10);
});
test('non-approaching pair receives no impulse',()=>{
 const r=resolveCircleCollision({position1:[0,0],position2:[1,0],velocity1:[0,0],velocity2:[1,0],restitution:.8});assert.equal(r.impulseMagnitude,0);assert.equal(r.approaching,false);
});
test('CCD finds first impact of two linear trajectories',()=>{
 const a=createLinearPhysicsSegment({segmentId:'a',startTime:0,duration:2,position:[0,0],velocity:[2,0]});
 const b=createLinearPhysicsSegment({segmentId:'b',startTime:0,duration:2,position:[3,0],velocity:[0,0]});
 const hit=firstCircleImpact({trajectoryA:a,trajectoryB:b,radiusA:.5,radiusB:.5,timeStart:0,timeEnd:2,subdivisions:16});assert.ok(hit);assert.ok(Math.abs(hit.time-1)<1e-8);
});
test('simulation resolves impact and generates both post-impact trajectories',()=>{
 const a=createLinearPhysicsSegment({segmentId:'a',startTime:0,duration:2,position:[0,0],velocity:[2,0]});
 const b=createLinearPhysicsSegment({segmentId:'b',startTime:0,duration:2,position:[3,0],velocity:[0,0]});
 const sim=new AuthoritativeSpriteSimulation({horizon:2,maxCollisionEvents:8});
 const out=sim.run({bodies:{a:{id:'a',layer:0,radius:.5,mass:1,collisionEnabled:true,physicsEnabled:true,isMotionOwner:true},b:{id:'b',layer:0,radius:.5,mass:1,collisionEnabled:true,physicsEnabled:true}},initialTrajectories:new Map([['a',a],['b',b]]),physicsByBody:{a:{restitution:1},b:{restitution:1}}});
 assert.equal(out.collisions.length,1);assert.ok(out.segments.get('a').some(segment=>segment.type==='physics'));assert.ok(out.segments.get('b').some(segment=>segment.type==='physics'));assert.ok(out.finalPositions.get('a')[0]<out.finalPositions.get('b')[0]);
});
test('positional correction separates overlap',()=>{
 const c=correctCirclePenetration({position1:[0,0],position2:[.5,0],radius1:.5,radius2:.5,mass1:1,mass2:1});assert.ok(c.position1[0]<0);assert.ok(c.position2[0]>.5);
});

test('authoritative simulation is deterministic for identical body and trajectory inputs',()=>{
 const a=createLinearPhysicsSegment({segmentId:'a',startTime:0,duration:1,position:[0,0,0],velocity:[10,0,0]});
 const b=createLinearPhysicsSegment({segmentId:'b',startTime:0,duration:1,position:[5,0,0],velocity:[0,0,0]});
 const input={bodies:{a:{id:'a',layer:1,radius:1,mass:1,collisionEnabled:true,physicsEnabled:true,isMotionOwner:true},b:{id:'b',layer:1,radius:1,mass:1,collisionEnabled:true,physicsEnabled:true}},initialTrajectories:new Map([['a',a],['b',b]]),physicsByBody:{a:{restitution:0.5},b:{restitution:0.5}}};
 const sim=new AuthoritativeSpriteSimulation({horizon:1,maxCollisionEvents:8});
 const x=sim.run(input),y=sim.run(input);assert.deepEqual(x.collisions,y.collisions);assert.deepEqual([...x.finalPositions],[...y.finalPositions]);
});

test('CCD does not repeatedly report an overlapping but separating pair',()=>{
 const a=createLinearPhysicsSegment({segmentId:'a',startTime:0,duration:1,position:[0,0,0],velocity:[-1,0,0]});
 const b=createLinearPhysicsSegment({segmentId:'b',startTime:0,duration:1,position:[1,0,0],velocity:[1,0,0]});
 const hit=firstCircleImpact({trajectoryA:a,trajectoryB:b,radiusA:1,radiusB:1,timeStart:0,timeEnd:1,subdivisions:8});assert.equal(hit,null);
});

test('CCD adaptively increases subdivisions for fast travel relative to radius',()=>{
  const trajectory=(position,velocity)=>({sample:t=>position.map((v,i)=>v+velocity[i]*t),velocity:()=>velocity});
  const hit=firstCircleImpact({trajectoryA:trajectory([-100,0,0],[400,0,0]),trajectoryB:trajectory([0,0,0],[0,0,0]),radiusA:1,radiusB:1,timeStart:0,timeEnd:1,subdivisions:8});
  assert.ok(hit);
  assert.ok(hit.subdivisions>8);
});

test('conservative CCD reports potential curved-trajectory crossing even when endpoint displacement is small', async()=>{
 const {createBezierTrajectory}=await import('../engine/modules/sprite/trajectory.js');
 const {firstCircleImpact}=await import('../engine/modules/sprite/collision.js');
 const loop=createBezierTrajectory({points:[[0,0,0],[100,100,0],[-100,100,0],[0,0,0]],duration:1});
 const stationary=createLinearPhysicsSegment({segmentId:'stationary',startTime:0,duration:1,position:[30,50,0],velocity:[0,0,0]});
 const impact=firstCircleImpact({trajectoryA:loop,trajectoryB:stationary,radiusA:1,radiusB:1,timeStart:0,timeEnd:1});
 assert.ok(impact);assert.ok(['conservative-interval','unknown-trajectory-conservative-fallback'].includes(impact.approximation));
});

test('analytical linear damping derives natural-equilibrium endpoint and duration', async()=>{
 const {solveDampedTrajectory,createDampedPhysicsSegment}=await import('../engine/modules/sprite/trajectory.js');
 const solved=solveDampedTrajectory({position:[30,0,0],velocity:[-80,0,0],linearDamping:4,velocityThreshold:0.02});
 assert.ok(solved.duration>0);
 assert.ok(Math.abs(solved.finalPosition[0]-10)<0.02);
 assert.ok(Math.hypot(...solved.finalVelocity)<=0.0200001);
 assert.equal(solved.completion,'natural-equilibrium');
 const segment=createDampedPhysicsSegment({segmentId:'damped',startTime:0.3,position:[30,0,0],velocity:[-80,0,0],linearDamping:4,velocityThreshold:0.02});
 assert.ok(Math.abs(segment.endTime-(0.3+solved.duration))<1e-10);
 assert.ok(Math.abs(segment.sample(segment.endTime)[0]-solved.finalPosition[0])<1e-10);
 assert.ok(Math.hypot(...segment.velocity(segment.endTime))<=0.0200001);
 assert.equal(segment.completion,'natural-equilibrium');
});

test('authoritative collision uses linear damping model without a horizon endpoint',()=>{
 const a=createLinearPhysicsSegment({segmentId:'a',startTime:0,duration:2,position:[0,0,0],velocity:[2,0,0]});
 const b=createLinearPhysicsSegment({segmentId:'b',startTime:0,duration:2,position:[3,0,0],velocity:[0,0,0]});
 const sim=new AuthoritativeSpriteSimulation({subdivisions:128,maxCollisionEvents:8});
 const out=sim.run({bodies:{a:{id:'a',layer:0,radius:.5,mass:1,collisionEnabled:true,physicsEnabled:true,isMotionOwner:true},b:{id:'b',layer:0,radius:.5,mass:1,collisionEnabled:true,physicsEnabled:true}},initialTrajectories:new Map([['a',a],['b',b]]),physicsByBody:{a:{restitution:1,linearDamping:2,sleepLinearThreshold:0.02},b:{restitution:1,linearDamping:2,sleepLinearThreshold:0.02}}});
 assert.equal(out.collisions.length,1);
 for(const id of ['a','b']){
   const post=out.segments.get(id).filter(segment=>segment.type==='physics').at(-1);
   assert.equal(post.completion,'natural-equilibrium');
   assert.ok(post.duration>0);
   assert.ok(Math.hypot(...post.velocity(post.endTime))<=0.0200001);
 }
});
