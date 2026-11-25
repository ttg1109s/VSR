import {ConfigSystem} from './modules/Config.js';
import {LogicSystem} from './modules/Logic.js';
import {EffectSystem} from './modules/Effect.js';
import {ActionSystem} from './modules/Action.js';
import {SceneSystem} from './modules/Scene.js';
import {EntitySystem} from './modules/Entity.js';
import {ItemSystem} from './modules/Item.js';
import {ChatSystem} from './modules/Chat.js';
import {AutomationSystem} from './modules/Automation.js';
import {SpriteSystem} from './modules/Sprite.js';
import {createEngineAPI} from './protocol/index.js';
import {ProtocolCommands} from './core/ProtocolCommands.js';
import {Lifecycle} from './core/Lifecycle.js';
import {SaveRestore} from './core/SaveRestore.js';
import {TaskScheduling} from './core/TaskScheduling.js';
import {EffectQueue} from './core/EffectQueue.js';
import {TaskManager} from './utils.js';
import {PasswordSystem} from './modules/password/PasswordSystem.js';
import {NotificationSystem} from './modules/Notification.js';
import {JsonProtocol,cloneJsonValue} from './protocol/JsonProtocol.js';
import {verifyPassword} from './modules/password/verify.js';

export class GameEngine {
 constructor({taskManager,engineId,authorizeCommand,requireAuthorization=false,clock,presentationAvailable=()=>false}={}) {
  this.taskManager=taskManager||new TaskManager({},120,{clock});
  this.protocol=new JsonProtocol({engineId,protocolVersion:2,authorizeCommand,requireAuthorization,presentationAvailable,onCommandSuccess:({command,revisionBefore})=>{
   if(!['engine.init','scenario.inspect','snapshot.get'].includes(command)&&this.protocol.stateRevision===revisionBefore)this.commitState(`command:${command}`);
  }});
  const register=this.protocol.registerCommand.bind(this.protocol);
  this.protocol.registerCommand=(name,handler)=>register(name,async(payload,context)=>{
   if(this.endingState&&!['engine.init','scenario.inspect','snapshot.get','save.export','save.restore'].includes(name)){
    const error=new Error('The scenario has ended. Gameplay commands are unavailable.');error.code='SCENARIO_TERMINAL';throw error;
   }
   return handler(payload,context);
  });
  this.notifications=new NotificationSystem({protocol:this.protocol,engineId:this.protocol.engineId,clock:clock||(()=>Date.now()),schedule:(callback,delay,name)=>this.taskManager.once(callback,Math.max(1,delay),name),cancelSchedule:handle=>handle?.kill?.()});
  this.api=createEngineAPI(this);
  this.passwordSystem=new PasswordSystem({clock:clock||(()=>Date.now())});
  this.reset();
  this.registerProtocolCommands();
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
    // An elapsed deadline is a failed password attempt, not a free cancellation.
    const attempt=this.passwordSystem.recordFailure(pending,{allowExpired:true});
    if(attempt.accepted) {
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
   // The close button hides the UI only. The challenge remains Engine-owned,
   // retaining its attempt count and absolute deadline for the next opening.
   this.commitState('password.challenge.hidden');
   return {success:true,hidden:true,challengeId:pending.challengeId};
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
}
Object.assign(GameEngine.prototype,ConfigSystem,LogicSystem,EffectSystem,ActionSystem,SceneSystem,EntitySystem,ItemSystem,ChatSystem,AutomationSystem,SpriteSystem,ProtocolCommands,Lifecycle,SaveRestore,TaskScheduling,EffectQueue);
