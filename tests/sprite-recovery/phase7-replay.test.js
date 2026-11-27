import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpriteReplay,validateSpriteReplay,compareSpriteReplayResults,replaySpriteSimulation} from '../../engine/modules/sprite/replay.js';
import {createLinearPhysicsSegment} from '../../engine/modules/sprite/trajectory.js';
test('Phase 7 replay validates canonical fingerprints and detects payload tampering',()=>{
 const initialTrajectories=new Map([['body',createLinearPhysicsSegment({segmentId:'s1',startTime:0,duration:1,position:[0,0,0],velocity:[1,0,0],acceleration:[0,0,0]})]]);
 const replay=createSpriteReplay({bodies:{body:{radius:1}},initialTrajectories,startTime:0,seed:17});
 assert.equal(replay.format,'vsr.sprite.replay.v2');assert.equal(validateSpriteReplay(replay).compatible,true);
 const changed=structuredClone(replay);changed.bodies.body.radius=2;
 assert.throws(()=>validateSpriteReplay(changed),/fingerprint mismatch/);
 assert.equal(compareSpriteReplayResults({x:1},{x:1}).equivalent,true);
 assert.equal(compareSpriteReplayResults({x:1},{x:2}).equivalent,false);
 assert.equal(replaySpriteSimulation(replay).simulationStatus,'completed');
});
test('Phase 7 replay explicitly retains or rejects legacy v1 compatibility',()=>{
 const initialTrajectories=new Map([['body',createLinearPhysicsSegment({segmentId:'s1',startTime:0,duration:1,position:[0,0,0],velocity:[1,0,0],acceleration:[0,0,0]})]]);
 const current=createSpriteReplay({bodies:{body:{radius:1}},initialTrajectories});
 const legacy={...current,format:'vsr.sprite.replay.v1'};delete legacy.compatibility;
 assert.equal(validateSpriteReplay(legacy).legacy,true);
 assert.throws(()=>validateSpriteReplay(legacy,{allowLegacy:false}),/Legacy/);
});
