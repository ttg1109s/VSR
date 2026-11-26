import { validateVector } from './math.js';

const vec3=(v,n,d=[0,0,0])=>{if(v===undefined)return d.slice();if(!Array.isArray(v)||v.length!==3||v.some(x=>!Number.isFinite(x)))throw new TypeError(n+' must be finite Vec3');return v.slice();};
const scale3=s=>{const v=Array.isArray(s)?vec3(s,'scale'):[s,s,s];if(v.some(x=>!Number.isFinite(x)||x<=0))throw new TypeError('scale components must be positive finite numbers');return v;};
const origin=o=>Array.isArray(o)?vec3(o,'origin'):String(o??'center');
const validRotation=r=>{if(typeof r==='number'&&Number.isFinite(r))return r;if(Array.isArray(r)&&(r.length===3||r.length===4)&&r.every(Number.isFinite))return r.slice();throw new TypeError('rotation must be a finite scalar, Euler Vec3, or quaternion');};
const qn=q=>{if(!Array.isArray(q)||q.length!==4||q.some(x=>!Number.isFinite(x)))throw new TypeError('Quaternion must be [w,x,y,z]');const n=Math.hypot(...q);if(n<1e-12)throw new TypeError('Quaternion cannot be zero');return q.map(x=>x/n);};
const qe=e=>{const[x,y,z]=e.map(v=>v*Math.PI/180),cx=Math.cos(x/2),sx=Math.sin(x/2),cy=Math.cos(y/2),sy=Math.sin(y/2),cz=Math.cos(z/2),sz=Math.sin(z/2);return qn([cx*cy*cz+sx*sy*sz,sx*cy*cz-cx*sy*sz,cx*sy*cz+sx*cy*sz,cx*cy*sz-sx*sy*cz]);};
const qs=(a,b,t)=>{a=qn(a);b=qn(b);let d=a.reduce((s,x,i)=>s+x*b[i],0);if(d<0){b=b.map(x=>-x);d=-d;}if(d>.9995)return qn(a.map((x,i)=>x+(b[i]-x)*t));const th=Math.acos(Math.min(1,d)),s=Math.sin(th);return a.map((x,i)=>(Math.sin((1-t)*th)*x+Math.sin(t*th)*b[i])/s);};
const qeOut=q=>{const[w,x,y,z]=qn(q);return[Math.atan2(2*(w*x+y*z),1-2*(x*x+y*y)),Math.asin(Math.max(-1,Math.min(1,2*(w*y-z*x)))),Math.atan2(2*(w*z+x*y),1-2*(y*y+z*z))].map(v=>v*180/Math.PI);};
const toQ=r=>Array.isArray(r)&&r.length===4?qn(r):qe(Array.isArray(r)?r:[0,0,r]);
const rv=k=>k.quaternion?qn(k.quaternion):validRotation(k.rotation??0);
const shortest=(a,b,t)=>qeOut(qs(toQ(a),toQ(b),t));
const directInterp=(a,b,t)=>Array.isArray(a)&&a.length===4?qs(a,b,t):Array.isArray(a)?a.map((v,j)=>v+(b[j]-v)*t):a+(b-a)*t;
const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const hermite=(p0,p1,v0,v1,u,dt)=>{const u2=u*u,u3=u2*u;return p0.map((v,i)=>(2*u3-3*u2+1)*v+(-2*u3+3*u2)*p1[i]+(u3-2*u2+u)*dt*v0[i]+(u3-u2)*dt*v1[i]);};
const hermiteD=(p0,p1,v0,v1,u,dt)=>{const u2=u*u;return p0.map((v,i)=>((6*u2-6*u)*v+(-6*u2+6*u)*p1[i]+(3*u2-4*u+1)*dt*v0[i]+(3*u2-2*u)*dt*v1[i])/dt);};
function keySample(keys,t,mode){if(!keys.length)return null;if(t<=keys[0].time)return keys[0];if(t>=keys.at(-1).time)return keys.at(-1);const i=keys.findIndex((k,j)=>j<keys.length-1&&t>=k.time&&t<=keys[j+1].time),a=keys[i],b=keys[i+1],u=(t-a.time)/(b.time-a.time);return{rotation:mode==='shortest-path'?shortest(a.rotation,b.rotation,u):directInterp(a.rotation,b.rotation,u),scale:a.scale.map((v,j)=>v+(b.scale[j]-v)*u),origin:u<1?a.origin:b.origin};}
function quaternionAngularVelocity(a,b,dt){const qa=toQ(a),qb=toQ(b),conj=[qa[0],-qa[1],-qa[2],-qa[3]],r=[conj[0]*qb[0]-conj[1]*qb[1]-conj[2]*qb[2]-conj[3]*qb[3],conj[0]*qb[1]+conj[1]*qb[0]+conj[2]*qb[3]-conj[3]*qb[2],conj[0]*qb[2]-conj[1]*qb[3]+conj[2]*qb[0]+conj[3]*qb[1],conj[0]*qb[3]+conj[1]*qb[2]-conj[2]*qb[1]+conj[3]*qb[0]];let n=qn(r);if(n[0]<0)n=n.map(x=>-x);const angle=2*Math.atan2(Math.hypot(n[1],n[2],n[3]),Math.max(-1,Math.min(1,n[0])));const s=Math.hypot(n[1],n[2],n[3]);return s<1e-12?[0,0,0]:n.slice(1).map(x=>x/s*angle/dt);}
function rotationRate(keys,t,mode){if(keys.length<2)return [0,0,0];const i=t<=keys[0].time?0:t>=keys.at(-1).time?keys.length-2:keys.findIndex((k,j)=>j<keys.length-1&&t>=k.time&&t<=keys[j+1].time),a=keys[i],b=keys[i+1],dt=b.time-a.time;if(dt<=0)return [0,0,0];if(mode==='shortest-path'||Array.isArray(a.rotation)&&a.rotation.length===4)return quaternionAngularVelocity(a.rotation,b.rotation,dt);const x=Array.isArray(a.rotation)?a.rotation:[0,0,a.rotation],y=Array.isArray(b.rotation)?b.rotation:[0,0,b.rotation];return x.map((v,j)=>(y[j]-v)/dt*Math.PI/180);}
function scaleRate(keys,t){if(keys.length<2)return [0,0,0];const i=t<=keys[0].time?0:t>=keys.at(-1).time?keys.length-2:keys.findIndex((k,j)=>j<keys.length-1&&t>=k.time&&t<=keys[j+1].time),a=keys[i],b=keys[i+1],dt=b.time-a.time;return dt>0?a.scale.map((v,j)=>(b.scale[j]-v)/dt):[0,0,0];}

