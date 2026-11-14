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
import {JsonProtocol,cloneJsonValue} from '../core/protocol/JsonProtocol.js';
import {verifyPassword} from '../password/verify.js';
import {TaskManager} from '../plugin/taskmanager.js';
import {createSaveEnvelope,normalizeSaveEnvelope} from './persistence/SaveState.js';

export class GameEngine {
 constructor({taskManager,engineId,authorizeCommand,clock}={}) {
  this.taskManager=taskManager||new TaskManager({},120,{clock});
  this.protocol=new JsonProtocol({engineId,protocolVersion:2,authorizeCommand,onCommandSuccess:({command,revisionBefore})=>{
   if(command!=='engine.init'&&this.protocol.stateRevision===revisionBefore)this.commitState(`command:${command}`);
  }});
  this.api=createEngineAPI(this);
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
 submitPassword(payload={}){
  if(typeof payload.actionId!=='string'||!payload.actionId)throw new TypeError('password.submit requires actionId.');
  const pending=this.pendingPasswordAction;
  if(!pending||pending.actionId!==payload.actionId)throw new Error('No matching pending password challenge.');
  if(pending.sceneId!==this.state.sceneId||pending.routerId!==this.state.scenes?.[this.state.sceneId]?.activeRouterId)throw new Error('Password challenge is no longer active.');
  const uniqueId=payload.uniqueId||pending.uniqueId;
  if(uniqueId!==pending.uniqueId)throw new Error('Password challenge identifier mismatch.');
  const sceneId=pending.sceneId,routerId=pending.routerId;
  const action=this.getEffectiveActions(sceneId,routerId).find(item=>item.id===pending.actionId);
  if(!action||!action.set?.password)throw new Error('Password action no longer exists.');
  if(payload.cancel===true){this.pendingPasswordAction=null;return this.finishPasswordAction(action,pending.actionId,uniqueId,'cancel');}
  if(!Object.prototype.hasOwnProperty.call(payload,'input'))throw new TypeError('password.submit requires raw input.');
  const [type,id]=String(action.set.password).split(':');
  const config=this.src?.passwords?.[type]?.[id];
  if(!type||!id||!config)throw new Error('Password definition not found in loaded scenario.');
  this.pendingPasswordAction=null;
  return this.finishPasswordAction(action,pending.actionId,uniqueId,verifyPassword(type,config,payload.input));
 }
 publishProtocolSnapshot(reason='state.changed'){return this.protocol?.publishSnapshot(this,reason)??null;}
 commitState(reason='state.changed'){return this.protocol?.commitState(this,reason)??null;}
 dispatchProtocolCommand(command,context={}){if(!this.protocol)throw new Error('VSR protocol is not initialized.');return this.protocol.dispatch(command,context);}
 reset(){
  this.clearEffectQueue?.('all');
  this.taskManager?.killAll?.();
  this.state={sceneId:'',scenes:{},routers:{},actions:{},global:{},characters:{},itemInfo:{},chats:{},chatHistory:{},executed:[],effect_overrides:{},effectQueue:{sync:[],async:[]},isSyncQueueRunning:false,isAsyncQueueRunning:false,pausedBackgroundTasks:{automations:{},characters:{}},prevRouter:null,map:{choices:{},blocks:{}},automations:{},faker:{active:false,targetId:null,backupPlayer:null},playerMoveHistory:[],sceneTree:{},config:{}};
  this.src=null;this.scenario=null;this.pendingPasswordAction=null;
  this.chatState={active:false,blocking:false,id:null,blockId:null,index:0,triggerActionId:null,actionModified:false};
  this.taskSequence=0;this.currentStillTask=null;this.activeTimerTasks=[];this.isActionProcessing=false;this.isTransitioning=false;this.disposed=false;
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
 delay(ms){return new Promise(resolve=>this.scheduleDelay(ms,resolve));}
 exportSave(){return createSaveEnvelope(this);}
 async restoreSave(input){
  const save=normalizeSaveEnvelope(input);
  const normalized=LoaderSystem.loadScript(save.scenario,this.api);
  if(!normalized)throw new TypeError('Save scenario is invalid.');
  const restored=cloneJsonValue(save.state);
  if(!restored.scenes||!restored.characters||!restored.sceneId||!restored.scenes[restored.sceneId])throw new TypeError('Save state does not match scenario.');
  await this.init(save.scenario);
  restored.effectQueue={sync:[],async:[]};restored.isSyncQueueRunning=false;restored.isAsyncQueueRunning=false;restored.pausedBackgroundTasks={automations:{},characters:{}};
  this.state=restored;this.chatState={...this.chatState,...(cloneJsonValue(save.chatState)||{})};
  this.taskManager.killAll();this.rehydrateBackgroundTasks();this.commitState('save.restored');
  return{restored:true,saveVersion:1};
 }
 rehydrateBackgroundTasks(){
  this.initCharactersMoving();
  for(const[id,state]of Object.entries(this.state.automations||{}))if(state?.active)this.processAutomationStep(id);
 }
 dispose(){this.clearEffectQueue('all');this.taskManager?.killAll?.();this.protocol?.publish('engine.disposed',{});this.disposed=true;}
 forceUnlock(){this.isTransitioning=false;this.isActionProcessing=false;this.state.isSyncQueueRunning=false;this.state.isAsyncQueueRunning=false;this.clearEffectQueue('all');this.api.presentation.navigation.setBlocking(false);}
 pushToEffectQueue(effectiveList,context,isAsync=false){
  return new Promise(resolve=>{
   const item={effectiveList,context,isAsync,resolve};
   const queue=isAsync?this.state.effectQueue.async:this.state.effectQueue.sync;queue.push(item);
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
