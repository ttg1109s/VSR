import { cloneJsonValue } from '../../protocol/JsonProtocol.js';

export const SAVE_VERSION = 3;
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
    taskRemainingMs: engine.taskManager?.snapshotRemaining?.(['auto_', 'move_char_', 'move_still_', 'router_still_', 'timer_ui_', 'timer_end_']) ?? {},
    pausedTasks: engine.taskManager?.snapshotPaused?.(['auto_', 'move_char_', 'move_still_', 'router_still_', 'timer_ui_', 'timer_end_']) ?? [],
    savedAt: new Date().toISOString()
  };
}

export function validateCharacterVisitCounters(savedCharacters, scenarioCharacters) {
  if (!savedCharacters || typeof savedCharacters !== 'object' || Array.isArray(savedCharacters) ||
      !scenarioCharacters || typeof scenarioCharacters !== 'object' || Array.isArray(scenarioCharacters)) {
    throw new TypeError('Save Character state is invalid.');
  }
  for (const [charId, charState] of Object.entries(savedCharacters)) {
    const scenarioCharacter = scenarioCharacters[charId];
    if (!scenarioCharacter) throw new TypeError(`Save contains unknown character "${charId}".`);
    if (!Array.isArray(charState?.moveList) ||
        charState.moveList.length !== (scenarioCharacter.moveList || []).length) {
      throw new TypeError(`Save moveList does not match scenario for character "${charId}".`);
    }
    charState.moveList.forEach((entry, index) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        throw new TypeError(`Save character "${charId}" moveList[${index}] is invalid.`);
      }
      if (!Number.isSafeInteger(entry.countVisited) || entry.countVisited < 0) {
        throw new TypeError(`Save character "${charId}" moveList[${index}].countVisited must be a non-negative safe integer.`);
      }
    });
  }
  return savedCharacters;
}

function validateSaveShape(save) {
  if (!save || typeof save !== 'object' || Array.isArray(save)) throw new TypeError('Invalid VSR save envelope.');
  if (save.protocol !== 'vsr-save') throw new TypeError('Invalid save protocol.');
  if (![2, SAVE_VERSION].includes(save.saveVersion)) throw new Error(`Unsupported save version: ${save.saveVersion}`);
  if (!save.scenario || typeof save.scenario !== 'object' || Array.isArray(save.scenario)) throw new TypeError('Save scenario must be an object.');
  if (!save.state || typeof save.state !== 'object' || Array.isArray(save.state)) throw new TypeError('Save state must be an object.');
  if (typeof save.savedAt !== 'string' || Number.isNaN(Date.parse(save.savedAt))) throw new TypeError('Save timestamp is invalid.');
  if (save.chatState !== undefined && (!save.chatState || typeof save.chatState !== 'object' || Array.isArray(save.chatState))) {
    throw new TypeError('Save chatState must be an object.');
  }
  if (save.pendingPasswordAction !== undefined && save.pendingPasswordAction !== null &&
      (typeof save.pendingPasswordAction !== 'object' || Array.isArray(save.pendingPasswordAction))) {
    throw new TypeError('Save pendingPasswordAction must be an object or null.');
  }
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

function migrateLegacyActionRuntime(save) {
  const scenario = save.scenario || {};
  const runtimeActions = save.state.actions || {};
  const legacyKeysByAction = new Map();

  for (const [sceneId, scene] of Object.entries(scenario.scenes || {})) {
    for (const [routerId, router] of Object.entries(scene?.routers || {})) {
      for (const [index, actionId] of (Array.isArray(router?.actions) ? router.actions : []).entries()) {
        if (typeof actionId !== 'string' || !actionId.trim()) {
          throw new Error(`Cannot migrate save: inline or invalid Action at scenes.${sceneId}.routers.${routerId}.actions[${index}] is not supported. Convert the scenario to global Action IDs and create a new save.`);
        }
        const keys = legacyKeysByAction.get(actionId) || [];
        keys.push(`${sceneId}_${routerId}_${actionId}`);
        legacyKeysByAction.set(actionId, keys);
      }
    }
  }

  const migrated = {};
  for (const [actionId, keys] of legacyKeysByAction) {
    const records = keys.filter(key => Object.prototype.hasOwnProperty.call(runtimeActions, key))
      .map(key => runtimeActions[key]);
    if (!records.length) continue;
    const canonical = JSON.stringify(records[0]);
    if (records.some(record => JSON.stringify(record) !== canonical)) {
      throw new Error(`Cannot migrate save: legacy per-Router runtime records for Action '${actionId}' differ. Their counters/properties have ambiguous ownership; resolve the save explicitly before restoring.`);
    }
    migrated[actionId] = cloneJsonValue(records[0]);
  }

  const knownLegacyKeys = new Set([...legacyKeysByAction.values()].flat());
  for (const key of Object.keys(runtimeActions)) {
    if (knownLegacyKeys.has(key)) delete runtimeActions[key];
  }
  for (const [actionId, record] of Object.entries(migrated)) {
    if (Object.prototype.hasOwnProperty.call(runtimeActions, actionId) &&
        JSON.stringify(runtimeActions[actionId]) !== JSON.stringify(record)) {
      throw new Error(`Cannot migrate save: global and legacy runtime records conflict for Action '${actionId}'.`);
    }
    runtimeActions[actionId] = record;
  }
}

export function normalizeSaveEnvelope(input) {
  validateSaveShape(input);
  const save = cloneJsonValue(input);
  if (save.saveVersion === 2) {
    migrateLegacyActionRuntime(save);
    save.saveVersion = SAVE_VERSION;
  }
  return save;
}
