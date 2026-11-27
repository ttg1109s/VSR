/** Phase 6 rigid-body tensor math and deterministic sequential-impulse contact solver. */
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0), add=(a,b)=>a.map((x,i)=>x+b[i]), sub=(a,b)=>a.map((x,i)=>x-b[i]), scale=(a,s)=>a.map(x=>x*s);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const qn=q=>{const n=Math.hypot(...q)||1;return q.map(x=>x/n);};
const qmul=(a,b)=>[a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3],a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2],a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[2],a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]];
const rotate=(q,v)=>{const p=qmul(qmul(q,[0,...v]),[q[0],-q[1],-q[2],-q[3]]);return p.slice(1);};
const matDiag=d=>[[d[0],0,0],[0,d[1],0],[0,0,d[2]]];
const matVec=(m,v)=>m.map(row=>dot(row,v));
const transpose=m=>m[0].map((_,i)=>m.map(row=>row[i]));
const matMul=(a,b)=>a.map(row=>b[0].map((_,j)=>dot(row,b.map(r=>r[j]))));
const invDiag=d=>matDiag(d.map(x=>x>1e-12&&Number.isFinite(x)?1/x:0));
export function worldInverseInertia(body){if(body.type!=='dynamic')return [[0,0,0],[0,0,0],[0,0,0]];const local=body.inverseInertiaTensorLocal||invDiag(body.inertiaTensorLocal||[body.inertia,body.inertia,body.inertia]),q=qn(body.orientation),basis=[rotate(q,[1,0,0]),rotate(q,[0,1,0]),rotate(q,[0,0,1])],R=transpose(basis);return matMul(matMul(R,local),transpose(R));}
export function applyAngularImpulse(body,impulse){body.angularVelocity=add(body.angularVelocity,matVec(worldInverseInertia(body),impulse));}
export function effectiveMass(body,r,n){if(body.type!=='dynamic')return 0;const rn=cross(r,n);return body.invMass+dot(rn,matVec(worldInverseInertia(body),rn));}
export function solveContactManifold(bodies,contacts,{velocityIterations=10,positionIterations=4,baumgarte=.18,slop=.002}={}){
 const ordered=[...contacts].sort((a,b)=>a.a.id.localeCompare(b.a.id)||a.b.id.localeCompare(b.b.id));
 for(const c of ordered){c.accN=0;c.accT=[0,0,0];c.ra=sub(c.point,c.a.position);c.rb=sub(c.point,c.b.position);c.preVn=dot(sub(add(c.b.velocity,cross(c.b.angularVelocity,c.rb)),add(c.a.velocity,cross(c.a.angularVelocity,c.ra))),c.normal);}
 for(let it=0;it<velocityIterations;it++)for(const c of ordered){const {a,b,normal:n,ra,rb}=c,rv=sub(add(b.velocity,cross(b.angularVelocity,rb)),add(a.velocity,cross(a.angularVelocity,ra))),vn=dot(rv,n),den=effectiveMass(a,ra,n)+effectiveMass(b,rb,n);if(den<=1e-12)continue;const restitution=(c.preVn<-.5?Math.min(a.restitution,b.restitution):0),target=-restitution*c.preVn;let d=(target-vn)/den,old=c.accN;c.accN=Math.max(0,old+d);d=c.accN-old;const J=scale(n,d);if(a.type==='dynamic'){a.velocity=sub(a.velocity,scale(J,a.invMass));applyAngularImpulse(a,scale(cross(ra,J),-1));}if(b.type==='dynamic'){b.velocity=add(b.velocity,scale(J,b.invMass));applyAngularImpulse(b,cross(rb,J));}
 const rv2=sub(add(b.velocity,cross(b.angularVelocity,rb)),add(a.velocity,cross(a.angularVelocity,ra))),tangent=sub(rv2,scale(n,dot(rv2,n))),tl=Math.hypot(...tangent);if(tl<1e-10)continue;const t=scale(tangent,1/tl),dt=-dot(rv2,t)/(effectiveMass(a,ra,t)+effectiveMass(b,rb,t)||1),mu=Math.sqrt(a.dynamicFriction*b.dynamicFriction),next=scale(t,Math.max(-mu*c.accN,Math.min(mu*c.accN,dt))),delta=sub(next,c.accT);c.accT=next;if(a.type==='dynamic'){a.velocity=sub(a.velocity,scale(delta,a.invMass));applyAngularImpulse(a,scale(cross(ra,delta),-1));}if(b.type==='dynamic'){b.velocity=add(b.velocity,scale(delta,b.invMass));applyAngularImpulse(b,cross(rb,delta));}}
 for(let it=0;it<positionIterations;it++)for(const c of ordered){const {a,b,normal:n,penetration}=c,den=a.invMass+b.invMass;if(den<=1e-12)continue;const correction=Math.max(0,penetration-slop)*baumgarte/positionIterations/den,J=scale(n,correction);if(a.type==='dynamic')a.position=sub(a.position,scale(J,a.invMass));if(b.type==='dynamic')b.position=add(b.position,scale(J,b.invMass));}
 return ordered.map(c=>({normalImpulse:c.accN,tangentImpulse:Math.hypot(...c.accT)}));
}
export const Tensor3D={matVec,matMul,transpose,rotate};
