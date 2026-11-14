import {ConfigSystem} from './modules/Config.js';
import {LogicSystem} from './modules/Logic.js';
import {EffectSystem} from './modules/Effect.js?v=1.2.2';
import {ActionSystem} from './modules/Action.js?v=2.3.0';
import {SceneSystem} from './modules/Scene.js?v=1.4.0';
import {EntitySystem} from './modules/Entity.js?v=2.0.1';
import {ItemSystem} from './modules/Item.js?v=2.1.0';
import {ChatSystem} from './modules/Chat.js?v=3.1.6';
import {AutomationSystem} from './modules/Automation.js';
import {LoaderSystem} from './modules/Loader.js';
import {createEngineAPI} from '../api/index.js';
import {JsonProtocol,cloneJsonValue} from '../protocol/JsonProtocol.js';
import {verifyPassword} from './modules/password/verify.js';
import {PasswordSystem} from './modules/password/PasswordSystem.js';
import {TaskManager} from './runtime/TaskManager.js';
import {createSaveEnvelope,normalizeSaveEnvelope,SAVE_VERSION} from './persistence/SaveState.js';

export class GameEngine {
 constructor({taskManager,engineId,authorizeCommand,clock}={}) {
  this.taskManager=taskManager||new TaskManager({},120,{clock});
  this.protocol=new JsonProtocol({engineId,protocolVersion:2,authorizeCommand,onCommandSuccess:({command,revisionBefore})=>{
   if(command!=='engine.init'&&this.protocol.stateRevision===revisionBefore)this.commitState(`command:${command}`);
  }});
  this.api=createEngineAPI(this);
  this.passwordSystem=new PasswordSystem({clock:clock||(()=>Date.now())});
  this.reset();
  this.registerProtocolCommands();
 }
 registerProtocolCommands(){
  this.protocol.registerCommand('engine.init',async payload=>{if(!payload.script||typeof payload.script!=='object')throw new TypeError('engine.init requires payload.script.');await this.init(payload.script);return{initialized:!!this.src};});
  this.protocol.registerCommand('action.trigger',payload=>{if(typeof payload.actionId!=='string'||!payload.actionId)throw new TypeError('action.trigger requires actionId.');return this.handleAction(payload.actionId,payload.uniqueId||payload.actionId);});
  this.protocol.registerCommand('chat.next',()=>this.nextChat());
  this.protocol.registerCommand('chat.selectChoice',payload=>{if(!Number.isInteger(payload.index))throw new TypeError('chat.selectChoice requires index.');return this.selectChatChoice(payload.index);});
  this.protocol.registerCommand('inventory.toggleHand',payload=>{if(typeof payload.itemId!=='string'||!payload.itemId)throw new TypeError('inventory.toggleHand requires itemId.');return this.toggleHand(payload.itemId);});
  this.protocol.registerCommand('scene.enter',payload=>{if(typeof payload.sceneId!=='string'||!payload.sceneId)throw new TypeError('scene.enter requires sceneId.');return this.enterScene(payload.sceneId,payload.skipTransition===true);});
  this.protocol.registerCommand('password.submit',payload=>this.submitPassword(payload));
 }
 submitPassword(payload={}) {
  const pending=this.pendingPasswordAction;
  if(!pending)throw new Error('No active password challenge.');
  if(payload.challengeId!==pending.challengeId)throw new Error('Password challenge ID mismatch or stale challenge.');
  if(pending.sceneId!==this.state.sceneId||pending.routerId!==this.state.scenes?.[pending.sceneId]?.activeRouterId)throw new Error('Password challenge is no longer active.');
  const action=this.getEffectiveActions(pending.sceneId,pending.routerId).find(item=>item.id===pending.actionId);
  if(!action||!action.set?.password)throw new Error('Password action no longer exists.');
  const config=this.src?.passwords?.[pending.type]?.[pending.passwordId];
  if(!config)throw new Error('Password definition not found in loaded scenario.');
  const inspected=this.passwordSystem.inspect(pending);
  if(!inspected.accepted) {
   if(inspected.reason==='expired') {
    this.clearPasswordExpiry(pending);
    this.passwordSystem.finish(pending,'expired');
    this.pendingPasswordAction=null;
    this.api.engine.state.set('session.passwordChallenge',null);
    this.protocol?.publish?.('password.expired',{challengeId:pending.challengeId});
    return this.finishPasswordAction(action,pending.actionId,pending.uniqueId,'expired');
   }
   throw new Error('Password challenge is not active.');
  }
  if(payload.cancel===true) {
   this.clearPasswordExpiry(pending);
   this.passwordSystem.finish(pending,'cancelled');
   this.pendingPasswordAction=null;
   this.api.engine.state.set('session.passwordChallenge',null);
   return this.finishPasswordAction(action,pending.actionId,pending.uniqueId,'cancel');
  }
  if(!Object.prototype.hasOwnProperty.call(payload,'input'))throw new TypeError('password.submit requires raw input.');
  const valid=verifyPassword(pending.type,config,payload.input);
  if(valid) {
   this.clearPasswordExpiry(pending);
   this.passwordSystem.finish(pending,'succeeded');
   this.pendingPasswordAction=null;
   this.api.engine.state.set('session.passwordChallenge',null);
   return this.finishPasswordAction(action,pending.actionId,pending.uniqueId,true);
  }
  const attempt=this.passwordSystem.recordFailure(pending);
  this.api.presentation.effects.shake(pending.uniqueId);
  if(!attempt.exhausted) {
   this.protocol?.publish?.('password.retry',{challengeId:pending.challengeId,countTest:pending.countTest,remainingAttempts:attempt.remainingAttempts});
   this.commitState('password.retry');
   return {success:false,retry:true,countTest:pending.countTest,remainingAttempts:attempt.remainingAttempts};
  }
  this.clearPasswordExpiry(pending);
  this.passwordSystem.finish(pending,'exhausted');
  this.pendingPasswordAction=null;
  this.api.engine.state.set('session.passwordChallenge',null);
  return this.finishPasswordAction(action,pending.actionId,pending.uniqueId,'exhausted');
 }
 publishProtocolSnapshot(reason='state.changed'){return this.protocol?.publishSnapshot(this,reason)??null;}
 commitState(reason='state.changed'){return this.protocol?.commitState(this,reason)??null;}
 dispatchProtocolCommand(command,context={}){if(!this.protocol)throw new Error('VSR protocol is not initialized.');return this.protocol.dispatch(command,context);}
 reset(){
  this.clearEffectQueue?.('all');
  this.taskManager?.killAll?.();
  this.state={sceneId:'',scenes:{},routers:{},actions:{},global:{},characters:{},itemInfo:{},chats:{},chatHistory:{},executed:[],effect_overrides:{},prevRouter:null,map:{choices:{},blocks:{}},automations:{},faker:{active:false,targetId:null,backupPlayer:null},playerMoveHistory:[],sceneTree:{},config:{}};
  this.runtime={effectQueue:{sync:[],async:[]},isSyncQueueRunning:false,isAsyncQueueRunning:false};
  this.src=null;this.scenario=null;this.pendingPasswordAction=null;
  this.chatState={active:false,blocking:false,id:null,blockId:null,index:0,triggerActionId:null,actionModified:false};
  this.taskSequence=0;this.currentStillTask=null;this.activeTimerTasks=[];this.isActionProcessing=false;this.isTransitioning=false;this.disposed=false;this.restoredTaskTimers={};this.restoredPausedTasks=[];
 }
 async init(script){
  const loaded=LoaderSystem.loadScript(script,this.api);
  if(!loaded)throw new Error('Scenario loading failed.');
  const sourceCopy=cloneJsonValue(script);
  this.reset();
  this.scenario=sourceCopy;this.src=loaded.src;this.state=loaded.state;
  this.initCharactersMoving();
  const entry=this.src.meta?.entryScene||Object.keys(this.state.scenes)[0];
  if(!this.state.scenes[entry])throw new Error(`Entry scene '${entry}' does not exist.`);
  await this.enterScene(entry);
  this.state.playerMoveHistory.push(entry);
  this.commitState('engine.initialized');
  return this;
 }
 scheduleDelay(ms,callback,taskId=null){
  const id=taskId||`engine_delay_${++this.taskSequence}`;
  this.taskManager.kill(id);
  this.taskManager.addNew(id,{time:Math.max(1,Number(ms)||1),mode:'timeout',count:1,exe:callback});
  this.taskManager.operator(id,'enabled');return id;
 }
 schedulePasswordExpiry(challenge, action) {
  if (!challenge?.deadlineAt) return null;
  const taskId = `password_${challenge.challengeId}`;
  const remaining = challenge.deadlineAt - this.passwordSystem.clock();
  return this.scheduleDelay(Math.max(1, remaining), async () => {
   if (this.pendingPasswordAction?.challengeId !== challenge.challengeId) return;
   const activeScene = this.state.scenes?.[challenge.sceneId];
   if (this.state.sceneId !== challenge.sceneId || activeScene?.activeRouterId !== challenge.routerId) {
    this.passwordSystem.finish(challenge, 'cancelled');
    this.pendingPasswordAction = null;
    this.api.engine.state.set('session.passwordChallenge', null);
    return;
   }
   const inspected = this.passwordSystem.inspect(challenge);
   if (inspected.accepted) return;
   this.passwordSystem.finish(challenge, 'expired');
   this.pendingPasswordAction = null;
   this.api.engine.state.set('session.passwordChallenge', null);
   this.protocol?.publish?.('password.expired', { challengeId: challenge.challengeId });
   await this.finishPasswordAction(action, challenge.actionId, challenge.uniqueId, 'expired');
  }, taskId);
 }
 clearPasswordExpiry(challenge) {
  if (challenge?.challengeId) this.taskManager?.kill?.(`password_${challenge.challengeId}`);
 }
 delay(ms){return new Promise(resolve=>this.scheduleDelay(ms,resolve));}
 exportSave(){return createSaveEnvelope(this);}
 async restoreSave(input){
  const save=normalizeSaveEnvelope(input);
  const normalized=LoaderSystem.loadScript(save.scenario,this.api);
  if(!normalized)throw new TypeError('Save scenario is invalid.');
  const restored=cloneJsonValue(save.state);
  const requiredObjects=['scenes','characters','routers','actions','global','automations','chats','chatHistory'];
  if(requiredObjects.some(key=>!restored[key]||typeof restored[key]!=='object'||Array.isArray(restored[key]))||
     typeof restored.sceneId!=='string'||!restored.sceneId||
     !restored.scenes[restored.sceneId]||!normalized.state.scenes?.[restored.sceneId]) {
   throw new TypeError('Save state does not match scenario structure.');
  }
  for(const sceneId of Object.keys(restored.scenes)) {
   if(!normalized.state.scenes?.[sceneId])throw new TypeError(`Save contains unknown scene "${sceneId}".`);
  }
  this.reset();
  this.scenario=cloneJsonValue(save.scenario);
  this.src=normalized.src;
  this.state=restored;
  this.chatState={...this.chatState,...(cloneJsonValue(save.chatState)||{})};
  this.pendingPasswordAction=cloneJsonValue(save.pendingPasswordAction)||null;
  this.restoredTaskTimers=cloneJsonValue(save.taskRemainingMs)||{};
  this.restoredPausedTasks=cloneJsonValue(save.pausedTasks)||[];
  this.rehydrateBackgroundTasks();
  this.rehydratePasswordChallenge();
  this.commitState('save.restored');
  return{restored:true,saveVersion:SAVE_VERSION};
 }
 rehydratePasswordChallenge() {
  const challenge = this.pendingPasswordAction;
  if (!challenge || challenge.status !== 'active') return;
  const action = this.getEffectiveActions(challenge.sceneId, challenge.routerId)
   .find(item => item.id === challenge.actionId);
  const config = this.src?.passwords?.[challenge.type]?.[challenge.passwordId];
  const scene = this.state.scenes?.[challenge.sceneId];
  if (!action?.set?.password || !config || this.state.sceneId !== challenge.sceneId ||
      scene?.activeRouterId !== challenge.routerId) {
   this.pendingPasswordAction = null;
   this.api.engine.state.set('session.passwordChallenge', null);
   return;
  }
  this.schedulePasswordExpiry(challenge, action);
 }
 rehydrateBackgroundTasks(){
  const timers=this.restoredTaskTimers||{};
  for(const charId of Object.keys(this.state.characters||{})) {
   const remaining=timers[`move_char_${charId}`];
   const taskId=`move_char_${charId}`;
   this.scheduleCharacterMove(charId,Number.isFinite(remaining)?remaining:null);
   if(this.restoredPausedTasks.includes(taskId))this.taskManager.pause(taskId);
  }
  for(const[id,state]of Object.entries(this.state.automations||{})) {
   if(!state?.active)continue;
   const taskId=`auto_${id}`;
   const remaining=timers[taskId];
   if(Number.isFinite(remaining))this.scheduleDelay(remaining,()=>this.processAutomationStep(id),taskId);
   else this.processAutomationStep(id);
   if(this.restoredPausedTasks.includes(taskId))this.taskManager.pause(taskId);
  }
  this.restoredTaskTimers={};
  this.restoredPausedTasks=[];
 }
 dispose(){this.clearEffectQueue('all');this.taskManager?.killAll?.();this.protocol?.publish('engine.disposed',{});this.disposed=true;}
 forceUnlock(){this.isTransitioning=false;this.isActionProcessing=false;this.runtime.isSyncQueueRunning=false;this.runtime.isAsyncQueueRunning=false;this.clearEffectQueue('all');this.api.presentation.navigation.setBlocking(false);}
 pushToEffectQueue(effectiveList,context,isAsync=false){
  return new Promise(resolve=>{
   const item={effectiveList,context,isAsync,resolve};
   const queue=isAsync?this.runtime.effectQueue.async:this.state.effectQueue.sync;queue.push(item);
   if(isAsync&&!this.state.isAsyncQueueRunning)this.runAsyncQueue();
   if(!isAsync&&!this.state.isSyncQueueRunning)this.runSyncQueue();
  });
 }
 async runSyncQueue(){
  this.state.isSyncQueueRunning=true;
  try{
   while(this.state.effectQueue.sync.length){
    const item=this.state.effectQueue.sync.shift();this.isActionProcessing=true;
    this.api.presentation.navigation.setBlocking(true);
    try{await this.processRunnables(item.effectiveList,item.context,false,true);}catch(error){console.error('EffectQueue sync error:',error);}
    item.resolve?.({cancelled:false});
   }
  }finally{
   this.state.isSyncQueueRunning=false;this.isActionProcessing=false;
   this.api.presentation.navigation.setBlocking(false);
  }
 }
 async runAsyncQueue(){
  this.state.isAsyncQueueRunning=true;
  try{
   while(this.state.effectQueue.async.length){
    const item=this.state.effectQueue.async.shift();
    try{await this.processRunnables(item.effectiveList,item.context,true,true);}catch(error){console.error('EffectQueue async error:',error);}
    item.resolve?.({cancelled:false});
   }
  }finally{this.state.isAsyncQueueRunning=false;}
 }
 clearEffectQueue(queueType='all'){
  if(!this.state?.effectQueue)return;
  const cancel=queue=>{for(const item of queue.splice(0))item.resolve?.({cancelled:true});};
  if(queueType==='all'||queueType==='sync')cancel(this.state.effectQueue.sync);
  if(queueType==='all'||queueType==='async')cancel(this.state.effectQueue.async);
 }
 pauseBackgroundTasks(){
  for(const id of Object.keys(this.state.automations||{}))if(this.state.automations[id]?.active)this.taskManager.pause(`auto_${id}`);
  for(const id of Object.keys(this.state.characters||{}))this.taskManager.pause(`move_char_${id}`);
 }
 resumeBackgroundTasks(){
  for(const id of Object.keys(this.state.automations||{}))if(this.state.automations[id]?.active)this.taskManager.resume(`auto_${id}`);
  for(const id of Object.keys(this.state.characters||{}))this.taskManager.resume(`move_char_${id}`);
 }
}
Object.assign(GameEngine.prototype,ConfigSystem,LogicSystem,EffectSystem,ActionSystem,SceneSystem,EntitySystem,ItemSystem,ChatSystem,AutomationSystem);
