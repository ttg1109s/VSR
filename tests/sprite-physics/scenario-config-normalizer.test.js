import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSpritePhysicsConfig, normalizeScenarioSpritePhysics, normalizePhysicsWorldConfig } from '../../engine/modules/sprite/SpritePhysicsConfig.js';
import { SpriteSimulationCoordinator3D } from '../../engine/modules/sprite/SpriteSimulationCoordinator3D.js';
import { normalizeScenario } from '../../engine/schema/scenario.js';
import { readFileSync } from 'node:fs';

test('shared physicsWorld config maps dimension profile and runtime settings',()=>{
 const world=normalizePhysicsWorldConfig({dimension:'2D',plane:'XY',planeOffset:5,dimensionPolicy:'project',gravity:[0,-9.8,0],fixedDt:1/60});
 assert.equal(world.dimension,'2D');assert.equal(world.plane,'XY');assert.equal(world.planeOffset,5);assert.deepEqual(world.gravity,[0,-9.8,0]);assert.equal(world.fixedDt,1/60);
 assert.equal(world.velocityIterations,8);assert.equal(world.positionIterations,3);assert.equal(world.maxSubsteps,8);
});

test('Sprite normalization only produces body and collider data',()=>{
 const body=normalizeSpritePhysicsConfig('ball',{position:[1,2,3],collision:{enable:true,shape:'sphere',radius:.4},physics:{bodyType:'dynamic',velocity:[1,2,3],angularVelocity:[0,0,4]}});
 assert.equal(body.type,'dynamic');assert.equal(body.collider.type,'sphere');assert.deepEqual(body.transform.position,[1,2,3]);assert.deepEqual(body.velocity,[1,2,3]);
 assert.equal(body.physicsEnabled,true);assert.equal(body.worldConfig,undefined);assert.equal(body.dimensionProfile,undefined);
});

test('scenario normalizer applies one world profile to all enabled bodies',()=>{
 const normalized=normalizeScenarioSpritePhysics({a:{physics:{}},b:{physics:{mass:2}}},{dimension:'3D',gravity:[0,-8,0]});
 assert.equal(normalized.worldConfig.dimension,'3D');assert.deepEqual(normalized.worldConfig.gravity,[0,-8,0]);assert.equal(normalized.bodies.length,2);
 assert.equal(normalized.bodies[1].mass,2);
});

test('world config rejects invalid values',()=>{
 assert.throws(()=>normalizePhysicsWorldConfig({dimension:'4D'}),/Invalid physicsWorld dimension profile/);
 assert.throws(()=>normalizePhysicsWorldConfig({fixedDt:0}),/fixedDt must be positive finite/);
 assert.throws(()=>normalizePhysicsWorldConfig({velocityIterations:0}),/velocityIterations must be a positive integer/);
});

test('coordinator accepts scenario-shaped input and publishes unified simulation payload',()=>{
 const scenario={config:{physicsWorld:{dimension:'2D',gravity:[0,-9.8,0]}},sprite:{ball:{position:[0,1,0],collision:{shape:'sphere',radius:.25},physics:{bodyType:'dynamic'}}}};
 const result=SpriteSimulationCoordinator3D.fromScenario(scenario,{maxTicks:120,simulationId:'test-ball'});
 assert.equal(result.payload.protocolVersion,2);assert.equal(result.payload.kind,'simulation');assert.equal(result.payload.simulationId,'test-ball');assert.equal(result.payload.bodies[0].id,'ball');assert.equal(result.payload.dimension,'2D');
});

test('Sprite physics is opt-in by physics object presence and collision defaults off unless declared',()=>{
 const disabled=normalizeScenarioSpritePhysics({legacy:{position:[0,2,0]}});
 assert.deepEqual(disabled.bodies,[]);
 const body=normalizeSpritePhysicsConfig('ball',{physics:{}});
 assert.equal(body.physicsEnabled,true);assert.equal(body.type,'dynamic');assert.equal(body.mass,1);assert.equal(body.restitution,0.2);assert.equal(body.staticFriction,0.5);assert.deepEqual(body.velocity,[0,0,0]);assert.equal(body.collisionEnabled,false);
 const withCollision=normalizeSpritePhysicsConfig('ball',{physics:{},collision:{}});
 assert.equal(withCollision.collisionEnabled,true);
});

test('scenario normalization migrates legacy Sprite world keys to config.physicsWorld',()=>{
 const fixture=JSON.parse(readFileSync(new URL('../fixtures/engine/minimal-scenario.json',import.meta.url),'utf8'));
 fixture.sprite={ball:{action:'test_action',layer:1,state:{idle:'ball.png'},position:[0,2,0],physics:{dimension:'2D',gravity:[0,-9.8,0],fixedDt:1/60,bodyType:'dynamic',mass:2}}};
 const scenario=normalizeScenario(fixture);
 const p=scenario.sprite.ball.physics;
 assert.equal(p.enable,undefined);assert.equal(p.dimension,undefined);assert.equal(p.gravity,undefined);assert.equal(p.fixedDt,undefined);assert.equal(p.bodyType,'dynamic');assert.equal(p.mass,2);
 assert.equal(scenario.config.physicsWorld.dimension,'2D');assert.deepEqual(scenario.config.physicsWorld.gravity,[0,-9.8,0]);assert.equal(scenario.config.physicsWorld.fixedDt,1/60);
});

test('legacy world settings conflict is rejected rather than silently choosing a Sprite',()=>{
 const fixture=JSON.parse(readFileSync(new URL('../fixtures/engine/minimal-scenario.json',import.meta.url),'utf8'));
 fixture.sprite={a:{action:'test_action',layer:1,state:{idle:'a.png'},position:[0,0,0],physics:{gravity:[0,-9,0]}},b:{action:'test_action',layer:1,state:{idle:'b.png'},position:[0,0,0],physics:{gravity:[0,-8,0]}}};
 assert.throws(()=>normalizeScenario(fixture),/conflicts with another Sprite's legacy World setting/);
});

test('Loader scenario normalization fills body defaults and World defaults',()=>{
 const fixture=JSON.parse(readFileSync(new URL('../fixtures/engine/minimal-scenario.json',import.meta.url),'utf8'));
 fixture.sprite={ball:{action:'test_action',layer:1,state:{idle:'ball.png'},position:[0,2,0],physics:{}}};
 const scenario=normalizeScenario(fixture);
 const p=scenario.sprite.ball.physics;
 assert.equal(p.enable,undefined);assert.equal(p.bodyType,'dynamic');assert.equal(p.mass,1);assert.equal(p.restitution,0.2);assert.equal(p.friction,0.5);assert.deepEqual(p.velocity,[0,0,0]);
 assert.deepEqual(scenario.config.physicsWorld.gravity,[0,-9.81,0]);assert.equal(scenario.config.physicsWorld.dimension,'2D');
 fixture.sprite={legacy:{action:'test_action',layer:1,state:{idle:'legacy.png'},position:[0,0,0]}};
 const legacy=normalizeScenario(fixture);
 assert.equal(legacy.sprite.legacy.physics,undefined);
});
