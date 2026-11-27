import { firstCircleImpactResult } from './collision.js';
import { resolveCircleCollision, correctCirclePenetration } from './physics.js';
import { createLinearPhysicsSegment, createDampedPhysicsSegment } from './trajectory.js';
import { sub, dot } from './math.js';


function analyticTrajectoryBounds(trajectory, startTime, endTime) {
  const segments = trajectory?.segments || (trajectory?.type === 'bezier-chain' ? trajectory.segments : [trajectory]);
  if (!Array.isArray(segments) || !segments.length) return null;
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  const include=(p)=>{if(!Array.isArray(p)||p.length<2||p.some(v=>!Number.isFinite(v)))return false;for(let k=0;k<3;k++){const v=p[k]??0;min[k]=Math.min(min[k],v);max[k]=Math.max(max[k],v);}return true;};
  for(const seg of segments){
    const st=Math.max(startTime,Number(seg.startTime??startTime)),et=Math.min(endTime,Number(seg.endTime??endTime));
    if(et<st)continue;
    if(seg.type==='bezier'&&Array.isArray(seg.points||seg.controlPoints)){
      const pts=seg.points||seg.controlPoints;for(const p of pts)if(!include(p))return null;
    } else if(seg.type==='physics'&&Array.isArray(seg.initialPosition)&&Array.isArray(seg.initialVelocity)&&Array.isArray(seg.acceleration)){
      const p0=seg.initialPosition,v=seg.initialVelocity,a=seg.acceleration;
      const t0=Math.max(0,st-seg.startTime),t1=Math.max(0,et-seg.startTime);
      const sample=t=>p0.map((x,k)=>x+(v[k]||0)*t+0.5*(a[k]||0)*t*t);
      for(const t of [t0,t1])if(!include(sample(t)))return null;
      for(let k=0;k<3;k++){const ak=a[k]||0;if(Math.abs(ak)>1e-15){const t=-(v[k]||0)/ak;if(t>t0&&t<t1){const p=sample(t);if(!include(p))return null;}}}
    } else if(seg.type==='linear'&&Array.isArray(seg.startPosition)&&Array.isArray(seg.endPosition)){
      if(!include(seg.startPosition)||!include(seg.endPosition))return null;
    } else if(seg.type==='bezier-chain'&&Array.isArray(seg.segments)){
      for(const nested of seg.segments){if(nested.type!=='bezier'||!Array.isArray(nested.points))return null;for(const p of nested.points)if(!include(p))return null;}
    } else return null;
  }
  if(min.some(v=>!Number.isFinite(v))||max.some(v=>!Number.isFinite(v)))return null;
  return {min,max};
}

function buildBroadPhasePairs(ids, trajectories, bodies, startTime, endTime) {
  // Analytic bounds for supported segment types; unknown/custom trajectories
  // deliberately fall back to all-pairs to preserve broad-phase conservatism.
  const cellSize = Math.max(16, ...ids.map(id => Math.max(1, Number(bodies[id]?.radius || 0) * 2)));
  const buckets = new Map(), ranges = new Map(), fallback=[];
  for (const id of ids) {
    const bounds=analyticTrajectoryBounds(trajectories.get(id),startTime,endTime);
    if(!bounds){fallback.push(id);continue;}
    const radius=Math.max(0,Number(bodies[id]?.radius||0));
    const lo=bounds.min.map(v=>Math.floor((v-radius)/cellSize)),hi=bounds.max.map(v=>Math.floor((v+radius)/cellSize));
    const cells=[];const cellCount=(hi[0]-lo[0]+1)*(hi[1]-lo[1]+1)*(hi[2]-lo[2]+1);
    if(cellCount>4096){ranges.set(id,null);continue;}
    for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++)for(let z=lo[2];z<=hi[2];z++)cells.push(`${x},${y},${z}`);
    ranges.set(id,cells);for(const key of cells){if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(id);}
  }
  const pairs=new Set();
  for(const bucket of buckets.values())for(let i=0;i<bucket.length;i++)for(let j=i+1;j<bucket.length;j++)pairs.add([bucket[i],bucket[j]].sort().join('|'));
  const oversized=[...ranges].filter(([,cells])=>cells===null).map(([id])=>id);
  for(const id of [...oversized,...fallback])for(const other of ids)if(id!==other)pairs.add([id,other].sort().join('|'));
  return [...pairs].map(key=>key.split('|'));
}

