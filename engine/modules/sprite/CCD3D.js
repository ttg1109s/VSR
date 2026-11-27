import { collider3DWorldGeometry, narrowphase3D } from './collider3d.js';

const EPS=1e-10;
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const scale=(a,s)=>a.map(v=>v*s);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const len=a=>Math.hypot(...a);
const qrotate=(q,v)=>{const u=q.slice(1),t=[2*(u[1]*v[2]-u[2]*v[1]),2*(u[2]*v[0]-u[0]*v[2]),2*(u[0]*v[1]-u[1]*v[0])];return add(v,add(scale(t,q[0]),[u[1]*t[2]-u[2]*t[1],u[2]*t[0]-u[0]*t[2],u[0]*t[1]-u[1]*t[0]]));};
function boundRadius(g){if(g.type==='sphere')return g.radius;if(g.type==='ellipsoid')return Math.max(...g.radii);if(g.type==='box')return len(g.halfExtents);return Infinity;}
function planeExtent(g,n){if(g.type==='sphere')return g.radius;if(g.type==='ellipsoid'){const inv=[g.orientation[0],-g.orientation[1],-g.orientation[2],-g.orientation[3]],ln=qrotate(inv,n);return Math.sqrt(g.radii.reduce((s,r,i)=>s+(r*ln[i])**2,0));}if(g.type==='box'){const axes=[qrotate(g.orientation,[1,0,0]),qrotate(g.orientation,[0,1,0]),qrotate(g.orientation,[0,0,1])];return g.halfExtents.reduce((s,h,i)=>s+h*Math.abs(dot(n,axes[i])),0);}return 0;}
function geometryAt(body,time){return collider3DWorldGeometry(body.collider,{position:add(body.position,scale(body.velocity,time)),orientation:body.orientation});}
function planeGap(g,plane){const signed=dot(g.center,plane.normal)-plane.offset;return{gap:Math.abs(signed)-planeExtent(g,plane.normal),side:signed>=0?1:-1};}
function sphereSphereTOI(ga,gb,va,vb,dt){const p=sub(gb.center,ga.center),v=sub(vb,va),r=ga.radius+gb.radius,A=dot(v,v),B=2*dot(p,v),C=dot(p,p)-r*r;if(C<=0)return 0;if(A<EPS||B>=0)return null;const d=B*B-4*A*C;if(d<0)return null;const t=(-B-Math.sqrt(Math.max(0,d)))/(2*A);return t>=0&&t<=dt?t:null;}
function pairTOI(a,b,dt){
 const ga=geometryAt(a,0),gb=geometryAt(b,0);
 if(ga.type==='sphere'&&gb.type==='sphere')return {time:sphereSphereTOI(ga,gb,a.velocity,b.velocity,dt),method:'analytic-sphere-sphere'};
 if(ga.type==='plane'&&gb.type!=='plane'){const {gap,side}=planeGap(gb,ga),speed=dot(b.velocity,ga.normal)*side;if(gap<=0)return{time:0,method:'analytic-shape-plane'};if(speed>=-EPS)return null;const t=gap/-speed;return t<=dt?{time:t,method:'analytic-shape-plane'}:null;}
 if(gb.type==='plane'&&ga.type!=='plane'){const {gap,side}=planeGap(ga,gb),speed=dot(a.velocity,gb.normal)*side;if(gap<=0)return{time:0,method:'analytic-shape-plane'};if(speed>=-EPS)return null;const t=gap/-speed;return t<=dt?{time:t,method:'analytic-shape-plane'}:null;}
 if(ga.type==='plane'||gb.type==='plane')return null;
 const R=boundRadius(ga)+boundRadius(gb),p=sub(gb.center,ga.center),v=sub(b.velocity,a.velocity),A=dot(v,v),B=2*dot(p,v),C=dot(p,p)-R*R;
 if(C<=0)return{time:0,method:'conservative-bounding-sphere'};
 if(A<EPS||B>=0)return null;const d=B*B-4*A*C;if(d<0)return null;const t=(-B-Math.sqrt(Math.max(0,d)))/(2*A);return t>=0&&t<=dt?{time:t,method:'conservative-bounding-sphere'}:null;
}
export function findCCDImpact3D(a,b,dt,{maxIterations=48}={}){
 const candidate=pairTOI(a,b,dt);if(!candidate||candidate.time===null)return null;
 const start=candidate.time,steps=Math.max(8,Math.min(64,maxIterations)),remaining=dt-start;
 // Candidate TOI is exact for sphere-sphere and shape-plane translation; other
 // supported pairs use a conservative enclosing-radius candidate. Narrowphase
 // contact is required before the candidate can become an authoritative impact.
 for(let i=0;i<=steps;i++){const ti=start+remaining*i/steps,ra=narrowphase3D(geometryAt(a,ti),geometryAt(b,ti));if(ra.status==='confirmed-contact')return{time:ti,contact:ra.contact,method:candidate.method,pair:ra.pair};}
 return null;
}
