import test from 'node:test';
import assert from 'node:assert/strict';
import { createBoxCollider3D, createSphereCollider3D, createPlaneCollider3D, collider3DWorldGeometry, collideWorldShapes3D, narrowphase3D, SUPPORTED_NARROWPHASE_PAIRS_3D } from '../../engine/modules/sprite/collider3d.js';
const box=(h=[1,1,1],q=[1,0,0,0],p=[0,0,0])=>collider3DWorldGeometry(createBoxCollider3D({halfExtents:h}),{position:p,orientation:q});
test('Phase 5 OBB box-box SAT detects overlap and separation with a contact feature',()=>{
 const a=box([1,1,1]),b=box([1,1,1],[Math.cos(Math.PI/8),0,0,Math.sin(Math.PI/8)],[1.5,0,0]);
 const hit=collideWorldShapes3D(a,b);assert.ok(hit);assert.ok(hit.penetration>=0);assert.equal(hit.feature,'obb-sat');assert.ok(hit.point.every(Number.isFinite));
 assert.equal(collideWorldShapes3D(a,box([1,1,1],[1,0,0,0],[5,0,0])),null);
});
test('Phase 5 OBB-plane contact is orientation-aware',()=>{
 const p=collider3DWorldGeometry(createPlaneCollider3D({normal:[0,1,0],offset:0}));
 const b=box([1,.25,1],[Math.cos(Math.PI/4),0,0,Math.sin(Math.PI/4)],[0,.5,0]);
 const c=collideWorldShapes3D(b,p);assert.ok(c);assert.ok(c.penetration>0);assert.equal(c.feature,'obb-plane');
});
test('Phase 5 narrowphase contract distinguishes unsupported pair from no-contact',()=>{
 const s=collider3DWorldGeometry(createSphereCollider3D({radius:1}));
 const e={type:'ellipsoid',center:[4,0,0],radii:[1,1,1],orientation:[1,0,0,0]};
 assert.equal(narrowphase3D(s,e).status,'confirmed-no-contact');
 assert.equal(narrowphase3D(e,{...e,center:[0,0,0]}).status,'indeterminate');
 assert.equal(narrowphase3D(e,box()).status,'indeterminate');
 assert.ok(SUPPORTED_NARROWPHASE_PAIRS_3D.includes('box:box'));
});

test('Phase 5 CCD preserves indeterminate status for unsupported shape pairs', async()=>{
 const {findCCDImpact3D}=await import('../../engine/modules/sprite/CCD3D.js');
 const sphere={collider:createSphereCollider3D({radius:1}),position:[0,0,0],velocity:[1,0,0],orientation:[1,0,0,0],angularVelocity:[0,0,0]};
 const ellipsoid={collider:{type:'ellipsoid',radii:[1,1,1]},position:[4,0,0],velocity:[0,0,0],orientation:[1,0,0,0],angularVelocity:[0,0,0]};
 const result=findCCDImpact3D(sphere,ellipsoid,1);
 assert.equal(result.status,'indeterminate');assert.equal(result.reason,'unsupported-shape-pair');
});
test('Phase 5 CCD returns explicit confirmed no-impact and initial-impact outcomes', async()=>{
 const {findCCDImpact3D}=await import('../../engine/modules/sprite/CCD3D.js');
 const a={collider:createSphereCollider3D({radius:.5}),position:[0,0,0],velocity:[0,0,0],orientation:[1,0,0,0],angularVelocity:[0,0,0]};
 const b={collider:createSphereCollider3D({radius:.5}),position:[3,0,0],velocity:[0,0,0],orientation:[1,0,0,0],angularVelocity:[0,0,0]};
 assert.equal(findCCDImpact3D(a,b,1).status,'confirmed-no-impact');
 b.position=[.5,0,0];assert.equal(findCCDImpact3D(a,b,1).status,'confirmed-impact');
});
