import { createDimensionProfile } from './DimensionProfile.js';
import { createSphereCollider3D, collider3DWorldGeometry, collideWorldShapes3D, narrowphase3D } from './collider3d.js';
import { buildSweptBroadphasePairs } from './Broadphase3D.js';
import { findCCDImpact3D } from './CCD3D.js';
import { worldInverseInertia, applyAngularImpulse, effectiveMass, buildContactIslands, solveContactIslands } from './RigidBodySolver3D.js';
/** Deterministic fixed-step 3D-native rigid-body runtime (sphere colliders in v1).
 * Transform convention: position=[x,y,z], orientation=[w,x,y,z] quaternion, time=t seconds.
 * This is a foundational 3D profile, not a replacement for a general convex solver yet.
 */
const EPS=1e-12;
const v3=(v=[0,0,0])=>{if(!Array.isArray(v)||v.length!==3||v.some(x=>!Number.isFinite(x)))throw new TypeError('Expected finite Vec3');return [...v];};
const add=(a,b)=>a.map((x,i)=>x+b[i]);
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const scale=(a,s)=>a.map(x=>x*s);
const dot=(a,b)=>a.reduce((n,x,i)=>n+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const len=a=>Math.hypot(...a);
const norm=a=>{const l=len(a);return l>EPS?scale(a,1/l):[1,0,0];};
const qnorm=q=>{if(!Array.isArray(q)||q.length!==4||q.some(x=>!Number.isFinite(x)))throw new TypeError('Expected finite Quat [w,x,y,z]');const l=Math.hypot(...q);if(l<EPS)return [1,0,0,0];return q.map(x=>x/l);};
const qmul=(a,b)=>[a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3],a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2],a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1],a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]];
const qintegrate=(q,w,dt)=>qnorm(qmul(q,[1, ...scale(w,dt/2)]));
function finitePositive(x,name,allowZero=false){if(!Number.isFinite(x)||(allowZero?x<0:x<=0))throw new TypeError(`${name} must be ${allowZero?'non-negative':'positive'} finite`);return x;}
function makeBody(spec){
 const id=String(spec.id??'');if(!id)throw new TypeError('Body id required');
 const type=spec.type??'dynamic';if(!['dynamic','static','kinematic','sensor'].includes(type))throw new TypeError(`Unsupported body type ${type}`);
 const radius=finitePositive(spec.radius??0.5,'radius');const mass=type==='dynamic'?finitePositive(spec.mass??1,'mass'):Infinity;const collider=spec.collider||createSphereCollider3D({radius});const poseTrajectory=spec.poseTrajectory||null,physicalStateSampler=spec.physicalStateSampler||null;const initialPhysical=physicalStateSampler?.(0)||null;const inertia=type==='dynamic'?(collider.type==='box'?mass*(collider.halfExtents[0]**2+collider.halfExtents[1]**2+collider.halfExtents[2]**2)/3:0.4*mass*radius*radius):Infinity;const invMass=type==='dynamic'?1/mass:0;const invInertia=type==='dynamic'&&inertia>EPS?1/inertia:0;const inertiaTensorLocal=initialPhysical?.inertia?.length===3?initialPhysical.inertia.slice():collider.type==='box'&&collider.halfExtents?collider.halfExtents.map((h,i)=>mass*((collider.halfExtents[(i+1)%3]**2)+(collider.halfExtents[(i+2)%3]**2))/3):[inertia,inertia,inertia];
 const material=spec.material||{};const restitution=Math.max(0,Math.min(1,material.restitution??spec.restitution??0));
 const staticFriction=finitePositive(material.staticFriction??spec.staticFriction??0.5,'staticFriction',true);
 const dynamicFriction=finitePositive(material.dynamicFriction??spec.friction??0.3,'dynamicFriction',true);
 const transform=spec.transform||{};
 return {id,type,radius,mass,baseMass:mass,collider,baseCollider:structuredClone(collider),poseTrajectory,physicalStateSampler,physicalState:initialPhysical,invMass,inertia,invInertia,inertiaTensorLocal,inverseInertiaTensorLocal:inertiaTensorLocal.map(x=>x>EPS&&Number.isFinite(x)?1/x:0),position:v3(transform.position??spec.position??initialPhysical?.pose?.location),orientation:qnorm(transform.orientation??spec.orientation??[1,0,0,0]),velocity:v3(spec.velocity),angularVelocity:v3(spec.angularVelocity),force:v3(spec.force),torque:v3(spec.torque),restitution,staticFriction,dynamicFriction,linearDamping:finitePositive(spec.linearDamping??0,'linearDamping',true),angularDamping:finitePositive(spec.angularDamping??0,'angularDamping',true),awake:type==='dynamic',sleepTime:0,collisionEnabled:spec.collisionEnabled!==false,ccd:spec.ccd===true};
}
function kineticEnergy(b){return b.type==='dynamic'?0.5*b.mass*dot(b.velocity,b.velocity)+0.5*b.inertia*dot(b.angularVelocity,b.angularVelocity):0;}
export class RigidBodyWorld3D {
 constructor({fixedDt=1/120,gravity=[0,-9.81,0],velocityIterations=8,positionIterations=3,sleepLinearThreshold=0.02,sleepAngularThreshold=0.03,sleepDwell=0.5,maxSubsteps=8,dimension='3D',plane='XY',planeOffset=0,dimensionPolicy='project'}={}){
  finitePositive(fixedDt,'fixedDt');if(!Number.isSafeInteger(velocityIterations)||velocityIterations<1)throw new TypeError('velocityIterations must be positive integer');
  this.dimensionProfile=createDimensionProfile({dimension,plane,offset:planeOffset,policy:dimensionPolicy});this.config={fixedDt,gravity:this.dimensionProfile.projectVector(v3(gravity),'gravity'),velocityIterations,positionIterations,sleepLinearThreshold:finitePositive(sleepLinearThreshold,'sleepLinearThreshold',true),sleepAngularThreshold:finitePositive(sleepAngularThreshold,'sleepAngularThreshold',true),sleepDwell:finitePositive(sleepDwell,'sleepDwell',true),maxSubsteps,dimension,plane,planeOffset,dimensionPolicy};
  this.t=0;this.tick=0;this.bodies=new Map();this.events=[];this.pending=[];this.lastDiagnostics=null;this._sequence=0;
 }
 addBody(spec){const b=makeBody(spec);this.dimensionProfile.constrainBody(b);if(this.bodies.has(b.id))throw new Error(`Duplicate body ${b.id}`);this.bodies.set(b.id,b);return this.getBody(b.id);}
 removeBody(id){return this.bodies.delete(String(id));}
 getBody(id){const b=this.bodies.get(String(id));return b?this.snapshotBody(b):null;}
 applyForce(id,force,torque=[0,0,0]){const b=this.#dynamic(id);b.force=add(b.force,this.dimensionProfile.projectVector(v3(force),'force'));b.torque=add(b.torque,this.dimensionProfile.projectAngular(v3(torque)));this.dimensionProfile.constrainBody(b);this.#wake(b);}
 applyImpulse(id,impulse,point=null){const b=this.#dynamic(id);const J=this.dimensionProfile.projectVector(v3(impulse),'impulse');b.velocity=add(b.velocity,scale(J,b.invMass));if(point)applyAngularImpulse(b,cross(sub(this.dimensionProfile.projectPosition(v3(point)),b.position),J));this.dimensionProfile.constrainBody(b);this.#wake(b);}
 scheduleImpulse({time,id,impulse,point=null,operationId}){finitePositive(time,'time',true);const op=String(operationId??`impulse-${++this._sequence}`);if(this.pending.some(x=>x.operationId===op))return false;this.pending.push({time,id:String(id),impulse:v3(impulse),point:point?v3(point):null,operationId:op,sequence:this._sequence++});this.pending.sort((a,b)=>a.time-b.time||a.sequence-b.sequence||a.operationId.localeCompare(b.operationId));return true;}
 step(dt=this.config.fixedDt){finitePositive(dt,'dt');if(Math.abs(dt-this.config.fixedDt)>1e-12)throw new Error('Authoritative world requires fixedDt; use advance() for wall-time accumulation');this.events=[];const startEnergy=this.energy();
  this.#samplePhysicalState(this.t);
  for(const op of this.pending.filter(x=>x.time<=this.t+dt+1e-12)){this.applyImpulse(op.id,op.impulse,op.point);this.events.push({type:'impulse',t:Math.max(this.t,op.time),operationId:op.operationId,bodyId:op.id,impulse:op.impulse});}
  this.pending=this.pending.filter(x=>x.time>this.t+dt+1e-12);
  const dyn=[...this.bodies.values()].filter(b=>b.type==='dynamic'&&b.awake).sort((a,b)=>a.id.localeCompare(b.id));
  for(const b of dyn){b.velocity=add(b.velocity,scale(add(this.config.gravity,scale(b.force,b.invMass)),dt));applyAngularImpulse(b,scale(b.torque,dt));b.velocity=scale(b.velocity,Math.max(0,1-b.linearDamping*dt));b.angularVelocity=scale(b.angularVelocity,Math.max(0,1-b.angularDamping*dt));}
  const ccdHandled=new Set(),collisionEvents=[],ccdEvents=[],ccdAdvance=new Map(),ids=[...this.bodies.keys()].sort();let candidatePairs=buildSweptBroadphasePairs(this.bodies,{dt,cellSize:Math.max(4,...[...this.bodies.values()].map(b=>Math.max(1,b.radius*2)))});
  // Global CCD event loop: advance to the earliest impact, solve it, then
  // recompute candidate TOIs over the remaining portion of this fixed step.
  const ccdBodies=[...this.bodies.values()].sort((a,b)=>a.id.localeCompare(b.id));
  let remaining=dt,elapsed=0,impactCount=0,ccdUnresolved=false;
  const maxCCDImpacts=Math.max(16,Math.min(256,candidatePairs.length*4));
  const advanceWorld=(delta)=>{if(delta<=0)return;for(const body of ccdBodies)if((body.type==='dynamic'&&body.awake)||body.type==='kinematic'){body.position=add(body.position,scale(body.velocity,delta));body.orientation=qintegrate(body.orientation,body.angularVelocity,delta);this.dimensionProfile.constrainBody(body);}};
  const ccdPairHandled=new Set(),ccdEventTimeKeys=new Set(),ccdUncertainKeys=new Set();
  while(remaining>EPS&&impactCount<maxCCDImpacts){
   const freshPairs=buildSweptBroadphasePairs(this.bodies,{dt:remaining,cellSize:Math.max(4,...[...this.bodies.values()].map(b=>Math.max(1,b.radius*2)))}),pairMap=new Map([...candidatePairs,...freshPairs].map(p=>[`${p[0]}\0${p[1]}`,p]));candidatePairs=[...pairMap.values()].sort((x,y)=>x[0].localeCompare(y[0])||x[1].localeCompare(y[1]));

   let earliest=null;const confirmed=[];
   for(const [pairA,pairB] of freshPairs){const a=this.bodies.get(pairA),b=this.bodies.get(pairB);if(!(a.ccd||b.ccd)||!a.collisionEnabled||!b.collisionEnabled||a.type==='static'&&b.type==='static')continue;
    const impact=findCCDImpact3D(a,b,remaining);
    if(impact.status==='indeterminate'){const key=a.id+'\0'+b.id+'\0'+(impact.reason||'indeterminate');if(!ccdUncertainKeys.has(key)){ccdUncertainKeys.add(key);const uncertainty={type:'ccd-indeterminate',t:this.t+elapsed,bodyA:a.id,bodyB:b.id,pair:impact.pair,reason:impact.reason,interval:impact.interval||null};ccdEvents.push(uncertainty);this.events.push(uncertainty);}continue;}
    if(impact.status!=='confirmed-impact')continue;
    const contact=impact.contact,n=contact.normal,point=contact.point,ra=sub(point,a.position),rb=sub(point,b.position),rv=dot(sub(add(b.velocity,cross(b.angularVelocity,rb)),add(a.velocity,cross(a.angularVelocity,ra))),n);
    if(impact.time<=TOI_TOL&&rv>=-EPS)continue;
    const candidate={a,b,impact,toi:Math.max(0,impact.time),vn:rv};confirmed.push(candidate);
    if(!earliest||candidate.toi<earliest.toi-TOI_TOL)earliest=candidate;
   }
   if(!earliest){advanceWorld(remaining);elapsed+=remaining;remaining=0;break;}
   const toi=earliest.toi;advanceWorld(toi);elapsed+=toi;remaining-=toi;
   // Group impacts whose TOIs fall within tolerance; stable pair order makes the batch deterministic.
   const batch=confirmed.filter(c=>Math.abs(c.toi-toi)<=TOI_TOL).sort((x,y)=>x.a.id.localeCompare(y.a.id)||x.b.id.localeCompare(y.b.id));
   const batchPairs=new Set(batch.map(({a,b})=>a.id+'\\0'+b.id));
   const batchDynamicIds=new Set(batch.flatMap(({a,b})=>[a,b]).filter(body=>body.type==='dynamic').map(body=>body.id));
   // At the TOI, discover contacts touching the batch's dynamic topology. Expand
   // the closure through dynamic-dynamic contacts so newly connected bodies are
   // solved in the same island batch rather than deferred to end-of-step.
   const topologyContacts=new Map();
   const pairKey=(a,b)=>a.id+'\\0'+b.id;
   for(const [pairA,pairB] of freshPairs){
    const a=this.bodies.get(pairA),b=this.bodies.get(pairB);
    if(!a.collisionEnabled||!b.collisionEnabled||a.type==='static'&&b.type==='static'||a.type==='sensor'||b.type==='sensor')continue;
    const key=pairKey(a,b),ga=collider3DWorldGeometry(a.collider,{position:a.position,orientation:a.orientation}),gb=collider3DWorldGeometry(b.collider,{position:b.position,orientation:b.orientation}),result=narrowphase3D(ga,gb);
    if(result.status!=='confirmed-contact')continue;
    const contact=result.contact;
    topologyContacts.set(key,{a,b,normal:contact.normal,point:contact.point,penetration:contact.penetration??0,colliderA:a.collider.type,colliderB:b.collider.type,ccd:batchPairs.has(key)});
   }
   let changed=true;
   while(changed){changed=false;for(const contact of topologyContacts.values())if(contact.a.type==='dynamic'&&contact.b.type==='dynamic'&&(batchDynamicIds.has(contact.a.id)||batchDynamicIds.has(contact.b.id))){for(const id of [contact.a.id,contact.b.id])if(!batchDynamicIds.has(id)){batchDynamicIds.add(id);changed=true;}}}
   const ccdContacts=[...topologyContacts.values()].filter(c=>batchPairs.has(pairKey(c.a,c.b))||c.a.type==='dynamic'&&batchDynamicIds.has(c.a.id)||c.b.type==='dynamic'&&batchDynamicIds.has(c.b.id)).sort((x,y)=>x.a.id.localeCompare(y.a.id)||x.b.id.localeCompare(y.b.id));
   // Ensure confirmed TOI contacts survive narrowphase edge cases at the exact
   // impact instant, and avoid duplicate pairs in the solve batch.
   for(const {a,b,impact} of batch){const key=pairKey(a,b);if(!topologyContacts.has(key)){const contact=impact.contact;topologyContacts.set(key,{a,b,normal:contact.normal,point:contact.point,penetration:contact.penetration??0,colliderA:a.collider.type,colliderB:b.collider.type,ccd:true});}}
   const solveContacts=[...topologyContacts.values()].filter(c=>batchPairs.has(pairKey(c.a,c.b))||c.a.type==='dynamic'&&batchDynamicIds.has(c.a.id)||c.b.type==='dynamic'&&batchDynamicIds.has(c.b.id)).sort((x,y)=>x.a.id.localeCompare(y.a.id)||x.b.id.localeCompare(y.b.id));
   const ccdIslands=buildContactIslands(solveContacts);
   for(const island of ccdIslands){const active=island.bodyIds.some(id=>this.bodies.get(id)?.awake)||island.contacts.some(c=>{const ra=sub(c.point,c.a.position),rb=sub(c.point,c.b.position),rv=sub(add(c.b.velocity,cross(c.b.angularVelocity,rb)),add(c.a.velocity,cross(c.a.angularVelocity,ra)));return dot(rv,c.normal)<-EPS;});if(active)for(const id of island.bodyIds)this.#wake(this.bodies.get(id));}
   const batchSolved=solveContactIslands(this.bodies,solveContacts,{velocityIterations:this.config.velocityIterations,positionIterations:0});
   const solvedByPair=new Map(solveContacts.map((c,i)=>[pairKey(c.a,c.b),batchSolved[i]]));
   const timeKey=Math.round((this.t+elapsed)/TOI_TOL);
   for(const c of solveContacts){const key=pairKey(c.a,c.b),imp=solvedByPair.get(key),eventKey=key+'\\0'+timeKey;if(!ccdEventTimeKeys.has(eventKey)){ccdEventTimeKeys.add(eventKey);const isImpact=batchPairs.has(key),event={type:'collision',t:this.t+elapsed,bodyA:c.a.id,bodyB:c.b.id,position:c.point,normal:c.normal,penetration:c.penetration??0,normalImpulse:imp.normalImpulse,tangentImpulse:imp.tangentImpulse,ccd:isImpact,ccdTopologyPropagated:!isImpact,ccdImpactIndex:isImpact?impactCount+batch.findIndex(x=>pairKey(x.a,x.b)===key):undefined,solver:'sequential-impulse-ccd-topology-batch'};ccdEvents.push(event);this.events.push(event);ccdHandled.add(c.a.id);ccdHandled.add(c.b.id);}ccdPairHandled.add(key);}
   impactCount+=batch.length;
   if(toi<=TOI_TOL&&batchSolved.some(x=>x.normalImpulse<=EPS)){const nudge=Math.min(remaining,TOI_TOL);advanceWorld(nudge);elapsed+=nudge;remaining-=nudge;}  }
  if(remaining>EPS){ccdUnresolved=true;advanceWorld(remaining);elapsed+=remaining;remaining=0;const ev={type:'ccd-impact-budget-exhausted',t:this.t+dt,impactCount,maxCCDImpacts};ccdEvents.push(ev);this.events.push(ev);}
  for(const b of ccdBodies)ccdAdvance.set(b.id,true);
  for(const b of [...this.bodies.values()].sort((a,b)=>a.id.localeCompare(b.id)))if((b.type==='dynamic'&&b.awake)||b.type==='kinematic'){if(!ccdAdvance.has(b.id)){b.position=add(b.position,scale(b.velocity,dt));b.orientation=qintegrate(b.orientation,b.angularVelocity,dt);}this.dimensionProfile.constrainBody(b);}
  for(const b of this.bodies.values())if(b.physicalStateSampler){this.#samplePhysicalStateForBody(b,this.t+dt);}
  const contactManifolds=[];
  for(const [pairA,pairB] of candidatePairs){const a=this.bodies.get(pairA),b=this.bodies.get(pairB);if(ccdPairHandled.has(`${a.id}\0${b.id}`))continue;if(!a.collisionEnabled||!b.collisionEnabled||a.type==='static'&&b.type==='static')continue;const ga=collider3DWorldGeometry(a.collider,{position:a.position,orientation:a.orientation}),gb=collider3DWorldGeometry(b.collider,{position:b.position,orientation:b.orientation}),result=narrowphase3D(ga,gb);if(result.status==='indeterminate'){this.events.push({type:'narrowphase-indeterminate',t:this.t+dt,bodyA:a.id,bodyB:b.id,pair:result.pair,reason:result.reason});continue;}if(result.status==='confirmed-no-contact')continue;const contact=result.contact,n=contact.normal,point=contact.point,penetration=contact.penetration;if(a.type==='sensor'||b.type==='sensor'){this.events.push({type:'overlap',t:this.t+dt,bodyA:a.id,bodyB:b.id,position:point,normal:n,penetration});continue;}contactManifolds.push({a,b,normal:n,point,penetration,colliderA:a.collider.type,colliderB:b.collider.type});}
  // Wake propagation: an awake dynamic member wakes its entire connected dynamic island
  // before solving, so sleeping bodies in chains/branches receive solver impulses and
  // participate in subsequent fixed-step integration.
  const wakeIslands=buildContactIslands(contactManifolds);
  for(const island of wakeIslands){const active=island.bodyIds.some(id=>this.bodies.get(id)?.awake)||island.contacts.some(c=>{const ra=sub(c.point,c.a.position),rb=sub(c.point,c.b.position),rv=sub(add(c.b.velocity,cross(c.b.angularVelocity,rb)),add(c.a.velocity,cross(c.a.angularVelocity,ra)));return dot(rv,c.normal)<-EPS;});if(active){for(const id of island.bodyIds)this.#wake(this.bodies.get(id));}}
  const solved=solveContactIslands(this.bodies,contactManifolds,{velocityIterations:this.config.velocityIterations,positionIterations:this.config.positionIterations});
  for(let i=0;i<contactManifolds.length;i++){const c=contactManifolds[i],imp=solved[i];const ev={type:'collision',t:this.t+dt,bodyA:c.a.id,bodyB:c.b.id,position:c.point,normal:c.normal,penetration:c.penetration,normalImpulse:imp.normalImpulse,tangentImpulse:imp.tangentImpulse,colliderA:c.colliderA,colliderB:c.colliderB,solver:'sequential-impulse'};collisionEvents.push(ev);this.events.push(ev);if(c.a.type==='dynamic')this.#wake(c.a);if(c.b.type==='dynamic')this.#wake(c.b);}

  for(const b of this.bodies.values())if(b.type==='dynamic'){b.force=[0,0,0];b.torque=[0,0,0];const quiet=len(b.velocity)<=this.config.sleepLinearThreshold&&len(b.angularVelocity)<=this.config.sleepAngularThreshold;if(quiet){b.sleepTime+=dt;if(b.sleepTime>=this.config.sleepDwell){b.awake=false;b.velocity=[0,0,0];b.angularVelocity=[0,0,0];}}else b.sleepTime=0;}
  for(const b of this.bodies.values())this.dimensionProfile.constrainBody(b);this.t+=dt;this.tick++;const endEnergy=this.energy();collisionEvents.push(...ccdEvents);this.lastDiagnostics={energyStart:startEnergy,energyEnd:endEnergy,energyDelta:endEnergy-startEnergy,collisionCount:collisionEvents.length,ccdCount:ccdEvents.filter(e=>e.type==='collision').length,ccdImpactCount:impactCount,ccdImpactBudgetExceeded:ccdUnresolved,ccdIndeterminate:ccdEvents.filter(e=>e.type==='ccd-indeterminate').length,broadphasePairs:candidatePairs.length,narrowphaseIndeterminate:this.events.filter(e=>e.type==='narrowphase-indeterminate').length,solverContacts:solved.contacts,solverVelocityIterations:solved.iterations,solverPositionIterations:solved.positionIterations,maxContactPenetration:solved.maxPenetration,simulationIslands:solved.islandCount,maxIslandBodies:solved.maxIslandBodies,maxIslandContacts:solved.maxIslandContacts,maxNormalResidual:solved.maxNormalResidual,solverConverged:solved.converged,islandDiagnostics:solved.islandDiagnostics,awakeBodies:[...this.bodies.values()].filter(b=>b.awake).length};return {t:this.t,tick:this.tick,events:[...this.events],diagnostics:{...this.lastDiagnostics},bodies:this.snapshot()};
 }
 syncPhysicalState(time=this.t){if(!Number.isFinite(time))throw new TypeError('physical sample time must be finite');this.t=time;this.#samplePhysicalState(time);return this.snapshot();}
 #samplePhysicalState(time){for(const b of this.bodies.values()){if(!b.physicalStateSampler)continue;const before=b.type==='dynamic'?b.position.slice():null;this.#samplePhysicalStateForBody(b,time);if(before)b.physicalState={...b.physicalState,pose:{...b.physicalState.pose,location:before}};}}
 #samplePhysicalStateForBody(b,time){
  const sampled=b.physicalStateSampler(time);
  if(!sampled||sampled.time!==time)throw new Error('PhysicalStateSampler timestamp mismatch');
  const pose=b.type==='dynamic'?{...sampled.pose,location:[...b.position],rotation:[...b.orientation]}:sampled.pose;
  b.physicalState={...sampled,pose};
  b.collider=structuredClone(sampled.geometry);
  if(b.type==='dynamic'){
   b.mass=finitePositive(sampled.mass,'sampled mass');b.invMass=1/b.mass;
   const inertia=sampled.inertia||[Infinity,Infinity,Infinity];
   b.inertiaTensorLocal=inertia.slice();b.inverseInertiaTensorLocal=inertia.map(v=>v>EPS&&Number.isFinite(v)?1/v:0);b.inertia=inertia.reduce((sum,v)=>sum+v,0)/3;b.invInertia=b.inertia>EPS?1/b.inertia:0;
  }else{
   b.position=v3(sampled.pose.location);
   b.velocity=v3(b.poseTrajectory?.velocity?.(time)??b.velocity);
   b.angularVelocity=v3(b.poseTrajectory?.angularVelocity?.(time)??b.angularVelocity);
   const r=sampled.pose.rotation;
   if(Array.isArray(r)&&r.length===4)b.orientation=qnorm(r);
   else if(Array.isArray(r)&&r.length===3){
    const [x,y,z]=r.map(v=>v*Math.PI/360),cx=Math.cos(x),sx=Math.sin(x),cy=Math.cos(y),sy=Math.sin(y),cz=Math.cos(z),sz=Math.sin(z);
    b.orientation=qnorm([cx*cy*cz+sx*sy*sz,sx*cy*cz-cx*sy*sz,cx*sy*cz+sx*cy*sz,cx*cy*sz-sx*sy*cz]);
   }else if(Number.isFinite(r)){
    const h=r*Math.PI/360;b.orientation=[Math.cos(h),0,0,Math.sin(h)];
   }
  }
  this.dimensionProfile.constrainBody(b);
 }
 advance(elapsed,{maxSteps=this.config.maxSubsteps}={}){finitePositive(elapsed,'elapsed',true);const steps=Math.min(Math.floor(elapsed/this.config.fixedDt),maxSteps),results=[];for(let i=0;i<steps;i++)results.push(this.step());return {steps,remaining:elapsed-steps*this.config.fixedDt,results};}
 isSettled({includeKinematic=false}={}){if(this.pending.length)return false;return [...this.bodies.values()].every(b=>b.type!=='dynamic'||!b.awake)&&(!includeKinematic||![...this.bodies.values()].some(b=>b.type==='kinematic'));}
 energy(){return [...this.bodies.values()].reduce((sum,b)=>sum+kineticEnergy(b),0);}
 snapshot(){return [...this.bodies.values()].sort((a,b)=>a.id.localeCompare(b.id)).map(b=>this.snapshotBody(b));}
 getDimensionProfile(){return this.dimensionProfile.snapshot();}
 snapshotBody(b){return {id:b.id,type:b.type,radius:b.radius,mass:b.mass,collider:structuredClone(b.collider),pose:b.physicalState?structuredClone(b.physicalState.pose):null,physicalState:b.physicalState?{time:b.physicalState.time,scale:[...b.physicalState.scale],mass:b.physicalState.mass,inertia:[...b.physicalState.inertia],geometry:structuredClone(b.physicalState.geometry)}:null,transform:{position:[...b.position],orientation:[...b.orientation]},position:[...b.position],orientation:[...b.orientation],velocity:[...b.velocity],angularVelocity:[...b.angularVelocity],awake:b.awake,sleepTime:b.sleepTime,material:{restitution:b.restitution,staticFriction:b.staticFriction,dynamicFriction:b.dynamicFriction}};}
 checkpoint(){return {version:2,physicsVersion:'3d-native-constrained-v2',dimensionProfile:this.dimensionProfile.snapshot(),t:this.t,tick:this.tick,config:{...this.config},bodies:this.snapshot(),pending:this.pending.map(x=>({...x,impulse:[...x.impulse],point:x.point?[...x.point]:null})),sequence:this._sequence};}
 restore(cp){if(![1,2].includes(cp?.version)||!Array.isArray(cp.bodies)||!Number.isFinite(cp.t)||!Number.isSafeInteger(cp.tick))throw new TypeError('Invalid checkpoint');if(cp.config){this.dimensionProfile=createDimensionProfile({dimension:cp.config.dimension||cp.dimensionProfile?.dimension||'3D',plane:cp.config.plane||cp.dimensionProfile?.plane||'XY',offset:cp.config.planeOffset??cp.dimensionProfile?.offset??0,policy:cp.config.dimensionPolicy||cp.dimensionProfile?.policy||'project'});this.config={...cp.config,gravity:this.dimensionProfile.projectVector(v3(cp.config.gravity),'gravity')};}const staging=new Map();for(const spec of cp.bodies){const b=makeBody({...spec,transform:spec.transform,velocity:spec.velocity,angularVelocity:spec.angularVelocity});b.awake=spec.awake;b.sleepTime=spec.sleepTime||0;this.dimensionProfile.constrainBody(b);staging.set(b.id,b);}this.bodies=staging;this.t=cp.t;this.tick=cp.tick;this.pending=(cp.pending||[]).map(x=>({...x}));this._sequence=cp.sequence||0;return this.snapshot();}
 #dynamic(id){const b=this.bodies.get(String(id));if(!b||b.type!=='dynamic')throw new Error(`Dynamic body not found: ${id}`);return b;}
 #wake(b){if(b.type==='dynamic'){b.awake=true;b.sleepTime=0;}}
}
export const Physics3DMath={add,sub,scale,dot,cross,length:len,normalize:norm,quatNormalize:qnorm,quatMultiply:qmul};
