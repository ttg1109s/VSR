import test from 'node:test';
import assert from 'node:assert/strict';
import { createBezierTrajectory, createLinearPhysicsSegment } from '../../engine/modules/sprite/trajectory.js';
import { firstCircleImpactResult, movingCircleTOI } from '../../engine/modules/sprite/collision.js';
import { createPoseTrajectory } from '../../engine/modules/sprite/PoseTrajectory.js';
import { createPhysicalStateSampler } from '../../engine/modules/sprite/PhysicalStateSampler.js';
import { RigidBodyWorld3D } from '../../engine/modules/sprite/RigidBodyWorld3D.js';
import { AuthoritativeSpriteSimulation } from '../../engine/modules/sprite/AuthoritativeSimulation.js';

test('CCD confirms tangential contact and rejects a geometric near miss',()=>{
  const a=createLinearPhysicsSegment({segmentId:'a',startTime:0,duration:2,position:[-2,0,0],velocity:[1,0,0]});
  const tangent=createLinearPhysicsSegment({segmentId:'b',startTime:0,duration:2,position:[0,1,0],velocity:[0,0,0]});
  const hit=firstCircleImpactResult({trajectoryA:a,trajectoryB:tangent,radiusA:1,radiusB:0,timeStart:0,timeEnd:2});
  assert.equal(hit.status,'confirmed-impact');
  assert.ok(Math.abs(hit.time-2)<1e-8);
  const miss=createLinearPhysicsSegment({segmentId:'c',startTime:0,duration:2,position:[0,1.00001,0],velocity:[0,0,0]});
  assert.equal(firstCircleImpactResult({trajectoryA:a,trajectoryB:miss,radiusA:1,radiusB:0,timeStart:0,timeEnd:2}).status,'no-impact');
  assert.equal(movingCircleTOI([-2,0,0],[1,0,0],[0,1,0],[0,0,0],1,2),2);
});

test('CCD returns indeterminate for unsupported trajectory bounds rather than no-impact',()=>{
  const known=createLinearPhysicsSegment({segmentId:'known',startTime:0,duration:1,position:[0,0,0],velocity:[0,0,0]});
  const custom={type:'custom',startTime:0,endTime:1,sample:t=>[Math.sin(t*Math.PI),0,0]};
  const result=firstCircleImpactResult({trajectoryA:known,trajectoryB:custom,radiusA:1,radiusB:1,timeStart:0,timeEnd:1});
  assert.equal(result.status,'indeterminate');
  assert.equal(result.reason,'unsupported-trajectory-bounds');
});

test('custom Bezier easing uses full control hull conservatively and authoritative status propagates uncertainty',()=>{
  const custom=createBezierTrajectory({segmentId:'custom',startTime:0,duration:1,points:[[0,0,0],[0,1,0],[0,1,0],[0,0,0]],easing:t=>Math.sin(Math.PI*t)});
  assert.equal(custom.easingName,'custom');
  const target=createLinearPhysicsSegment({segmentId:'target',startTime:0,duration:1,position:[0,1,0],velocity:[0,0,0]});
  const result=firstCircleImpactResult({trajectoryA:custom,trajectoryB:target,radiusA:.1,radiusB:.1,timeStart:0,timeEnd:1});
  assert.equal(result.status,'indeterminate');
  const sim=new AuthoritativeSpriteSimulation({gravity:[0,0,0]});
  const run=sim.run({bodies:{a:{radius:.1,collisionEnabled:true,physicsEnabled:true,mass:1},b:{radius:.1,collisionEnabled:true,physicsEnabled:true,mass:1}},initialTrajectories:new Map([['a',custom],['b',target]])});
  assert.ok(['completed','indeterminate'].includes(run.simulationStatus));
  if(run.profiler.ccdIndeterminate>0){
    assert.equal(run.simulationStatus,'indeterminate');
    assert.ok(run.indeterminatePairs.length>0);
  }
});

test('PoseTrajectory preserves direct 720-degree multi-turn keys and reports scale rate',()=>{
  const pose=createPoseTrajectory({initialPose:{location:[0,0,0],rotation:0,scale:1,origin:'center'},transformKeys:[{time:0,rotation:0,scale:[1,1,1]},{time:1,rotation:720,scale:[2,3,4]}],rotationMode:'direct'});
  assert.equal(pose.sample(.5).rotation,360);
  assert.deepEqual(pose.sample(.5).scale,[1.5,2,2.5]);
  assert.ok(Math.abs(pose.angularVelocity(.5)[2]-4*Math.PI)<1e-3);
  assert.ok(pose.scaleRate(.5).every((v,i)=>Math.abs(v-[1,2,3][i])<1e-6));
  assert.deepEqual(pose.sample(1).origin,'center');
});

test('PoseTrajectory normalizes quaternion keys and samples deterministic endpoint values',()=>{
  const pose=createPoseTrajectory({transformKeys:[{time:0,quaternion:[2,0,0,0]},{time:1,quaternion:[0,0,0,2]}],rotationMode:'shortest-path'});
  assert.deepEqual(pose.sample(0).rotation,[1,0,0,0]);
  const end=pose.sample(1).rotation;
  assert.ok(Math.abs(Math.hypot(...end)-1)<1e-12);
  assert.deepEqual(pose.sample(-1).scale,[1,1,1]);
});

