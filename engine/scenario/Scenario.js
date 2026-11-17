import Ajv from 'ajv';
import { scenarioSchema } from './ScenarioSchema.js';
import addFormats from 'ajv-formats';
import { COMMUNICATION_SENDER_ID } from '../modules/chat/systemSenders.js';

export const SCENARIO_FORMAT_VERSION = scenarioSchema.properties.formatVersion.const;

export class ScenarioValidationError extends Error {
  constructor(errors) {
    super(`Invalid VSR scenario: ${errors.join('; ')}`);
    this.name = 'ScenarioValidationError';
    this.code = 'INVALID_SCENARIO';
    this.errors = errors;
  }
}

const ajv = new Ajv({
  allErrors: true,
  strict: false,
  allowUnionTypes: true,
  useDefaults: true
});
addFormats(ajv);
const validateAgainstSchema = ajv.compile(scenarioSchema);

function clone(input) {
  try {
    const serialized = JSON.stringify(input);
    if (serialized === undefined) throw new TypeError('Scenario root is not JSON-serializable.');
    return JSON.parse(serialized);
  } catch (error) {
    throw new ScenarioValidationError([`Scenario must be JSON-compatible: ${error.message}`]);
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function validateReferences(scenario) {
  const errors = [];
  const scenes = scenario.scenes || {};
  const actions = scenario.actions || {};
  const characters = scenario.characters || {};
  const items = scenario.itemInfo || {};
  const chats = scenario.chat || {};
  const endings = scenario.endings || {};
  const passwords = scenario.passwords || {};
  const templates = scenario.templates || {};
  const routerOwners = new Map();
  const allRouterIds = new Set(Object.values(scenes).flatMap(scene => Object.keys(scene?.routers || {})));

  const add = (path, message) => errors.push(`${path}: ${message}`);
  const routerExists = (id) => allRouterIds.has(id);
  const characterExists = (id) => id === 'player' || Object.hasOwn(characters, id);
  const actionExists = (id) => Object.hasOwn(actions, id) || Object.values(scenes).some(scene =>
    Object.values(scene?.routers || {}).some(router =>
      Array.isArray(router.actions) && router.actions.some(item => item === id || (isObject(item) && item.id === id))
    )
  );

  for (const [sceneId, scene] of Object.entries(scenes)) {
    const parentId = scene?.meta?.parentScene;
    if (parentId && !Object.hasOwn(scenes, parentId)) {
      add(`scenes.${sceneId}.meta.parentScene`, `references missing scene '${parentId}'`);
    }

    const routerIds = Object.keys(scene?.routers || {});
    if (!routerIds.length) add(`scenes.${sceneId}.routers`, 'must contain at least one router');
    if (scene?.set?.activeRouterId && !routerIds.includes(scene.set.activeRouterId)) {
      add(`scenes.${sceneId}.set.activeRouterId`, `references missing router '${scene.set.activeRouterId}' in this scene`);
    }

    for (const [routerId, router] of Object.entries(scene?.routers || {})) {
      if (router?.meta?.sceneID && router.meta.sceneID !== sceneId) {
        add(`scenes.${sceneId}.routers.${routerId}.meta.sceneID`, `must equal containing scene ID '${sceneId}'`);
      }
      if (routerOwners.has(routerId)) {
        add(`scenes.${sceneId}.routers.${routerId}`, `router ID is not globally unique; already declared in scene '${routerOwners.get(routerId)}'`);
      } else {
        routerOwners.set(routerId, sceneId);
      }

      const seen = new Set();
      const routerActions = router?.actions;
      if (Array.isArray(routerActions)) {
        routerActions.forEach((action, index) => {
          const path = `scenes.${sceneId}.routers.${routerId}.actions[${index}]`;
          if (typeof action === 'string') {
            if (!Object.hasOwn(actions, action)) add(path, `references missing global action '${action}'`);
            if (seen.has(action)) add(path, `duplicates action ID '${action}' in this router`);
            seen.add(action);
          }
          if (isObject(action) && action.id) {
            if (seen.has(action.id)) add(path, `duplicates action ID '${action.id}' in this router`);
            seen.add(action.id);
          }
        });
      }
    }
  }

  for (const sceneId of Object.keys(scenes)) {
    const visited = new Set();
    let current = sceneId;
    while (current && scenes[current]?.meta?.parentScene) {
      if (visited.has(current)) {
        add(`scenes.${sceneId}.meta.parentScene`, 'scene parent cycle detected');
        break;
      }
      visited.add(current);
      current = scenes[current].meta.parentScene;
    }
  }

  const isDynamicExpression = value => typeof value === 'string' && /^\$[A-Za-z_][A-Za-z0-9_]*\(/.test(value);

  const validatePasswordRef = (reference, path) => {
    if (typeof reference !== 'string' || isDynamicExpression(reference)) return;
    const parts = reference.split(':');
    if (parts.length !== 2 || !parts[0] || !parts[1] || !Object.hasOwn(passwords[parts[0]] || {}, parts[1])) {
      add(path, `references invalid password '${reference}' (expected type:id)`);
    }
  };

  const validateRequirement = (requirement, path) => {
    if (!isObject(requirement)) return;
    if (typeof requirement.ref === 'string') {
      if (!Object.hasOwn(templates.requirements || {}, requirement.ref)) {
        add(path, "references missing requirement template '" + requirement.ref + "'");
      }
      return;
    }
    for (const [index, check] of asArray(requirement.check).entries()) {
      const checkPath = path + ".check[" + index + "]";
      if (!isObject(check)) {
        add(checkPath, 'must be a requirement check object');
        continue;
      }
      if (check.type === 'state') {
        const stateDef = scenario.globalStates?.[check.property];
        if (!stateDef) add(checkPath + ".property", "references missing global state '" + check.property + "'");
        else if (check.value !== undefined && typeof check.value !== stateDef.type) {
          add(checkPath + ".value", "must match global state type '" + stateDef.type + "'");
        }
      }
      if (check.type === 'item') {
        if (check.subtype === 'usage' && !Object.hasOwn(items, check.target)) {
          add(checkPath + ".target", "references missing item '" + check.target + "'");
        }
        if ((check.subtype === 'inventory' || check.subtype === 'hand') && typeof check.value === 'string' && !Object.hasOwn(items, check.value)) {
          add(checkPath + ".value", "references missing item '" + check.value + "'");
        }
        if (check.subtype === 'hand' && Array.isArray(check.value)) {
          check.value.forEach((id, itemIndex) => {
            if (!Object.hasOwn(items, id)) add(checkPath + ".value[" + itemIndex + "]", "references missing item '" + id + "'");
          });
        }
      }
      if (check.type === 'stats') {
        const collection = check.subtype === 'characters' ? characters : items;
        if (!Object.hasOwn(collection, check.target)) add(checkPath + ".target", "references missing stat owner '" + check.target + "'");
        else if (check.property && !Object.hasOwn(collection[check.target]?.stats || {}, check.property)) {
          add(checkPath + ".property", "references missing stat '" + check.property + "'");
        }
      }
      if (check.type === 'set') {
        const exists = {
          scene: () => Object.hasOwn(scenes, check.target),
          router: () => routerExists(check.target),
          action: () => actionExists(check.target),
          characters: () => characterExists(check.target),
          chat: () => Object.hasOwn(chats, check.target),
          chat_choice: () => Object.values(chats).some(chat => Object.hasOwn(chat?.choice || {}, check.target)),
          automation: () => Object.hasOwn(templates.automation || {}, check.target)
        }[check.subtype];
        if (exists && !exists()) add(checkPath + ".target", "references missing " + check.subtype + " target '" + check.target + "'");
      }
      if (check.type === 'relationship') {
        if (!characterExists(check.target)) {
          add(checkPath + ".target", "references missing relationship owner character '" + check.target + "'");
        }
        if (!characterExists(check.character)) {
          add(checkPath + ".character", "references missing related character '" + check.character + "'");
        }
      }
    }
  };

  const validateWrapper = (wrapper, path) => {
    if (!isObject(wrapper)) return;
    if (wrapper.type === 'effect' && typeof wrapper.ref === 'string' &&
        !Object.hasOwn(templates.effects || {}, wrapper.ref)) {
      add(path, `references missing effect template '${wrapper.ref}'`);
    }
    if (wrapper.type === 'effect' && !wrapper.ref && !wrapper.inline) {
      add(path, "type 'effect' requires either ref or inline payload");
    }
    if (wrapper.type === 'manage_effect' && !wrapper.inline) {
      add(path, "type 'manage_effect' requires an inline management payload");
    }
    if (wrapper.type === 'manage_effect' && isObject(wrapper.inline)) {
      const config = wrapper.inline;
      const targetExists = {
        router: () => routerExists(config.target),
        character: () => characterExists(config.target),
        action: () => actionExists(config.target),
        chat: () => Object.hasOwn(chats, config.target),
        item: () => Object.hasOwn(items, config.target)
      }[config.space];
      if (targetExists && !targetExists()) {
        add(path + '.inline.target', "references missing " + config.space + " target '" + config.target + "'");
      }
      if (config.space === 'chat' && typeof config.in === 'string') {
        const [blockId, choiceId] = config.in.split(':');
        const chat = chats[config.target];
        if (blockId && !Object.hasOwn(chat?.block || {}, blockId)) {
          add(path + '.inline.in', "references missing chat block '" + blockId + "'");
        }
        if (choiceId && !Object.hasOwn(chat?.choice || {}, choiceId)) {
          add(path + '.inline.in', "references missing chat choice group '" + choiceId + "'");
        }
      }
    }
    validateRequirement(wrapper.req, path + '.req');
  };

  const validateAction = (action, path) => {
    if (!isObject(action)) return;
    const set = action.set || {};
    if (Object.hasOwn(set, 'type') || Object.hasOwn(set, 'target') ||
        Object.hasOwn(set, 'countClicks') || Object.hasOwn(set, 'countFails')) {
      add(`${path}.set`, 'uses removed Action fields (type/target/countClicks/countFails); move behavior into effect and use runtime count phases.');
    }
    if (typeof set.password === 'string') validatePasswordRef(set.password, `${path}.set.password`);
    if (Array.isArray(set.charAllow)) {
      set.charAllow.forEach((id, index) => {
        if (!characterExists(id)) add(`${path}.set.charAllow[${index}]`, `references missing character '${id}'`);
      });
    }
    validateRequirement(action.requirement, path + '.requirement');
  };

  const validateEffectPayload = (effect, path) => {
    if (!isObject(effect)) return;
    const dynamicTarget = isDynamicExpression(effect.target);
    if (effect.type === 'goto' && !dynamicTarget) {
      if (effect.subtype === 'scene' && effect.target && !Object.hasOwn(scenes, effect.target)) {
        add(`${path}.target`, `references missing scene '${effect.target}'`);
      } else if (effect.subtype === 'router' && effect.target && !routerExists(effect.target)) {
        add(`${path}.target`, `references missing router '${effect.target}'`);
      } else if (effect.subtype === 'chat' && effect.target && !Object.hasOwn(chats, effect.target)) {
        add(`${path}.target`, `references missing chat '${effect.target}'`);
      } else if (effect.subtype === 'end' && effect.target && !Object.hasOwn(endings, effect.target)) {
        add(`${path}.target`, `references missing ending '${effect.target}'`);
      } else if (effect.subtype === 'in_faker' && typeof effect.target === 'string') {
        const targetCharacter = effect.target.includes(':') ? effect.target.split(':').at(-1) : effect.target;
        if (!characterExists(targetCharacter)) add(`${path}.target`, `references missing faker character '${targetCharacter}'`);
      }
    }
    if (effect.type === 'item' && effect.target && !dynamicTarget && !Object.hasOwn(items, effect.target)) {
      add(`${path}.target`, `references missing item '${effect.target}'`);
    }
    if (effect.type === 'characters' && effect.target && !dynamicTarget) {
      if (['mng_stats', 'mng_items'].includes(effect.subtype) && typeof effect.target === 'string' && effect.target.includes(':')) {
        add(`${path}.target`, 'must contain only the destination character ID; provide source in the separate source field');
      }
      if (!characterExists(effect.target)) add(`${path}.target`, `references missing character '${effect.target}'`);
      if (['mng_stats', 'mng_items'].includes(effect.subtype) && typeof effect.source === 'string' && !isDynamicExpression(effect.source) && !characterExists(effect.source)) {
        add(`${path}.source`, `references missing source character '${effect.source}'`);
      }
    }
    if (effect.type === 'cms' && typeof effect.id === 'string' && !effect.id.includes('$(')) {
      if (effect.table === 'characters' && !characterExists(effect.id)) {
        add(`${path}.id`, `references missing character '${effect.id}'`);
      }
      if (effect.table === 'routers' && !routerExists(effect.id)) {
        add(`${path}.id`, `references missing router '${effect.id}'`);
      }
    }
    if (effect.type === 'set' && effect.target && !dynamicTarget) {
      const exists = {
        state: () => Object.hasOwn(scenario.globalStates || {}, effect.target),
        scene: () => Object.hasOwn(scenes, effect.target),
        router: () => routerExists(effect.target),
        action: () => actionExists(effect.target),
        character: () => characterExists(effect.target),
        chat: () => Object.hasOwn(chats, effect.target),
        chat_choice: () => Object.values(chats).some(chat => Object.hasOwn(chat?.choice || {}, effect.target)),
        automation: () => Object.hasOwn(templates.automation || {}, effect.target)
      }[effect.subtype];
      if (exists && !exists()) add(`${path}.target`, `references missing ${effect.subtype} target '${effect.target}'`);
    }
  };

  const effectTemplateGraph = new Map();
  const collectEffectRefs = (value, refs) => {
    if (Array.isArray(value)) {
      value.forEach(item => collectEffectRefs(item, refs));
      return;
    }
    if (!isObject(value)) return;
    if (value.type === 'effect' && typeof value.ref === 'string') refs.push(value.ref);
    for (const child of Object.values(value)) collectEffectRefs(child, refs);
  };
  for (const [templateId, content] of Object.entries(templates.effects || {})) {
    const refs = [];
    collectEffectRefs(content, refs);
    effectTemplateGraph.set(templateId, refs);
  }
  const visitedEffectTemplates = new Set();
  const activeEffectTemplates = [];
  const visitEffectTemplate = (templateId) => {
    if (activeEffectTemplates.includes(templateId)) {
      const cycle = [...activeEffectTemplates.slice(activeEffectTemplates.indexOf(templateId)), templateId];
      add('templates.effects.' + templateId, 'contains recursive effect-template cycle: ' + cycle.join(' -> '));
      return;
    }
    if (visitedEffectTemplates.has(templateId)) return;
    activeEffectTemplates.push(templateId);
    for (const ref of effectTemplateGraph.get(templateId) || []) {
      if (effectTemplateGraph.has(ref)) visitEffectTemplate(ref);
    }
    activeEffectTemplates.pop();
    visitedEffectTemplates.add(templateId);
  };
  for (const templateId of effectTemplateGraph.keys()) visitEffectTemplate(templateId);

  const inspect = (value, path = 'scenario') => {
    if (Array.isArray(value)) {
      value.forEach((child, index) => inspect(child, `${path}[${index}]`));
      return;
    }
    if (!isObject(value)) return;

    if (value.type && ['effect','item','set','goto','characters','cms','notify','vfx','manage_effect','skip_all'].includes(value.type)) {
      validateWrapper(value, path);
      if (value.type !== 'effect' && value.type !== 'skip_all') validateEffectPayload(value, path);
    }
    if (isObject(value.set) && typeof value.set.password === 'string') {
      validatePasswordRef(value.set.password, `${path}.set.password`);
    }
    for (const [key, child] of Object.entries(value)) inspect(child, `${path}.${key}`);
  };

  for (const [actionId, action] of Object.entries(actions)) validateAction(action, 'actions.' + actionId);
  for (const [itemId, item] of Object.entries(items)) validateRequirement(item?.requirements, 'itemInfo.' + itemId + '.requirements');
  for (const [templateId, requirement] of Object.entries(templates.requirements || {})) validateRequirement(requirement, 'templates.requirements.' + templateId);
  for (const [sceneId, scene] of Object.entries(scenes)) {
    for (const [routerId, router] of Object.entries(scene?.routers || {})) {
      if (!Array.isArray(router.actions)) continue;
      const entries = router.actions.map((item, index) => [index, item]);
      for (const [key, item] of entries) {
        if (isObject(item)) validateAction(item, `scenes.${sceneId}.routers.${routerId}.actions.${key}`);
      }
    }
  }

  for (const [characterId, character] of Object.entries(characters)) {
    for (const [index, move] of asArray(character?.moveList).entries()) {
      if (move?.scene_id && !Object.hasOwn(scenes, move.scene_id)) {
        add(`characters.${characterId}.moveList[${index}].scene_id`, `references missing scene '${move.scene_id}'`);
      }
      validateRequirement(move?.req, `characters.${characterId}.moveList[${index}].req`);
    }
    const placeScene = character?.place?.scene_id;
    if (placeScene && !Object.hasOwn(scenes, placeScene)) {
      add(`characters.${characterId}.place.scene_id`, `references missing scene '${placeScene}'`);
    }
    for (const [index, itemId] of [...asArray(character?.inventory), ...asArray(character?.hand)].entries()) {
      if (!Object.hasOwn(items, itemId)) add(`characters.${characterId}.inventory/hand[${index}]`, `references missing item '${itemId}'`);
    }
    if (character?.set?.mainAction && !actionExists(character.set.mainAction)) {
      add(`characters.${characterId}.set.mainAction`, `references missing action '${character.set.mainAction}'`);
    }
    for (const scope of ['meeting','leave']) {
      for (const targetId of Object.keys(character?.effect?.[scope] || {})) {
        if (!characterExists(targetId)) add(`characters.${characterId}.effect.${scope}.${targetId}`, `references missing character '${targetId}'`);
      }
    }
  }

  const globalChoiceIds = new Map();
  for (const [chatId, chat] of Object.entries(chats)) {
    const blocks = chat?.block || {};
    const choices = chat?.choice || {};
    const entry = chat?.meta?.entry;
    if (entry && !Object.hasOwn(blocks, entry)) add(`chat.${chatId}.meta.entry`, `references missing entry block '${entry}'`);
    // Sender IDs are not all Characters: `$communication` is built in and
    // undeclared sender IDs are intentionally grouped as unknown/spam.
    for (const [index, recipient] of asArray(chat?.meta?.to).entries()) {
      if (!characterExists(recipient)) add(`chat.${chatId}.meta.to[${index}]`, `references missing character '${recipient}'`);
    }
    for (const [blockId, block] of Object.entries(blocks)) {
      if (block?.choice_id && !Object.hasOwn(choices, block.choice_id)) {
        add(`chat.${chatId}.block.${blockId}.choice_id`, `references missing choice group '${block.choice_id}'`);
      }
      for (const [index, line] of asArray(block?.line).entries()) {
        if (line?.char_id && !characterExists(line.char_id) &&
            line.char_id !== COMMUNICATION_SENDER_ID && line.char_id !== chat?.meta?.sender) {
          add(`chat.${chatId}.block.${blockId}.line[${index}].char_id`, `references missing character or chat sender '${line.char_id}'`);
        }
      }
    }
    for (const [choiceId, list] of Object.entries(choices)) {
      for (const [index, choice] of asArray(list).entries()) {
        if (choice?.id) {
          if (globalChoiceIds.has(choice.id)) add(`chat.${chatId}.choice.${choiceId}[${index}].id`, `choice ID '${choice.id}' is already used in chat '${globalChoiceIds.get(choice.id)}'`);
          else globalChoiceIds.set(choice.id, chatId);
        }
        if (choice?.jump && !Object.hasOwn(blocks, choice.jump)) {
          add(`chat.${chatId}.choice.${choiceId}[${index}].jump`, `references missing block '${choice.jump}'`);
        }
      }
    }
  }

  for (const [passwordId, password] of Object.entries(passwords.find_way || {})) {
    const path = `passwords.find_way.${passwordId}`;
    const [cols, rows] = Array.isArray(password?.area) ? password.area : [];
    const inBounds = (point) => Array.isArray(point) && point.length === 2 &&
      Number.isInteger(point[0]) && Number.isInteger(point[1]) &&
      point[0] >= 0 && point[0] < cols && point[1] >= 0 && point[1] < rows;
    if (!inBounds(password?.start)) add(`${path}.start`, 'must be inside the configured grid');
    if (!inBounds(password?.target)) add(`${path}.target`, 'must be inside the configured grid');
    const street = Array.isArray(password?.street) ? password.street : [];
    street.forEach((point, index) => {
      if (!inBounds(point)) add(`${path}.street[${index}]`, 'must be inside the configured grid');
      if (index > 0 && Array.isArray(point) && Array.isArray(street[index - 1])) {
        const previous = street[index - 1];
        const distance = Math.abs(point[0] - previous[0]) + Math.abs(point[1] - previous[1]);
        if (distance !== 1) add(`${path}.street[${index}]`, 'must be orthogonally adjacent to the previous point');
      }
    });
    if (street.length && JSON.stringify(street[0]) !== JSON.stringify(password?.start)) {
      add(`${path}.street[0]`, 'must equal start');
    }
    if (street.length && JSON.stringify(street.at(-1)) !== JSON.stringify(password?.target)) {
      add(`${path}.street[${street.length - 1}]`, 'must equal target');
    }
    const seen = new Set();
    street.forEach((point, index) => {
      const key = Array.isArray(point) ? point.join(',') : String(point);
      if (seen.has(key)) add(`${path}.street[${index}]`, 'must not revisit a grid cell');
      seen.add(key);
    });
  }

  for (const [automationId, automation] of Object.entries(templates.automation || {})) {
    if (!Array.isArray(automation?.plan) || automation.plan.length === 0) {
      add(`templates.automation.${automationId}.plan`, 'must contain at least one step');
    }
  }

  inspect(scenario);

  const entryScene = scenario.meta?.entryScene;
  if (typeof entryScene !== 'string' || !Object.hasOwn(scenes, entryScene)) {
    add('meta.entryScene', `must reference an existing scene; received '${entryScene}'`);
  }
  const entryCharacter = scenario.meta?.entryCharacter;
  if (entryCharacter && !characterExists(entryCharacter)) {
    add('meta.entryCharacter', `references missing character '${entryCharacter}'`);
  }

  return [...new Set(errors)];
}

export function validateScenario(scenario) {
  if (!isObject(scenario)) return ['root must be a JSON object'];

  let candidate;
  try {
    candidate = clone(scenario);
  } catch (error) {
    return error instanceof ScenarioValidationError ? error.errors : [error.message];
  }

  const errors = [];
  validateAgainstSchema(candidate);
  for (const error of validateAgainstSchema.errors || []) {
    const path = error.instancePath || '/';
    errors.push(path + ' ' + error.message);
  }
  errors.push(...validateReferences(candidate));
  return [...new Set(errors)];
}

export function normalizeScenario(input) {
  const scenario = clone(input);
  if (!isObject(scenario)) throw new ScenarioValidationError(['root must be a JSON object']);

  if (isObject(scenario.meta) && scenario.meta.entryCharacter == null) {
    scenario.meta.entryCharacter = 'player';
  }
  // The single compiled validator also applies schema defaults (useDefaults: true).
  validateAgainstSchema(scenario);

  for (const [sceneId, scene] of Object.entries(isObject(scenario.scenes) ? scenario.scenes : {})) {
    for (const [routerId, router] of Object.entries(isObject(scene?.routers) ? scene.routers : {})) {
      if (Array.isArray(router?.actions)) {
        router.actions.forEach((action, index) => {
          if (action && typeof action === 'object' && !Array.isArray(action) && !action.id) {
            action.id = 'inline_' + sceneId + '_' + routerId + '_' + index;
          }
        });
      }
    }
  }

  const errors = validateScenario(scenario);
  if (errors.length) throw new ScenarioValidationError(errors);
  return scenario;
}
