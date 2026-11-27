import { validateVector } from './math.js';

const vec3=(v,n,d=[0,0,0])=>{if(v===undefined)return d.slice();if(!Array.isArray(v)||v.length!==3||v.some(x=>!Number.isFinite(x)))throw new TypeError(n+' must be finite Vec3');return v.slice();};
const scale3=s=>{const v=vec3(s,'scale');if(v.some(x=>x<=0))throw new TypeError('scale components must be positive finite numbers');return v;};
const origin=o=>vec3(o,'origin');
const validRotation=r=>{if(Array.isArray(r)&&(r.length===3||r.length===4)&&r.every(Number.isFinite))return r.length===4?qn(r):r.slice();throw new TypeError('rotation must be Euler Vec3 or quaternion [w,x,y,z]');};
const qn=q=>{if(!Array.isArray(q)||q.length!==4||q.some(x=>!Number.isFinite(x)))throw new TypeError('Quaternion must be [w,x,y,z]');const n=Math.hypot(...q);if(n<1e-12)throw new TypeError('Quaternion cannot be zero');return q.map(x=>x/n);};
const qe=e=>{const[x,y,z]=e.map(v=>v*Math.PI/180),cx=Math.cos(x/2),sx=Math.sin(x/2),cy=Math.cos(y/2),sy=Math.sin(y/2),cz=Math.cos(z/2),sz=Math.sin(z/2);return qn([cx*cy*cz+sx*sy*sz,sx*cy*cz-cx*sy*sz,cx*sy*cz+sx*cy*sz,cx*cy*sz-sx*sy*cz]);};
const qs=(a,b,t)=>{a=qn(a);b=qn(b);let d=a.reduce((s,x,i)=>s+x*b[i],0);if(d<0){b=b.map(x=>-x);d=-d;}if(d>.9995)return qn(a.map((x,i)=>x+(b[i]-x)*t));const th=Math.acos(Math.min(1,d)),s=Math.sin(th);return a.map((x,i)=>(Math.sin((1-t)*th)*x+Math.sin(t*th)*b[i])/s);};
const qmul=(a,b)=>[a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3],a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2],a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1],a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]];
const quatTangent=(q,w)=>{const d=qmul(q,[0,w[0],w[1],w[2]]);return d.map(x=>x*.5);};
const qHermite=(a,b,wa,wb,u,dt)=>{a=qn(a);b=qn(b);if(a.reduce((v,x,i)=>v+x*b[i],0)<0)b=b.map(x=>-x);const da=quatTangent(a,wa),db=quatTangent(b,wb),raw=hermite(a,b,da,db,u,dt),der=hermiteD(a,b,da,db,u,dt),n=Math.hypot(...raw);if(n<1e-10)return qs(a,b,u);const q=raw.map(x=>x/n),proj=q.reduce((v,x,i)=>v+x*der[i],0),qd=der.map((x,i)=>(x-q[i]*proj)/(n));const rel=qmul([q[0],-q[1],-q[2],-q[3]],qd);return{q,omega:rel.slice(1).map(x=>2*x/dt)};};
const qeOut=q=>{const[w,x,y,z]=qn(q);return[Math.atan2(2*(w*x+y*z),1-2*(x*x+y*y)),Math.asin(Math.max(-1,Math.min(1,2*(w*y-z*x)))),Math.atan2(2*(w*z+x*y),1-2*(y*y+z*z))].map(v=>v*180/Math.PI);};
const toQ=r=>Array.isArray(r)&&r.length===4?qn(r):qe(Array.isArray(r)?r:[0,0,r]);
const rv=k=>validRotation(k.rotation);
const shortest=(a,b,t)=>qeOut(qs(toQ(a),toQ(b),t));



