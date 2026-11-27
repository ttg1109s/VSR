import {normalizeMotionState} from './MotionState.js';
const statuses=new Set(['completed','interrupted','cancelled','failed','superseded']);
const reasons=new Set(['supported_and_resting','authored_policy','simulation_limit','safety_limit','interrupted','cancelled','superseded','failed','phase_complete']);
export function createMotionPhaseResult(input={}){
 const start=normalizeMotionState(input.stateAtStart),end=normalizeMotionState(input.stateAtEnd);
 if(!Number.isFinite(input.interval?.startTime)||!Number.isFinite(input.interval?.endTime)||input.interval.endTime<input.interval.startTime)throw new TypeError('Phase result interval is invalid');
 const status=input.status||'completed';if(!statuses.has(status))throw new TypeError(`Invalid phase status: ${status}`);
 const reason=input.terminal?.reason||'phase_complete';if(!reasons.has(reason))throw new TypeError(`Invalid phase terminal reason: ${reason}`);
 return {phaseId:String(input.phaseId||'phase'),phaseType:String(input.phaseType||'unknown'),status,interval:{startTime:input.interval.startTime,endTime:input.interval.endTime},stateAtStart:start,stateAtEnd:end,trajectory:structuredClone(input.trajectory||{samples:[]}),segments:structuredClone(input.segments||[]),events:structuredClone(input.events||[]),terminal:{reason,physicallyResting:input.terminal?.physicallyResting===true,supported:input.terminal?.supported===true},continuation:{required:input.continuation?.required===true,nextPhaseType:input.continuation?.nextPhaseType??null,policy:input.continuation?.policy??null},diagnostics:structuredClone(input.diagnostics||{})};
}
