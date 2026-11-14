const RUNTIME_ONLY_STATE_KEYS=new Set(['effectQueue','isSyncQueueRunning','isAsyncQueueRunning','pausedBackgroundTasks']);
export function cloneJsonValue(value,seen=new WeakSet()){
 if(value===null||typeof value==='string'||typeof value==='boolean')return value;
 if(typeof value==='number'){if(!Number.isFinite(value))throw new TypeError('Protocol JSON cannot contain non-finite numbers.');return value;}
 if(value===undefined||typeof value==='function'||typeof value==='symbol')return undefined;
 if(typeof value!=='object')throw new TypeError(`Unsupported protocol value: ${typeof value}`);
 if(seen.has(value))throw new TypeError('Protocol JSON cannot contain circular references.');seen.add(value);
 let out;if(Array.isArray(value))out=value.map(v=>{const c=cloneJsonValue(v,seen);return c===undefined?null:c;});
 else if(value instanceof Date)out=value.toISOString();
 else{out={};for(const k of Object.keys(value)){const c=cloneJsonValue(value[k],seen);if(c!==undefined)out[k]=c;}}
 seen.delete(value);return out;
}
const id=(p,n)=>`${p}_${Date.now().toString(36)}_${n.toString(36)}`;
export class JsonProtocol{
 constructor({engineId=`vsr-${Math.random().toString(36).slice(2,10)}`,protocolVersion=2,maxEvents=1000,maxRememberedCommands=500,authorizeCommand=null,onCommandSuccess=null}={}){
  Object.assign(this,{engineId,protocolVersion,maxEvents,maxRememberedCommands,authorizeCommand,onCommandSuccess});
  this.stateRevision=0;this.revision=0;this.eventSequence=0;this.commandSequence=0;this.listeners=new Set();this.eventLog=[];this.commandHandlers=new Map();this.commandResults=new Map();this.dispatchQueue=Promise.resolve();
 }
 subscribe(fn){if(typeof fn!=='function')throw new TypeError('Protocol listener must be a function.');this.listeners.add(fn);return()=>this.listeners.delete(fn);}
 registerCommand(name,fn){if(typeof name!=='string'||!name.trim()||typeof fn!=='function')throw new TypeError('Invalid command registration.');this.commandHandlers.set(name,fn);return()=>this.commandHandlers.delete(name);}
 createSnapshot(engine,{includeSource=false}={}){
  if(!engine?.state)throw new Error('Engine state is not initialized.');
  const state={};for(const k of Object.keys(engine.state)){if(RUNTIME_ONLY_STATE_KEYS.has(k))continue;const v=cloneJsonValue(engine.state[k]);if(v!==undefined)state[k]=v;}
  const snapshot={protocol:'vsr',protocolVersion:this.protocolVersion,type:'snapshot',engineId:this.engineId,revision:this.stateRevision,stateRevision:this.stateRevision,eventSequence:this.eventSequence,createdAt:new Date().toISOString(),game:{initialized:!!engine.src,sceneId:engine.state.sceneId||null,routerId:engine.state.sceneId?(engine.state.scenes?.[engine.state.sceneId]?.activeRouterId||null):null},state};
  if(includeSource&&engine.src)snapshot.source=cloneJsonValue(engine.src);return snapshot;
 }
 publish(type,payload={}){
  if(typeof type!=='string'||!type.trim()||!payload||typeof payload!=='object'||Array.isArray(payload))throw new TypeError('Invalid event envelope.');
  const sequence=++this.eventSequence,safe=cloneJsonValue(payload);
  const event={protocol:'vsr',protocolVersion:this.protocolVersion,type:'event',engineId:this.engineId,eventId:id('evt',sequence),sequence,revision:this.stateRevision,stateRevision:this.stateRevision,timestamp:new Date().toISOString(),event:type,payload:safe??{}};
  this.eventLog.push(event);if(this.eventLog.length>this.maxEvents)this.eventLog.shift();
  for(const listener of this.listeners){try{listener(cloneJsonValue(event));}catch(error){console.error('[VSR Protocol] Event listener failed:',error);}}
  return cloneJsonValue(event);
 }
 commitState(engine,reason='state.changed'){this.stateRevision++;this.revision=this.stateRevision;const snapshot=this.createSnapshot(engine);this.publish('state.snapshot',{reason,snapshot});return cloneJsonValue(snapshot);}
 publishSnapshot(engine,reason='state.changed'){return this.commitState(engine,reason);}
 getEventsSince(rev=0){if(!Number.isInteger(rev)||rev<0)throw new TypeError('stateRevision must be non-negative.');const first=this.eventLog[0],gap=!!first&&first.stateRevision>rev+1;return{gap,currentRevision:this.stateRevision,currentStateRevision:this.stateRevision,events:gap?[]:this.eventLog.filter(e=>e.stateRevision>rev).map(cloneJsonValue)};}
 getEventsAfter(seq=0){if(!Number.isInteger(seq)||seq<0)throw new TypeError('sequence must be non-negative.');const first=this.eventLog[0]?.sequence??this.eventSequence+1,gap=seq<first-1;return{gap,currentSequence:this.eventSequence,currentStateRevision:this.stateRevision,events:gap?[]:this.eventLog.filter(e=>e.sequence>seq).map(cloneJsonValue)};}
 #remember(key,ack){this.commandResults.set(key,ack);if(this.commandResults.size>this.maxRememberedCommands)this.commandResults.delete(this.commandResults.keys().next().value);return cloneJsonValue(ack);}
 dispatch(command,context={}){const run=this.dispatchQueue.then(()=>this.#dispatch(command,context));this.dispatchQueue=run.then(()=>undefined,()=>undefined);return run;}
 async #dispatch(command,context){
  if(!command||typeof command!=='object'||Array.isArray(command)||command.protocol!=='vsr'||command.protocolVersion!==this.protocolVersion||command.type!=='command'||typeof command.command!=='string')throw new TypeError('Invalid VSR command envelope.');
  if(typeof command.commandId!=='string'||!command.commandId.trim())throw new TypeError('commandId is required.');
  if(this.commandResults.has(command.commandId))return cloneJsonValue(this.commandResults.get(command.commandId));
  const expected=command.expectedStateRevision??command.expectedRevision;
  if(expected!==undefined&&(!Number.isInteger(expected)||expected<0))throw new TypeError('expectedStateRevision must be non-negative.');
  if(expected!==undefined&&expected!==this.stateRevision)return this.#remember(command.commandId,{protocol:'vsr',protocolVersion:this.protocolVersion,type:'ack',commandId:command.commandId,ok:false,error:{code:'REVISION_CONFLICT',expected,actual:this.stateRevision},revision:this.stateRevision,stateRevision:this.stateRevision});
  const handler=this.commandHandlers.get(command.command);
  if(!handler)return this.#remember(command.commandId,{protocol:'vsr',protocolVersion:this.protocolVersion,type:'ack',commandId:command.commandId,ok:false,error:{code:'UNKNOWN_COMMAND',command:command.command},revision:this.stateRevision,stateRevision:this.stateRevision});
  if(command.payload!==undefined&&(!command.payload||typeof command.payload!=='object'||Array.isArray(command.payload)))throw new TypeError('Command payload must be an object.');
  const payload=command.payload===undefined?{}:cloneJsonValue(command.payload);
  if(this.authorizeCommand&&!await this.authorizeCommand({command:command.command,payload,context}))return this.#remember(command.commandId,{protocol:'vsr',protocolVersion:this.protocolVersion,type:'ack',commandId:command.commandId,ok:false,error:{code:'FORBIDDEN'},revision:this.stateRevision,stateRevision:this.stateRevision});
  const revisionBefore=this.stateRevision;this.publish('command.accepted',{commandId:command.commandId,command:command.command});
  try{const result=await handler(payload,context);await this.onCommandSuccess?.({command:command.command,payload,context,revisionBefore});this.publish('command.completed',{commandId:command.commandId,command:command.command});return this.#remember(command.commandId,{protocol:'vsr',protocolVersion:this.protocolVersion,type:'ack',commandId:command.commandId,ok:true,revision:this.stateRevision,stateRevision:this.stateRevision,result:result===undefined?null:cloneJsonValue(result)});}
  catch(error){this.publish('command.failed',{commandId:command.commandId,command:command.command,code:error?.code||'COMMAND_FAILED',message:error?.message||String(error)});return this.#remember(command.commandId,{protocol:'vsr',protocolVersion:this.protocolVersion,type:'ack',commandId:command.commandId,ok:false,error:{code:error?.code||'COMMAND_FAILED',message:error?.message||String(error)},revision:this.stateRevision,stateRevision:this.stateRevision});}
 }
 createCommand(command,payload={}, {commandId,expectedRevision,expectedStateRevision}={}){
  if(typeof command!=='string'||!command.trim()||!payload||typeof payload!=='object'||Array.isArray(payload))throw new TypeError('Invalid command name or payload.');
  const expected=expectedStateRevision??expectedRevision;if(expected!==undefined&&(!Number.isInteger(expected)||expected<0))throw new TypeError('expectedStateRevision must be non-negative.');
  const out={protocol:'vsr',protocolVersion:this.protocolVersion,type:'command',commandId:commandId||id('cmd',++this.commandSequence),command,payload:cloneJsonValue(payload)};
  if(expected!==undefined)out.expectedStateRevision=expected;return out;
 }
}