const hermite=(p0,p1,v0,v1,u,dt)=>{const u2=u*u,u3=u2*u;return p0.map((v,i)=>(2*u3-3*u2+1)*v+(-2*u3+3*u2)*p1[i]+(u3-2*u2+u)*dt*v0[i]+(u3-u2)*dt*v1[i]);};
const hermiteD=(p0,p1,v0,v1,u,dt)=>{const u2=u*u;return p0.map((v,i)=>((6*u2-6*u)*v+(-6*u2+6*u)*p1[i]+(3*u2-4*u+1)*dt*v0[i]+(3*u2-2*u)*dt*v1[i])/dt);};
function keyIndex(keys,t){return t<=keys[0].time?0:t>=keys.at(-1).time?keys.length-2:keys.findIndex((k,i)=>i<keys.length-1&&t>=k.time&&t<=keys[i+1].time);}
function componentTangent(keys,i,field,dim){const key=keys[i],specified=field==='rotation'?key.angularVelocity:key.scaleRate;if(specified){if(field==='rotation')return dim===1?[specified[2]*180/Math.PI]:specified.map(v=>v*180/Math.PI);return specified.slice();}const prev=keys[Math.max(0,i-1)],next=keys[Math.min(keys.length-1,i+1)],dt=next.time-prev.time,a=field==='scale'?prev.scale:(Array.isArray(prev.rotation)?prev.rotation:[0,0,prev.rotation]),b=field==='scale'?next.scale:(Array.isArray(next.rotation)?next.rotation:[0,0,next.rotation]);return dt>0?a.map((v,j)=>(b[j]-v)/dt):Array(dim).fill(0);}
function componentSample(keys,t,field,derivative=false){const i=keyIndex(keys,t),a=keys[i],b=keys[i+1],dt=b.time-a.time,u=Math.max(0,Math.min(1,(t-a.time)/dt)),av=field==='scale'?a.scale:(Array.isArray(a.rotation)?a.rotation:[0,0,a.rotation]),bv=field==='scale'?b.scale:(Array.isArray(b.rotation)?b.rotation:[0,0,b.rotation]),v0=componentTangent(keys,i,field,av.length),v1=componentTangent(keys,i+1,field,bv.length),v=derivative?hermiteD(av,bv,v0,v1,u,dt):hermite(av,bv,v0,v1,u,dt);if(field==='rotation'&&typeof a.rotation==='number')return derivative?[0,0,v[2]*Math.PI/180]:v[2];if(field==='rotation')return derivative?v.map(x=>x*Math.PI/180):v;if(field==='scale')return v;}
function quatVelocity(keys,t){const i=keyIndex(keys,t),a=keys[i],b=keys[i+1],dt=b.time-a.time,qa=toQ(a.rotation),qb=toQ(b.rotation),conj=[qa[0],-qa[1],-qa[2],-qa[3]],r=[conj[0]*qb[0]-conj[1]*qb[1]-conj[2]*qb[2]-conj[3]*qb[3],conj[0]*qb[1]+conj[1]*qb[0]+conj[2]*qb[3]-conj[3]*qb[2],conj[0]*qb[2]-conj[1]*qb[3]+conj[2]*qb[0]+conj[3]*qb[1],conj[0]*qb[3]+conj[1]*qb[2]-conj[2]*qb[1]+conj[3]*qb[0]];let n=qn(r);if(n[0]<0)n=n.map(x=>-x);const angle=2*Math.atan2(Math.hypot(n[1],n[2],n[3]),Math.max(-1,Math.min(1,n[0]))),sn=Math.hypot(n[1],n[2],n[3]);return sn<1e-12?[0,0,0]:n.slice(1).map(x=>x/sn*angle/dt);}
function quaternionSegment(keys,t){const i=keyIndex(keys,t),a=keys[i],b=keys[i+1],dt=b.time-a.time,u=Math.max(0,Math.min(1,(t-a.time)/dt)),hasTangents=Boolean(a.angularVelocity||b.angularVelocity);if(!hasTangents)return{q:qs(a.rotation,b.rotation,u),omega:quatVelocity(keys,t)};const wa=a.angularVelocity||quatVelocity(keys,a.time),wb=b.angularVelocity||quatVelocity(keys,b.time);return qHermite(a.rotation,b.rotation,wa,wb,u,dt);}
function keySample(keys,t,mode){if(!keys.length)return null;if(keys.length===1||t<=keys[0].time)return keys[0];if(t>=keys.at(-1).time)return keys.at(-1);const i=keyIndex(keys,t),a=keys[i],b=keys[i+1],u=(t-a.time)/(b.time-a.time),quaternion=Array.isArray(a.rotation)&&a.rotation.length===4;return{rotation:quaternion?quaternionSegment(keys,t).q:mode==='shortest-path'?shortest(a.rotation,b.rotation,u):componentSample(keys,t,'rotation'),scale:componentSample(keys,t,'scale'),origin:u<1?a.origin:b.origin};}
function rotationRate(keys,t,mode){if(keys.length<2)return[0,0,0];if(mode==='shortest-path'||(Array.isArray(keys[0].rotation)&&keys[0].rotation.length===4))return quaternionSegment(keys,t).omega;return componentSample(keys,t,'rotation',true);}

