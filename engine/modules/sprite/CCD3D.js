import { collider3DWorldGeometry, narrowphase3D } from './collider3d.js';
const EPS=1e-10,TOI_TOL=1e-7;
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),scale=(a,s)=>a.map(v=>v*s);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),len=a=>Math.hypot(...a),norm=a=>len(a)>EPS?scale(a,1/len(a)):[1,0,0];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const qrotate=(q,v)=>{const u=q.slice(1),t=scale(cross(u,v),2);return add(v,add(scale(t,q[0]),cross(u,t)));},qinv=q=>[q[0],-q[1],-q[2],-q[3]];
function qintegrate(q,w,dt){const [wx,wy,wz]=w,[x,y,z]=q.slice(1),s=.5*dt,n=[q[0]-s*(wx*x+wy*y+wz*z),x+s*(wx*q[0]+wy*z-wz*y),y+s*(wy*q[0]+wz*x-wx*z),z+s*(wz*q[0]+wx*y-wy*x)],l=Math.hypot(...n);return l>EPS?n.map(v=>v/l):q.slice();}
function geometryAt(body,time){return collider3DWorldGeometry(body.collider,{position:add(body.position,scale(body.velocity,time)),orientation:qintegrate(body.orientation,body.angularVelocity||[0,0,0],time)});}
function radius(g){if(g.type==='sphere')return g.radius;if(g.type==='ellipsoid')return Math.max(...g.radii);if(g.type==='box')return len(g.halfExtents);return Infinity;}
function planeExtent(g,n){if(g.type==='sphere')return g.radius;if(g.type==='ellipsoid'){const local=qrotate(qinv(g.orientation),n);return Math.sqrt(g.radii.reduce((s,r,i)=>s+(r*local[i])**2,0));}if(g.type==='box'){const axes=[qrotate(g.orientation,[1,0,0]),qrotate(g.orientation,[0,1,0]),qrotate(g.orientation,[0,0,1])];return g.halfExtents.reduce((s,h,i)=>s+h*Math.abs(dot(n,axes[i])),0);}return 0;}
function planeGap(g,p){const signed=dot(g.center,p.normal)-p.offset;return Math.abs(signed)-planeExtent(g,p.normal);}
function localPoint(b,p){return qrotate(qinv(b.orientation),sub(p,b.center));}
function sphereBoxGap(s,b){const p=localPoint(b,s.center),h=b.halfExtents,q=p.map((v,i)=>Math.max(-h[i],Math.min(h[i],v)));return len(sub(p,q))-s.radius;}
function boxAxes(b){return[qrotate(b.orientation,[1,0,0]),qrotate(b.orientation,[0,1,0]),qrotate(b.orientation,[0,0,1])];}
function boxBoxGap(a,b){const aa=boxAxes(a),bb=boxAxes(b),d=sub(b.center,a.center),axes=[...aa,...bb];for(const x of aa)for(const y of bb){const c=cross(x,y);if(len(c)>1e-8)axes.push(norm(c));}let max=-Infinity;for(const n of axes){const ra=a.halfExtents.reduce((s,h,i)=>s+h*Math.abs(dot(n,aa[i])),0),rb=b.halfExtents.reduce((s,h,i)=>s+h*Math.abs(dot(n,bb[i])),0);max=Math.max(max,Math.abs(dot(d,n))-ra-rb);}return max;}
function sphereEllipsoidGap(s,e){const inv=qinv(e.orientation),r=e.radii;let p=e.center.slice();for(let i=0;i<48;i++){const dir=norm(sub(s.center,p)),ld=qrotate(inv,dir),den=Math.sqrt((r[0]*ld[0])**2+(r[1]*ld[1])**2+(r[2]*ld[2])**2);if(den<EPS)break;const lp=[r[0]*r[0]*ld[0]/den,r[1]*r[1]*ld[1]/den,r[2]*r[2]*ld[2]/den],next=add(e.center,qrotate(e.orientation,lp));if(len(sub(next,p))<1e-9){p=next;break;}p=next;}const approximate=len(sub(s.center,p))-s.radius,lowerBound=len(sub(s.center,e.center))-s.radius-Math.max(...e.radii);return Math.min(approximate,lowerBound);}
function shapeGap(a,b){if(a.type==='sphere'&&b.type==='sphere')return len(sub(b.center,a.center))-a.radius-b.radius;if(a.type==='sphere'&&b.type==='box')return sphereBoxGap(a,b);if(a.type==='box'&&b.type==='sphere')return sphereBoxGap(b,a);if(a.type==='box'&&b.type==='box')return boxBoxGap(a,b);if(a.type==='sphere'&&b.type==='ellipsoid')return sphereEllipsoidGap(a,b);if(a.type==='ellipsoid'&&b.type==='sphere')return sphereEllipsoidGap(b,a);if(a.type==='plane'&&b.type!=='plane')return planeGap(b,a);if(b.type==='plane'&&a.type!=='plane')return planeGap(a,b);if(a.type==='plane'||b.type==='plane')return Infinity;return len(sub(b.center,a.center))-radius(a)-radius(b);}
function angularBound(body){const w=body.angularVelocity||[0,0,0];return len(w)*radius(body.collider);}
export function findCCDImpact3D(a,b,dt,{maxIterations=64,tolerance=TOI_TOL}={}) {
 const ga0=geometryAt(a,0),gb0=geometryAt(b,0),initial=narrowphase3D(ga0,gb0);
 if(initial.status==='indeterminate')return {status:'indeterminate',reason:initial.reason||'unsupported-initial-pair',pair:initial.pair,time:0};
 if(initial.status==='confirmed-contact')return {status:'confirmed-impact',time:0,contact:initial.contact,method:'initial-contact',pair:initial.pair,iterations:0};
 if(a.collider?.type==='sphere'&&b.collider?.type==='sphere'&&len(a.angularVelocity||[0,0,0])<EPS&&len(b.angularVelocity||[0,0,0])<EPS){const p=sub(b.position,a.position),v=sub(b.velocity,a.velocity),r=a.collider.radius+b.collider.radius,A=dot(v,v),B=2*dot(p,v),C=dot(p,p)-r*r;if(A<EPS)return{status:'confirmed-no-impact',reason:'zero-relative-motion',pair:initial.pair};const disc=B*B-4*A*C;if(disc<0)return{status:'confirmed-no-impact',reason:'analytic-swept-sphere-no-root',pair:initial.pair};const toi=(-B-Math.sqrt(Math.max(0,disc)))/(2*A);if(toi<0||toi>dt)return{status:'confirmed-no-impact',reason:'analytic-swept-sphere-outside-step',pair:initial.pair};const contact=narrowphase3D(geometryAt(a,toi),geometryAt(b,toi));if(contact.status==='confirmed-contact')return{status:'confirmed-impact',time:toi,contact:contact.contact,method:'analytic-swept-sphere',pair:contact.pair,iterations:1};return{status:'indeterminate',reason:'analytic-swept-sphere-contact-verification-failed',pair:initial.pair,time:toi};}
 const speed=len(sub(b.velocity,a.velocity))+angularBound(a)+angularBound(b);
 if(speed<EPS)return {status:'confirmed-no-impact',reason:'zero-relative-motion',pair:initial.pair};
 let t=0,gap=shapeGap(ga0,gb0);
 if(!Number.isFinite(gap))return {status:'indeterminate',reason:'non-finite-shape-gap',pair:initial.pair};
 if(gap<=0)return {status:'indeterminate',reason:'non-positive-gap-without-contact',pair:initial.pair};
 for(let i=0;i<maxIterations;i++){
  const step=Math.max(tolerance*.25,gap/speed*.8);
  const previous=t;t+=step;
  if(t>dt+tolerance)return {status:'confirmed-no-impact',reason:'conservative-advance-past-step',pair:initial.pair,iterations:i+1};
  t=Math.min(t,dt);
  const ga=geometryAt(a,t),gb=geometryAt(b,t),result=narrowphase3D(ga,gb);
  if(result.status==='confirmed-contact')return {status:'confirmed-impact',time:t,contact:result.contact,method:'conservative-advancement',pair:result.pair,iterations:i+1};
  if(result.status==='indeterminate')return {status:'indeterminate',reason:result.reason||'narrowphase-indeterminate-during-advance',pair:result.pair,interval:[previous,t],iterations:i+1};
  gap=shapeGap(ga,gb);
  if(!Number.isFinite(gap))return {status:'indeterminate',reason:'non-finite-shape-gap',pair:initial.pair,interval:[previous,t],iterations:i+1};
  if(gap<=tolerance){
   const samples=128,from=t;
   for(let k=1;k<=samples;k++){
    const ti=from+(dt-from)*k/samples,hit=narrowphase3D(geometryAt(a,ti),geometryAt(b,ti));
    if(hit.status==='indeterminate')return {status:'indeterminate',reason:hit.reason||'narrowphase-indeterminate-during-bracket',pair:hit.pair,interval:[from,ti],iterations:i+1};
    if(hit.status==='confirmed-contact'){
     let lo=from+(dt-from)*(k-1)/samples,hi=ti;
     for(let j=0;j<24;j++){const mid=(lo+hi)/2,m=narrowphase3D(geometryAt(a,mid),geometryAt(b,mid));if(m.status==='indeterminate')return {status:'indeterminate',reason:m.reason||'narrowphase-indeterminate-during-refinement',pair:m.pair,interval:[lo,hi],iterations:i+1};if(m.status==='confirmed-contact')hi=mid;else lo=mid;}
     const confirmed=narrowphase3D(geometryAt(a,hi),geometryAt(b,hi));
     if(confirmed.status==='confirmed-contact')return {status:'confirmed-impact',time:hi,contact:confirmed.contact,method:'conservative-advancement+bracket',pair:confirmed.pair,iterations:i+1};
     return {status:'indeterminate',reason:'impact-bracket-not-confirmed',pair:initial.pair,interval:[lo,hi],iterations:i+1};
    }
   }
   return {status:'confirmed-no-impact',reason:'temporal-bracket-no-contact',pair:initial.pair,iterations:i+1};
  }
  if(t>=dt)return {status:'confirmed-no-impact',reason:'step-end-no-contact',pair:initial.pair,iterations:i+1};
 }
 return {status:'indeterminate',reason:'conservative-advancement-iteration-limit',pair:initial.pair,interval:[t,dt],iterations:maxIterations};
}
