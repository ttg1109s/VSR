export { GameEngine } from './GameEngine.js';
export { JsonProtocol, cloneJsonValue } from '../core/protocol/JsonProtocol.js';
export { verifyPassword } from './modules/password/verify.js';
export { API, createEngineAPI } from '../api/index.js';
export { TaskManager, Loop } from '../plugin/taskmanager.js';
export { LoaderSystem } from './modules/Loader.js';
export { DEMO_SCRIPT } from '../demo_script.js';

export { normalizeScenario, validateScenario, ScenarioValidationError, SCENARIO_FORMAT_VERSION } from './scenario/Scenario.js';
export { createSaveEnvelope, normalizeSaveEnvelope, SAVE_VERSION } from './persistence/SaveState.js';

export { StateAccess, StatePathError, createStateAccess } from '../state/StateAccess.js';
export { STATE_SCHEMA } from '../state/schema.js';
