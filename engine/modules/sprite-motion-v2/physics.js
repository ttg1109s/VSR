import { validateVector, sub, dot, scale, add, normalize } from './math.js';
export function resolveCircleCollision({position1,position2,velocity1,velocity2,mass1=1,mass2=1,restitution=0,friction=0}){
  const p1=validateVector(position1,'position1'),p2=validateVector(position2,'position2'),v1=validateVector(velocity1,'velocity1'),v2=validateVector(velocity2,'velocity2');
  for(const [name,value] of [['mass1',mass1],['mass2',mass2]])if(!Number.isFinite(value)||value<=0)throw new TypeError(`${name} must be positive and finite.`);
  if(!Number.isFinite(restitution)||restitution<0||restitution>1)throw new TypeError('restitution must be in [0,1].');
  if(!Number.isFinite(friction)||friction<0)throw new TypeError('friction must be non-negative.');
  const delta=sub(p2,p1),relative=sub(v2,v1);
  const n=Math.hypot(...delta)>1e-12?normalize(delta):[1,0,0];
  const vn=dot(relative,n);
  if(vn>=0)return {velocity1:v1,velocity2:v2,normal:n,impulseMagnitude:0,normalImpulse:0,tangentImpulse:0,approaching:false};
  const inv1=1/mass1,inv2=1/mass2,j=-(1+restitution)*vn/(inv1+inv2),J=scale(n,j);
  let nv1=sub(v1,scale(J,inv1)),nv2=add(v2,scale(J,inv2)),jt=0;
  if(friction>0){const rv=sub(nv2,nv1),tangentRaw=sub(rv,scale(n,dot(rv,n))),tLen=Math.hypot(...tangentRaw);if(tLen>1e-12){const tangent=scale(tangentRaw,1/tLen);jt=-dot(rv,tangent)/(inv1+inv2);const limit=friction*j;jt=Math.max(-limit,Math.min(limit,jt));const TJ=scale(tangent,jt);nv1=sub(nv1,scale(TJ,inv1));nv2=add(nv2,scale(TJ,inv2));}}
  return {velocity1:nv1,velocity2:nv2,normal:n,impulseMagnitude:j,normalImpulse:j,tangentImpulse:jt,approaching:true};
}
export function correctCirclePenetration({position1,position2,radius1,radius2,mass1=1,mass2=1,slop=0.001,percent=0.8}){
  const p1=validateVector(position1),p2=validateVector(position2),delta=sub(p2,p1),distance=Math.hypot(...delta),n=distance>1e-12?normalize(delta):[1,0,0],penetration=Math.max(0,radius1+radius2-distance-slop),den=1/mass1+1/mass2;
  if(!Number.isFinite(radius1)||radius1<0||!Number.isFinite(radius2)||radius2<0||!Number.isFinite(mass1)||mass1<=0||!Number.isFinite(mass2)||mass2<=0||!Number.isFinite(slop)||slop<0||!Number.isFinite(percent)||percent<0||percent>1)throw new TypeError('Invalid penetration correction parameters.');
  if(!penetration)return {position1:p1,position2:p2,penetration:0};
  const correction=scale(n,penetration*percent/den);
  return {position1:sub(p1,scale(correction,1/mass1)),position2:add(p2,scale(correction,1/mass2)),penetration};
}
