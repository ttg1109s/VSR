import { adaptSpriteTrajectory } from '../protocol/JsonProtocol.js';
import {LoaderSystem} from '../modules/Loader.js';
import {cloneJsonValue} from '../protocol/JsonProtocol.js';
import {createSaveEnvelope,normalizeSaveEnvelope,validateCharacterVisitCounters,SAVE_VERSION} from '../persistence/SaveState.js';
export const SaveRestore = {
  exportSave(){return createSaveEnvelope(this);},
 
  async restoreSave(input){
   const save=normalizeSaveEnvelope(input);
   const normalized=LoaderSystem.loadScript(save.scenario,this.api);
   if(!normalized)throw new TypeError('Save scenario is invalid.');
   const restored=cloneJsonValue(save.state);
   // Sprite runtime state is new; older v3 saves may omit it. Seed from scenario defaults.
   if (restored.sprites === undefined) restored.sprites = cloneJsonValue(normalized.state.sprites || {});
   const requiredObjects=['scenes','characters','routers','actions','global','automations','chats','chatHistory','faker','itemInfo','map','sceneTree','sprites'];
   if(requiredObjects.some(key=>!restored[key]||typeof restored[key]!=='object'||Array.isArray(restored[key]))||
      typeof restored.sceneId!=='string'||!restored.sceneId||
      !restored.scenes[restored.sceneId]||!normalized.state.scenes?.[restored.sceneId]) {
    throw new TypeError('Save state does not match scenario structure.');
   }
   for(const sceneId of Object.keys(restored.scenes)) {
    if(!normalized.state.scenes?.[sceneId])throw new TypeError(`Save contains unknown scene "${sceneId}".`);
   }
   for (const mapKey of ['routers','actions','automations','chats']) {
    const scenarioMap=normalized.state[mapKey]||{};
    for (const id of Object.keys(restored[mapKey])) if (!Object.prototype.hasOwnProperty.call(scenarioMap,id)) throw new TypeError(`Save contains unknown ${mapKey.slice(0,-1)} "${id}".`);
   }
   for (const [spriteId, runtimeSprite] of Object.entries(restored.sprites)) {
    const definition=normalized.src?.sprite?.[spriteId];
    if(!definition) throw new TypeError(`Save contains unknown Sprite "${spriteId}".`);
    if(!runtimeSprite||typeof runtimeSprite!=='object'||Array.isArray(runtimeSprite)||
       typeof runtimeSprite.state!=='string'||!Object.hasOwn(definition.state||{},runtimeSprite.state)||
       !Number.isFinite(runtimeSprite.layer)||!Array.isArray(runtimeSprite.position)||runtimeSprite.position.length!==3||runtimeSprite.position.some(value=>typeof value!=='number'||!Number.isFinite(value))) {
     throw new TypeError(`Save Sprite "${spriteId}" runtime state is invalid.`);
    }
    const transform=runtimeSprite.transform||definition.transform||{scale:1,rotate:0};
    if(typeof transform.scale!=='number'||!Number.isFinite(transform.scale)||transform.scale<=0||typeof transform.rotate!=='number'||!Number.isFinite(transform.rotate)) throw new TypeError(`Save Sprite "${spriteId}" transform is invalid.`);
    runtimeSprite.transform=cloneJsonValue(transform);
   }
   for(const [spriteId] of Object.entries(normalized.src?.sprite||{})) {
    if(!Object.hasOwn(restored.sprites,spriteId)) restored.sprites[spriteId]=cloneJsonValue(normalized.state.sprites[spriteId]);
   }
   for (const [sceneId,sceneState] of Object.entries(restored.scenes)) {
    const sceneDef=normalized.state.scenes[sceneId];
    if (!sceneState || typeof sceneState!=='object' || Array.isArray(sceneState)) throw new TypeError(`Save scene "${sceneId}" state is invalid.`);
    if (sceneState.activeRouterId && !normalized.src?.scenes?.[sceneId]?.routers?.[sceneState.activeRouterId]) throw new TypeError(`Save scene "${sceneId}" has unknown active router.`);
   }
   for (const [automationId,bag] of Object.entries(save.automationRandomBags||{})) {
    const plan=normalized.src?.templates?.automation?.[automationId]?.plan;
    if (!Array.isArray(plan)||!Array.isArray(bag)||bag.some(index=>!Number.isSafeInteger(index)||index<0||index>=plan.length)||new Set(bag).size!==bag.length) throw new TypeError(`Save automation random bag "${automationId}" is invalid.`);
   }
   validateCharacterVisitCounters(restored.characters,normalized.state.characters);
   for (const [characterId, characterState] of Object.entries(restored.characters)) {
    for (const [index, entry] of (characterState.moveList || []).entries()) {
     if (!normalized.state.scenes?.[entry.scene_id]) throw new TypeError(`Save character "${characterId}" moveList[${index}] references unknown scene "${entry.scene_id}".`);
    }
   }
   if(save.endingState&&(!save.endingState.id||!normalized.src?.endings?.[save.endingState.id]))throw new TypeError('Save ending does not exist in scenario.');
   const originalEntryCharacter=restored.originalEntryCharacter;
   const currentEntryCharacter=restored.entryCharacter;
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
   // Preserve the currently running runtime until the replacement runtime has
   // completed reconstruction. If a post-validation restore phase fails, restore
   // the previous runtime references and rehydrate its background work.
   const rollbackFields=[
    'scenario','src','state','runtime','pendingPasswordAction','chatState','timerState','endingState',
    'taskSequence','currentStillTask','activeTimerTasks','characterVisitTokens','characterVisitSequence',
    'characterStillTaskIds','characterTransitionQueues','characterMoveSlots','characterMoveQueue','characterMoveExecuting','isActionProcessing','isTransitioning','disposed',
    'restoredTaskTimers','restoredPausedTasks','restoredAutomationRandomBags','activeSpriteMotions','completedSpriteMotions','completedSpriteMotionIdentities','pendingSpriteMotionEndHooks','spriteMotionSequence','automationRunTokens',
    'automationRandomBags','automationBlockingOwners','automationRunSequence','_lifecycleGeneration'
   ];
   const rollback=Object.fromEntries(rollbackFields.map(key=>[key,this[key]]));
   let rollbackSave=null;
   try { rollbackSave=this.exportSave(); } catch {}
   try {
    this.reset();
    this.scenario=cloneJsonValue(normalized.scenario);
    this.src=normalized.src;
    this.state=restored;
    this.activeSpriteMotions=new Map((save.activeSpriteMotions||[]).map(item=>{const restoredMotion={...item,startedAt:Date.now(),phase:'presentation-pending'};return[item.descriptor.spriteId,restoredMotion];}));
    this.completedSpriteMotions=new Set(save.completedSpriteMotions||[]);
    this.completedSpriteMotionIdentities=new Map(Object.entries(save.completedSpriteMotionIdentities||{}));
    this.pendingSpriteMotionEndHooks=new Map(Object.entries(save.pendingSpriteMotionEndHooks||{}));
    this.spriteMotionSequence=save.spriteMotionSequence||0;
    this.chatState={...this.chatState,...(cloneJsonValue(save.chatState)||{})};
    this.pendingPasswordAction=cloneJsonValue(save.pendingPasswordAction)||null;
    this.endingState=save.endingState===null||save.endingState===undefined?null:cloneJsonValue(save.endingState);
    this.restoredTaskTimers=cloneJsonValue(save.taskRemainingMs)||{};
    this.restoredPausedTasks=cloneJsonValue(save.pausedTasks)||[];
    this.restoredAutomationRandomBags=cloneJsonValue(save.automationRandomBags)||{};
    this.rehydrateBackgroundTasks();
    this.rehydratePasswordChallenge();
    for(const active of this.activeSpriteMotions.values()) this.protocol?.publish?.('presentation.sprite.simulation',adaptSpriteTrajectory(active.descriptor));
    this.commitState('save.restored');
    return{restored:true,saveVersion:SAVE_VERSION};
   } catch(error) {
    this.taskManager?.killAll?.();
    for(const key of rollbackFields)this[key]=rollback[key];
    // A new generation invalidates callbacks from the failed runtime. Rehydrated
    // tasks belong to the restored old runtime and use the old save's timer data.
    this._lifecycleGeneration=Math.max(this._lifecycleGeneration||0,rollback._lifecycleGeneration||0)+1;
    this.restoredTaskTimers=cloneJsonValue(rollbackSave?.taskRemainingMs)||{};
    this.restoredPausedTasks=cloneJsonValue(rollbackSave?.pausedTasks)||[];
    this.restoredAutomationRandomBags=cloneJsonValue(rollbackSave?.automationRandomBags)||{};
    try { this.rehydrateBackgroundTasks(); } catch(rollbackError) {
     error.rollbackError=rollbackError;
     this.disposed=true;
    }
    throw error;
   }
  },
 
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
  },
};
