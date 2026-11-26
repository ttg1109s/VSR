import { validateVector, lerp, sub, scale } from './math.js';
export function cubicBezier(p0,p1,p2,p3,u){
  const v=1-u, v2=v*v, u2=u*u;
  return p0.map((x,i)=>v2*v*x+3*v2*u*p1[i]+3*v*u2*p2[i]+u2*u*p3[i]);
}
export function cubicBezierDerivative(p0,p1,p2,p3,u){
  const v=1-u;
  return p0.map((x,i)=>3*v*v*(p1[i]-x)+6*v*u*(p2[i]-p1[i])+3*u*u*(p3[i]-p2[i]));
}
export function createBezierTrajectory({points,duration,easing='linear',startTime=0,segmentId='segment-1'}){
  if(!Array.isArray(points)||points.length!==4)throw new TypeError('Bezier trajectory requires exactly four control points.');
  const p=points.map((v,i)=>validateVector(v,`control point ${i}`));
  if(!Number.isFinite(duration)||duration<=0)throw new TypeError('duration must be a positive finite number.');
  const ease=typeof easing==='function'?easing:(easing==='ease-in'||easing==='ease_in'?t=>t*t:easing==='ease-out'||easing==='ease_out'?t=>1-(1-t)*(1-t):easing==='ease-in-out'||easing==='ease_in_out'?t=>t<.5?2*t*t:1-2*(1-t)*(1-t):easing==='sin_in'?t=>1-Math.cos(t*Math.PI/2):easing==='sin_out'?t=>Math.sin(t*Math.PI/2):easing==='sin_in_out'?t=>-(Math.cos(Math.PI*t)-1)/2:easing==='step'?t=>t>=1?1:0:t=>t);
  return {segmentId,type:'bezier',startTime,endTime:startTime+duration,duration,points:p,easingName:typeof easing==='string'?easing:'linear',
    sample(time){const t=Math.max(0,Math.min(1,(time-startTime)/duration));return cubicBezier(...p,ease(t));},
    velocity(time){const raw=Math.max(0,Math.min(1,(time-startTime)/duration));const eps=1e-5;const eased=ease(raw);const de=(ease(Math.min(1,raw+eps))-ease(Math.max(0,raw-eps)))/(Math.min(1,raw+eps)-Math.max(0,raw-eps));return scale(cubicBezierDerivative(...p,eased),de/duration);},
    sampleNormalized(t){return cubicBezier(...p,ease(Math.max(0,Math.min(1,t))));}
  };
}

export function createPiecewiseBezierTrajectory({points,duration,easing='linear',startTime=0,segmentId='chain'}){
  if(!Array.isArray(points)||points.length<2)throw new TypeError('Piecewise trajectory requires at least two points.');
  const nodes=points.map((v,i)=>validateVector(v,`waypoint ${i}`));
  if(!Number.isFinite(duration)||duration<=0)throw new TypeError('duration must be a positive finite number.');
  const distances=[];let total=0;for(let i=0;i<nodes.length-1;i++){const d=Math.hypot(...sub(nodes[i+1],nodes[i]));distances.push(d);total+=d;}
  const weights=distances.map(d=>total>1e-12?d/total:1/distances.length);
  let cursor=startTime;
  const segments=[];
  for(let i=0;i<nodes.length-1;i++){
    const prev=nodes[Math.max(0,i-1)],a=nodes[i],b=nodes[i+1],next=nodes[Math.min(nodes.length-1,i+2)];
    const c1=a.map((v,k)=>v+(b[k]-prev[k])/6),c2=b.map((v,k)=>v-(next[k]-a[k])/6);
    const segDuration=duration*weights[i];
    segments.push(createBezierTrajectory({points:[a,c1,c2,b],duration:segDuration,easing,startTime:cursor,segmentId:`${segmentId}:${i+1}`}));cursor+=segDuration;
  }
  const endTime=startTime+duration;
  const locate=time=>segments.find(seg=>time<=seg.endTime+1e-12)||segments.at(-1);
  return {segmentId,type:'bezier-chain',startTime,endTime,duration,segments,
    sample(time){return locate(time).sample(time);},
    velocity(time){return locate(time).velocity(time);},
    sampleNormalized(t){return this.sample(startTime+Math.max(0,Math.min(1,t))*duration);}
  };
}

export function createLinearPhysicsSegment({segmentId,startTime,duration,position,velocity,acceleration=[0,0,0]}){
  const p=validateVector(position,'position'),v=validateVector(velocity,'velocity'),a=validateVector(acceleration,'acceleration');
  if(!Number.isFinite(duration)||duration<=0)throw new TypeError('duration must be positive.');
  return {segmentId,type:'physics',startTime,endTime:startTime+duration,duration,initialPosition:p,initialVelocity:v,acceleration:a,
    sample(time){const t=Math.max(0,Math.min(duration,time-startTime));return p.map((x,i)=>x+v[i]*t+.5*a[i]*t*t);},
    velocity(time){const t=Math.max(0,Math.min(duration,time-startTime));return v.map((x,i)=>x+a[i]*t);}
  };
}
