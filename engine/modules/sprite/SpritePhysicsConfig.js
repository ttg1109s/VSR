import { createSphereCollider3D, createBoxCollider3D, createPlaneCollider3D } from './collider3d.js';
import { createPoseTrajectory } from './PoseTrajectory.js';
import { createPhysicalStateSampler } from './PhysicalStateSampler.js';

const vec3 = (value, name) => {
  if (!Array.isArray(value) || value.length !== 3 || value.some(v => !Number.isFinite(v))) throw new TypeError(`${name} must be a finite Vec3`);
  return [...value];
};
const quat = (value, name='orientation') => {
  if (!Array.isArray(value) || value.length !== 4 || value.some(v => !Number.isFinite(v)) || Math.hypot(...value) < 1e-12) throw new TypeError(`${name} must be a finite non-zero quaternion`);
  const m=Math.hypot(...value); return value.map(v=>v/m);
};

const WORLD_DEFAULTS = Object.freeze({
  dimension:'2D', plane:'XY', planeOffset:0, dimensionPolicy:'project',
  gravity:[0,-9.81,0], fixedDt:1/120, velocityIterations:8, positionIterations:3,
  maxSubsteps:8, sleepLinearThreshold:0.02, sleepAngularThreshold:0.03, sleepDwell:0.5
});

export function normalizePhysicsWorldConfig(config={}) {
  const w={...WORLD_DEFAULTS,...(config||{})};
  if(!['2D','3D'].includes(w.dimension)||!['XY','XZ','YZ'].includes(w.plane)||!Number.isFinite(w.planeOffset)||!['project','reject'].includes(w.dimensionPolicy)) throw new TypeError('Invalid physicsWorld dimension profile');
  w.gravity=vec3(w.gravity,'physicsWorld.gravity');
  for(const key of ['fixedDt'])if(!Number.isFinite(w[key])||w[key]<=0)throw new TypeError(`physicsWorld.${key} must be positive finite`);
  for(const key of ['velocityIterations','positionIterations','maxSubsteps'])if(!Number.isSafeInteger(w[key])||w[key]<1)throw new TypeError(`physicsWorld.${key} must be a positive integer`);
  for(const key of ['sleepLinearThreshold','sleepAngularThreshold','sleepDwell'])if(!Number.isFinite(w[key])||w[key]<0)throw new TypeError(`physicsWorld.${key} must be non-negative finite`);
  return w;
}

/** Converts a scenario Sprite definition into a rigid-body spec. World settings are never read from the Sprite. */
export function normalizeSpritePhysicsConfig(spriteId, spriteDefinition) {
  if (!spriteDefinition || typeof spriteDefinition !== 'object') throw new TypeError(`Sprite ${spriteId} definition required`);
  const p=spriteDefinition.physics||{}, c=spriteDefinition.collision||{};
  const physicsEnabled=Object.hasOwn(spriteDefinition,'physics') && p && typeof p==='object';
  const collisionDeclared=Object.prototype.hasOwnProperty.call(spriteDefinition,'collision') && c.enable!==false;
  const shape=c.shape??'sphere'; let collider;
  if(shape==='sphere') collider=createSphereCollider3D({radius:Number(c.radius??0.5),offset:vec3(c.offset??[0,0,0],'collision.offset')});
  else if(shape==='box') collider=createBoxCollider3D({halfExtents:vec3(c.halfExtents??[0.5,0.5,0.5],'collision.halfExtents'),offset:vec3(c.offset??[0,0,0],'collision.offset')});
  else if(shape==='plane') collider=createPlaneCollider3D({normal:vec3(c.normal??[0,1,0],'collision.normal'),offset:Number(c.planeOffset??0)});
  else throw new TypeError(`Sprite ${spriteId} has unsupported collider shape ${shape}`);
  const radius=shape==='sphere'?collider.radius:Number(c.radius??0.5);
  const bodyType=p.bodyType??'dynamic';
  if(!['static','kinematic','dynamic','sensor'].includes(bodyType))throw new TypeError(`Sprite ${spriteId} has invalid bodyType`);
  const authoredPose=spriteDefinition.position&&typeof spriteDefinition.position==='object'&&!Array.isArray(spriteDefinition.position)?spriteDefinition.position:{};
  const position=vec3(authoredPose.location??spriteDefinition.position??[0,0,0],'position');
  const tuple=authoredPose.transform;
  const initialScale=tuple?.[1]??1,initialRotation=tuple?.[0]??0,initialOrigin=tuple?.[2]??'center';
  const transformKeys=Array.isArray(spriteDefinition.transformTrajectory)?spriteDefinition.transformTrajectory.map(k=>({time:k.time,rotation:k.rotate??k.rotation??0,scale:k.scale??1,origin:k.origin??initialOrigin})):[];
  const poseTrajectory=createPoseTrajectory({initialPose:{location:position,rotation:initialRotation,scale:initialScale,origin:initialOrigin},transformKeys,rotationMode:p.rotationMode??'direct'});
  const physicalStateSampler=createPhysicalStateSampler({collider,mass:Number(p.mass??1),bodyType,poseTrajectory,constantDensity:p.massMode==='constant-density',density:Number(p.density??1)});
  return {
    id:String(spriteId), type:bodyType, radius, collider,
    transform:{position,orientation:quat(p.orientation??[1,0,0,0]),rotation:initialRotation,scale:initialScale,origin:initialOrigin},
    poseTrajectory,physicalStateSampler,
    velocity:vec3(p.velocity??[0,0,0],'physics.velocity'),
    angularVelocity:vec3(p.angularVelocity??[0,0,0],'physics.angularVelocity'),
    mass:Number(p.mass??1),
    restitution:Number(p.restitution??0.2),
    staticFriction:Number(p.friction??0.5), dynamicFriction:Number(p.friction??0.5),
    linearDamping:Number(p.linearDamping??0), angularDamping:Number(p.angularDamping??0),
    collisionEnabled:collisionDeclared, ccd:c.ccd===true||p.ccd===true,
    physicsEnabled
  };
}

/** Normalizes one shared World configuration and per-Sprite Body specifications. */
export function normalizeScenarioSpritePhysics(spriteDefinitions={}, worldConfig={}) {
  const legacyWorldKeys=['dimension','plane','planeOffset','dimensionPolicy','gravity','fixedDt','sleepLinearThreshold','sleepAngularThreshold','sleepDwell'];
  const worldInput={...(worldConfig||{})};
  const explicitKeys=new Set(Object.keys(worldInput));
  const adopted=new Set();
  for(const [spriteId,definition] of Object.entries(spriteDefinitions||{})){
    const p=definition?.physics||{};
    for(const key of legacyWorldKeys){
      if(!Object.hasOwn(p,key))continue;
      if(explicitKeys.has(key)){
        if(JSON.stringify(worldInput[key])!==JSON.stringify(p[key]))throw new TypeError(`physicsWorld.${key} conflicts with legacy Sprite ${spriteId} physics.${key}`);
      }else if(adopted.has(key)){
        if(JSON.stringify(worldInput[key])!==JSON.stringify(p[key]))throw new TypeError(`Legacy Sprite physics settings conflict for physicsWorld.${key}`);
      }else{
        worldInput[key]=p[key];adopted.add(key);
      }
    }
  }
  const normalizedWorld=normalizePhysicsWorldConfig(worldInput);
  const bodies=Object.entries(spriteDefinitions||{}).map(([id,def])=>normalizeSpritePhysicsConfig(id,def)).filter(body=>body.physicsEnabled);
  return {worldConfig:normalizedWorld,bodies};
}
