import { cloneJsonValue } from '../protocol/JsonProtocol.js';

export const SAVE_VERSION = 5;
const RUNTIME_KEYS = ['effectQueue', 'isSyncQueueRunning', 'isAsyncQueueRunning', 'pausedBackgroundTasks'];

export function createSaveEnvelope(engine) {
  if (!engine?.src || !engine?.scenario) throw new Error('Cannot save an uninitialized Engine.');

  if (engine.isActionProcessing || engine.isTransitioning ||
      engine.runtime?.isSyncQueueRunning || engine.runtime?.isAsyncQueueRunning ||
      engine.runtime?.effectQueue?.sync?.length || engine.runtime?.effectQueue?.async?.length) {
    throw new Error('Cannot save while an action, transition, or effect queue is active.');
  }
  if (engine.taskManager?.hasBusyTasks?.(['auto_', 'move_char_', 'move_still_', 'router_still_', 'timer_ui_', 'timer_end_'])) {
    throw new Error('Cannot save while a background task is executing.');
  }
  for (const [id, automation] of Object.entries(engine.state?.automations ?? {})) {
    if (automation?.active && !engine.taskManager?.plan?.[`auto_${id}`]) {
      throw new Error('Cannot save while an automation step is in flight.');
    }
  }
  const state = cloneJsonValue(engine.state);
  for (const key of RUNTIME_KEYS) delete state[key];
  return {
    protocol: 'vsr-save',
    saveVersion: SAVE_VERSION,
    scenario: cloneJsonValue(engine.scenario),
    state,
    chatState: cloneJsonValue(engine.chatState),
    pendingPasswordAction: cloneJsonValue(engine.pendingPasswordAction),
    endingState: cloneJsonValue(engine.endingState),
    taskRemainingMs: engine.taskManager?.snapshotRemaining?.(['auto_', 'move_char_', 'move_still_', 'router_still_', 'timer_ui_', 'timer_end_']) ?? {},
    pausedTasks: engine.taskManager?.snapshotPaused?.(['auto_', 'move_char_', 'move_still_', 'router_still_', 'timer_ui_', 'timer_end_']) ?? [],
    automationRandomBags: Object.fromEntries([...(engine.automationRandomBags||new Map())].map(([id,bag])=>[id,[...bag]])),
    activeSpriteMotions: [...(engine.activeSpriteMotions||new Map()).values()].map(item=>cloneJsonValue(item)),
    completedSpriteMotions: [...(engine.completedSpriteMotions||new Set())],
    completedSpriteMotionIdentities: Object.fromEntries(engine.completedSpriteMotionIdentities||new Map()),
    pendingSpriteMotionEndHooks: Object.fromEntries(engine.pendingSpriteMotionEndHooks||new Map()),
    spriteMotionSequence: engine.spriteMotionSequence||0,
    protocolCheckpoint: engine.protocol?.checkpoint?.() ?? null,
    savedAt: new Date().toISOString()
  };
}

export function validateCharacterVisitCounters(savedCharacters, scenarioCharacters) {
  if (!savedCharacters || typeof savedCharacters !== 'object' || Array.isArray(savedCharacters) ||
      !scenarioCharacters || typeof scenarioCharacters !== 'object' || Array.isArray(scenarioCharacters)) {
    throw new TypeError('Save Character state is invalid.');
  }
  for (const charId of Object.keys(scenarioCharacters)) {
    if (!Object.prototype.hasOwnProperty.call(savedCharacters, charId)) throw new TypeError(`Save is missing Character "${charId}".`);
  }
  for (const [charId, charState] of Object.entries(savedCharacters)) {
    if (!Object.prototype.hasOwnProperty.call(scenarioCharacters, charId)) throw new TypeError(`Save contains unknown character "${charId}".`);
    if (!Array.isArray(charState?.moveList)) throw new TypeError(`Save moveList is invalid for character "${charId}".`);
    const entryIds = new Set();
    charState.moveList.forEach((entry, index) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        throw new TypeError(`Save character "${charId}" moveList[${index}] is invalid.`);
      }
      if (!Number.isSafeInteger(entry.countVisited) || entry.countVisited < 0) {
        throw new TypeError(`Save character "${charId}" moveList[${index}].countVisited must be a non-negative safe integer.`);
      }
      if (typeof entry.scene_id !== 'string' || !entry.scene_id ||
          typeof entry.entryId !== 'string' || !/^[A-Za-z0-9.-]+$/.test(entry.entryId)) {
        throw new TypeError(`Save character "${charId}" moveList[${index}] is invalid.`);
      }
      if (entryIds.has(entry.entryId)) throw new TypeError(`Save character "${charId}" has duplicate movement entry ID "${entry.entryId}".`);
      entryIds.add(entry.entryId);
    });
    if (charState.moveList.length && (!Number.isInteger(charState.place?.currentIndex) || charState.place.currentIndex < 0 || charState.place.currentIndex >= charState.moveList.length)) {
      throw new TypeError(`Save character "${charId}" current movement index is invalid.`);
    }
  }
  return savedCharacters;
}

