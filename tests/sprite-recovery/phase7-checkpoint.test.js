import test from 'node:test';
import assert from 'node:assert/strict';
import {RigidBodyWorld3D} from '../../engine/modules/sprite/RigidBodyWorld3D.js';
test('Phase 7 rigid-body checkpoint is detached and restores state atomically',()=>{
 const world=new RigidBodyWorld3D({fixedDt:1/60,gravity:[0,-2,0]});
 world.addBody({id:'a',type:'dynamic',position:[0,2,0],velocity:[1,0,0]});
 world.scheduleImpulse({id:'a',operationId:'impulse-a',time:2,impulse:[1,0,0]});
 const detached=world.checkpoint();assert.equal(detached.format,'vsr.rigidbody-world.checkpoint');
 detached.bodies[0].position[0]=99;assert.notEqual(world.snapshot()[0].position[0],99);
 const checkpoint=world.checkpoint(),restored=new RigidBodyWorld3D();restored.restore(checkpoint);
 assert.deepEqual(restored.snapshot(),world.snapshot());assert.equal(restored.pending.length,1);
 const before=restored.checkpoint(),bad=structuredClone(before);bad.bodies.push({...bad.bodies[0]});
 assert.throws(()=>restored.restore(bad),/duplicate body identity/);assert.deepEqual(restored.checkpoint(),before);
});
test('Phase 7 rigid-body checkpoint rejects incompatible solver version without mutation',()=>{
 const world=new RigidBodyWorld3D();world.addBody({id:'a',type:'dynamic'});
 const before=world.checkpoint();assert.throws(()=>world.restore({...before,physicsVersion:'future-model'}),/Incompatible/);assert.deepEqual(world.checkpoint(),before);
});
