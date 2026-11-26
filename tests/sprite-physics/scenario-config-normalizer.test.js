import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSpritePhysicsConfig, normalizeScenarioSpritePhysics } from '../../engine/modules/sprite/physics3d/SpritePhysicsConfig.js';
import { SpriteSimulationCoordinator3D } from '../../engine/modules/sprite/physics3d/SpriteSimulationCoordinator3D.js';
import { normalizeScenario } from '../../engine/schema/scenario.js';
import { readFileSync } from 'node:fs';

test('canonical scenario physics config maps 2D constrained body and collider',()=>{
 const body=normalizeSpritePhysicsConfig('ball',{position:[1,2,3],collision:{enable:true,shape:'sphere',radius:.4},physics:{dimension:'2D',plane:'XY',planeOffset:5,dimensionPolicy:'project',bodyType:'dynamic',velocity:[1,2,3],angularVelocity:[0,0,4],gravity:[0,-9.8,0]}});
 assert.equal(body.type,'dynamic');assert.equal(body.collider.type,'sphere');assert.deepEqual(body.transform.position,[1,2,3]);assert.deepEqual(body.velocity,[1,2,3]);assert.deepEqual(body.dimensionProfile,{dimension:'2D',plane:'XY',planeOffset:5,dimensionPolicy:'project'});
});
test('scenario normalizer rejects mixed profiles/gravity rather than silently ignoring',()=>{
 assert.throws(()=>normalizeScenarioSpritePhysics({a:{physics:{enable:true,dimension:'2D'}},b:{physics:{enable:true,dimension:'3D'}}}),/mix dimension profiles/);
 assert.throws(()=>normalizeScenarioSpritePhysics({a:{physics:{enable:true,gravity:[0,-9,0]}},b:{physics:{enable:true,gravity:[0,-8,0]}}}),/mix per-Sprite gravity/);
});
test('coordinator runScenario produces validated unified Sprite payload from canonical scenario sprite',()=>{
 const result=SpriteSimulationCoordinator3D.fromScenario({ball:{position:[0,1,0],collision:{shape:'sphere',radius:.25},physics:{enable:true,dimension:'2D',gravity:[0,-9.8,0],bodyType:'dynamic'}}},{maxTicks:120,simulationId:'test-ball'});
 assert.equal(result.payload.protocolVersion,2);assert.equal(result.payload.kind,'simulation');assert.equal(result.payload.simulationId,'test-ball');assert.equal(result.payload.bodies[0].id,'ball');assert.equal(result.payload.dimension,'2D');
});


test('physics defaults are simple and opt-in; collision defaults off unless declared',()=>{
 const disabled=normalizeScenarioSpritePhysics({legacy:{position:[0,2,0]}});
 assert.deepEqual(disabled.bodies,[]);
 const body=normalizeSpritePhysicsConfig('ball',{position:[0,2,0],physics:{enable:true}});
 assert.equal(body.physicsEnabled,true);assert.equal(body.type,'dynamic');assert.equal(body.mass,1);assert.equal(body.restitution,0.2);assert.equal(body.staticFriction,0.5);assert.deepEqual(body.worldConfig.gravity,[0,-9.81,0]);assert.deepEqual(body.velocity,[0,0,0]);assert.equal(body.collisionEnabled,false);
 const withCollision=normalizeSpritePhysicsConfig('ball',{physics:{enable:true},collision:{}});
 assert.equal(withCollision.collisionEnabled,true);
});


test('Loader scenario normalization fills simple physics defaults for opt-in bodies',()=>{
 const fixture=JSON.parse(readFileSync(new URL('../fixtures/engine/minimal-scenario.json',import.meta.url),'utf8'));
 fixture.sprite={ball:{action:'test_action',layer:1,state:{idle:'ball.png'},position:[0,2,0],physics:{enable:true}}};
 const scenario=normalizeScenario(fixture);
 const p=scenario.sprite.ball.physics;
 assert.equal(p.enable,true);assert.equal(p.dimension,'2D');assert.equal(p.bodyType,'dynamic');assert.equal(p.mass,1);assert.equal(p.restitution,0.2);assert.equal(p.friction,0.5);assert.deepEqual(p.gravity,[0,-9.81,0]);assert.deepEqual(p.velocity,[0,0,0]);
 fixture.sprite={legacy:{action:'test_action',layer:1,state:{idle:'legacy.png'},position:[0,0,0]}};
 const legacy=normalizeScenario(fixture);
 assert.equal(legacy.sprite.legacy.physics,undefined);
});
