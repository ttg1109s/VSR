const finiteVector=(v,n,name)=>{if(!Array.isArray(v)||v.length!==n||v.some(x=>!Number.isFinite(x)))throw new TypeError(`${name} must be a finite ${n}-vector`);return [...v];};
export function normalizeMotionState(input={}){
 const state=input.state||input;
 const time=Number(input.simulationTime??input.time??state.time??0);
 if(!Number.isFinite(time))throw new TypeError('Motion state simulationTime must be finite');
 return {simulationTime:time,state:{position:finiteVector(state.position??[0,0,0],3,'position'),velocity:finiteVector(state.velocity??[0,0,0],3,'velocity'),orientation:finiteVector(state.orientation??[1,0,0,0],4,'orientation'),angularVelocity:finiteVector(state.angularVelocity??[0,0,0],3,'angularVelocity'),scale:finiteVector(state.scale??[1,1,1],3,'scale')},body:structuredClone(input.body||{}),collider:structuredClone(input.collider||{}),world:structuredClone(input.world||{}),contactState:structuredClone(input.contactState||{supported:false,contacts:[]}),context:structuredClone(input.context||{})};
}
export function cloneMotionState(state){return structuredClone(normalizeMotionState(state));}
export function assertMotionStateContinuity(a,b,{epsilon=1e-9}={}){const x=normalizeMotionState(a),y=normalizeMotionState(b);if(Math.abs(x.simulationTime-y.simulationTime)>epsilon)throw new Error('Motion phase handoff violated simulation-time continuity');for(const k of ['position','velocity','orientation','angularVelocity','scale'])for(let i=0;i<x.state[k].length;i++)if(Math.abs(x.state[k][i]-y.state[k][i])>epsilon)throw new Error(`Motion phase handoff violated ${k} continuity at index ${i}`);return true;}
