import test from 'node:test';
import assert from 'node:assert/strict';
import { RigidBodyWorld3D, Physics3DMath } from '../../engine/modules/sprite/physics/3d/RigidBodyWorld.js';

test('3D transform uses XYZ and normalized quaternion; time is explicit',()=>{
 const w=new RigidBodyWorld3D({gravity:[0,0,0]});w.addBody({id:'a',position:[1,2,3],orientation:[2,0,0,0],velocity:[1,0,0]});
 const out=w.step();assert.deepEqual(out.bodies[0].transform.position,[1+w.config.fixedDt,2,3]);assert.deepEqual(out.bodies[0].orientation,[1,0,0,0]);assert.equal(out.t,w.config.fixedDt);assert.equal(out.tick,1);
});
test('dynamic impulse changes linear velocity and angular velocity when applied off-center',()=>{
 const w=new RigidBodyWorld3D({gravity:[0,0,0]});w.addBody({id:'ball',radius:1,mass:2,position:[0,0,0]});w.applyImpulse('ball',[0,0,2],[1,0,0]);const b=w.getBody('ball');assert.deepEqual(b.velocity,[0,0,1]);assert.ok(b.angularVelocity[1]<0);
});
test('sphere collision is deterministic and emits contact impulse',()=>{
 const make=()=>{const w=new RigidBodyWorld3D({gravity:[0,0,0],fixedDt:1/60});w.addBody({id:'a',radius:.5,mass:1,position:[-0.51,0,0],velocity:[1,0,0],material:{restitution:1}});w.addBody({id:'b',radius:.5,mass:1,position:[.51,0,0],velocity:[-1,0,0],material:{restitution:1}});return w.step();};
 const a=make(),b=make();assert.deepEqual(a.events,b.events);assert.equal(a.events[0].type,'collision');assert.ok(a.bodies[0].velocity[0]<0);assert.ok(a.bodies[1].velocity[0]>0);
});
test('sensor sphere overlap emits event but does not apply collision impulse',()=>{
 const w=new RigidBodyWorld3D({gravity:[0,0,0]});w.addBody({id:'sensor',type:'sensor',radius:1,position:[0,0,0]});w.addBody({id:'dynamic',radius:.5,position:[.5,0,0],velocity:[1,0,0]});const r=w.step();assert.ok(r.events.some(e=>e.type==='overlap'));assert.deepEqual(r.bodies.find(b=>b.id==='dynamic').velocity,[1,0,0]);
});
test('checkpoint restore preserves deterministic time, body state and pending impulses',()=>{
 const w=new RigidBodyWorld3D({gravity:[0,-1,0]});w.addBody({id:'ball',position:[0,1,0],velocity:[1,0,0]});w.scheduleImpulse({time:.01,id:'ball',impulse:[0,2,0],operationId:'jump'});w.step();const cp=w.checkpoint();const a=w.step();const restored=new RigidBodyWorld3D();restored.restore(cp);const b=restored.step();assert.deepEqual(a.bodies,b.bodies);assert.deepEqual(a.events,b.events);
});
test('scheduled operation id is idempotent and natural settling is explicit',()=>{
 const w=new RigidBodyWorld3D({gravity:[0,0,0],sleepDwell:0.02,fixedDt:0.01});w.addBody({id:'still',position:[0,0,0]});assert.equal(w.scheduleImpulse({time:0,id:'still',impulse:[0,0,0],operationId:'x'}),true);assert.equal(w.scheduleImpulse({time:0,id:'still',impulse:[0,0,0],operationId:'x'}),false);w.step();w.step();w.step();assert.equal(w.isSettled(),true);
});
test('invalid vector and variable timestep are rejected',()=>{const w=new RigidBodyWorld3D();assert.throws(()=>w.addBody({id:'bad',position:[NaN,0,0]}),TypeError);assert.throws(()=>w.step(.02),/fixedDt/);});
