/** Dimension constraints shared by 3D-native simulation and legacy 2D adapters. */
const finiteVec=(v,n,name)=>{if(!Array.isArray(v)||v.length!==n||v.some(x=>!Number.isFinite(x)))throw new TypeError(`${name} must be a finite ${n}-vector`);return [...v];};
const normalizeQuat=q=>{const v=finiteVec(q,4,'quaternion'),m=Math.hypot(...v);if(m<1e-12)throw new TypeError('Quaternion cannot be zero');return v.map(x=>x/m);};
const quatFromZ=a=>[Math.cos(a/2),0,0,Math.sin(a/2)];
const angleFromQuat=q=>{const [w,x,y,z]=normalizeQuat(q);return 2*Math.atan2(z,w);};
export function createDimensionProfile({dimension='3D',plane='XY',offset=0,policy='reject'}={}){
 if(!['2D','3D'].includes(dimension))throw new TypeError('dimension must be 2D or 3D');if(!['XY','XZ','YZ'].includes(plane))throw new TypeError('plane must be XY, XZ or YZ');if(!Number.isFinite(offset))throw new TypeError('plane offset must be finite');if(!['reject','project'].includes(policy))throw new TypeError('policy must be reject or project');
 const axes=plane==='XY'?[0,1,2]:plane==='XZ'?[0,2,1]:[1,2,0],free=axes.slice(0,2),normal=axes[2];
 const project3=(v,name='vector')=>{const a=finiteVec(v,3,name);if(dimension==='3D')return a;const out=[0,0,0];out[free[0]]=a[free[0]];out[free[1]]=a[free[1]];out[normal]=0;if(policy==='reject'&&Math.abs(a[normal])>1e-9)throw new TypeError(`${name} violates ${plane} 2D constraint`);return out;};
 const projectPosition=(v)=>{const a=finiteVec(v,3,'position');if(dimension==='3D')return a;const out=project3(a,'position');out[normal]=offset;return out;};
 const axisIndex=plane==='XY'?2:plane==='XZ'?1:0;
 const projectQuat=q=>{if(dimension==='3D')return normalizeQuat(q);const [w,x,y,z]=normalizeQuat(q);const component=[x,y,z][axisIndex];const angle=2*Math.atan2(component,w);const out=[0,0,0];out[axisIndex]=Math.sin(angle/2);return [Math.cos(angle/2),...out];};
 const projectAngular=v=>{const a=finiteVec(v,3,'angular vector');if(dimension==='2D'){const out=[0,0,0];out[axisIndex]=a[axisIndex];return out;}return a;};
 return Object.freeze({dimension,plane,offset,policy,normalAxis:normal,freeAxes:free,projectVector:project3,projectPosition,projectQuaternion:projectQuat,projectAngular,constrainBody(body){body.position=projectPosition(body.position);body.velocity=project3(body.velocity,'velocity');body.force=project3(body.force,'force');body.angularVelocity=projectAngular(body.angularVelocity);body.torque=projectAngular(body.torque);body.orientation=projectQuat(body.orientation);return body;},snapshot(){return{dimension,plane,offset,policy};}});
}
export function legacy2DTo3D({x=0,y=0,angle=0,z=0,vx=0,vy=0,angularVelocity=0}={}){for(const v of [x,y,z,angle,vx,vy,angularVelocity])if(!Number.isFinite(v))throw new TypeError('Legacy 2D fields must be finite');return{position:[x,y,z],orientation:quatFromZ(angle),velocity:[vx,vy,0],angularVelocity:[0,0,angularVelocity]};}
export function transform3DToLegacy2D(transform={}){const p=finiteVec(transform.position||[0,0,0],3,'position'),q=normalizeQuat(transform.orientation||[1,0,0,0]);return{x:p[0],y:p[1],z:p[2],angle:angleFromQuat(q)};}
