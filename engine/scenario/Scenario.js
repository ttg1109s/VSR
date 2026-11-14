export const SCENARIO_FORMAT_VERSION=1;
export class ScenarioValidationError extends Error{constructor(errors){super(`Invalid VSR scenario: ${errors.join('; ')}`);this.name='ScenarioValidationError';this.code='INVALID_SCENARIO';this.errors=errors;}}
function clone(input){try{return structuredClone(input);}catch(error){throw new ScenarioValidationError([`Scenario must be JSON-compatible: ${error.message}`]);}}
export function validateScenario(s){
 const errors=[];
 if(!s||typeof s!=='object'||Array.isArray(s))return['root must be a JSON object'];
 if(!s.scenes||typeof s.scenes!=='object'||Array.isArray(s.scenes)||!Object.keys(s.scenes).length)errors.push('scenes must be a non-empty object');
 else for(const[id,scene]of Object.entries(s.scenes)){
  if(!scene||typeof scene!=='object'||Array.isArray(scene)){errors.push(`scenes.${id} must be an object`);continue;}
  if(!scene.routers||typeof scene.routers!=='object'||Array.isArray(scene.routers)||!Object.keys(scene.routers).length){errors.push(`scenes.${id}.routers must be a non-empty object`);continue;}
  if(scene.set?.activeRouterId&&!Object.hasOwn(scene.routers,scene.set.activeRouterId))errors.push(`scenes.${id}.set.activeRouterId references a missing router`);
 }
 const version=s.formatVersion??1;if(!Number.isInteger(version)||version!==1)errors.push(`unsupported formatVersion '${version}'`);
 return errors;
}
export function normalizeScenario(input){
 const s=clone(input),errors=validateScenario(s);if(errors.length)throw new ScenarioValidationError(errors);
 s.formatVersion=s.formatVersion??1;s.meta||={};s.config||={};
 for(const key of ['globalStates','templates','itemInfo','passwords','actions','chat','characters','endings'])s[key]||={};
 for(const scene of Object.values(s.scenes)){scene.meta||={};scene.set||={};scene.set.activeRouterId||=Object.keys(scene.routers)[0];}
 return s;
}