function validateSaveShape(save) {
  if (!save || typeof save !== 'object' || Array.isArray(save)) throw new TypeError('Invalid VSR save envelope.');
  if (save.protocol !== 'vsr-save') throw new TypeError('Invalid save protocol.');
  if (save.saveVersion !== SAVE_VERSION) throw new Error(`Unsupported save version: ${save.saveVersion}`);
  if (!save.scenario || typeof save.scenario !== 'object' || Array.isArray(save.scenario)) throw new TypeError('Save scenario must be an object.');
  if (!save.state || typeof save.state !== 'object' || Array.isArray(save.state)) throw new TypeError('Save state must be an object.');
  if (typeof save.savedAt !== 'string' || Number.isNaN(Date.parse(save.savedAt))) throw new TypeError('Save timestamp is invalid.');
  if (save.chatState !== undefined && (!save.chatState || typeof save.chatState !== 'object' || Array.isArray(save.chatState))) {
    throw new TypeError('Save chatState must be an object.');
  }
  if (save.endingState !== undefined && save.endingState !== null && (typeof save.endingState !== 'object' || Array.isArray(save.endingState) || typeof save.endingState.id !== 'string')) throw new TypeError('Save endingState is invalid.');
  if (save.pendingPasswordAction !== undefined && save.pendingPasswordAction !== null &&
      (typeof save.pendingPasswordAction !== 'object' || Array.isArray(save.pendingPasswordAction))) {
    throw new TypeError('Save pendingPasswordAction must be an object or null.');
  }
  if (save.activeSpriteMotions !== undefined && (!Array.isArray(save.activeSpriteMotions) || save.activeSpriteMotions.some(item=>!item||typeof item!=='object'||typeof item.motionId!=='string'||typeof item.trajectoryId!=='string'||!item.descriptor?.trajectories))) throw new TypeError('Save activeSpriteMotions is invalid.');
  if (save.completedSpriteMotions !== undefined && (!Array.isArray(save.completedSpriteMotions) || save.completedSpriteMotions.some(id=>typeof id!=='string'))) throw new TypeError('Save completedSpriteMotions is invalid.');
  if (save.completedSpriteMotionIdentities !== undefined && (!save.completedSpriteMotionIdentities||typeof save.completedSpriteMotionIdentities!=='object'||Array.isArray(save.completedSpriteMotionIdentities)||Object.values(save.completedSpriteMotionIdentities).some(identity=>!identity||typeof identity.spriteId!=='string'||typeof identity.trajectoryId!=='string'))) throw new TypeError('Save completedSpriteMotionIdentities is invalid.');
  if (save.pendingSpriteMotionEndHooks !== undefined && (!save.pendingSpriteMotionEndHooks||typeof save.pendingSpriteMotionEndHooks!=='object'||Array.isArray(save.pendingSpriteMotionEndHooks)||Object.values(save.pendingSpriteMotionEndHooks).some(item=>!item||!Array.isArray(item.effects)||!item.context||!item.completion||!Array.isArray(item.committedSprites)||(item.startedIndexes!==undefined&&!Array.isArray(item.startedIndexes))||(item.completedIndexes!==undefined&&!Array.isArray(item.completedIndexes))))) throw new TypeError('Save pendingSpriteMotionEndHooks is invalid.');
  if (save.spriteMotionSequence !== undefined && (!Number.isSafeInteger(save.spriteMotionSequence)||save.spriteMotionSequence<0)) throw new TypeError('Save spriteMotionSequence is invalid.');
  if (save.protocolCheckpoint !== undefined && save.protocolCheckpoint !== null && (save.protocolCheckpoint.format !== 'vsr.protocol.checkpoint.v1' || !Number.isSafeInteger(save.protocolCheckpoint.eventSequence) || !Number.isSafeInteger(save.protocolCheckpoint.stateRevision) || !Array.isArray(save.protocolCheckpoint.eventLog) || !Array.isArray(save.protocolCheckpoint.commandResults))) throw new TypeError('Save protocolCheckpoint is invalid.');
  if (save.automationRandomBags !== undefined && (!save.automationRandomBags || typeof save.automationRandomBags !== 'object' || Array.isArray(save.automationRandomBags))) throw new TypeError('Save automationRandomBags must be an object.');
  if (save.pausedTasks !== undefined && (!Array.isArray(save.pausedTasks) || save.pausedTasks.some(name => typeof name !== 'string' || !/^(auto_|move_char_|move_still_|router_still_|timer_ui_|timer_end_)[^/]+$/.test(name)))) {
    throw new TypeError('Save pausedTasks must contain valid task names.');
  }
  if (save.taskRemainingMs !== undefined) {
    if (!save.taskRemainingMs || typeof save.taskRemainingMs !== 'object' || Array.isArray(save.taskRemainingMs)) {
      throw new TypeError('Save taskRemainingMs must be an object.');
    }
    for (const [name, value] of Object.entries(save.taskRemainingMs)) {
      if (!/^(auto_|move_char_|move_still_|router_still_|timer_ui_|timer_end_)[^/]+$/.test(name) || !Number.isFinite(value) || value < 0) {
        throw new TypeError(`Invalid remaining timer entry: ${name}`);
      }
    }
  }
}

export function normalizeSaveEnvelope(input) {
  validateSaveShape(input);
  const save = cloneJsonValue(input);
  return save;
}
