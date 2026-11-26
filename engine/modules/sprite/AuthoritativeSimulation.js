import { firstCircleImpact } from './collision.js';
import { resolveCircleCollision, correctCirclePenetration } from './physics.js';
import { createLinearPhysicsSegment } from './trajectory.js';
import { sub, dot } from './math.js';


function buildBroadPhasePairs(ids, trajectories, bodies, startTime, endTime) {
  // Swept sampled AABBs are expanded by collision radius. The grid only filters
  // pairs whose sampled swept bounds cannot overlap; exact CCD remains narrow phase.
  const cellSize = Math.max(16, ...ids.map(id => Math.max(1, Number(bodies[id]?.radius || 0) * 2)));
  const buckets = new Map();
  const ranges = new Map();
  for (const id of ids) {
    const trajectory = trajectories.get(id), radius = Math.max(0, Number(bodies[id]?.radius || 0));
    if (!trajectory?.sample) continue;
    const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
    for(let i=0;i<=32;i++){
      const t=startTime+(endTime-startTime)*i/32,p=trajectory.sample(t);
      for(let axis=0;axis<3;axis++){min[axis]=Math.min(min[axis],p[axis]-radius);max[axis]=Math.max(max[axis],p[axis]+radius);}
    }
    const lo=min.map(v=>Math.floor(v/cellSize)),hi=max.map(v=>Math.floor(v/cellSize));
    const cells=[];
    const cellCount=(hi[0]-lo[0]+1)*(hi[1]-lo[1]+1)*(hi[2]-lo[2]+1);
    if(cellCount>4096){ranges.set(id,null);continue;}
    for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++)for(let z=lo[2];z<=hi[2];z++)cells.push(`${x},${y},${z}`);
    ranges.set(id,cells);
    for(const key of cells){if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(id);}
  }
  const pairs=new Set();
  for(const bucket of buckets.values())for(let i=0;i<bucket.length;i++)for(let j=i+1;j<bucket.length;j++)pairs.add([bucket[i],bucket[j]].sort().join('|'));
  // Huge swept bodies use conservative all-pairs fallback.
  const oversized=[...ranges].filter(([,cells])=>cells===null).map(([id])=>id);
  if(oversized.length)for(const id of oversized)for(const other of ids)if(id!==other)pairs.add([id,other].sort().join('|'));
  return [...pairs].map(key=>key.split('|'));
}

