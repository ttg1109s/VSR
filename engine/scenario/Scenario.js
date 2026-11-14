import Ajv from 'ajv';
import scenarioSchema from '../../scenario.schema.json' assert { type: 'json' };

export const SCENARIO_FORMAT_VERSION = 1;

export class ScenarioValidationError extends Error {
  constructor(errors) {
    super(`Invalid VSR scenario: ${errors.join('; ')}`);
    this.name = 'ScenarioValidationError';
    this.code = 'INVALID_SCENARIO';
    this.errors = errors;
  }
}

const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true });
const validateAgainstSchema = ajv.compile(scenarioSchema);

function clone(input) {
  try {
    return structuredClone(input);
  } catch (error) {
    throw new ScenarioValidationError([`Scenario must be JSON-compatible: ${error.message}`]);
  }
}

function validateReferences(scenario) {
  const errors = [];
  const scenes = scenario.scenes || {};

  for (const [sceneId, scene] of Object.entries(scenes)) {
    const parentId = scene?.meta?.parentScene;
    if (parentId && !Object.hasOwn(scenes, parentId)) {
      errors.push(`scenes.${sceneId}.meta.parentScene references missing scene '${parentId}'`);
    }
    const routerIds = Object.keys(scene?.routers || {});
    if (scene?.set?.activeRouterId && !routerIds.includes(scene.set.activeRouterId)) {
      errors.push(`scenes.${sceneId}.set.activeRouterId references missing router '${scene.set.activeRouterId}'`);
    }
    for (const [routerId, router] of Object.entries(scene?.routers || {})) {
      const seen = new Set();
      const actions = router?.actions;
      if (Array.isArray(actions)) {
        actions.forEach((action, index) => {
          if (typeof action === 'string' && !Object.hasOwn(scenario.actions || {}, action)) {
            errors.push(`scenes.${sceneId}.routers.${routerId}.actions[${index}] references missing global action '${action}'`);
          }
          if (action && typeof action === 'object' && action.id) {
            if (seen.has(action.id)) errors.push(`scenes.${sceneId}.routers.${routerId} contains duplicate action id '${action.id}'`);
            seen.add(action.id);
          }
        });
      } else if (actions && typeof actions === 'object') {
        for (const id of Object.keys(actions)) {
          if (seen.has(id)) errors.push(`scenes.${sceneId}.routers.${routerId} contains duplicate action id '${id}'`);
          seen.add(id);
        }
      }
    }
  }

  for (const sceneId of Object.keys(scenes)) {
    const visited = new Set();
    let current = sceneId;
    while (current && scenes[current]?.meta?.parentScene) {
      if (visited.has(current)) {
        errors.push(`scene parent cycle detected from '${sceneId}'`);
        break;
      }
      visited.add(current);
      current = scenes[current].meta.parentScene;
    }
  }

  for (const [automationId, automation] of Object.entries(scenario.templates?.automation || {})) {
    if (!Array.isArray(automation?.plan) || automation.plan.length === 0) {
      errors.push(`templates.automation.${automationId}.plan must contain at least one step`);
    }
  }

  const templates = scenario.templates || {};
  const inspectReferences = (value, path = '') => {
    if (!value || typeof value !== 'object') return;
    if (!Array.isArray(value) && typeof value.type === 'string' && typeof value.ref === 'string') {
      if (value.type === 'effect' && !Object.hasOwn(templates.effects || {}, value.ref)) {
        errors.push(`${path || 'scenario'} references missing effect template '${value.ref}'`);
      }
      if (value.type === 'req' && !Object.hasOwn(templates.requirements || {}, value.ref)) {
        errors.push(`${path || 'scenario'} references missing requirement template '${value.ref}'`);
      }
    }
    for (const [key, child] of Object.entries(value)) {
      if (child && typeof child === 'object') inspectReferences(child, path ? `${path}.${key}` : key);
    }
  };
  inspectReferences(scenario);

  const entryScene = scenario.meta?.entryScene;
  if (entryScene && !Object.hasOwn(scenes, entryScene)) {
    errors.push(`meta.entryScene references missing scene '${entryScene}'`);
  }
  const entryCharacter = scenario.meta?.entryCharacter;
  if (entryCharacter && entryCharacter !== 'player' && !Object.hasOwn(scenario.characters || {}, entryCharacter)) {
    errors.push(`meta.entryCharacter references missing character '${entryCharacter}'`);
  }

  return errors;
}

export function validateScenario(scenario) {
  if (!scenario || typeof scenario !== 'object' || Array.isArray(scenario)) {
    return ['root must be a JSON object'];
  }
  const errors = [];
  validateAgainstSchema(scenario);
  if (validateAgainstSchema.errors) {
    for (const error of validateAgainstSchema.errors) {
      const path = error.instancePath || '/';
      errors.push(`${path} ${error.message}`);
    }
  }
  errors.push(...validateReferences(scenario));
  return [...new Set(errors)];
}

export function normalizeScenario(input) {
  const scenario = clone(input);
  const errors = validateScenario(scenario);
  if (errors.length) throw new ScenarioValidationError(errors);

  scenario.formatVersion = scenario.formatVersion ?? SCENARIO_FORMAT_VERSION;
  for (const [sceneId, scene] of Object.entries(scenario.scenes)) {
    scene.set.activeRouterId ||= Object.keys(scene.routers)[0];
    for (const [routerId, router] of Object.entries(scene.routers)) {
      if (Array.isArray(router.actions)) {
        router.actions.forEach((action, index) => {
          if (action && typeof action === 'object' && !action.id) {
            action.id = `inline_${sceneId}_${routerId}_${index}`;
          }
        });
      }
    }
  }
  return scenario;
}