test('PhysicalStateSampler derives box geometry and diagonal inertia from animated scale',()=>{
  const sampler=createPhysicalStateSampler({collider:{type:'box',halfExtents:[1,2,3]},mass:2,poseTrajectory:createPoseTrajectory({transformKeys:[{time:0,scale:[1,1,1]},{time:1,scale:[2,1,.5]}]})});
  const s=sampler(1);
  assert.deepEqual(s.geometry.halfExtents,[2,2,1.5]);
  assert.ok(Math.abs(s.inertia[0]-4.166666666666667)<1e-12);
  assert.ok(Math.abs(s.inertia[1]-4.166666666666667)<1e-12);
  assert.ok(Math.abs(s.inertia[2]-5.333333333333333)<1e-12);
});

test('PhysicalStateSampler supports nonuniform sphere scale and constant-density mass',()=>{
  const sampler=createPhysicalStateSampler({collider:{type:'sphere',radius:2},mass:3,constantDensity:true,density:2,poseTrajectory:createPoseTrajectory({transformKeys:[{time:0,scale:[2,1,.5]}]})});
  const s=sampler(0);
  assert.equal(s.geometry.type,'sphere');
  assert.equal(s.geometry.radius,4);
  assert.deepEqual(s.geometry.radii,[4,2,1]);
  assert.equal(s.geometry.approximation,'conservative-enclosing-sphere');
  assert.ok(s.mass>0);
  assert.ok(s.inertia.every(x=>Number.isFinite(x)&&x>0));
});

test('PhysicalStateSampler capsule inertia responds to axial and radial scale',()=>{
  const base=createPhysicalStateSampler({collider:{type:'capsule',radius:.5,halfLength:1},mass:2})(0);
  const radial=createPhysicalStateSampler({collider:{type:'capsule',radius:.5,halfLength:1},mass:2,poseTrajectory:createPoseTrajectory({transformKeys:[{time:0,scale:[2,1,1]}]})})(0);
  const axial=createPhysicalStateSampler({collider:{type:'capsule',radius:.5,halfLength:1},mass:2,poseTrajectory:createPoseTrajectory({transformKeys:[{time:0,scale:[1,2,1]}]})})(0);
  assert.ok(radial.inertia[1]>base.inertia[1]);
  assert.ok(axial.inertia[0]>base.inertia[0]);
  assert.ok(base.inertia.every(x=>Number.isFinite(x)&&x>0));
});

test('PhysicalStateSampler rejects dynamic and constant-density plane mass models',()=>{
  assert.throws(()=>createPhysicalStateSampler({collider:{type:'plane',normal:[0,1,0],offset:0},bodyType:'dynamic'}),/plane colliders cannot be dynamic/);
  assert.throws(()=>createPhysicalStateSampler({collider:{type:'plane',normal:[0,1,0],offset:0},constantDensity:true}),/constant-density mass is undefined/);
});


test('PoseTrajectory retarget carries position, angular and scale derivatives',()=>{
  const source=createPoseTrajectory({positionTrajectory:{sample:t=>[t*t,0,0],velocity:t=>[2*t,0,0]},transformKeys:[{time:0,rotation:0,scale:[1,1,1]},{time:2,rotation:180,scale:[3,3,3]}]});
  const before=source.sample(1),velocity=source.velocity(1),angular=source.angularVelocity(1),scaleRate=source.scaleRate(1);
  const next=source.retarget(1,{transformKeys:[{time:2,rotation:270,scale:[5,5,5]}]});
  assert.deepEqual(next.sample(1),before);
  assert.ok(next.velocity(1).every((v,i)=>Math.abs(v-velocity[i])<1e-9));
  assert.ok(next.angularVelocity(1).every((v,i)=>Math.abs(v-angular[i])<1e-9));
  assert.ok(next.scaleRate(1).every((v,i)=>Math.abs(v-scaleRate[i])<1e-9));
});

test('PhysicalStateSampler keeps the requested timestamp and conservative scale geometry',()=>{
  const pose=createPoseTrajectory({transformKeys:[{time:0,scale:[2,1,.5]},{time:1,scale:[1,2,1]}]});
  const sample=createPhysicalStateSampler({collider:{type:'sphere',radius:1},mass:2,poseTrajectory:pose});
  const result=sample(.5);
  assert.equal(result.time,.5);
  assert.deepEqual(result.scale,[1.5,1.5,.75]);
  assert.equal(result.geometry.radius,1.5);
  assert.equal(result.geometry.approximation,'conservative-enclosing-sphere');
});

test('RigidBodyWorld3D samples kinematic physical state at fixed-step timestamps',()=>{
  const {RigidBodyWorld3D}=await import('../../engine/modules/sprite/RigidBodyWorld3D.js');
  const {createPhysicalStateSampler}=await import('../../engine/modules/sprite/PhysicalStateSampler.js');
  const pose=createPoseTrajectory({positionTrajectory:{sample:t=>[t,0,0],velocity:()=>[1,0,0]},transformKeys:[{time:0,scale:[1,1,1]},{time:1,scale:[2,1,1]}]});
  const world=new RigidBodyWorld3D({fixedDt:.1,gravity:[0,0,0]});
  world.addBody({id:'scripted',type:'kinematic',poseTrajectory:pose,physicalStateSampler:createPhysicalStateSampler({collider:{type:'box',halfExtents:[1,1,1]},bodyType:'kinematic',poseTrajectory:pose})});
  world.syncPhysicalState(0);
  const snapshot=world.step().bodies[0];
  assert.equal(snapshot.physicalState.time,.1);
  assert.ok(Math.abs(snapshot.position[0]-.1)<1e-9);
  assert.ok(Math.abs(snapshot.collider.halfExtents[0]-1.1)<1e-9);
});