function scaleRate(keys,t){return keys.length<2?[0,0,0]:componentSample(keys,t,'scale',true);}
export function createPoseTrajectory({positionTrajectory=null,transformKeys=[],initialPose={},rotationMode='direct'}={}){
 if(!['direct','shortest-path'].includes(rotationMode))throw new TypeError('rotationMode must be direct or shortest-path');
 if(!Array.isArray(transformKeys))throw new TypeError('transformKeys must be an array');
 const base={location:vec3(initialPose.location,'location'),rotation:validRotation(initialPose.rotation),scale:scale3(initialPose.scale),origin:origin(initialPose.origin)};
 const keys=transformKeys.map(k=>({time:Number(k.time),rotation:rv(k),scale:scale3(k.scale),origin:origin(k.origin),positionVelocity:k.positionVelocity===undefined?null:vec3(k.positionVelocity,'positionVelocity'),angularVelocity:k.angularVelocity===undefined?null:vec3(k.angularVelocity,'angularVelocity'),scaleRate:k.scaleRate===undefined?null:vec3(k.scaleRate,'scaleRate')})).sort((a,b)=>a.time-b.time);
 if(keys.some(k=>!Number.isFinite(k.time)))throw new TypeError('Key times must be finite');
 if(keys.some((k,i)=>i>0&&k.time===keys[i-1].time))throw new TypeError('Transform key times must be unique');
 if(rotationMode==='direct'&&keys.length){const first=keys[0].rotation,same=r=>typeof r===typeof first&&(!Array.isArray(first)||(Array.isArray(r)&&r.length===first.length));if(keys.some(k=>!same(k.rotation)))throw new TypeError('Direct-mode rotation keys must use a consistent representation');}
 if(keys.some(k=>k.angularVelocity&&k.angularVelocity.length!==3))throw new TypeError('angularVelocity key values must be Vec3 in radians per second');
 const sample=t=>{if(!Number.isFinite(t))throw new TypeError('sample time must be finite');const k=keySample(keys,t,rotationMode),location=positionTrajectory?.sample?validateVector(positionTrajectory.sample(t),'pose location'):base.location.slice(),originValue=k?.origin??base.origin;if(Array.isArray(originValue))return{location,rotation:k?.rotation??base.rotation,scale:k?.scale??base.scale.slice(),origin:originValue};return{location,rotation:k?.rotation??base.rotation,scale:k?.scale??base.scale.slice(),origin:originValue};};
 const velocity=t=>{if(!Number.isFinite(t))throw new TypeError('velocity time must be finite');if(positionTrajectory?.velocity)return validateVector(positionTrajectory.velocity(t),'pose velocity');if(keys.length>1&&keys.some(k=>k.positionVelocity)){const i=keyIndex(keys,t),a=keys[i],b=keys[i+1],dt=b.time-a.time,u=Math.max(0,Math.min(1,(t-a.time)/dt)),p0=positionTrajectory?.sample?.(a.time)||base.location,p1=positionTrajectory?.sample?.(b.time)||base.location,v0=a.positionVelocity||[0,0,0],v1=b.positionVelocity||[0,0,0];return hermiteD(p0,p1,v0,v1,u,dt);}if(positionTrajectory?.sample){const h=1e-5,a=positionTrajectory.sample(t-h),b=positionTrajectory.sample(t+h);return b.map((v,i)=>(v-a[i])/(2*h));}return [0,0,0];};
 const angularVelocity=t=>rotationRate(keys,t,rotationMode);
 const scaleVelocity=t=>scaleRate(keys,t);
 const retarget=(time,{transformKeys:nextKeys=[],positionTrajectory:nextPositionTrajectory=null,rotationMode:nextMode=rotationMode,preserveVelocity=true}={})=>{
  if(!Number.isFinite(time)||!Array.isArray(nextKeys))throw new TypeError('Invalid retarget arguments');
  const current=sample(time),pv=velocity(time),av=angularVelocity(time),sv=scaleVelocity(time);
  const endTime=nextPositionTrajectory?.endTime??time+1,duration=Math.max(1e-9,endTime-time);
  const target=nextPositionTrajectory?nextPositionTrajectory.sample(endTime):current.location.map((x,i)=>x+pv[i]*duration),targetVelocity=nextPositionTrajectory?.velocity?.(endTime)??pv;
  const positionSource={startTime:time,endTime,sample(t){const u=Math.max(0,Math.min(1,(t-time)/duration));return hermite(current.location,target,preserveVelocity?pv:[0,0,0],targetVelocity,u,duration);},velocity(t){const u=Math.max(0,Math.min(1,(t-time)/duration));return hermiteD(current.location,target,preserveVelocity?pv:[0,0,0],targetVelocity,u,duration);}};
  const first={time,rotation:current.rotation,scale:current.scale,origin:current.origin,angularVelocity:preserveVelocity?av:[0,0,0],scaleRate:preserveVelocity?sv:[0,0,0],positionVelocity:preserveVelocity?pv:[0,0,0]};
  return createPoseTrajectory({positionTrajectory:positionSource,initialPose:current,transformKeys:[first,...nextKeys.map(k=>({...k}))],rotationMode:nextMode});
 };
 return{sample,velocity,angularVelocity,scaleRate:scaleVelocity,retarget,rotationMode,keys};
}
export {qn,qs};