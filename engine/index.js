export { GameEngine } from './GameEngine.js';
export { NotificationSystem } from './modules/Notification.js';
export { JsonProtocol, cloneJsonValue, API, createEngineAPI } from './protocol/index.js';
export { verifyPassword } from './modules/password/verify.js';


export { LoaderSystem } from './modules/Loader.js';

export { normalizeScenario, validateScenario, ScenarioValidationError, SCENARIO_FORMAT_VERSION } from './schema/scenario.js';
export { createSaveEnvelope, normalizeSaveEnvelope, SAVE_VERSION } from './persistence/SaveState.js';

export { StateAccess, StatePathError, createStateAccess } from './state/StateAccess.js';
export { STATE_SCHEMA } from './state/schema.js';

export { createUtils, TaskManager, Loop } from './utils.js';

export { MotionLifecycle, FallingPhase, normalizeMotionState, createMotionPhaseResult, finalizeMotionLifecycle } from './modules/sprite/motion/index.js';
