import {ConfigSystem} from './modules/Config.js';
import {LogicSystem} from './modules/Logic.js';
import {EffectSystem} from './modules/Effect.js';
import {ActionSystem} from './modules/Action.js';
import {SceneSystem} from './modules/Scene.js';
import {EntitySystem} from './modules/Entity.js';
import {ItemSystem} from './modules/Item.js';
import {ChatSystem} from './modules/Chat.js';
import {AutomationSystem} from './modules/Automation.js';
import {LoaderSystem} from './modules/Loader.js';
import {normalizeScenario} from './scenario/Scenario.js';
import {createEngineAPI} from '../protocol/index.js';
import {NotificationSystem} from './modules/Notification.js';
import {JsonProtocol,cloneJsonValue} from '../protocol/JsonProtocol.js';
import {verifyPassword} from './modules/password/verify.js';
import {PasswordSystem} from './modules/password/PasswordSystem.js';
import {TaskManager} from './runtime/TaskManager.js';
import {createSaveEnvelope,normalizeSaveEnvelope,validateCharacterVisitCounters,SAVE_VERSION} from './persistence/SaveState.js';

export class GameEngine {
 constructor({taskManager,engineId,authorizeCommand,requireAuthorization=false,clock}={}) {
  this.taskManager=taskManager||new TaskManager({},120,{clock});
  this.protocol=new JsonProtocol({engineId,protocolVersion:2,authorizeCommand,requireAuthorization,onCommandSuccess:({command,revisionBefore})=>{
   if(!['engine.init','scenario.inspect','snapshot.get'].includes(command)&&this.protocol.stateRevision===revisionBefore)this.commitState(`command:${command}`);
  }});
  this.notifications=new NotificationSystem({protocol:this.protocol,engineId:this.protocol.engineId,clock:clock||(()=>Date.now())});
  this.api=createEngineAPI(this);
  this.passwordSystem=new PasswordSystem({clock:clock||(()=>Date.now())});
  this.reset();
  this.registerProtocolCommands();
 }
 registerProtocolCommands(){
  this.protocol.registerCommand('engine.init',async payload=>{if(!payload.script||typeof payload.script!=='object')throw new TypeError('engine.init requires payload.script.');await this.init(payload.script,{enterScene:payload.enterScene!==false});return{initialized:!!this.src,sceneEntered:!!this.api.engine.state.get('sceneId'),entryScene:this.src?.meta?.entryScene??null};});
  this.protocol.registerCommand('scenario.inspect',payload=>{
   if(!payload.scenario||typeof payload.scenario!=='object'||Array.isArray(payload.scenario))throw new TypeError('scenario.inspect requires payload.scenario.');
   const scenario=normalizeScenario(payload.scenario);
   const meta=scenario.meta||{};
   const actionIds=new Set(Object.keys(scenario.actions||{}));
   for(const scene of Object.values(scenario.scenes||{})){
    for(const router of Object.values(scene?.routers||{})){
     const actions=router?.actions;
     if(Array.isArray(actions)){
      for(const action of actions){
       if(typeof action==='string')actionIds.add(action);
       else if(action&&typeof action==='object'&&action.id)actionIds.add(action.id);
      }
     }else if(actions&&typeof actions==='object'){
      for(const actionId of Object.keys(actions))actionIds.add(actionId);
     }
    }
   }
   return{
    metadata:{
     title:meta.title,subtitle:meta.subtitle??null,description:meta.desc,
     writer:meta.writer??null,studio:meta.studio??null,version:meta.version,
     language:meta.language,cover:meta.cover?{url:meta.cover.url,ratio:meta.cover.ratio??null}:null,
     tags:Array.isArray(meta.tags)?meta.tags:[],ageRating:meta.ageRating,
     difficulty:meta.difficulty??null,estimatedPlayTime:meta.estimatedPlayTime??null,
     entryScene:meta.entryScene,createdAt:meta.createdAt??null,updatedAt:meta.updatedAt??null,
     copyright:meta.copyright??null,license:meta.license??null,notes:meta.notes??null
    },
    summary:{
     sceneCount:Object.keys(scenario.scenes||{}).length,
     characterCount:Object.keys(scenario.characters||{}).length,
     actionCount:actionIds.size,
     itemCount:Object.keys(scenario.itemInfo||{}).length,
     chatCount:Object.keys(scenario.chat||{}).length
    },
    formatVersion:scenario.formatVersion
   };
  });
  this.protocol.registerCommand('snapshot.get',()=>this.protocol.createSnapshot(this));
  this.protocol.registerCommand('action.trigger',payload=>{if(typeof payload.actionId!=='string'||!payload.actionId)throw new TypeError('action.trigger requires actionId.');return this.handleAction(payload.actionId,payload.uniqueId||payload.actionId);});
  this.protocol.registerCommand('chat.open',payload=>{
   if(typeof payload.contactId!=='string'||!payload.contactId||typeof payload.chatId!=='string'||!payload.chatId)throw new TypeError('chat.open requires contactId and chatId.');
   const runtimeState=this.api.engine.state;
   const characters=runtimeState.getRuntimeSnapshot('characters')||{};
   const contact=characters[payload.contactId];
   const identityId=this._getCurrentIdentityKey?.()||runtimeState.get('entryCharacter')||'player';
   const met=Array.isArray(contact?.met)&&contact.met.some(entry=>String(entry).split(':')[0]===identityId);
   const present=!!contact&&contact.place?.scene_id===runtimeState.get('sceneId');
   if(!contact||payload.contactId===identityId||(!met&&!present))throw new Error('Chat thread is not available for this contact.');
   const thread=this.getThreads(payload.contactId).find(item=>item.id===payload.chatId);
   if(!thread)throw new Error('Chat thread is not available for this contact.');
   if(this.chatState?.active&&this.chatState.id===payload.chatId)return{opened:true,alreadyActive:true,contactId:payload.contactId,chatId:payload.chatId};
   this.startChat(payload.chatId);
   return{opened:true,alreadyActive:false,contactId:payload.contactId,chatId:payload.chatId};
  });
  this.protocol.registerCommand('chat.next',()=>this.nextChat());
  this.protocol.registerCommand('chat.selectChoice',payload=>{if(!Number.isInteger(payload.index))throw new TypeError('chat.selectChoice requires index.');return this.selectChatChoice(payload.index);});
  this.protocol.registerCommand('inventory.toggleHand',payload=>{if(typeof payload.itemId!=='string'||!payload.itemId)throw new TypeError('inventory.toggleHand requires itemId.');return this.toggleHand(payload.itemId);});
  this.protocol.registerCommand('scene.enter',payload=>{if(typeof payload.sceneId!=='string'||!payload.sceneId)throw new TypeError('scene.enter requires sceneId.');return this.enterScene(payload.sceneId,payload.skipTransition===true);});
  this.protocol.registerCommand('password.submit',payload=>this.submitPassword(payload));
  this.protocol.registerCommand('action.markAsRead',payload=>{
   if(typeof payload.uniqueId!=='string'||!payload.uniqueId)throw new TypeError('action.markAsRead requires uniqueId.');
   return this.markAsRead(payload.uniqueId);
  });
  this.protocol.registerCommand('item.use',async payload=>{
   if(typeof payload.itemId!=='string'||!payload.itemId)throw new TypeError('item.use requires itemId.');
   return this.use(payload.itemId);
  });
  this.protocol.registerCommand('engine.pause',()=>{this.pauseBackgroundTasks();return{paused:true};});
  this.protocol.registerCommand('engine.resume',()=>{this.resumeBackgroundTasks();return{paused:false};});
  this.protocol.registerCommand('save.export',()=>({save:this.exportSave()}));
  this.protocol.registerCommand('save.restore',async payload=>{
   if(!payload.save||typeof payload.save!=='object'||Array.isArray(payload.save))throw new TypeError('save.restore requires payload.save.');
   return this.restoreSave(payload.save);
  });
  this.protocol.registerCommand('notification.read',payload=>{
   if(typeof payload.notificationId!=='string'||!payload.notificationId)throw new TypeError('notification.read requires notificationId.');
   return{updated:this.notifications.markRead(payload.notificationId)};
  });
  this.protocol.registerCommand('notification.dismiss',payload=>{
   if(typeof payload.notificationId!=='string'||!payload.notificationId)throw new TypeError('notification.dismiss requires notificationId.');
   return{updated:this.notifications.dismiss(payload.notificationId)};
  });
 }
 async submitPassword(payload={}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
   throw new TypeError('password.submit payload must be an object.');
  }
  const pending=this.pendingPasswordAction;
  if(!pending)throw new Error('No active password challenge.');
  if(payload.challengeId!==pending.challengeId)throw new Error('Password challenge ID mismatch or stale challenge.');
  if(pending.sceneId!==this.api.engine.state.get('sceneId')||pending.routerId!==this.api.engine.state.get('scene.activeRouterId', { id: pending.sceneId }))throw new Error('Password challenge is no longer active.');
  const action=this.getEffectiveActions(pending.sceneId,pending.routerId).find(item=>item.id===pending.actionId);
  if(!action||!action.set?.password)throw new Error('Password action no longer exists.');
  const config=this.src?.passwords?.[pending.type]?.[pending.passwordId];
  if(!config)throw new Error('Password definition not found in loaded scenario.');
  const inspected=this.passwordSystem.inspect(pending);
  if(!inspected.accepted) {
   if(inspected.reason==='expired') {
    this.clearPasswordExpiry(pending);
    if (this.passwordSystem.finish(pending,'expired')) {
     this.pendingPasswordAction=null;
     this.api.engine.state.set('session.passwordChallenge',null);
     return this.finishPasswordAction(action,pending.actionId,pending.uniqueId,'expired');
    }
   }
   if(inspected.reason==='invalid_deadline'||inspected.reason==='invalid_clock') {
    this.clearPasswordExpiry(pending);
    this.passwordSystem.finish(pending,'cancelled');
    this.pendingPasswordAction=null;
    this.api.engine.state.set('session.passwordChallenge',null);
    this.commitState('password.cancelled');
    return this.finishPasswordAction(action,pending.actionId,pending.uniqueId,'cancel');
   }
   throw new Error('Password challenge is not active.');
  }
  if(payload.cancel===true) {
   this.clearPasswordExpiry(pending);
   if (!this.passwordSystem.finish(pending,'cancelled')) throw new Error('Password challenge is no longer active.');
   this.pendingPasswordAction=null;
   this.api.engine.state.set('session.passwordChallenge',null);
   this.commitState('password.cancelled');
   return this.finishPasswordAction(action,pending.actionId,pending.uniqueId,'cancel');
  }
  if(!Object.prototype.hasOwnProperty.call(payload,'input'))throw new TypeError('password.submit requires raw input.');
  const valid=verifyPassword(pending.type,config,payload.input);
  if(valid) {
   this.clearPasswordExpiry(pending);
   if (!this.passwordSystem.finish(pending,'succeeded')) throw new Error('Password challenge is no longer active.');
   this.pendingPasswordAction=null;
   this.api.engine.state.set('session.passwordChallenge',null);
   return this.finishPasswordAction(action,pending.actionId,pending.uniqueId,true);
  }
  const attempt=this.passwordSystem.recordFailure(pending);
  if (!attempt.accepted) throw new Error('Password challenge is no longer active.');
  this.api.presentation.effects.shake(pending.uniqueId);
  if(!attempt.exhausted) {
   this.protocol?.publish?.('password.retry',{challengeId:pending.challengeId,countTest:pending.countTest,remainingAttempts:attempt.remainingAttempts});
   this.commitState('password.retry');
   return {success:false,retry:true,countTest:pending.countTest,remainingAttempts:attempt.remainingAttempts};
  }
  this.clearPasswordExpiry(pending);
  this.pendingPasswordAction=null;
  this.api.engine.state.set('session.passwordChallenge',null);
  return this.finishPasswordAction(action,pending.actionId,pending.uniqueId,'exhausted');
 }
 publishProtocolSnapshot(reason='state.changed'){return this.protocol?.publishSnapshot(this,reason)??null;}
 commitState(reason='state.changed'){return this.protocol?.commitState(this,reason)??null;}
 dispatchProtocolCommand(command,context={}){if(!this.protocol)throw new Error('VSR protocol is not initialized.');return this.protocol.dispatch(command,context);}
 reset(){
  this.clearEffectQueue?.('all');
  this.notifications?.reset();
  this.taskManager?.killAll?.();
  this.state={sceneId:'',scenes:{},routers:{},actions:{},global:{},characters:{},itemInfo:{},chats:{},chatHistory:{},executed:[],effect_overrides:{},prevRouter:null,map:{choices:{},blocks:{}},automations:{},faker:{active:false,targetId:null,backupPlayer:null},playerMoveHistory:[],sceneTree:{},config:{},originalEntryCharacter:'player',entryCharacter:'player'};
  this.runtime={effectQueue:{sync:[],async:[]},isSyncQueueRunning:false,isAsyncQueueRunning:false};
  this.src=null;this.scenario=null;this.pendingPasswordAction=null;
  this.chatState={active:false,blocking:false,id:null,blockId:null,index:0,triggerActionId:null,actionModified:false};
  this.timerState=null;
  this.taskSequence=0;this.currentStillTask=null;this.activeTimerTasks=[];this.characterVisitTokens=new Map();this.characterVisitSequence=0;this.characterStillTaskIds=new Map();this.characterTransitionQueues=new Map();this.isActionProcessing=false;this.isTransitioning=false;this.disposed=false;this.restoredTaskTimers={};this.restoredPausedTasks=[];
 }
 async init(script,{enterScene=true}={}){
  const loaded=LoaderSystem.loadScript(script,this.api);
  if(!loaded)throw new Error('Scenario loading failed.');
  const sourceCopy=cloneJsonValue(loaded.scenario);
  this.reset();
  this.scenario=sourceCopy;this.src=loaded.src;this.state=loaded.state;
  const entry=this.src.meta.entryScene;
  if(!this.api.engine.state.getRuntimeSnapshot('scenes.[id]', { id: entry }))throw new Error(`Entry scene '${entry}' does not exist.`);
  if(enterScene){
   await this.enterScene(entry);
   this.api.engine.state.update('playerMoveHistory', history => [...(history || []), entry]);
  }
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
  if (!challenge || challenge.deadlineAt === null || challenge.deadlineAt === undefined) return null;
  const taskId = `password_${challenge.challengeId}`;
  const remaining = challenge.deadlineAt - this.passwordSystem.clock();
  return this.scheduleDelay(Math.max(1, remaining), async () => {
   if (this.pendingPasswordAction?.challengeId !== challenge.challengeId) return;
   const activeRouterId = this.api.engine.state.get('scene.activeRouterId', { id: challenge.sceneId });
   if (this.api.engine.state.get('sceneId') !== challenge.sceneId || activeRouterId !== challenge.routerId) {
    this.passwordSystem.finish(challenge, 'cancelled');
    this.pendingPasswordAction = null;
    this.api.engine.state.set('session.passwordChallenge', null);
    this.commitState('password.cancelled');
    return;
   }
   const inspected = this.passwordSystem.inspect(challenge);
   if (inspected.accepted) {
    // Timers can fire early under clock adjustments or scheduler jitter.
    // Re-arm against the absolute deadline instead of losing the expiry.
    this.schedulePasswordExpiry(challenge, action);
    return;
   }
   if (inspected.reason === 'expired') {
    if (!this.passwordSystem.finish(challenge, 'expired')) return;
    this.pendingPasswordAction = null;
    this.api.engine.state.set('session.passwordChallenge', null);
    await this.finishPasswordAction(action, challenge.actionId, challenge.uniqueId, 'expired');
    return;
   }
   this.passwordSystem.finish(challenge, 'cancelled');
   this.pendingPasswordAction = null;
   this.api.engine.state.set('session.passwordChallenge', null);
   this.commitState('password.cancelled');
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
  validateCharacterVisitCounters(restored.characters,normalized.state.characters);
  const originalEntryCharacter=restored.originalEntryCharacter||normalized.state.originalEntryCharacter||'player';
  const currentEntryCharacter=restored.entryCharacter||originalEntryCharacter;
  if(typeof originalEntryCharacter!=='string'||!originalEntryCharacter.trim()||typeof currentEntryCharacter!=='string'||!currentEntryCharacter.trim()) {
   throw new TypeError('Save player identity fields must be non-empty character IDs.');
  }
  if(!Object.prototype.hasOwnProperty.call(restored.characters,originalEntryCharacter)) {
   throw new TypeError(`Save original entry character "${originalEntryCharacter}" does not exist.`);
  }
  const activeIdentity=restored.faker?.active&&restored.faker?.targetId
   ?restored.faker.targetId
   :currentEntryCharacter;
  if(!Object.prototype.hasOwnProperty.call(restored.characters,currentEntryCharacter)||
     !Object.prototype.hasOwnProperty.call(restored.characters,activeIdentity)) {
   throw new TypeError(`Save current identity "${activeIdentity}" does not exist.`);
  }
  restored.originalEntryCharacter=originalEntryCharacter;
  restored.entryCharacter=currentEntryCharacter;
  this.reset();
  this.scenario=cloneJsonValue(normalized.scenario);
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
  if (!challenge) {
   this.api.engine.state.set('session.passwordChallenge', null);
   return;
  }
  const validChallenge =
   typeof challenge.challengeId === 'string' && challenge.challengeId.length > 0 &&
   typeof challenge.actionId === 'string' && typeof challenge.uniqueId === 'string' &&
   typeof challenge.sceneId === 'string' && typeof challenge.routerId === 'string' &&
   typeof challenge.type === 'string' && typeof challenge.passwordId === 'string' &&
   challenge.status === 'active' &&
   Number.isFinite(challenge.startedAt) &&
   Number.isInteger(challenge.countTest) && challenge.countTest >= 0 &&
   Number.isInteger(challenge.retryMax) && challenge.retryMax >= 0 &&
   (challenge.retryMax === 0 || challenge.countTest < challenge.retryMax) &&
   (challenge.deadlineAt === null || Number.isFinite(challenge.deadlineAt));
  const action = validChallenge
   ? this.getEffectiveActions(challenge.sceneId, challenge.routerId).find(item => item.id === challenge.actionId)
   : null;
  const config = validChallenge ? this.src?.passwords?.[challenge.type]?.[challenge.passwordId] : null;
  const activeRouterId = validChallenge
   ? this.api.engine.state.get('scene.activeRouterId', { id: challenge.sceneId })
   : null;
  const expectedReference = validChallenge ? `${challenge.type}:${challenge.passwordId}` : null;
  if (!validChallenge || !action?.set?.password || action.set.password !== expectedReference ||
      !config || this.api.engine.state.get('sceneId') !== challenge.sceneId ||
      activeRouterId !== challenge.routerId) {
   this.pendingPasswordAction = null;
   this.api.engine.state.set('session.passwordChallenge', null);
   return;
  }
  this.api.engine.state.set('session.passwordChallenge', challenge);
  this.schedulePasswordExpiry(challenge, action);
 }
 rehydrateBackgroundTasks(){
  const timers=this.restoredTaskTimers||{};
  for(const charId of Object.keys(this.api.engine.state.getRuntimeSnapshot('characters') || {})) {
   const remaining=timers[`move_char_${charId}`];
   const taskId=`move_char_${charId}`;
   this.scheduleCharacterMove(charId,Number.isFinite(remaining)?remaining:null);
   if(this.restoredPausedTasks.includes(taskId))this.taskManager.pause(taskId);
   const stillRemaining=Object.entries(timers).find(([name])=>name.startsWith(`move_still_${charId}_`));
   if(stillRemaining) {
    const visitToken=this.getCharacterVisitToken(charId);
    this.scheduleCharacterStill(charId,visitToken,stillRemaining[1]);
    const restoredStillTaskId=this.characterStillTaskIds?.get(charId);
    if(restoredStillTaskId&&this.restoredPausedTasks.includes(stillRemaining[0]))this.taskManager.pause(restoredStillTaskId);
   }
  }
  for(const[id,state]of Object.entries(this.api.engine.state.getRuntimeSnapshot('automations') || {})) {
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
 dispose(){this.clearEffectQueue('all');this.notifications?.reset();this.taskManager?.killAll?.();this.protocol?.publish('engine.disposed',{});this.disposed=true;}
 forceUnlock(){this.isTransitioning=false;this.isActionProcessing=false;this.runtime.isSyncQueueRunning=false;this.runtime.isAsyncQueueRunning=false;this.clearEffectQueue('all');this.api.presentation.navigation.setBlocking(false);}
 pushToEffectQueue(effectiveList,context,isAsync=false){
  return new Promise(resolve=>{
   const item={effectiveList,context,isAsync,resolve};
   const queue=isAsync?this.runtime.effectQueue.async:this.runtime.effectQueue.sync;queue.push(item);
   if(isAsync&&!this.runtime.isAsyncQueueRunning)this.runAsyncQueue();
   if(!isAsync&&!this.runtime.isSyncQueueRunning)this.runSyncQueue();
  });
 }
 async runSyncQueue(){
  this.runtime.isSyncQueueRunning=true;
  try{
   while(this.runtime.effectQueue.sync.length){
    const item=this.runtime.effectQueue.sync.shift();this.isActionProcessing=true;
    this.api.presentation.navigation.setBlocking(true);
    try{await this.processRunnables(item.effectiveList,item.context,false,true);}catch(error){console.error('EffectQueue sync error:',error);}
    item.resolve?.({cancelled:false});
   }
  }finally{
   this.runtime.isSyncQueueRunning=false;this.isActionProcessing=false;
   this.api.presentation.navigation.setBlocking(false);
  }
 }
 async runAsyncQueue(){
  this.runtime.isAsyncQueueRunning=true;
  try{
   while(this.runtime.effectQueue.async.length){
    const item=this.runtime.effectQueue.async.shift();
    try{await this.processRunnables(item.effectiveList,item.context,true,true);item.resolve?.({cancelled:false});}
    catch(error){console.error('EffectQueue async error:',error);item.resolve?.({cancelled:false,error});}
   }
  }finally{this.runtime.isAsyncQueueRunning=false;}
 }
 clearEffectQueue(queueType='all'){
  if(!this.runtime?.effectQueue)return;
  const cancel=queue=>{for(const item of queue.splice(0))item.resolve?.({cancelled:true});};
  if(queueType==='all'||queueType==='sync')cancel(this.runtime.effectQueue.sync);
  if(queueType==='all'||queueType==='async')cancel(this.runtime.effectQueue.async);
 }
 pauseBackgroundTasks(){
  for(const id of Object.keys(this.api.engine.state.getRuntimeSnapshot('automations') || {}))if(this.api.engine.state.get('automation.active', { id }))this.taskManager.pause(`auto_${id}`);
  for(const id of Object.keys(this.api.engine.state.getRuntimeSnapshot('characters') || {}))this.taskManager.pause(`move_char_${id}`);
  for(const id of Object.keys(this.taskManager.plan || {}))if(id.startsWith('move_still_'))this.taskManager.pause(id);
 }
 resumeBackgroundTasks(){
  for(const id of Object.keys(this.api.engine.state.getRuntimeSnapshot('automations') || {}))if(this.api.engine.state.get('automation.active', { id }))this.taskManager.resume(`auto_${id}`);
  for(const id of Object.keys(this.api.engine.state.getRuntimeSnapshot('characters') || {}))this.taskManager.resume(`move_char_${id}`);
  for(const id of Object.keys(this.taskManager.plan || {}))if(id.startsWith('move_still_'))this.taskManager.resume(id);
 }
}
Object.assign(GameEngine.prototype,ConfigSystem,LogicSystem,EffectSystem,ActionSystem,SceneSystem,EntitySystem,ItemSystem,ChatSystem,AutomationSystem);
