import { cloneJsonValue } from '../../core/protocol/JsonProtocol.js';

export const SAVE_VERSION = 2;
const RUNTIME_KEYS = ['effectQueue', 'isSyncQueueRunning', 'isAsyncQueueRunning', 'pausedBackgroundTasks'];

export function createSaveEnvelope(engine) {
  if (!engine?.src || !engine?.scenario) throw new Error('Cannot save an uninitialized Engine.');
  if (engine.isActionProcessing || engine.isTransitioning ||
      engine.state?.isSyncQueueRunning || engine.state?.isAsyncQueueRunning ||
      engine.state?.effectQueue?.sync?.length || engine.state?.effectQueue?.async?.length) {
    throw new Error('Cannot save while an action, transition, or effect queue is active.');
  }
  if (engine.taskManager?.hasBusyTasks?.(['auto_', 'move_char_'])) {
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
    taskRemainingMs: engine.taskManager?.snapshotRemaining?.(['auto_', 'move_char_']) ?? {},
    pausedTasks: engine.taskManager?.snapshotPaused?.(['auto_', 'move_char_']) ?? [],
    savedAt: new Date().toISOString()
  };
}

function validateSaveShape(save) {
  if (!save || typeof save !== 'object' || Array.isArray(save)) throw new TypeError('Invalid VSR save envelope.');
  if (save.protocol !== undefined && save.protocol !== 'vsr-save') throw new TypeError('Invalid save protocol.');
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
  if (save.pausedTasks !== undefined && (!Array.isArray(save.pausedTasks) || save.pausedTasks.some(name => typeof name !== 'string' || !/^(auto_|move_char_)[^/]+$/.test(name)))) {
    throw new TypeError('Save pausedTasks must contain valid task names.');
  }
  if (save.taskRemainingMs !== undefined) {
    if (!save.taskRemainingMs || typeof save.taskRemainingMs !== 'object' || Array.isArray(save.taskRemainingMs)) {
      throw new TypeError('Save taskRemainingMs must be an object.');
    }
    for (const [name, value] of Object.entries(save.taskRemainingMs)) {
      if (!/^(auto_|move_char_)[^/]+$/.test(name) || !Number.isFinite(value) || value < 0) {
        throw new TypeError(`Invalid remaining timer entry: ${name}`);
      }
    }
  }
}

export function normalizeSaveEnvelope(input) {
  validateSaveShape(input);
  const version = input.saveVersion ?? 1;
  if (version === 1) {
    return {
      ...cloneJsonValue(input),
      protocol: 'vsr-save',
      saveVersion: SAVE_VERSION,
      pendingPasswordAction: input.pendingPasswordAction ?? null,
      taskRemainingMs: {},
      pausedTasks: []
    };
  }
  if (version !== SAVE_VERSION) throw new Error(`Unsupported save version: ${version}`);
  return {
    ...input,
    protocol: 'vsr-save',
    pendingPasswordAction: input.pendingPasswordAction ?? null,
    taskRemainingMs: input.taskRemainingMs ?? {},
    pausedTasks: input.pausedTasks ?? []
  };
}