export function createPoseTrajectory({positionTrajectory=null,transformKeys=[],initialPose={},rotationMode='direct'}={}){
 if(!['direct','shortest-path'].includes(rotationMode))throw new TypeError('rotationMode must be direct or shortest-path');
 if(!Array.isArray(transformKeys))throw new TypeError('transformKeys must be an array');
 const base={location:vec3(initialPose.location,'location'),rotation:validRotation(initialPose.rotation??0),scale:scale3(initialPose.scale??1),origin:origin(initialPose.origin)};
 const keys=transformKeys.map(k=>({time:Number(k.time),rotation:rv(k),scale:scale3(k.scale??1),origin:origin(k.origin??base.origin),positionVelocity:k.positionVelocity===undefined?null:vec3(k.positionVelocity,'positionVelocity'),angularVelocity:k.angularVelocity===undefined?null:vec3(k.angularVelocity,'angularVelocity'),scaleRate:k.scaleRate===undefined?null:vec3(k.scaleRate,'scaleRate')})).sort((a,b)=>a.time-b.time);
 if(keys.some(k=>!Number.isFinite(k.time)))throw new TypeError('Key times must be finite');
 if(keys.some((k,i)=>i>0&&k.time===keys[i-1].time))throw new TypeError('Transform key times must be unique');
 if(rotationMode==='direct'&&keys.length){const first=keys[0].rotation,same=r=>typeof r===typeof first&&(!Array.isArray(first)||(Array.isArray(r)&&r.length===first.length));if(keys.some(k=>!same(k.rotation)))throw new TypeError('Direct-mode rotation keys must use a consistent representation');}
 const sample=t=>{if(!Number.isFinite(t))throw new TypeError('sample time must be finite');const k=keySample(keys,t,rotationMode),location=positionTrajectory?.sample?validateVector(positionTrajectory.sample(t),'pose location'):base.location.slice();return{location,rotation:k?.rotation??base.rotation,scale:k?.scale??base.scale.slice(),origin:k?.origin??base.origin};};
 const velocity=t=>{if(!Number.isFinite(t))throw new TypeError('velocity time must be finite');if(positionTrajectory?.velocity)return validateVector(positionTrajectory.velocity(t),'pose velocity');if(positionTrajectory?.sample){const h=1e-5,a=positionTrajectory.sample(t-h),b=positionTrajectory.sample(t+h);return b.map((v,i)=>(v-a[i])/(2*h));}return [0,0,0];};
 const angularVelocity=t=>{const i=keys.findIndex(k=>Math.abs(k.time-t)<1e-12),key=i>=0?keys[i]:null;if(key?.angularVelocity)return key.angularVelocity.slice();return rotationRate(keys,t,rotationMode);};
 const scaleVelocity=t=>{const i=keys.findIndex(k=>Math.abs(k.time-t)<1e-12),key=i>=0?keys[i]:null;if(key?.scaleRate)return key.scaleRate.slice();return scaleRate(keys,t);};
 const retarget=(time,{transformKeys:nextKeys=[],positionTrajectory:nextPositionTrajectory=null,rotationMode:nextMode=rotationMode,preserveVelocity=true}={})=>{
  if(!Number.isFinite(time)||!Array.isArray(nextKeys))throw new TypeError('Invalid retarget arguments');
  const current=sample(time),pv=velocity(time),av=angularVelocity(time),sv=scaleVelocity(time);
  const anchoredPosition=nextPositionTrajectory||{sample:t=>current.location.map(x=>x),velocity:()=>pv.slice()};
  const positionSource=nextPositionTrajectory?{
   sample(t){return hermite(current.location,nextPositionTrajectory.sample(t),pv, nextPositionTrajectory.velocity?.(t)||pv, Math.max(0,Math.min(1,(t-time)/Math.max(1e-9,(nextPositionTrajectory.endTime??time+1)-time))),Math.max(1e-9,(nextPositionTrajectory.endTime??time+1)-time));},
   velocity(t){const end=nextPositionTrajectory.sample(nextPositionTrajectory.endTime??time+1),ev=nextPositionTrajectory.velocity?.(nextPositionTrajectory.endTime??time+1)||pv,d=Math.max(1e-9,(nextPositionTrajectory.endTime??time+1)-time),u=Math.max(0,Math.min(1,(t-time)/d));return hermiteD(current.location,end,pv,ev,u,d);}
  }:anchoredPosition;
  const first={time,rotation:current.rotation,scale:current.scale,origin:current.origin,angularVelocity:preserveVelocity?av:[0,0,0],scaleRate:preserveVelocity?sv:[0,0,0]};
  const keys=[first,...nextKeys.map(k=>({...k}))];
  return createPoseTrajectory({positionTrajectory:positionSource,initialPose:current,transformKeys:keys,rotationMode:nextMode});
 };
 return{sample,velocity,angularVelocity,scaleRate:scaleVelocity,retarget,rotationMode,keys};
}
export {qn,qs};