/** Deterministic event-time collision coordinator for circle/sphere bodies. */
export class AuthoritativeSpriteSimulation {
  constructor({horizon=2,subdivisions=128,maxCollisionEvents=16,gravity=[0,0,0],timeEpsilon=1e-6}={}) {
    if(!Number.isFinite(horizon)||horizon<=0) throw new TypeError('horizon must be positive and finite');
    if(!Number.isSafeInteger(subdivisions)||subdivisions<=0) throw new TypeError('subdivisions must be a positive safe integer');
    if(!Number.isSafeInteger(maxCollisionEvents)||maxCollisionEvents<=0) throw new TypeError('maxCollisionEvents must be a positive safe integer');
    if(!Number.isFinite(timeEpsilon)||timeEpsilon<=0) throw new TypeError('timeEpsilon must be positive and finite');
    if(!Array.isArray(gravity)||gravity.length<2||gravity.length>3||gravity.some(v=>!Number.isFinite(v))) throw new TypeError('gravity must be a finite 2D/3D vector');
    this.options={horizon,subdivisions,maxCollisionEvents,gravity:[...gravity,...Array(3-gravity.length).fill(0)],timeEpsilon};
  }
  run({bodies,initialTrajectories,physicsByBody={},startTime=0}) {
    if(!Number.isFinite(startTime)) throw new TypeError('startTime must be finite');
    if(!bodies||typeof bodies!=='object'||!(initialTrajectories instanceof Map)) throw new TypeError('run requires bodies and initialTrajectories Map');
    const endTime=startTime+this.options.horizon;
    const trajectories=new Map(initialTrajectories);
    const segments=new Map([...trajectories].map(([id,t])=>[id,t.segments?[...t.segments]:[t]]));
    const positions=new Map(); const velocities=new Map();
    const collisions=[]; const lastCollisionTimeByPair=new Map();
    for(const [id,t] of trajectories){positions.set(id,t.sample(startTime));velocities.set(id,t.velocity(startTime));}
    let cursor=startTime;
    let collisionLimitReached=false;
    while(true){
      let earliest=null;
      const ids=[...trajectories.keys()].sort();
      for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
        const a=ids[i],b=ids[j],key=`${a}|${b}`;
        const lastTime=lastCollisionTimeByPair.get(key);
        const pairSearchStart=Math.max(cursor,lastTime===undefined?cursor:lastTime+this.options.timeEpsilon*20);
        const bodyA=bodies[a],bodyB=bodies[b];
        if(!bodyA||!bodyB||bodyA.collisionEnabled===false||bodyB.collisionEnabled===false)continue;
        if(bodyA.layer!==bodyB.layer)continue;
        const impact=firstCircleImpact({trajectoryA:trajectories.get(a),trajectoryB:trajectories.get(b),radiusA:bodyA.radius??0,radiusB:bodyB.radius??0,timeStart:pairSearchStart,timeEnd:endTime,subdivisions:this.options.subdivisions});
        if(impact&&(!earliest||impact.time<earliest.time))earliest={...impact,a,b,key};
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
      if(physicsEnabled) resolved=resolveCircleCollision({position1:positionA,position2:positionB,velocity1:va,velocity2:vb,mass1:massA,mass2:massB,restitution,friction});
      else {
        const relative=sub(vb,va),normal=earliest.normal,normalSpeed=dot(relative,normal);
        const approaching=normalSpeed<0;
        const moverId=bodies[a].isMotionOwner?a:bodies[b].isMotionOwner?b:null;
        const stoppedA=moverId===a?vb:va,stoppedB=moverId===b?va:vb;
        resolved={velocity1:approaching&&moverId===a?stoppedA:va,velocity2:approaching&&moverId===b?stoppedB:vb,normal,normalImpulse:0,tangentImpulse:0,approaching};
      }
      const correctedPhysics=correctCirclePenetration({position1:positionA,position2:positionB,radius1:bodies[a].radius??0,radius2:bodies[b].radius??0,mass1:massA,mass2:massB});
      const moverId=bodies[a].isMotionOwner?a:bodies[b].isMotionOwner?b:null;
      const corrected=physicsEnabled?correctedPhysics:(moverId===a?{...correctedPhysics,position2:positionB}:moverId===b?{...correctedPhysics,position1:positionA}:{position1:positionA,position2:positionB,penetration:0});
      if(!resolved.approaching&&correctedPhysics.penetration<=0){lastCollisionTimeByPair.set(key,time);continue;}
      const remain=Math.max(this.options.timeEpsilon,endTime-time),accA=physicsEnabled?(pa.acceleration??this.options.gravity):[0,0,0],accB=physicsEnabled?(pb.acceleration??this.options.gravity):[0,0,0];
      const segA=createLinearPhysicsSegment({segmentId:`${a}:physics:${collisions.length+1}`,startTime:time,duration:remain,position:corrected.position1,velocity:resolved.velocity1,acceleration:accA});
      const segB=createLinearPhysicsSegment({segmentId:`${b}:physics:${collisions.length+1}`,startTime:time,duration:remain,position:corrected.position2,velocity:resolved.velocity2,acceleration:accB});
      trajectories.set(a,segA);trajectories.set(b,segB);segments.get(a).push(segA);segments.get(b).push(segB);
      positions.set(a,corrected.position1);positions.set(b,corrected.position2);velocities.set(a,resolved.velocity1);velocities.set(b,resolved.velocity2);
      collisions.push({eventId:`collision-${collisions.length+1}`,time,spriteA:a,spriteB:b,contactA:positionA,contactB:positionB,normal:resolved.normal,velocityBeforeA:va,velocityBeforeB:vb,velocityAfterA:resolved.velocity1,velocityAfterB:resolved.velocity2,impulse:resolved.normalImpulse,restitution,friction,physicsEnabled,penetration:corrected.penetration});
      lastCollisionTimeByPair.set(key,time);cursor=time;
      if(!physicsEnabled)break;
    }
    const finalPositions=new Map();
    for(const [id,t] of trajectories)finalPositions.set(id,t.sample(endTime));
    return {startTime,endTime,collisions,segments,finalPositions,positionsAtImpact:positions,velocitiesAtImpact:velocities,collisionLimitReached,simulationStatus:collisionLimitReached?'collision-event-limit':'completed'};
  }
}