/** Deterministic event-time collision coordinator for circle/sphere bodies. */
export class AuthoritativeSpriteSimulation {
  constructor({subdivisions=128,maxCollisionEvents=16,gravity=[0,0,0],timeEpsilon=1e-6}={}) {
    if(!Number.isSafeInteger(subdivisions)||subdivisions<=0) throw new TypeError('subdivisions must be a positive safe integer');
    if(!Number.isSafeInteger(maxCollisionEvents)||maxCollisionEvents<=0) throw new TypeError('maxCollisionEvents must be a positive safe integer');
    if(!Number.isFinite(timeEpsilon)||timeEpsilon<=0) throw new TypeError('timeEpsilon must be positive and finite');
    if(!Array.isArray(gravity)||gravity.length<2||gravity.length>3||gravity.some(v=>!Number.isFinite(v))) throw new TypeError('gravity must be a finite 2D/3D vector');
    this.options={subdivisions,maxCollisionEvents,gravity:[...gravity,...Array(3-gravity.length).fill(0)],timeEpsilon};
  }
  run({bodies,initialTrajectories,physicsByBody={},startTime=0}) {
    if(!Number.isFinite(startTime)) throw new TypeError('startTime must be finite');
    if(!bodies||typeof bodies!=='object'||!(initialTrajectories instanceof Map)) throw new TypeError('run requires bodies and initialTrajectories Map');
    let endTime=Math.max(startTime,...[...initialTrajectories.values()].map(t=>Number(t.endTime??startTime)));
    if(endTime<=startTime)endTime=startTime+this.options.timeEpsilon;
    const trajectories=new Map(initialTrajectories);
    const segments=new Map([...trajectories].map(([id,t])=>[id,t.segments?[...t.segments]:[t]]));
    const positions=new Map(); const velocities=new Map();
    const collisions=[]; const lastCollisionTimeByPair=new Map(); const lastCollisionNormalByPair=new Map(); const indeterminatePairs=[];
    for(const [id,t] of trajectories){positions.set(id,t.sample(startTime));velocities.set(id,t.velocity(startTime));}
    let cursor=startTime;
    let collisionLimitReached=false;
    const profiler={iterations:0,broadphasePairs:0,narrowphaseChecks:0,collisionEvents:0,ccdIntervals:0,ccdFallbacks:0,ccdIndeterminate:0,elapsedMs:0};
    const profileStart=globalThis.performance?.now?.()??Date.now();
    while(true){
      let earliest=null;
      const ids=[...trajectories.keys()].sort();
      const candidatePairs=buildBroadPhasePairs(ids,trajectories,bodies,cursor,endTime);
      profiler.iterations++;profiler.broadphasePairs+=candidatePairs.length;
      for(const [a,b] of candidatePairs){
        const key=`${a}|${b}`;
        const lastTime=lastCollisionTimeByPair.get(key);
        let pairSearchStart=Math.max(cursor,lastTime===undefined?cursor:lastTime+this.options.timeEpsilon*20);
        const bodyA=bodies[a],bodyB=bodies[b];
        if(!bodyA||!bodyB||bodyA.collisionEnabled===false||bodyB.collisionEnabled===false)continue;
        if(bodyA.layer!==bodyB.layer)continue;
        if(lastTime!==undefined){const normal=lastCollisionNormalByPair.get(key),ta=trajectories.get(a),tb=trajectories.get(b),pa=ta.sample(pairSearchStart),pb=tb.sample(pairSearchStart),relative=sub(tb.velocity(pairSearchStart),ta.velocity(pairSearchStart));if(normal&&Math.hypot(...sub(pb,pa))<=(bodyA.radius??0)+(bodyB.radius??0)+1e-9&&dot(relative,normal)>=-1e-12){let separatedAt=null;for(let k=1;k<=96;k++){const t=pairSearchStart+(endTime-pairSearchStart)*k/96,xa=ta.sample(t),xb=tb.sample(t);if(Math.hypot(...sub(xb,xa))>(bodyA.radius??0)+(bodyB.radius??0)+1e-9){separatedAt=t;break;}}if(separatedAt===null)continue;pairSearchStart=separatedAt;}}
        profiler.narrowphaseChecks++;
        const ccd=firstCircleImpactResult({trajectoryA:trajectories.get(a),trajectoryB:trajectories.get(b),radiusA:bodyA.radius??0,radiusB:bodyB.radius??0,timeStart:pairSearchStart,timeEnd:endTime,subdivisions:this.options.subdivisions});
        profiler.ccdIntervals+=ccd.subdivisions||0;
        if(ccd.status==='indeterminate'){profiler.ccdIndeterminate++;indeterminatePairs.push({a,b,interval:ccd.interval||null,reason:ccd.reason||'indeterminate'});}
        if(ccd.status==='confirmed-impact'){if(String(ccd.approximation||'').includes('conservative')||String(ccd.approximation||'').includes('fallback'))profiler.ccdFallbacks++;if(!earliest||ccd.time<earliest.time)earliest={...ccd,a,b,key};}
      }
      if(!earliest)break;
      if(collisions.length>=this.options.maxCollisionEvents){collisionLimitReached=true;break;}
      const {a,b,key,time,positionA,positionB}=earliest;
      const va=trajectories.get(a).velocity(time),vb=trajectories.get(b).velocity(time);
      const pa=physicsByBody[a]||{},pb=physicsByBody[b]||{};
      const massA=pa.mass??bodies[a].mass??1,massB=pb.mass??bodies[b].mass??1;
      // Effective body materials are resolved independently, then combined symmetrically.
      const restitutionA=pa.restitution??bodies[a].restitution??0.5;
      const restitutionB=pb.restitution??bodies[b].restitution??0.5;
      const restitution=Math.min(restitutionA,restitutionB);
      const frictionA=pa.friction??bodies[a].friction??0;
      const frictionB=pb.friction??bodies[b].friction??0;
      const friction=Math.max(frictionA,frictionB);
      let resolved;
      const physicsEnabled=(bodies[a].physicsEnabled===true||bodies[b].physicsEnabled===true);
      if(physicsEnabled) resolved=resolveCircleCollision({position1:positionA,position2:positionB,velocity1:va,velocity2:vb,mass1:massA,mass2:massB,restitution,friction,bodyType1:pa.bodyType??bodies[a].bodyType??'dynamic',bodyType2:pb.bodyType??bodies[b].bodyType??'dynamic'});
      else {
        const relative=sub(vb,va),normal=earliest.normal,normalSpeed=dot(relative,normal);
        const approaching=normalSpeed<0;
        const moverId=bodies[a].isMotionOwner?a:bodies[b].isMotionOwner?b:null;
        const stoppedA=moverId===a?vb:va,stoppedB=moverId===b?va:vb;
        resolved={velocity1:approaching&&moverId===a?stoppedA:va,velocity2:approaching&&moverId===b?stoppedB:vb,normal,normalImpulse:0,tangentImpulse:0,approaching};
      }
      const correctedPhysics=correctCirclePenetration({position1:positionA,position2:positionB,radius1:bodies[a].radius??0,radius2:bodies[b].radius??0,mass1:massA,mass2:massB,bodyType1:pa.bodyType??bodies[a].bodyType??'dynamic',bodyType2:pb.bodyType??bodies[b].bodyType??'dynamic'});
      const moverId=bodies[a].isMotionOwner?a:bodies[b].isMotionOwner?b:null;
      const corrected=physicsEnabled?correctedPhysics:(moverId===a?{...correctedPhysics,position2:positionB}:moverId===b?{...correctedPhysics,position1:positionA}:{position1:positionA,position2:positionB,penetration:0});
      if(!resolved.approaching&&correctedPhysics.penetration<=0){lastCollisionTimeByPair.set(key,time);continue;}
      const remain=Math.max(this.options.timeEpsilon,endTime-time),typeA=pa.bodyType??bodies[a].bodyType??'dynamic',typeB=pb.bodyType??bodies[b].bodyType??'dynamic';
      const accA=physicsEnabled&&typeA!=='static'?(pa.acceleration??this.options.gravity):[0,0,0],accB=physicsEnabled&&typeB!=='static'?(pb.acceleration??this.options.gravity):[0,0,0];
      const thresholdA=Number(pa.sleepLinearThreshold??pa.settlingVelocityThreshold??0.02),thresholdB=Number(pb.sleepLinearThreshold??pb.settlingVelocityThreshold??0.02);
      const dampingA=Number(pa.linearDamping??0),dampingB=Number(pb.linearDamping??0);
      const makePostImpactSegment=(id,position,velocity,bodyType,damping,threshold,acceleration)=>{
        if(bodyType==='static'||Math.hypot(...velocity)<=threshold){
          return {...createLinearPhysicsSegment({segmentId:`${id}:physics:${collisions.length+1}`,startTime:time,duration:Math.max(this.options.timeEpsilon,remain),position,velocity:[0,0,0],acceleration:[0,0,0]}),completion:'natural-equilibrium'};
        }
        if(physicsEnabled&&damping>0&&!acceleration.some(x=>Math.abs(x)>1e-12)){
          const solved=createDampedPhysicsSegment({segmentId:`${id}:physics:${collisions.length+1}`,startTime:time,position,velocity,linearDamping:damping,velocityThreshold:threshold,acceleration});
          if(solved)return solved;
        }
        return {...createLinearPhysicsSegment({segmentId:`${id}:physics:${collisions.length+1}`,startTime:time,duration:Math.max(this.options.timeEpsilon,remain),position,velocity,acceleration}),completion:'non-terminating-dynamics'};
      };
      const segA=makePostImpactSegment(a,corrected.position1,resolved.velocity1,typeA,dampingA,thresholdA,accA);
      const segB=makePostImpactSegment(b,corrected.position2,resolved.velocity2,typeB,dampingB,thresholdB,accB);
      trajectories.set(a,segA);trajectories.set(b,segB);segments.get(a).push(segA);segments.get(b).push(segB);
      if(segA.completion==='natural-equilibrium')endTime=Math.max(endTime,segA.endTime);
      if(segB.completion==='natural-equilibrium')endTime=Math.max(endTime,segB.endTime);
      positions.set(a,corrected.position1);positions.set(b,corrected.position2);velocities.set(a,resolved.velocity1);velocities.set(b,resolved.velocity2);
      collisions.push({eventId:`collision-${collisions.length+1}`,time,spriteA:a,spriteB:b,contactA:positionA,contactB:positionB,normal:resolved.normal,velocityBeforeA:va,velocityBeforeB:vb,velocityAfterA:resolved.velocity1,velocityAfterB:resolved.velocity2,impulse:resolved.normalImpulse,restitution,friction,physicsEnabled,penetration:corrected.penetration,approximation:earliest.approximation,interval:earliest.interval||null});
      lastCollisionTimeByPair.set(key,time);lastCollisionNormalByPair.set(key,resolved.normal);cursor=time;profiler.collisionEvents=collisions.length;
      if(!physicsEnabled)break;
    }
    const finalPositions=new Map();
    for(const [id,t] of trajectories)finalPositions.set(id,t.sample(endTime));
    const trajectoryEndTime=Math.max(startTime,...[...segments.values()].flat().map(seg=>Number(seg.endTime??startTime)));
    profiler.elapsedMs=(globalThis.performance?.now?.()??Date.now())-profileStart;
    return {startTime,endTime,trajectoryEndTime,collisions,segments,finalPositions,positionsAtImpact:positions,velocitiesAtImpact:velocities,collisionLimitReached,indeterminatePairs,simulationStatus:collisionLimitReached?'collision-event-limit':indeterminatePairs.length?'indeterminate':'completed',profiler};
  }
}
