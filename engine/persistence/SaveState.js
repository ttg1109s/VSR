import {cloneJsonValue} from '../../core/protocol/JsonProtocol.js';
export const SAVE_VERSION=1;
const RUNTIME_KEYS=['effectQueue','isSyncQueueRunning','isAsyncQueueRunning','pausedBackgroundTasks'];
export function createSaveEnvelope(engine){
 if(!engine?.src||!engine?.scenario)throw new Error('Cannot save an uninitialized Engine.');
 const state=cloneJsonValue(engine.state);for(const key of RUNTIME_KEYS)delete state[key];
 return{protocol:'vsr-save',saveVersion:SAVE_VERSION,scenario:cloneJsonValue(engine.scenario),state,chatState:cloneJsonValue(engine.chatState),savedAt:new Date().toISOString()};
}
export function normalizeSaveEnvelope(save){
 if(!save||typeof save!=='object'||Array.isArray(save)||!save.scenario||!save.state)throw new TypeError('Invalid VSR save envelope.');
 const version=save.saveVersion??1;if(version!==SAVE_VERSION)throw new Error(`Unsupported save version: ${version}`);
 return{...save,saveVersion:SAVE_VERSION};
}
