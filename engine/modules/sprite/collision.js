import {sub,dot,length,normalize} from './math.js';
export function movingCircleTOI(p1,v1,p2,v2,radiusSum,maxTime){const p=sub(p2,p1),v=sub(v2,v1),a=dot(v,v),b=2*dot(p,v),c=dot(p,p)-radiusSum*radiusSum;if(c<=0)return dot(p,v)<0?0:null;if(a<=1e-15)return null;const disc=b*b-4*a*c;if(disc<0)return null;const t=(-b-Math.sqrt(disc))/(2*a);return t>=0&&t<=maxTime?t:null;}
const box=(min,max)=>({min,max});const merge=(a,b)=>({min:a.min.map((v,i)=>Math.min(v,b.min[i])),max:a.max.map((v,i)=>Math.max(v,b.max[i]))});const inflate=(b,r)=>({min:b.min.map(v=>v-r),max:b.max.map(v=>v+r)});const separated=(a,b)=>a.min.some((v,i)=>v>b.max[i]||a.max[i]<b.min[i]);
const cubic=(p0,p1,p2,p3,u)=>{const v=1-u;return p0.map((x,i)=>v*v*v*x+3*v*v*u*p1[i]+3*v*u*u*p2[i]+u*u*u*p3[i]);};
const splitCurve=(p,u)=>{let rows=[p.map(x=>x.slice())];for(let k=1;k<4;k++)rows.push(rows[k-1].slice(0,4-k).map((a,i)=>a.map((x,j)=>x+(rows[k-1][i+1][j]-x)*u)));return[rows.map(r=>r[0]),rows.map(r=>r.at(-1))];};
const subCurve=(p,a,b)=>{if(a<=0&&b>=1)return p;if(a>=1)return p.map(x=>x.slice());const[left]=splitCurve(p,b);if(a<=0)return left;const[,right]=splitCurve(left,a/b);return right;};
function ease(name,t){switch(name){case'ease-in':case'ease_in':return t*t;case'ease-out':case'ease_out':return 1-(1-t)*(1-t);case'ease-in-out':case'ease_in_out':return t<.5?2*t*t:1-2*(1-t)*(1-t);case'sin_in':return 1-Math.cos(t*Math.PI/2);case'sin_out':return Math.sin(t*Math.PI/2);case'sin_in_out':return-(Math.cos(Math.PI*t)-1)/2;case'step':return t>=1?1:0;default:return t;}}
function trajectoryBounds(t,t0,t1){if(!t)return null;if(t.type==='bezier'&&Array.isArray(t.points)){const raw0=Math.max(0,Math.min(1,(t0-t.startTime)/t.duration)),raw1=Math.max(0,Math.min(1,(t1-t.startTime)/t.duration)),u0=ease(t.easingName||'linear',raw0),u1=ease(t.easingName||'linear',raw1),curve=subCurve(t.points,Math.min(u0,u1),Math.max(u0,u1));return box(curve.reduce((m,p)=>m.map((v,i)=>Math.min(v,p[i])),[Infinity,Infinity,Infinity]),curve.reduce((m,p)=>m.map((v,i)=>Math.max(v,p[i])),[-Infinity,-Infinity,-Infinity]));}
 if(t.type==='bezier-chain'&&Array.isArray(t.segments)){let result=null;for(const s of t.segments){const a=Math.max(t0,s.startTime),b=Math.min(t1,s.endTime);if(b<a)continue;const q=trajectoryBounds(s,a,b);if(q)result=result?merge(result,q):q;}return result;}
 if(t.type==='linear'&&Array.isArray(t.startPosition)&&Array.isArray(t.endPosition)){const p0=t.sample(t0),p1=t.sample(t1);return box(p0.map((v,i)=>Math.min(v,p1[i])),p0.map((v,i)=>Math.max(v,p1[i])));}
 if(t.type==='physics'&&Array.isArray(t.initialPosition)&&Array.isArray(t.initialVelocity)&&Array.isArray(t.acceleration)){const p=t.initialPosition,v=t.initialVelocity,a=t.acceleration,lo=Math.max(0,t0-t.startTime),hi=Math.min(t.duration,t1-t.startTime),sample=x=>p.map((q,i)=>q+v[i]*x+.5*a[i]*x*x),pts=[sample(lo),sample(hi)];for(let i=0;i<3;i++)if(Math.abs(a[i])>1e-15){const x=-v[i]/a[i];if(x>lo&&x<hi)pts.push(sample(x));}return box(pts.reduce((m,q)=>m.map((x,i)=>Math.min(x,q[i])),[Infinity,Infinity,Infinity]),pts.reduce((m,q)=>m.map((x,i)=>Math.max(x,q[i])),[-Infinity,-Infinity,-Infinity]));}
 return null;}
