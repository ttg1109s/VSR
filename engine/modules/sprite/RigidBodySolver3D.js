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
 const normalResidual=ordered.reduce((max,c)=>{const rv=sub(add(c.b.velocity,cross(c.b.angularVelocity,c.rb)),add(c.a.velocity,cross(c.a.angularVelocity,c.ra))),vn=dot(rv,c.normal),target=-(c.preVn<-.5?Math.min(c.a.restitution,c.b.restitution):0)*c.preVn,residual=c.accN>1e-12?Math.abs(vn-target):Math.max(0,target-vn);return Math.max(max,residual);},0);
 const results=ordered.map(c=>({normalImpulse:c.accN,tangentImpulse:Math.hypot(...c.accT)}));results.iterations=velocityIterations;results.positionIterations=positionIterations;results.contacts=ordered.length;results.maxPenetration=ordered.reduce((v,c)=>Math.max(v,c.penetration||0),0);results.normalResidual=normalResidual;results.converged=normalResidual<=1e-3;return results;
}
/** Deterministic contact-island partitioning. Static/kinematic anchors do not merge
 * otherwise independent dynamic networks (e.g. two stacks on the same floor). */
export function buildContactIslands(contacts){
 const ordered=[...contacts].sort((a,b)=>a.a.id.localeCompare(b.a.id)||a.b.id.localeCompare(b.b.id));
 const dynamicIds=[...new Set(ordered.flatMap(c=>[c.a,c.b]).filter(b=>b.type==='dynamic').map(b=>b.id))].sort();
 const parent=new Map(dynamicIds.map(id=>[id,id]));
 const find=id=>{let p=parent.get(id);while(p!==parent.get(p)){parent.set(p,parent.get(parent.get(p)));p=parent.get(p);}return p;};
 const union=(a,b)=>{let ra=find(a),rb=find(b);if(ra===rb)return;if(ra<rb)parent.set(rb,ra);else parent.set(ra,rb);};
 for(const c of ordered)if(c.a.type==='dynamic'&&c.b.type==='dynamic')union(c.a.id,c.b.id);
 const groups=new Map();
 for(const id of dynamicIds){const root=find(id);if(!groups.has(root))groups.set(root,{bodyIds:[],contacts:[]});groups.get(root).bodyIds.push(id);}
 for(const c of ordered){const dynamic=c.a.type==='dynamic'?c.a:c.b.type==='dynamic'?c.b:null;if(!dynamic)continue;const group=groups.get(find(dynamic.id));group.contacts.push(c);}
 return [...groups.values()].sort((a,b)=>a.bodyIds[0].localeCompare(b.bodyIds[0])).map(g=>({bodyIds:g.bodyIds,contacts:g.contacts}));
}
/** Solve independent contact islands deterministically, preserving existing solver semantics.
 * Results are flattened in stable island/contact order; diagnostics expose per-island work. */
export function solveContactIslands(bodies,contacts,options={}){
 const islands=buildContactIslands(contacts),results=new Array(contacts.length),diagnostics=[],contactIndex=new Map(contacts.map((c,i)=>[c,i]));
 for(const island of islands){const solved=solveContactManifold(bodies,island.contacts,options);island.contacts.forEach((c,i)=>{results[contactIndex.get(c)]=solved[i];});diagnostics.push({bodyIds:island.bodyIds,bodyCount:island.bodyIds.length,contactCount:island.contacts.length,velocityIterations:solved.iterations,positionIterations:solved.positionIterations,maxPenetration:solved.maxPenetration,normalResidual:solved.normalResidual,converged:solved.converged});}
 results.contacts=contacts.length;results.iterations=diagnostics.reduce((m,d)=>Math.max(m,d.velocityIterations),0);results.positionIterations=diagnostics.reduce((m,d)=>Math.max(m,d.positionIterations),0);results.maxPenetration=diagnostics.reduce((m,d)=>Math.max(m,d.maxPenetration),0);results.islandCount=islands.length;results.islandDiagnostics=diagnostics;results.maxIslandBodies=diagnostics.reduce((m,d)=>Math.max(m,d.bodyCount),0);results.maxIslandContacts=diagnostics.reduce((m,d)=>Math.max(m,d.contactCount),0);results.maxNormalResidual=diagnostics.reduce((m,d)=>Math.max(m,d.normalResidual),0);results.converged=diagnostics.every(d=>d.converged);return results;
}
export const Tensor3D={matVec,matMul,transpose,rotate};
