import test from 'node:test';
import assert from 'node:assert/strict';
import { buildContactIslands, solveContactIslands, solveContactManifold } from '../../engine/modules/sprite/RigidBodySolver3D.js';

const body=(id,type='dynamic',velocity=[0,0,0])=>({id,type,position:[0,0,0],velocity:[...velocity],angularVelocity:[0,0,0],invMass:type==='dynamic'?1:0,mass:type==='dynamic'?1:Infinity,inertia:1,invInertia:type==='dynamic'?1:0,inertiaTensorLocal:[1,1,1],inverseInertiaTensorLocal:[1,1,1],orientation:[1,0,0,0],restitution:0,staticFriction:.8,dynamicFriction:.5});
const contact=(a,b,normal=[0,1,0],penetration=.01)=>({a,b,normal,point:[0,0,0],penetration});
test('Phase 6.5 island partition is deterministic for chain, branch, cycle and independent anchor networks',()=>{
 const a=body('a'),b=body('b'),c=body('c'),d=body('d'),e=body('e'),floor=body('floor','static');
 const contacts=[contact(a,b),contact(b,c),contact(b,d),contact(c,a),contact(a,floor),contact(e,floor)];
 const one=buildContactIslands(contacts),two=buildContactIslands([...contacts].reverse());
 assert.deepEqual(one.map(x=>x.bodyIds),[['a','b','c','d'],['e']]);
 assert.deepEqual(one.map(x=>x.bodyIds),two.map(x=>x.bodyIds));
 assert.equal(one[0].contacts.length,5);
 assert.equal(one[1].contacts.length,1);
});
test('Phase 6.5 island solver exposes normal, friction and position residual diagnostics',()=>{
 const floor=body('floor','static'),moving=body('moving','dynamic',[0,-1,1]);
 const contacts=[contact(floor,moving,[0,1,0],.02)];
 const solved=solveContactIslands([floor,moving],contacts,{velocityIterations:20,positionIterations:8});
 assert.equal(solved.islandCount,1);
 assert.ok(Number.isFinite(solved.maxNormalResidual));
 assert.ok(Number.isFinite(solved.maxFrictionResidual));
 assert.ok(Number.isFinite(solved.maxPositionResidual));
 assert.ok(solved.islandDiagnostics[0].hasOwnProperty('frictionResidual'));
 assert.ok(solved.islandDiagnostics[0].hasOwnProperty('positionResidual'));
 assert.ok(moving.velocity[1]>=-1e-3);
 assert.ok(moving.position[1]>0);
});
test('static friction holds a low tangential load without slipping',()=>{
 const floor=body('floor','static'),moving=body('moving','dynamic',[0,-1,.1]);
 const c=contact(floor,moving,[0,1,0],.01);
 const result=solveContactManifold([floor,moving],[c],{velocityIterations:30,positionIterations:0});
 assert.ok(Math.abs(moving.velocity[2])<1e-3,'tangential velocity should be arrested by static friction');
 assert.ok(result[0].tangentImpulse>0);
});
test('solver diagnostics do not report convergence when residuals exceed tolerances',()=>{
 const floor=body('floor','static'),moving=body('moving','dynamic',[0,-5,5]);
 const c=contact(floor,moving,[0,1,0],.1);
 const result=solveContactManifold([floor,moving],[c],{velocityIterations:1,positionIterations:1,normalTolerance:1e-12,frictionTolerance:1e-12,positionTolerance:1e-12});
 assert.equal(result.converged,false);
 assert.ok(result.normalResidual>0||result.frictionResidual>0||result.positionResidual>0);
});
test('island solver remains deterministic under contact input reordering',()=>{
 const run=reverse=>{
  const floor=body('floor','static'),a=body('a','dynamic',[0,-1,0]),b=body('b','dynamic',[0,-1,0]);
  const cs=[contact(floor,a),contact(a,b)];if(reverse)cs.reverse();
  const result=solveContactIslands([floor,a,b],cs,{velocityIterations:8,positionIterations:4});
  return {bodies:[a,b].map(x=>({id:x.id,velocity:x.velocity,position:x.position,angularVelocity:x.angularVelocity})),contacts:cs.map((c,i)=>({pair:[c.a.id,c.b.id].join('|'),impulse:result[i]})).sort((x,y)=>x.pair.localeCompare(y.pair))};
 };
 assert.deepEqual(run(false),run(true));
});
