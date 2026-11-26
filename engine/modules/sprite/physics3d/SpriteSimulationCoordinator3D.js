import { RigidBodyWorld3D } from './RigidBodyWorld3D.js';
import { serializeSpriteSimulation } from '../../../protocol/JsonProtocol.js';
import { normalizeScenarioSpritePhysics } from './SpritePhysicsConfig.js';
/** Runs an authoritative fixed-step 3D (or constrained 2D) Sprite simulation to natural completion or watchdog failure. */
export class SpriteSimulationCoordinator3D {
 constructor({world=null,worldConfig={},maxTicks=12000,sampleEveryTicks=1,simulationId='sprite-sim'}={}){if(!Number.isSafeInteger(maxTicks)||maxTicks<=0||!Number.isSafeInteger(sampleEveryTicks)||sampleEveryTicks<=0)throw new TypeError('maxTicks and sampleEveryTicks must be positive integers');this.world=world||new RigidBodyWorld3D(worldConfig);this.maxTicks=maxTicks;this.sampleEveryTicks=sampleEveryTicks;this.simulationId=String(simulationId);}
 static fromScenario(input,options={}){
  const scenarioLike=input&&typeof input==='object'&&input.sprite&&input.config;
  const spriteDefinitions=scenarioLike?input.sprite:input;
  const worldConfig=scenarioLike?(input.config.physicsWorld||{}):(options.worldConfig||{});
  const normalized=normalizeScenarioSpritePhysics(spriteDefinitions,worldConfig);
  return new SpriteSimulationCoordinator3D({...options,worldConfig:normalized.worldConfig}).run({bodies:normalized.bodies,scheduledImpulses:options.scheduledImpulses||[],initialTime:options.initialTime||0});
 }
 runScenario(input,{scheduledImpulses=[],initialTime=0,worldConfig:providedWorldConfig={}}={}){
  const scenarioLike=input&&typeof input==='object'&&input.sprite&&input.config;
  const spriteDefinitions=scenarioLike?input.sprite:input;
  const worldConfig=scenarioLike?(input.config.physicsWorld||{}):providedWorldConfig;
  const normalized=normalizeScenarioSpritePhysics(spriteDefinitions,worldConfig);
  if(this.world.bodies.size)throw new Error('Coordinator world must be empty before scenario run');
  this.world=new RigidBodyWorld3D(normalized.worldConfig);
  return this.run({bodies:normalized.bodies,scheduledImpulses,initialTime});
 }
 run({bodies=[],scheduledImpulses=[],initialTime=0}={}){if(!Array.isArray(bodies)||!Array.isArray(scheduledImpulses)||!Number.isFinite(initialTime))throw new TypeError('Invalid coordinator input');if(this.world.bodies.size)throw new Error('Coordinator world must be empty before run');for(const body of bodies)this.world.addBody(body);for(const op of scheduledImpulses)this.world.scheduleImpulse(op);this.world.t=initialTime;const dt=this.world.config.fixedDt,samples=new Map([...this.world.bodies.keys()].map(id=>[id,[]]));const events=[];const sample=()=>{for(const b of this.world.snapshot())samples.get(b.id)?.push({t:this.world.t,position:b.position,orientation:b.orientation,velocity:b.velocity,angularVelocity:b.angularVelocity,awake:b.awake});};sample();let completion=null;for(let i=0;i<this.maxTicks;i++){const r=this.world.step();events.push(...r.events);if((this.world.tick%this.sampleEveryTicks)===0)sample();if(this.world.isSettled({includeKinematic:true})){completion={status:'natural-rest',reason:'all-dynamic-bodies-settled-and-no-pending-operations'};break;}}if(!completion)completion={status:'failed',reason:'watchdog-exceeded',watchdogExceeded:true};if(!samples.values().next().value?.length||samples.values().next().value.at(-1)?.t!==this.world.t)sample();const bodiesOut=this.world.snapshot(),trajectories=[...samples].map(([id,points])=>({bodyId:id,samples:points}));const payload=serializeSpriteSimulation({simulationId:this.simulationId,physicsVersion:'3d-native-constrained-v2',dimension:this.world.config.dimension,time:{tStart:initialTime,tEnd:this.world.t,fixedDt:dt,ticks:this.world.tick},bodies:bodiesOut,events,trajectories,diagnostics:{...this.world.lastDiagnostics,dimensionProfile:this.world.getDimensionProfile(),watchdogTicks:this.maxTicks},completion});return{payload,world:this.world,completion,events,trajectories};}
}
