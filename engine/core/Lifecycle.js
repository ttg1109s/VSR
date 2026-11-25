import {LoaderSystem} from '../modules/Loader.js';
export const Lifecycle = {
 reset(){
   this._lifecycleGeneration=(this._lifecycleGeneration||0)+1;
   this.clearEffectQueue?.('all');
   this.automationRunTokens?.clear?.();this.automationRandomBags?.clear?.();this.automationBlockingOwners?.clear?.();this.automationRunSequence=0;
   this.api?.presentation?.navigation?.setBlocking?.(false);
   this.notifications?.reset();
   this.taskManager?.killAll?.();
   this.state={sceneId:'',scenes:{},routers:{},actions:{},global:{},characters:{},itemInfo:{},chats:{},chatHistory:{},executed:[],effect_overrides:{},prevRouter:null,map:{choices:{},blocks:{}},automations:{},faker:{active:false,targetId:null,backupPlayer:null},playerMoveHistory:[],sceneTree:{},config:{},originalEntryCharacter:'player',entryCharacter:'player'};
   this.runtime={effectQueue:{sync:[],async:[]},effectQueuesPaused:false,isSyncQueueRunning:false,isAsyncQueueRunning:false,itemUseSequence:0,itemUses:new Map()};
   this.src=null;this.scenario=null;this.pendingPasswordAction=null;
   this.chatState={active:false,blocking:false,id:null,blockId:null,index:0,triggerActionId:null,actionModified:false};
   this.timerState=null;this.endingState=null;
   this.taskSequence=0;this.currentStillTask=null;this.activeTimerTasks=[];this.characterVisitTokens=new Map();this.characterVisitSequence=0;this.characterStillTaskIds=new Map();this.characterTransitionQueues=new Map();this.characterMoveSlots=new Set();this.characterMoveQueue=new Set();this.characterMoveExecuting=new Set();this.isActionProcessing=false;this.isTransitioning=false;this.disposed=false;this.restoredTaskTimers={};this.restoredPausedTasks=[];
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
    const entryResult = await this.enterScene(entry);
    if (entryResult?.success === false) throw new Error(`Entry Scene '${entry}' could not be entered: ${entryResult.reason || 'unknown failure'}`);
    this.api.engine.state.update('playerMoveHistory', history => [...(history || []), entry]);
   }
   this.commitState('engine.initialized');
   return this;
  }
 
 activateEnding(endingId){
   if(this.endingState)return {success:true,endingId:this.endingState.id,alreadyEnded:true};
   const definition=this.src?.endings?.[endingId];
   if(!definition)throw new Error(`Unknown ending '${String(endingId)}'.`);
   this.pauseBackgroundTasks?.();this.clearEffectQueue?.('all');
   this.endingState={id:endingId,title:definition.title,desc:definition.desc,activatedAt:new Date().toISOString()};
   this.pendingPasswordAction=null;this.api?.engine?.state?.set?.('session.passwordChallenge',null);
   this.commitState('scenario.ended');
   this.protocol?.publish?.('scenario.ended',{ending:cloneJsonValue(this.endingState)});
   return {success:true,endingId};
  }
 
 dispose(){this.clearEffectQueue('all');this.notifications?.reset();this.taskManager?.killAll?.();this.protocol?.publish('engine.disposed',{});this.disposed=true;}
 
 forceUnlock(){
   // Unlock UI/action state without falsifying runner ownership. In-flight queue
   // runners retain their running flags until their own finally blocks finish,
   // preventing a second runner from overlapping on the same queue.
   this.isTransitioning=false;this.isActionProcessing=false;
   this.clearEffectQueue('all');
   this.api.presentation.navigation.setBlocking(false);
  }
};
