import { sub, dot, length, normalize, lerp } from './math.js';
// Continuous collision detection for moving circles/spheres over linearized trajectory samples.
export function movingCircleTOI(p1,v1,p2,v2,radiusSum,maxTime){
  const p=sub(p2,p1),v=sub(v2,v1),a=dot(v,v),b=2*dot(p,v),c=dot(p,p)-radiusSum*radiusSum;
  if(c<=0){
    // Existing non-deep overlap is not a new collision while separating. Exact-center
    // overlap is handled explicitly by firstCircleImpact for deterministic depenetration.
    return dot(p,v)<0?0:null;
  }
  if(a<=1e-15)return null;
  const disc=b*b-4*a*c;if(disc<0)return null;
  const t=(-b-Math.sqrt(disc))/(2*a);return t>=0&&t<=maxTime?t:null;
}
export function firstCircleImpact({trajectoryA,trajectoryB=null,radiusA,radiusB,timeStart=0,timeEnd,subdivisions=128}){
  if(!Number.isFinite(radiusA)||radiusA<0||!Number.isFinite(radiusB)||radiusB<0)throw new TypeError('Collision radii must be non-negative finite numbers.');
  if(!Number.isFinite(timeEnd)||timeEnd<=timeStart)throw new TypeError('timeEnd must exceed timeStart.');
  if(!trajectoryB||typeof trajectoryA?.sample!=='function'||typeof trajectoryB?.sample!=='function')throw new TypeError('CCD requires two explicit trajectory objects with sample(time).');
  const b=trajectoryB;
  if(!Number.isSafeInteger(subdivisions)||subdivisions<=0)throw new TypeError('subdivisions must be a positive safe integer');
  // Adaptive refinement: increase temporal resolution for fast travel relative to
  // the combined collision radius. The cap prevents pathological CPU growth.
  const initialA=trajectoryA.sample(timeStart),initialB=b.sample(timeStart),initialDelta=sub(initialB,initialA);
  const travelA=Math.hypot(...sub(trajectoryA.sample(timeEnd),initialA));
  const travelB=Math.hypot(...sub(b.sample(timeEnd),initialB));
  const scaleRadius=Math.max(radiusA+radiusB,1e-3);
  const adaptive=Math.min(4096,Math.max(subdivisions,Math.ceil((travelA+travelB)/(scaleRadius*0.25))));
  subdivisions=adaptive;
  const dt=(timeEnd-timeStart)/subdivisions,rs=radiusA+radiusB;
  if(Math.hypot(...initialDelta)<=1e-12&&rs>0){
    const relative=sub(trajectoryB.velocity(timeStart),trajectoryA.velocity(timeStart));
    const normal=[1,0,0];
    return {time:timeStart,positionA:initialA,positionB:initialB,normal,approximation:'overlap-depenetration',subdivisions};
  }
  for(let i=0;i<subdivisions;i++){
    const t0=timeStart+i*dt,t1=t0+dt,pA0=trajectoryA.sample(t0),pA1=trajectoryA.sample(t1),pB0=b.sample(t0),pB1=b.sample(t1);
    const va=pA1.map((x,k)=>(x-pA0[k])/dt),vb=pB1.map((x,k)=>(x-pB0[k])/dt);
    const local=movingCircleTOI(pA0,va,pB0,vb,rs,dt);
    if(local!==null){const time=t0+local,pa=trajectoryA.sample(time),pb=b.sample(time);const delta=sub(pb,pa),rel=sub(vb,va);
      const normal=Math.hypot(...delta)>1e-12?normalize(delta):[1,0,0];
      return {time,positionA:pa,positionB:pb,normal,approximation:'subdivision-ccd',subdivisions};}
  }
  return null;
}
