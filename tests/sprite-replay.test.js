import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpriteReplay,replaySpriteSimulation,deterministicFingerprint} from '../engine/modules/sprite/motion/replay.js';
import {createLinearPhysicsSegment} from '../engine/modules/sprite/motion/trajectory.js';
test('deterministic replay reconstructs physics descriptors and yields same collision trace',async()=>{
 const {createSpriteReplay,replaySpriteSimulation,deterministicFingerprint}=await import('../engine/modules/sprite/motion/replay.js');
 const {createLinearPhysicsSegment}=await import('../engine/modules/sprite/motion/trajectory.js');
 const bodies={a:{layer:0,radius:.5,mass:1,collisionEnabled:true,physicsEnabled:true,isMotionOwner:true},b:{layer:0,radius:.5,mass:1,collisionEnabled:true,physicsEnabled:true}};
 const initialTrajectories=new Map([['a',createLinearPhysicsSegment({segmentId:'a',startTime:0,duration:2,position:[0,0,0],velocity:[2,0,0]})],['b',createLinearPhysicsSegment({segmentId:'b',startTime:0,duration:2,position:[3,0,0],velocity:[0,0,0]})]]);
 const replay=createSpriteReplay({simulationOptions:{horizon:2,maxCollisionEvents:8},bodies,initialTrajectories,physicsByBody:{a:{restitution:1},b:{restitution:1}},startTime:0,seed:42});
 const x=replaySpriteSimulation(replay),y=replaySpriteSimulation(replay);assert.deepEqual(x.collisions,y.collisions);assert.deepEqual([...x.finalPositions],[...y.finalPositions]);assert.equal(replay.fingerprint,deterministicFingerprint({seed:42,simulationOptions:{horizon:2,maxCollisionEvents:8},bodies,physicsByBody:{a:{restitution:1},b:{restitution:1}},startTime:0,trajectories:[...initialTrajectories].map(([id,t])=>[id,{type:t.type,segmentId:t.segmentId,startTime:t.startTime,duration:t.duration,initialPosition:t.initialPosition,initialVelocity:t.initialVelocity,acceleration:t.acceleration}])}));
});
