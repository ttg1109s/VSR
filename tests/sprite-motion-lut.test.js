import test from 'node:test';
import assert from 'node:assert/strict';
import {createMotionLUT,generateAdaptiveMotionSamples,sampleMotionTrack,MotionLUTPlayer} from '../engine/modules/sprite/MotionLUT.js';
import {serializeMotionLUT,validateMotionLUTProtocol,validateSpriteProtocol} from '../engine/protocol/JsonProtocol.js';
import {SpriteSimulationCoordinator3D} from '../engine/modules/sprite/SpriteSimulationCoordinator3D.js';
import {createSpriteMotionLUTPlayer,sampleSpriteMotionLUT} from '../engine/client/adapters/JsonClient.js';
const sample=(t,p,v=[1,0,0])=>({t,p,v,q:[1,0,0,0],w:[0,0,0],s:[1,1,1]});
test('Motion LUT fixed samples normalize and playback seek/advance',()=>{
 const lut=createMotionLUT({simulationId:'t',startTime:0,endTime:1,tracks:[{bodyId:'a',samples:[sample(0,[0,0,0]),sample(1,[1,0,0])]}]});
 assert.equal(sampleMotionTrack(lut.tracks[0],.5).p[0],.5);const player=new MotionLUTPlayer(lut);assert.equal(player.seek(.25).a.p[0],.25);player.pause();player.advance(.5);assert.equal(player.time,.25);player.resume();player.advance(.5);assert.equal(player.time,.75);
});
test('adaptive sampling increases density for curved trajectory and keeps boundaries',()=>{
 const samples=generateAdaptiveMotionSamples({startTime:0,endTime:1,positionTolerance:.01,maxSamples:512,sample:t=>({position:[t,Math.sin(Math.PI*t),0],velocity:[1,Math.PI*Math.cos(Math.PI*t),0],orientation:[1,0,0,0],scale:[1,1,1]}),boundaries:[.5]});
 assert(samples.length>3);assert(samples.some(s=>s.t===.5));assert(samples.length<=512);
});
test('LUT protocol serializer validates v3 and rejects malformed samples',()=>{
 const payload=serializeMotionLUT({simulationId:'x',startTime:0,endTime:1,tracks:[{bodyId:'a',samples:[sample(0,[0,0,0]),sample(1,[1,0,0])]}]});assert.equal(validateMotionLUTProtocol(payload),true);assert.throws(()=>validateMotionLUTProtocol({...payload,tracks:[{bodyId:'a',samples:[{t:0,p:[0,0],q:[1],w:[0,0,0],s:[1,1,1]}]}]}));
});
test('segment sample time ordering enforced',()=>assert.throws(()=>createMotionLUT({startTime:0,endTime:1,tracks:[{bodyId:'x',samples:[sample(0,[0,0,0]),sample(0,[1,0,0])]}]})));

test('3D coordinator emits legacy simulation plus v3 canonical LUT',()=>{const c=new SpriteSimulationCoordinator3D({worldConfig:{gravity:[0,0,0],fixedDt:1/60,sleepDwell:.05,sleepLinearThreshold:.1},maxTicks:100,simulationId:'lut-coordinator'});const r=c.run({bodies:[{id:'body',position:[0,0,0],velocity:[0,0,0]}]});assert.equal(r.payload.protocolVersion,2);assert.equal(r.payload.kind,'simulation');assert.equal(r.payload.motionLUT.protocolVersion,3);assert.equal(r.payload.motionLUT.kind,'motion-lut');assert.equal(validateSpriteProtocol(r.payload.motionLUT),true);assert.equal(r.motionLUT.tracks[0].bodyId,'body');assert.ok(r.motionLUT.tracks[0].samples.length>0);});

test('adaptive reconstruction midpoint error converges within configured tolerance',()=>{
 const tol=.005,actual=t=>[t,Math.sin(Math.PI*t),0];const samples=generateAdaptiveMotionSamples({startTime:0,endTime:1,positionTolerance:tol,maxSamples:1024,sample:t=>({p:actual(t),q:[1,0,0,0],w:[0,0,0],s:[1,1,1]})});let maxError=0;for(let i=1;i<samples.length;i++){const a=samples[i-1],b=samples[i],m=(a.t+b.t)/2,approx=a.p.map((x,k)=>(x+b.p[k])/2);maxError=Math.max(maxError,Math.hypot(...actual(m).map((x,k)=>x-approx[k])));}assert.ok(maxError<=tol+1e-9,`max midpoint error ${maxError} exceeds tolerance ${tol}`);assert.ok(samples.length<=1024);
});

test('client adapter validates and exposes LUT player sampling',()=>{const lut=serializeMotionLUT({simulationId:'client',startTime:0,endTime:1,tracks:[{bodyId:'sprite',samples:[sample(0,[0,0,0]),sample(1,[1,0,0])]}]});const player=createSpriteMotionLUTPlayer(lut);assert.equal(player.seek(.4).sprite.p[0],.4);assert.equal(sampleSpriteMotionLUT(lut,.8).sprite.p[0],.8);});
