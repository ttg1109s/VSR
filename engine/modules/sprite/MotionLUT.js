/** Canonical sampled motion representation and playback utilities.
 * LUTs are presentation outputs of authoritative motion; this module never solves physics.
 */
const finite = n => Number.isFinite(n);
const vec = (v, n, label) => { if (!Array.isArray(v) || v.length !== n || !v.every(finite)) throw new TypeError(`${label} must be a finite ${n}-vector`); return v.slice(); };
const normQuat = q => { const a=vec(q,4,'quaternion'),m=Math.hypot(...a); if(m<1e-12)throw new TypeError('Quaternion must be non-zero'); return a.map(x=>x/m); };
const lerp=(a,b,u)=>a.map((x,i)=>x+(b[i]-x)*u);
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
export function normalizeMotionSample(s){
 if(!s||!finite(s.t))throw new TypeError('Motion sample requires finite t');
 const p=vec(s.p??s.position,3,'position'),v=s.v??s.velocity;
 const q=normQuat(s.q??s.orientation??[1,0,0,0]);
 const w=s.w??s.angularVelocity??[0,0,0];
 const scale=s.s??s.scale??[1,1,1];
 return {t:s.t,p,v:v==null?undefined:vec(v,3,'velocity'),q,w:vec(w,3,'angularVelocity'),s:vec(scale,3,'scale'),...(s.origin!==undefined?{origin:s.origin}:{}),...(s.state!==undefined?{state:s.state}:{})};
}
export function createMotionLUT({simulationId='motion',startTime=0,endTime,sampling={mode:'fixed',interpolation:'linear'},tracks=[],events=[],completion={status:'completed'},coordinateSystem={space:'world',dimension:3,lengthUnit:'engine-unit',timeUnit:'second',rotationFormat:'quaternion-wxyz'},protocolVersion=3}={}){
 if(!finite(startTime)||!finite(endTime)||endTime<startTime)throw new TypeError('Invalid LUT time range');
 const normalizedTracks=tracks.map(t=>{if(!t?.bodyId||!Array.isArray(t.samples)||!t.samples.length)throw new TypeError('Each track needs bodyId and samples');const samples=t.samples.map(normalizeMotionSample).sort((a,b)=>a.t-b.t);for(let i=1;i<samples.length;i++)if(samples[i].t<=samples[i-1].t)throw new TypeError('Track sample timestamps must be strictly increasing');return{bodyId:String(t.bodyId),samples};});
 return {protocol:'vsr.sprite',protocolVersion,kind:'motion-lut',simulation:{simulationId:String(simulationId),startTime,endTime,completion:{...completion}},coordinateSystem:{...coordinateSystem},sampling:{mode:sampling.mode||'fixed',interpolation:sampling.interpolation||'linear',...sampling},tracks:normalizedTracks,events:events.map(e=>({...e})),integrity:{authoritative:true,complete:true}};
}
export function sampleMotionTrack(track,time,{interpolation='linear'}={}){
 if(!track?.samples?.length||!finite(time))throw new TypeError('Track and finite time required');const a=track.samples;
 if(time<=a[0].t)return {...a[0]};if(time>=a.at(-1).t)return {...a.at(-1)};
 let lo=0,hi=a.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(a[m].t<=time)lo=m;else hi=m;}const A=a[lo],B=a[hi],dt=B.t-A.t,u=(time-A.t)/dt;
 const p=interpolation==='hermite'&&A.v&&B.v?hermite(A.p,A.v,B.p,B.v,dt,u):lerp(A.p,B.p,u);
 const v=interpolation==='hermite'&&A.v&&B.v?hermiteDerivative(A.p,A.v,B.p,B.v,dt,u):A.v&&B.v?lerp(A.v,B.v,u):undefined;
 // Quaternion normalized lerp (shortest path) is a stable fallback; SLERP is used except near parallel.
 let q=B.q.slice(),qa=A.q.slice();if(qa.reduce((sum,x,i)=>sum+x*q[i],0)<0)q=q.map(x=>-x);const dot=qa.reduce((sum,x,i)=>sum+x*q[i],0);let rot;
 if(dot>.9995)rot=normQuat(lerp(qa,q,u));else{const theta=Math.acos(Math.max(-1,Math.min(1,dot))),sin=Math.sin(theta);rot=normQuat(qa.map((x,i)=>x*Math.sin((1-u)*theta)/sin+q[i]*Math.sin(u*theta)/sin));}
 return {t:time,p,v,q:rot,w:lerp(A.w,B.w,u),s:lerp(A.s,B.s,u),...(A.origin===B.origin&&A.origin!==undefined?{origin:A.origin}:{}),...(u<1?A.state!==undefined?{state:A.state}:{}:B.state!==undefined?{state:B.state}:{})};
}
function hermite(p0,v0,p1,v1,dt,u){const u2=u*u,u3=u2*u,h00=2*u3-3*u2+1,h10=u3-2*u2+u,h01=-2*u3+3*u2,h11=u3-u2;return p0.map((x,i)=>h00*x+h10*dt*v0[i]+h01*p1[i]+h11*dt*v1[i]);}
function hermiteDerivative(p0,v0,p1,v1,dt,u){const u2=u*u,h00=(6*u2-6*u)/dt,h10=3*u2-4*u+1,h01=(-6*u2+6*u)/dt,h11=3*u2-2*u;return p0.map((x,i)=>h00*x+h10*v0[i]+h01*p1[i]+h11*v1[i]);}
/** Adaptive samples a continuous trajectory using midpoint reconstruction error; exact boundaries are retained. */
export function generateAdaptiveMotionSamples({sample,velocity=null,startTime,endTime,positionTolerance=1e-3,velocityTolerance=1e-2,maxSamples=4096,minInterval=1e-6,boundaries=[]}={}){
 if(typeof sample!=='function'||!finite(startTime)||!finite(endTime)||endTime<startTime||positionTolerance<=0||maxSamples<2)throw new TypeError('Invalid adaptive sampling configuration');
 const times=[...new Set([startTime,endTime,...boundaries.filter(t=>finite(t)&&t>startTime&&t<endTime)])].sort((a,b)=>a-b),cache=new Map();const get=t=>{if(!cache.has(t)){const raw=sample(t);cache.set(t,normalizeMotionSample({t,p:raw.p??raw.position,v:velocity?velocity(t):raw.v??raw.velocity,q:raw.q??raw.orientation,w:raw.w??raw.angularVelocity,s:raw.s??raw.scale,origin:raw.origin,state:raw.state}));}return cache.get(t);};
 const refine=(a,b,depth=0)=>{if(cache.size>=maxSamples||b-a<=minInterval||depth>40)return;const m=(a+b)/2,A=get(a),B=get(b),M=get(m),approx=interpolationApprox(A,B,m,'linear');const ep=distance(M.p,approx.p),ev=M.v&&approx.v?distance(M.v,approx.v):0;if(ep>positionTolerance||(velocityTolerance>0&&ev>velocityTolerance)){refine(a,m,depth+1);refine(m,b,depth+1);}};
 for(const t of times)get(t);for(let i=1;i<times.length;i++)refine(times[i-1],times[i]);return [...cache.values()].sort((a,b)=>a.t-b.t);
}
function interpolationApprox(A,B,t,mode='linear'){const u=(t-A.t)/(B.t-A.t),dt=B.t-A.t;return{p:mode==='hermite'&&A.v&&B.v?hermite(A.p,A.v,B.p,B.v,dt,u):lerp(A.p,B.p,u),v:A.v&&B.v?lerp(A.v,B.v,u):undefined};}
export class MotionLUTPlayer{
 constructor(lut){if(lut?.kind!=='motion-lut'||!Array.isArray(lut.tracks))throw new TypeError('MotionLUTPlayer requires a motion-lut payload');this.lut=lut;this.time=lut.simulation.startTime;this.paused=false;}
 seek(t){const {startTime,endTime}=this.lut.simulation;if(!finite(t))throw new TypeError('Seek time must be finite');this.time=Math.max(startTime,Math.min(endTime,t));return this.sample(this.time);}
 sample(t=this.time){return Object.fromEntries(this.lut.tracks.map(track=>[track.bodyId,sampleMotionTrack(track,t,{interpolation:this.lut.sampling.interpolation})]));}
 pause(){this.paused=true;}resume(){this.paused=false;}reset(){this.time=this.lut.simulation.startTime;this.paused=false;return this.sample(this.time);}
 advance(delta){if(!finite(delta)||delta<0)throw new TypeError('advance delta must be non-negative');if(!this.paused)this.time=Math.min(this.lut.simulation.endTime,this.time+delta);return this.sample(this.time);}
 eventsAt(t,{epsilon=1e-6}={}){return this.lut.events.filter(e=>Math.abs((e.time??e.t)-t)<=epsilon);}
}
