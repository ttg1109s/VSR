/**
 * Central registry for Engine modules imported by Node tests.
 *
 * Keys are stable paths relative to engine/, not test-relative filesystem paths.
 * Keep fixtures and other test data outside this registry.
 */

import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const MODULE_REGISTRY = Object.freeze({
  "GameEngine": new URL("../../engine/GameEngine.js", import.meta.url),
  "Sprite": new URL("../../engine/modules/sprite/index.js", import.meta.url),
  "ProtocolCommands": new URL("../../engine/core/ProtocolCommands.js", import.meta.url),
  "Lifecycle": new URL("../../engine/core/Lifecycle.js", import.meta.url),
  "SaveRestore": new URL("../../engine/core/SaveRestore.js", import.meta.url),
  "TaskScheduling": new URL("../../engine/core/TaskScheduling.js", import.meta.url),
  "EffectQueue": new URL("../../engine/core/EffectQueue.js", import.meta.url),
  "HttpJsonTransport": new URL("../../engine/client/adapters/HttpJsonTransport.js", import.meta.url),
  "JsonProtocol": new URL("../../engine/protocol/JsonProtocol.js", import.meta.url),
  "JsonClient": new URL("../../engine/client/adapters/JsonClient.js", import.meta.url),
  "WorkerJsonTransport": new URL("../../engine/client/adapters/WorkerJsonTransport.js", import.meta.url),
  "ChatSystem": new URL("../../engine/modules/Chat.js", import.meta.url),
  "ActionSystem": new URL("../../engine/modules/Action.js", import.meta.url),
  "AutomationSystem": new URL("../../engine/modules/Automation.js", import.meta.url),
  "EffectSystem": new URL("../../engine/modules/Effect.js", import.meta.url),
  "EntitySystem": new URL("../../engine/modules/Entity.js", import.meta.url),
  "ItemSystem": new URL("../../engine/modules/Item.js", import.meta.url),
  "LoaderSystem": new URL("../../engine/modules/Loader.js", import.meta.url),
  "LogicSystem": new URL("../../engine/modules/Logic.js", import.meta.url),
  "Resolver": new URL("../../engine/modules/Resolver.js", import.meta.url),
  "NotificationSystem": new URL("../../engine/modules/Notification.js", import.meta.url),
  "SceneSystem": new URL("../../engine/modules/Scene.js", import.meta.url),
  "EffectStrategies": new URL("../../engine/modules/effect/Strategies.js", import.meta.url),
  "SetEffectsSystem": new URL("../../engine/modules/SetEffects.js", import.meta.url),
  "ItemStrategies": new URL("../../engine/modules/Item.js", import.meta.url),
  "ManagementStrategies": new URL("../../engine/modules/Management.js", import.meta.url),
  "StatsHelpers": new URL("../../engine/modules/Stats.js", import.meta.url),
  "MoveAlgorithms": new URL("../../engine/modules/entity/Movement.js", import.meta.url),
  "PasswordVerification": new URL("../../engine/modules/password/verify.js", import.meta.url),
  "SaveState": new URL("../../engine/persistence/SaveState.js", import.meta.url),
  "JsonProtocol": new URL("../../engine/protocol/JsonProtocol.js", import.meta.url),
  "Scenario": new URL("../../engine/schema/scenario.js", import.meta.url),
  "ScenarioSchema": new URL("../../engine/schema/scenario.schema.json", import.meta.url),
  "StateAccess": new URL("../../engine/state/StateAccess.js", import.meta.url),
  "TaskManager": new URL("../../engine/utils.js", import.meta.url),
});

const moduleCache = new Map();
const JSON_MODULE_KEYS = new Set(['ScenarioSchema']);

function assertKnownKey(key) {
  if (typeof key !== 'string' || !Object.hasOwn(MODULE_REGISTRY, key)) {
    const available = Object.keys(MODULE_REGISTRY).join(', ');
    throw new Error(
      `[Test Import Registry] Unknown module key: "${String(key)}". Available keys: ${available}`
    );
  }
}

export function getModuleUrl(key) {
  assertKnownKey(key);
  return MODULE_REGISTRY[key].href;
}

export function listModuleKeys() {
  return Object.keys(MODULE_REGISTRY);
}

export async function validateModuleRegistry() {
  const entries = Object.entries(MODULE_REGISTRY);
  const missing = [];

  await Promise.all(entries.map(async ([key, url]) => {
    try {
      await access(fileURLToPath(url));
    } catch {
      missing.push({ key, url: url.href });
    }
  }));

  return { valid: missing.length === 0, checked: entries.length, missing };
}

export async function importModule(key) {
  assertKnownKey(key);
  if (!moduleCache.has(key)) {
    const pending = JSON_MODULE_KEYS.has(key)
      ? import(MODULE_REGISTRY[key].href, { with: { type: 'json' } })
      : import(MODULE_REGISTRY[key].href);
    moduleCache.set(key, pending);
    pending.catch(() => moduleCache.delete(key));
  }
  return moduleCache.get(key);
}

export async function importModules(keys) {
  if (!Array.isArray(keys)) {
    throw new TypeError('[Test Import Registry] importModules() expects an array of keys.');
  }

  const uniqueKeys = [...new Set(keys)];
  for (const key of uniqueKeys) assertKnownKey(key);

  const modules = await Promise.all(uniqueKeys.map(key => importModule(key)));
  return Object.fromEntries(uniqueKeys.map((key, index) => [key, modules[index]]));
}
