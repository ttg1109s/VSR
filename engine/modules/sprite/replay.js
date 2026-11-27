import {createBezierTrajectory,createLinearPhysicsSegment} from './trajectory.js';
import {AuthoritativeSpriteSimulation} from './AuthoritativeSimulation.js';
const stable=value=>{if(value instanceof Map)return [...value].sort(([a],[b])=>String(a).localeCompare(String(b))).map(([k,v])=>[k,stable(v)]);if(Array.isArray(value))return value.map(stable);if(value&&typeof value==='object'){const out={};for(const k of Object.keys(value).sort())if(typeof value[k]!=='function')out[k]=stable(value[k]);return out;}return value;};
export function deterministicFingerprint(value){const text=JSON.stringify(stable(value));let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0).toString(16).padStart(8,'0');}
export function describeTrajectory(t){if(t.type==='physics')return{type:'physics',segmentId:t.segmentId,startTime:t.startTime,duration:t.duration,initialPosition:t.initialPosition,initialVelocity:t.initialVelocity,acceleration:t.acceleration};if(t.type==='bezier')return{type:'bezier',segmentId:t.segmentId,startTime:t.startTime,duration:t.duration,points:t.points,easing:t.easingName||'linear'};if(t.type==='bezier-chain')return{type:'bezier-chain',segmentId:t.segmentId,startTime:t.startTime,duration:t.duration,segments:t.segments.map(describeTrajectory)};if(t.type==='linear')return{type:'linear',segmentId:t.segmentId,startTime:t.startTime,duration:t.duration,startPosition:t.startPosition,endPosition:t.endPosition};throw new TypeError(`Unsupported replay trajectory type: ${t.type}`);}
export const SPRITE_REPLAY_FORMAT='vsr.sprite.replay.v2';
export function createSpriteReplay({simulationOptions={},bodies,initialTrajectories,physicsByBody={},startTime=0,seed=null}={}){
 if(!(initialTrajectories instanceof Map))throw new TypeError('initialTrajectories must be a Map.');
 const trajectories=[...initialTrajectories].sort(([a],[b])=>String(a).localeCompare(String(b))).map(([id,t])=>[id,describeTrajectory(t)]);
 const candidate={seed,simulationOptions:stable(simulationOptions),bodies:stable(bodies),physicsByBody:stable(physicsByBody),startTime,trajectories};
 return {...candidate,format:SPRITE_REPLAY_FORMAT,compatibility:{trajectorySchema:1,physicsModel:'authoritative-sprite-v1'},fingerprint:deterministicFingerprint(candidate)};
}
export function validateSpriteReplay(replay,{allowLegacy=true}={}){
 if(!replay||typeof replay!=='object'||!['vsr.sprite.replay.v1',SPRITE_REPLAY_FORMAT].includes(replay.format))throw new TypeError('Unsupported Sprite replay format.');
 if(replay.format==='vsr.sprite.replay.v1'&&!allowLegacy)throw new TypeError('Legacy Sprite replay format is not allowed.');
 if(!Array.isArray(replay.trajectories)||!replay.bodies||typeof replay.bodies!=='object'||!Number.isFinite(replay.startTime))throw new TypeError('Invalid Sprite replay envelope.');
 const ids=new Set();for(const [id,trajectory] of replay.trajectories){if(typeof id!=='string'||!id||ids.has(id))throw new TypeError('Replay trajectory IDs must be unique non-empty strings.');ids.add(id);if(!trajectory||typeof trajectory!=='object')throw new TypeError('Replay trajectory descriptor is invalid.');}
 const candidate={seed:replay.seed??null,simulationOptions:stable(replay.simulationOptions||{}),bodies:stable(replay.bodies),physicsByBody:stable(replay.physicsByBody||{}),startTime:replay.startTime,trajectories:replay.trajectories.map(([id,t])=>[id,t]).sort(([a],[b])=>a.localeCompare(b))};
 const fingerprint=deterministicFingerprint(candidate);
 if(replay.fingerprint!==fingerprint)throw new Error('Sprite replay fingerprint mismatch; payload is corrupt or incompatible.');
 if(replay.format===SPRITE_REPLAY_FORMAT&&replay.compatibility?.trajectorySchema!==1)throw new TypeError('Unsupported Sprite replay trajectory schema.');
 return {fingerprint,compatible:true,legacy:replay.format==='vsr.sprite.replay.v1'};
}
export function compareSpriteReplayResults(a,b){
 const left=deterministicFingerprint(a),right=deterministicFingerprint(b);
 return {equivalent:left===right,leftFingerprint:left,rightFingerprint:right};
}
function buildTrajectory(d){if(d.type==='physics')return createLinearPhysicsSegment({segmentId:d.segmentId,startTime:d.startTime,duration:d.duration,position:d.initialPosition,velocity:d.initialVelocity,acceleration:d.acceleration});if(d.type==='bezier')return createBezierTrajectory({points:d.points,duration:d.duration,easing:d.easing,startTime:d.startTime,segmentId:d.segmentId});if(d.type==='bezier-chain'){const segments=d.segments.map(buildTrajectory),locate=t=>segments.find(s=>t<=s.endTime+1e-12)||segments.at(-1);return{type:'bezier-chain',segmentId:d.segmentId,startTime:d.startTime,endTime:d.startTime+d.duration,duration:d.duration,segments,sample(t){return locate(t).sample(t);},velocity(t){return locate(t).velocity(t);}};}if(d.type==='linear'){const p0=d.startPosition,p1=d.endPosition,v=p0.map((x,i)=>(p1[i]-x)/d.duration);return{type:'linear',segmentId:d.segmentId,startTime:d.startTime,endTime:d.startTime+d.duration,duration:d.duration,startPosition:p0,endPosition:p1,sample(t){const u=Math.max(0,Math.min(1,(t-d.startTime)/d.duration));return p0.map((x,i)=>x+(p1[i]-x)*u);},velocity(){return v;}};}throw new TypeError(`Unsupported replay trajectory type: ${d.type}`);}
export function replaySpriteSimulation(replay){validateSpriteReplay(replay);const simulation=new AuthoritativeSpriteSimulation(replay.simulationOptions);const trajectories=new Map(replay.trajectories.map(([id,d])=>[id,buildTrajectory(d)]));return simulation.run({bodies:replay.bodies,initialTrajectories:trajectories,physicsByBody:replay.physicsByBody,startTime:replay.startTime});}
