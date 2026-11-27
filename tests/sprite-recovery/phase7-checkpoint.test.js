import test from 'node:test';
import assert from 'node:assert/strict';
import {RigidBodyWorld3D} from '../../engine/modules/sprite/RigidBodyWorld3D.js';
test('Phase 7 rigid-body checkpoint is detached and restores state atomically',()=>{
 const world=new RigidBodyWorld3D({fixedDt:1/60,gravity:[0,-2,0]});
 world.addBody({id:'a',type:'dynamic',position:[0,2,0],velocity:[1,0,0],force:[0.25,0,0],torque:[0,0,0.1],linearDamping:0.1});
 world.scheduleImpulse({id:'a',operationId:'impulse-a',time:2,impulse:[1,0,0]});
 const detached=world.checkpoint();assert.equal(detached.format,'vsr.rigidbody-world.checkpoint');
 detached.bodies[0].position[0]=99;assert.notEqual(world.snapshot()[0].position[0],99);
 const checkpoint=world.checkpoint(),restored=new RigidBodyWorld3D();restored.restore(checkpoint);
 assert.deepEqual(restored.snapshot(),world.snapshot());assert.equal(restored.pending.length,1);assert.deepEqual(restored.snapshot()[0].force,[0.25,0,0]);assert.equal(restored.snapshot()[0].linearDamping,0.1);
 const before=restored.checkpoint(),bad=structuredClone(before);bad.bodies.push({...bad.bodies[0]});
 assert.throws(()=>restored.restore(bad),/duplicate body identity/);assert.deepEqual(restored.checkpoint(),before);
});
test('Phase 7 rigid-body checkpoint rejects incompatible solver version without mutation',()=>{
 const world=new RigidBodyWorld3D();world.addBody({id:'a',type:'dynamic'});
 const before=world.checkpoint();assert.throws(()=>world.restore({...before,physicsVersion:'future-model'}),/Incompatible/);assert.deepEqual(world.checkpoint(),before);
});

test('Phase 7 checkpoint rejects unsnapshotable trajectory and physical sampler closures',()=>{
 const world=new RigidBodyWorld3D();
 world.addBody({id:'kinematic',type:'kinematic',poseTrajectory:{sample:()=>[0,0,0]}});
 assert.throws(()=>world.checkpoint(),/runtime trajectory\/sampler closures/);
});


test('Phase 7 checkpoint continuation matches uninterrupted deterministic simulation',()=>{
 const create=()=>new RigidBodyWorld3D({fixedDt:1/120,gravity:[0,-9.81,0],velocityIterations:8,positionIterations:3});
 const uninterrupted=create();
 uninterrupted.addBody({id:'a',type:'dynamic',position:[0,3,0],velocity:[1,0,0],radius:0.5,restitution:0.2});
 uninterrupted.addBody({id:'floor',type:'static',position:[0,0,0],radius:1});
 for(let i=0;i<25;i++)uninterrupted.step();
 const checkpoint=uninterrupted.checkpoint();
 const checkpointEvents=uninterrupted.events.length;
 const continued=[];for(let i=0;i<40;i++)continued.push(uninterrupted.step());
 const finalState=uninterrupted.snapshot();const postCheckpointEvents=uninterrupted.events.slice(checkpointEvents);
 const restored=create();restored.restore(checkpoint);
 const replayed=[];for(let i=0;i<40;i++)replayed.push(restored.step());
 assert.deepEqual(restored.snapshot(),finalState);
 assert.deepEqual(restored.events,postCheckpointEvents);
 assert.deepEqual(restored.lastDiagnostics,uninterrupted.lastDiagnostics);
});
