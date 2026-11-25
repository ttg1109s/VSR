import {normalizeScenario} from '../schema/scenario.js';
import { COMMUNICATION_SENDER_ID, UNKNOWN_SENDER_ID } from '../modules/chat/systemSenders.js';
export const ProtocolCommands = {
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
      if(router?.meta?.sprite===true&&Array.isArray(router.sprites)){
       for(const spriteId of router.sprites){const actionId=scenario.sprite?.[spriteId]?.action;if(actionId)actionIds.add(actionId);}
      }
     }
    }
    return{
     metadata:{
      title:meta.title,subtitle:meta.subtitle??null,description:meta.desc,
      writer:meta.writer??null,version:meta.version,
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
   this.protocol.registerCommand('sprite.trigger',async payload=>{
    if(typeof payload.spriteId!=='string'||!payload.spriteId)throw new TypeError('sprite.trigger requires spriteId.');
    const state=this.api.engine.state;
    const sceneId=state.get('sceneId');
    const routerId=sceneId?state.get('scene.activeRouterId',{id:sceneId}):null;
    const router=this.src?.scenes?.[sceneId]?.routers?.[routerId];
    if(router?.meta?.sprite!==true||!Array.isArray(router.sprites)||!router.sprites.includes(payload.spriteId))return{success:false,reason:'sprite_not_available'};
    const sprite=this.src?.sprite?.[payload.spriteId];
    if(!sprite)return{success:false,reason:'sprite_not_found'};
    return this.handleAction(sprite.action,payload.uniqueId||`${sceneId}_${routerId}_${payload.spriteId}`);
   });
   this.protocol.registerCommand('action.trigger',async payload=>{
    if(typeof payload.actionId!=='string'||!payload.actionId)throw new TypeError('action.trigger requires actionId.');
    try {
     const result=await this.handleAction(payload.actionId,payload.uniqueId||payload.actionId);
     if(result?.success===false&&!result.notificationEmitted&&!['action_hidden','locked','permission_denied','not_read','cooldown','busy','transitioning','challenge_active','invalid_context','action_not_found'].includes(result.reason)) {
      const messages={
       requirement_failed:['Action failed','Requirements not met.'],
       target_locked:['Target locked','The target is locked.'],
       invalid_result:['Action failed','The Engine returned an invalid execution result.']
      };
      const [title,message]=messages[result.reason]||['Action failed','The action was not performed.'];
      this.notifications.add(title,message,'warning',{source:'engine',category:`action.${result.reason||'failed'}`,dedupeKey:`action.result:${payload.actionId}:${result.reason||'failed'}`});
     }
     return result;
    } catch(error) {
     this.notifications.add('Action failed',error?.message||'Unable to complete the action.','danger',{source:'engine',category:'action.execution_error'});
     throw error;
    }
   });
   this.protocol.registerCommand('chat.open',payload=>{
    if(typeof payload.contactId!=='string'||!payload.contactId||typeof payload.chatId!=='string'||!payload.chatId)throw new TypeError('chat.open requires contactId and chatId.');
    const runtimeState=this.api.engine.state;
    const characters=runtimeState.getRuntimeSnapshot('characters')||{};
    const isSystemContact=payload.contactId===COMMUNICATION_SENDER_ID||payload.contactId===UNKNOWN_SENDER_ID;
    if(!isSystemContact){
     const contact=characters[payload.contactId];
     const identityId=this._getCurrentIdentityKey?.()||runtimeState.get('entryCharacter')||'player';
     const met=Array.isArray(contact?.met)&&contact.met.some(entry=>String(entry).split(':')[0]===identityId);
     const present=!!contact&&contact.place?.scene_id===runtimeState.get('sceneId');
     if(!contact||payload.contactId===identityId||(!met&&!present))throw new Error('Chat thread is not available for this contact.');
    }
    const thread=this.getThreads(payload.contactId).find(item=>item.id===payload.chatId);
    if(!thread)throw new Error('Chat thread is not available for this contact.');
    if(this.chatState?.active&&this.chatState.id===payload.chatId)return{opened:true,alreadyActive:true,contactId:payload.contactId,chatId:payload.chatId};
    this.startChat(payload.chatId);
    return{opened:true,alreadyActive:false,contactId:payload.contactId,chatId:payload.chatId};
   });
   this.protocol.registerCommand('chat.next',()=>this.nextChat());
   this.protocol.registerCommand('chat.selectChoice',payload=>{if(!Number.isInteger(payload.index))throw new TypeError('chat.selectChoice requires index.');return this.selectChatChoice(payload.index);});
   this.protocol.registerCommand('inventory.toggleHand',payload=>{if(typeof payload.itemId!=='string'||!payload.itemId)throw new TypeError('inventory.toggleHand requires itemId.');return this.toggleHand(payload.itemId);});
   this.protocol.registerCommand('inventory.remove',payload=>{if(typeof payload.itemId!=='string'||!payload.itemId)throw new TypeError('inventory.remove requires itemId.');return this.removeFromInventory(payload.itemId);});
   this.protocol.registerCommand('inventory.transfer',payload=>{if(typeof payload.itemId!=='string'||!payload.itemId||typeof payload.targetCharacterId!=='string'||!payload.targetCharacterId)throw new TypeError('inventory.transfer requires itemId and targetCharacterId.');return this.transferItem(payload.itemId,payload.targetCharacterId);});
   this.protocol.registerCommand('scene.enter',payload=>{if(typeof payload.sceneId!=='string'||!payload.sceneId)throw new TypeError('scene.enter requires sceneId.');return this.enterScene(payload.sceneId,payload.skipTransition===true);});
   this.protocol.registerCommand('scene.backParent',()=>this.goBackParent());
   this.protocol.registerCommand('password.submit',async payload=>{
    try {
     const result=await this.submitPassword(payload);
     if(result?.retry) {
      const message=result.remainingAttempts===null?'Incorrect response. You can try again.':`Incorrect response. ${result.remainingAttempts} attempts remaining.`;
      this.notifications.add('Incorrect response',message,'warning',{source:'engine',category:'action.password_retry'});
     } else if(result?.reason==='expired') {
      this.notifications.add('Challenge expired','The password challenge has expired.','warning',{source:'engine',category:'action.password_expired'});
     } else if(result?.reason==='exhausted') {
      this.notifications.add('Challenge failed','No attempts remaining.','danger',{source:'engine',category:'action.password_exhausted'});
     }
     return result;
    } catch(error) {
     this.notifications.add('Challenge error',error?.message||'Unable to process the password challenge.','danger',{source:'engine',category:'action.password_error'});
     throw error;
    }
   });
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
   this.protocol.registerCommand('timer.control',payload=>{
    if(!['pause','resume'].includes(payload.control))throw new TypeError('timer.control requires control pause/resume.');
    const subtype = payload.subtype || (payload.routerId ? 'router' : null);
    const target = payload.target || payload.routerId || payload.actionId;
    if(typeof target!=='string'||!target)throw new TypeError('timer.control requires target.');
    if(subtype==='router') return this.controlRouterTimer(target,payload.control,{protocol:true});
    if(subtype==='cooldown') return this.controlActionCooldown(target,payload.control);
    throw new TypeError('timer.control subtype must be router or cooldown.');
   });
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
   this.protocol.registerCommand('notification.readAll',payload=>{
    const source=typeof payload.source==='string'&&payload.source.trim()?payload.source:undefined;
    return{updated:this.notifications.markAllRead({source})};
   });
  }
};