function constantVelocity(t){return t?.type==='linear'||(t?.type==='physics'&&Array.isArray(t.acceleration)&&t.acceleration.every(v=>Math.abs(v)<1e-15));}
function endpointTravel(t,t0,t1){return Math.hypot(...sub(t.sample(t1),t.sample(t0)));}
export function firstCircleImpact({trajectoryA,trajectoryB=null,radiusA,radiusB,timeStart=0,timeEnd,subdivisions=128,conservative=true,intervalTolerance=1e-6,maxDepth=24}) {
 if(!Number.isFinite(radiusA)||radiusA<0||!Number.isFinite(radiusB)||radiusB<0)throw new TypeError('Collision radii must be non-negative finite numbers.');
 if(!Number.isFinite(timeStart)||!Number.isFinite(timeEnd)||timeEnd<=timeStart)throw new TypeError('timeEnd must exceed timeStart.');
 if(!trajectoryB||typeof trajectoryA?.sample!=='function'||typeof trajectoryB?.sample!=='function')throw new TypeError('CCD requires two explicit trajectory objects with sample(time).');
 if(!Number.isSafeInteger(subdivisions)||subdivisions<=0)throw new TypeError('subdivisions must be a positive safe integer');
 if(!Number.isFinite(intervalTolerance)||intervalTolerance<=0)throw new TypeError('intervalTolerance must be positive and finite');
 if(!Number.isSafeInteger(maxDepth)||maxDepth<1)throw new TypeError('maxDepth must be a positive safe integer');
 const rs=radiusA+radiusB;
 const samplePair=time=>{const pa=trajectoryA.sample(time),pb=trajectoryB.sample(time),delta=sub(pb,pa),distance=Math.hypot(...delta);return{time,positionA:pa,positionB:pb,normal:distance>1e-12?normalize(delta):[1,0,0],distance,gap:distance-rs};};
 const initial=samplePair(timeStart);
 if(initial.gap<=1e-10){
  const va=typeof trajectoryA.velocity==='function'?trajectoryA.velocity(timeStart):null;
  const vb=typeof trajectoryB.velocity==='function'?trajectoryB.velocity(timeStart):null;
  if(va&&vb&&dot(sub(vb,va),initial.normal)<-1e-10)return{time:timeStart,positionA:initial.positionA,positionB:initial.positionB,normal:initial.normal,approximation:'initial-overlap',subdivisions:0};
  return null;
 }
 if(constantVelocity(trajectoryA)&&constantVelocity(trajectoryB)){
  const vA=trajectoryA.velocity(timeStart),vB=trajectoryB.velocity(timeStart);
  const t=movingCircleTOI(initial.positionA,vA,initial.positionB,vB,rs,timeEnd-timeStart);
  if(t===null)return null;
  const hit=samplePair(timeStart+t);
  if(hit.gap>1e-8)return null;
  return{time:hit.time,positionA:hit.positionA,positionB:hit.positionB,normal:hit.normal,approximation:'analytic-linear',subdivisions:1};
 }
 if(conservative){
  let checks=0,indeterminate=null;
  const stack=[[timeStart,timeEnd,0]];
  while(stack.length){
   const[t0,t1,depth]=stack.pop();checks++;
   const ba=trajectoryBounds(trajectoryA,t0,t1),bb=trajectoryBounds(trajectoryB,t0,t1);
   if(ba&&bb&&separated(inflate(ba,radiusA),inflate(bb,radiusB)))continue;
   const left=samplePair(t0),right=samplePair(t1);
   if(left.gap<=1e-10&&right.gap>1e-10){
    const va=typeof trajectoryA.velocity==='function'?trajectoryA.velocity(t0):null;
    const vb=typeof trajectoryB.velocity==='function'?trajectoryB.velocity(t0):null;
    if(va&&vb&&dot(sub(vb,va),left.normal)<-1e-10)return{time:t0,positionA:left.positionA,positionB:left.positionB,normal:left.normal,approximation:'sampled-contact',subdivisions:checks};
   }
   if(left.gap>0&&right.gap<=0){
    let lo=t0,hi=t1,loSample=left,hiSample=right;
    for(let i=0;i<64&&hi-lo>intervalTolerance;i++){
     const mid=(lo+hi)/2,m=samplePair(mid);
     if(m.gap<=0){hi=mid;hiSample=m;}else{lo=mid;loSample=m;}
    }
    const hit=samplePair(hi);
    if(hit.gap<=1e-8)return{time:hi,positionA:hit.positionA,positionB:hit.positionB,normal:hit.normal,approximation:'refined-contact',subdivisions:checks,interval:[lo,hi]};
   }
   if(depth>=maxDepth||t1-t0<=intervalTolerance){
    indeterminate={time:t0,interval:[t0,t1],subdivisions:checks,reason:!ba||!bb?'unknown-trajectory-bounds':'unresolved-conservative-interval'};
    continue;
   }
   const mid=(t0+t1)/2;
   stack.push([mid,t1,depth+1],[t0,mid,depth+1]);
  }
  return null;
 }
 // Explicit approximate mode retained for compatibility; only sampled contact is returned.
 const dt=(timeEnd-timeStart)/subdivisions;
 for(let i=0;i<subdivisions;i++){
  const t0=timeStart+i*dt,t1=t0+dt,a0=trajectoryA.sample(t0),a1=trajectoryA.sample(t1),b0=trajectoryB.sample(t0),b1=trajectoryB.sample(t1);
  const va=a1.map((x,k)=>(x-a0[k])/dt),vb=b1.map((x,k)=>(x-b0[k])/dt);
  const local=movingCircleTOI(a0,va,b0,vb,rs,dt);
  if(local!==null){
   const hit=samplePair(t0+local);
   if(hit.gap<=1e-8)return{time:hit.time,positionA:hit.positionA,positionB:hit.positionB,normal:hit.normal,approximation:'subdivision-ccd',subdivisions};
  }
 }
 return null;
}

