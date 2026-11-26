import { createSphereCollider3D, createBoxCollider3D, createPlaneCollider3D } from './collider3d.js';

const vec3 = (value, name) => {
  if (!Array.isArray(value) || value.length !== 3 || value.some(v => !Number.isFinite(v))) throw new TypeError(`${name} must be a finite Vec3`);
  return [...value];
};
const quat = (value, name='orientation') => {
  if (!Array.isArray(value) || value.length !== 4 || value.some(v => !Number.isFinite(v)) || Math.hypot(...value) < 1e-12) throw new TypeError(`${name} must be a finite non-zero quaternion`);
  const m=Math.hypot(...value); return value.map(v=>v/m);
};

/** Converts canonical scenario Sprite definitions into RigidBodyWorld3D body specs. */
export function normalizeSpritePhysicsConfig(spriteId, spriteDefinition) {
  if (!spriteDefinition || typeof spriteDefinition !== 'object') throw new TypeError(`Sprite ${spriteId} definition required`);
  const p=spriteDefinition.physics||{}, c=spriteDefinition.collision||{};
  const physicsEnabled=p.enable===true;
  const collisionDeclared=Object.prototype.hasOwnProperty.call(spriteDefinition,'collision') && c.enable!==false;
  const dimension=p.dimension??'2D', plane=p.plane??'XY', planeOffset=p.planeOffset??0, dimensionPolicy=p.dimensionPolicy??'project';
  if(!['2D','3D'].includes(dimension)||!['XY','XZ','YZ'].includes(plane)||!Number.isFinite(planeOffset)||!['project','reject'].includes(dimensionPolicy))throw new TypeError(`Sprite ${spriteId} has invalid dimension profile`);
  const shape=c.shape??'sphere'; let collider;
  if(shape==='sphere') collider=createSphereCollider3D({radius:Number(c.radius??0.5),offset:vec3(c.offset??[0,0,0],'collision.offset')});
  else if(shape==='box') collider=createBoxCollider3D({halfExtents:vec3(c.halfExtents??[0.5,0.5,0.5],'collision.halfExtents'),offset:vec3(c.offset??[0,0,0],'collision.offset')});
  else if(shape==='plane') collider=createPlaneCollider3D({normal:vec3(c.normal??[0,1,0],'collision.normal'),offset:Number(c.planeOffset??0)});
  else throw new TypeError(`Sprite ${spriteId} has unsupported collider shape ${shape}`);
  const radius=shape==='sphere'?collider.radius:Number(c.radius??0.5);
  const bodyType=p.bodyType??'dynamic';
  if(!['static','kinematic','dynamic','sensor'].includes(bodyType))throw new TypeError(`Sprite ${spriteId} has invalid bodyType`);
  const position=vec3(spriteDefinition.position??[0,0,0],'position');
  return {
    id:String(spriteId), type:bodyType, radius, collider,
    transform:{position,orientation:quat(p.orientation??[1,0,0,0])},
    velocity:vec3(p.velocity??[0,0,0],'physics.velocity'),
    angularVelocity:vec3(p.angularVelocity??[0,0,0],'physics.angularVelocity'),
    mass:Number(p.mass??1),
    restitution:Number(p.restitution??0.2),
    staticFriction:Number(p.friction??0.5), dynamicFriction:Number(p.friction??0.5),
    linearDamping:Number(p.linearDamping??0), angularDamping:Number(p.angularDamping??0),
    collisionEnabled:collisionDeclared, ccd:p.ccd===true||c.ccd===true,
    physicsEnabled,
    dimensionProfile:{dimension,plane,planeOffset,dimensionPolicy},
    worldConfig:{fixedDt:Number(p.fixedDt??1/120),gravity:vec3(p.gravity??[0,-9.81,0],'physics.gravity'),sleepLinearThreshold:Number(p.sleepLinearThreshold??0.02),sleepAngularThreshold:Number(p.sleepAngularThreshold??0.03),sleepDwell:Number(p.sleepDwell??0.5)}
  };
}

/** Builds one authoritative world configuration and body set. Mixed profiles or per-body gravity/timestep are rejected rather than silently ignored. */
export function normalizeScenarioSpritePhysics(spriteDefinitions={}) {
  const bodies=Object.entries(spriteDefinitions).map(([id,def])=>normalizeSpritePhysicsConfig(id,def)).filter(body=>body.physicsEnabled);
  if(!bodies.length)return {worldConfig:{},bodies:[]};
  const profile=bodies[0].dimensionProfile, worldConfig=bodies[0].worldConfig;
  for(const b of bodies){
    if(JSON.stringify(b.dimensionProfile)!==JSON.stringify(profile))throw new TypeError('One authoritative Sprite physics world cannot mix dimension profiles; split simulations or use a common profile.');
    for(const key of ['fixedDt','sleepLinearThreshold','sleepAngularThreshold','sleepDwell'])if(b.worldConfig[key]!==worldConfig[key])throw new TypeError(`Sprite physics world cannot mix ${key} values`);
    if(JSON.stringify(b.worldConfig.gravity)!==JSON.stringify(worldConfig.gravity))throw new TypeError('Sprite physics world cannot mix per-Sprite gravity vectors; use a shared gravity or separate worlds.');
  }
  return {worldConfig:{...worldConfig,...profile,gravity:worldConfig.gravity},bodies:bodies.map(({dimensionProfile,worldConfig,physicsEnabled,...body})=>body)};
}
