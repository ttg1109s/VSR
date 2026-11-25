// engine/modules/Logic.js
import { resolveValue } from './Resolver.js';
import { getFakerRelationshipIdentityId } from './entity/Identity.js';

// --- 1. Comparison Operations ---
const Operations = {
    '==': (a, b) => a == b,
    '!=': (a, b) => a != b,
    '>': (a, b) => Number(a) > Number(b),
    '<': (a, b) => Number(a) < Number(b),
    '>=': (a, b) => Number(a) >= Number(b),
    '<=': (a, b) => Number(a) <= Number(b),
    'has': (a, b) => Array.isArray(a) ? a.includes(b) : false,
    '!has': (a, b) => Array.isArray(a) ? !a.includes(b) : false
};

const LogicGates = {
    AND: (results) => results.every(r => r.pass),
    OR: (results) => results.some(r => r.pass),
    NOT: (results) => !results[0].pass,
    XOR: (results) => results.filter(r => r.pass).length === 1
};

// Resolve runtime objects used by requirement checks.
const ObjectRetrievers = {
    scene: (engine, target) => engine.api.engine.state.getRuntime('scenes.[id]', { id: target }),
    router: (engine, target) => {
        const state = engine.api.engine.state;
        let key = `${state.sceneId}_${target}`;
        if (!state.getRuntime('routers.[routerKey]', { routerKey: key })) {
            const sourceSceneId = state.getSource('path.routers.[id]', { id: target });
            if (sourceSceneId) key = `${sourceSceneId}_${target}`;
        }
        return state.getRuntime('routers.[routerKey]', { routerKey: key });
    },
    action: (engine, target) => {
        if (!Object.prototype.hasOwnProperty.call(engine.src?.actions || {}, target)) return null;
        return engine.api.engine.state.getRuntime('actions.[id]', { id: target });
    },
    characters: (engine, target) => engine.api.engine.state.getRuntime('characters.[id]', { id: engine.redirectTarget(target) }),
    chat: (engine, target) => engine.api.engine.state.getRuntime('chats.[id]', { id: target }),
    chat_choice: (engine, target) => {
        const state = engine.api.engine.state;
        const map = state.getRuntime('map.choices.[id]', { id: target });
        if (!map) return null;
        return state.getRuntime('chats.[chatId].block.[blockId].choices.[idx]', map);
    },
    automation: (engine, target) => engine.api.engine.state.getRuntime('automations.[id]', { id: target })
};

const ItemStrategies = {
    inventory: (engine, c) => {
        const { op, value, broken } = c;
        const val = resolveValue(value, engine);
        const inv = engine.getInventory();

        // [UPDATED] Broken Logic: Default true (Allow broken items)
        // Set broken: false in logic config to filter them out.
        const allowBroken = broken !== false;

        const validInventory = allowBroken ? inv : inv.filter(id => {
            const usage = engine.api.engine.state.getRuntime('itemInfo.[id].usage', { id });
            return !usage || usage.current < usage.max;
        });

        return Operations[op]?.(validInventory, val) ?? false;
    },
    hand: (engine, c) => {
        const { op, value, broken } = c;
        const val = resolveValue(value, engine);
        const hand = engine.getHand();

        // [UPDATED] Broken Logic: Default true
        const allowBroken = broken !== false;

        const validHand = allowBroken ? hand : hand.filter(id => {
            const usage = engine.api.engine.state.getRuntime('itemInfo.[id].usage', { id });
            return !usage || usage.current < usage.max;
        });

        // Equality remains strict: same items, multiplicity, and order.
        if (op === '==') {
            const compareVal = Array.isArray(val) ? val : [val];
            return JSON.stringify(validHand) === JSON.stringify(compareVal);
        }

        return Operations[op]?.(validHand, val) ?? false;
    },
    usage: (engine, { target, op, value }) => {
        // [REFACTOR] Use API State
        const current = engine.api.engine.state.get('item.current', { id: target });
        return current !== undefined ? (Operations[op]?.(current, resolveValue(value, engine)) ?? false) : false;
    }
};

const StatsStrategies = {
    characters: (engine, { target, property, field, op, value }) => {
        const charId = engine.redirectTarget(target);
        const statId = property;
        const selectedField = field || 'current';
        if (!['current', 'max'].includes(selectedField)) return false;
        const fieldKey = selectedField === 'max' ? 'char.max' : 'char.current';

        const val = engine.api.engine.state.get(fieldKey, { charId, statId });
        return val !== undefined ? (Operations[op]?.(val, resolveValue(value, engine)) ?? false) : false;
    },
    item: (engine, { target, property, field, op, value }) => {
        const itemId = target;
        const statId = property;
        const selectedField = field || 'current';
        if (!['current', 'max'].includes(selectedField)) return false;

        const path = selectedField === 'max'
            ? 'itemInfo.[id].stats.[statId].max'
            : 'itemInfo.[id].stats.[statId].current';
        const val = engine.api.engine.state.get(path, { id: itemId, statId });

        return val !== undefined ? (Operations[op]?.(val, resolveValue(value, engine)) ?? false) : false;
    }
};

const RelationshipStrategies = {
    characters: (engine, { target, character, op, value }) => {
        if (!['has', '!has'].includes(op) || typeof character !== 'string' || !character) return false;

        const state = engine.api.engine.state;
        const runtimeOwnerId = engine.redirectTarget(target);
        const entryCharacter = state.getRuntime?.('entryCharacter', {}) || 'player';
        const faker = state.getRuntimeSnapshot?.('faker') || {};
        const ownerId = getFakerRelationshipIdentityId(runtimeOwnerId, entryCharacter, faker);
        const owner = state.getRuntime('characters.[id]', { id: ownerId });
        if (!owner) return false;

        // Relationship requirements read the canonical character-level collection.
        const relationships = Array.isArray(owner.relationship) ? owner.relationship : [];
        const tag = resolveValue(value, engine);
        if (typeof tag !== 'string') return false;

        const found = relationships.some(entry => {
            const relatedId = Array.isArray(entry)
                ? entry[1]
                : entry?.characterId;
            const relatedTag = Array.isArray(entry)
                ? entry[0]
                : entry?.tag;
            return relatedId === character && relatedTag === tag;
        });

        return op === 'has' ? found : !found;
    }
};

const CheckTypeHandlers = {
    item: (engine, c) => ItemStrategies[c.subtype]?.(engine, c) ?? false,
    state: (engine, c) => {
        // [REFACTOR] Use API State (Global State)
        const stateId = c.property;
        const val = engine.api.engine.state.get('globalState.value', { id: stateId });
        return val !== undefined ? (Operations[c.op]?.(val, resolveValue(c.value, engine)) ?? false) : false;
    },
    stats: (engine, c) => StatsStrategies[c.subtype]?.(engine, c) ?? false,
    relationship: (engine, c) => RelationshipStrategies.characters(engine, c),
    sprite: (engine, c) => {
        const runtime = engine.api.engine.state.getRuntimeSnapshot('sprites.[id]', { id: c.target });
        if (!runtime) return false;
        let actual;
        if (c.property === 'position') {
            const index = { x: 0, y: 1, z: 2 }[c.field];
            if (index === undefined || !Array.isArray(runtime.position) || typeof c.value !== 'number') return false;
            actual = runtime.position[index];
        } else {
            actual = runtime[c.property];
            if (c.property === 'state' && !['==','!='].includes(c.op)) return false;
            if (c.property === 'layer' && typeof c.value !== 'number') return false;
        }
        if (actual === undefined || actual === null) return false;
        return Operations[c.op]?.(actual, resolveValue(c.value, engine)) ?? false;
    },
    action_count: (engine, c) => {
        if (!['normal', 'pass', 'fail', 'pwFailed'].includes(c.phase)) return false;
        const action = ObjectRetrievers.action(engine, c.target);
        const count = action?.count?.[c.phase];
        if (!Number.isSafeInteger(count) || count < 0) return false;
        const expected = resolveValue(c.value, engine);
        if (!Number.isSafeInteger(expected) || expected < 0) return false;
        return Operations[c.op]?.(count, expected) ?? false;
    },
    set: (engine, c) => {
        const retriever = ObjectRetrievers[c.subtype];
        const obj = retriever ? retriever(engine, c.target) : null;
        if (obj?.set && obj.set[c.property] !== undefined) {
            return Operations[c.op]?.(obj.set[c.property], resolveValue(c.value, engine)) ?? false;
        }
        return false;
    }
};

export const LogicSystem = {
    checkReq(req) {
        if (req === null || req === undefined) {
            return { pass: false, type: 'invalid_requirement' };
        }
        return this.evaluateRequirementNode(req, []);
    },

    evaluateRequirementNode(node, refStack = []) {
        if (node && typeof node === 'object' && !Array.isArray(node) &&
            typeof node.ref === 'string') {
            const ref = node.ref;
            if (refStack.includes(ref)) {
                return { pass: false, type: 'invalid_requirement' };
            }
            const definition = this.src?.templates?.requirements?.[ref];
            if (!definition) {
                return { pass: false, type: 'invalid_requirement' };
            }
            return this.evaluateRequirementNode(definition, [...refStack, ref]);
        }

        if (!node || typeof node !== 'object' || Array.isArray(node) ||
            !Object.prototype.hasOwnProperty.call(node, 'logic') ||
            !Array.isArray(node.check) || node.check.length === 0) {
            return { pass: false, type: 'invalid_requirement' };
        }

        const results = node.check.map(child => {
            if (child && typeof child === 'object' && !Array.isArray(child) &&
                (typeof child.ref === 'string' ||
                (Object.prototype.hasOwnProperty.call(child, 'logic') && Array.isArray(child.check)))) {
                return this.evaluateRequirementNode(child, refStack);
            }
            return this.checkSingle(child);
        });

        if (node.logic === null) {
            return results.length === 1 ? results[0] : { pass: false, type: 'invalid_requirement' };
        }
        const gate = LogicGates[node.logic];
        if (!gate || (node.logic === 'NOT' && results.length !== 1)) {
            return { pass: false, type: 'invalid_requirement' };
        }
        // Invalid children are not ordinary false values: NOT must never turn
        // malformed/missing references into a passing requirement. Propagate
        // invalidity through every composed gate (fail closed).
        if (results.some(result => result?.type === 'invalid_requirement' || typeof result?.pass !== 'boolean')) {
            return { pass: false, type: 'invalid_requirement' };
        }
        return { pass: gate(results) };
    },

    compare(v1, op, v2) {
        return Operations[op]?.(resolveValue(v1, this), resolveValue(v2, this)) ?? false;
    },

    checkSingle(c) {
        const has = key => Object.prototype.hasOwnProperty.call(c || {}, key);
        const supportedSubtypes = {
            item: ['inventory', 'hand', 'usage'],
            stats: ['characters', 'item'],
            set: ['scene', 'router', 'action', 'characters', 'chat', 'chat_choice', 'automation', 'sprite']
        };
        const validShape = !!(c && typeof c === 'object' && !Array.isArray(c) &&
            typeof c.type === 'string' && Object.hasOwn(CheckTypeHandlers, c.type) &&
            typeof c.op === 'string' && Object.hasOwn(Operations, c.op) && has('value') &&
            (c.type === 'state' ? typeof c.property === 'string' && c.property.length > 0 : true) &&
            (c.type === 'item' ? supportedSubtypes.item.includes(c.subtype) && (c.subtype !== 'usage' || typeof c.target === 'string') : true) &&
            (c.type === 'stats' ? supportedSubtypes.stats.includes(c.subtype) && typeof c.target === 'string' && typeof c.property === 'string' && ['current', 'max'].includes(c.field) : true) &&
            (c.type === 'set' ? supportedSubtypes.set.includes(c.subtype) && typeof c.target === 'string' && typeof c.property === 'string' : true) &&
            (c.type === 'sprite' ? c.subtype === 'sprite' && typeof c.target === 'string' && ['state','layer','position'].includes(c.property) && (c.property === 'state' ? typeof c.value === 'string' && ['==','!='].includes(c.op) && !has('field') : c.property === 'layer' ? typeof c.value === 'number' && !has('field') : typeof c.value === 'number' && ['x','y','z'].includes(c.field)) : true) &&
            (c.type === 'relationship' ? typeof c.target === 'string' && typeof c.character === 'string' && ['has', '!has'].includes(c.op) && typeof c.value === 'string' : true) &&
            (c.type === 'action_count' ? typeof c.target === 'string' && ['normal', 'pass', 'fail', 'pwFailed'].includes(c.phase) : true));
        if (!validShape) return { pass: false, type: 'invalid_requirement' };

        // Static reference errors are invalid requirements, not ordinary false
        // checks. This prevents NOT from granting access through broken IDs.
        const dynamic = value => typeof value === 'string' && /^\$[A-Za-z_][A-Za-z0-9_]*\(/.test(value);
        const source = this.src;
        if (source && !dynamic(c.target)) {
            if (c.type === 'state' && source.globalStates && !Object.hasOwn(source.globalStates, c.property)) return { pass: false, type: 'invalid_requirement' };
            if (c.type === 'item' && c.subtype === 'usage' && source.itemInfo && !Object.hasOwn(source.itemInfo, c.target)) return { pass: false, type: 'invalid_requirement' };
            if (c.type === 'stats') {
                const collection = c.subtype === 'characters' ? source.characters : source.itemInfo;
                if (collection && !Object.hasOwn(collection, c.target)) return { pass: false, type: 'invalid_requirement' };
                if (collection?.[c.target]?.stats && !Object.hasOwn(collection[c.target].stats, c.property)) return { pass: false, type: 'invalid_requirement' };
            }
            if (c.type === 'set') {
                const exists = {
                    scene: () => Object.hasOwn(source.scenes || {}, c.target),
                    router: () => Object.hasOwn(source.path?.routers || {}, c.target),
                    action: () => Object.hasOwn(source.actions || {}, c.target),
                    characters: () => Object.hasOwn(source.characters || {}, c.target),
                    chat: () => Object.hasOwn(source.chat || {}, c.target),
                    chat_choice: () => Object.values(source.chat || {}).some(chat => Object.hasOwn(chat?.choice || {}, c.target)),
                    automation: () => Object.hasOwn(source.templates?.automation || {}, c.target),
                    sprite: () => Object.hasOwn(source.sprite || {}, c.target)
                }[c.subtype];
                if (exists && !exists()) return { pass: false, type: 'invalid_requirement' };
            }
            if (c.type === 'relationship' && source.characters &&
                (!Object.hasOwn(source.characters, c.target) || !Object.hasOwn(source.characters, c.character))) return { pass: false, type: 'invalid_requirement' };
            if (c.type === 'action_count' && source.actions && !Object.hasOwn(source.actions, c.target)) return { pass: false, type: 'invalid_requirement' };
            if (c.type === 'sprite' && source.sprite && !Object.hasOwn(source.sprite, c.target)) return { pass: false, type: 'invalid_requirement' };
        }
        if (c.type === 'item' && (c.subtype === 'inventory' || c.subtype === 'hand') && source?.itemInfo) {
            const value = c.value;
            if (!dynamic(value) && typeof value === 'string' && !Object.hasOwn(source.itemInfo, value)) return { pass: false, type: 'invalid_requirement' };
            if (Array.isArray(value) && value.some(id => !dynamic(id) && typeof id === 'string' && !Object.hasOwn(source.itemInfo, id))) return { pass: false, type: 'invalid_requirement' };
        }
        try {
            const handler = CheckTypeHandlers[c.type];
            return { pass: handler ? handler(this, c) : false };
        } catch (e) {
            return { pass: false };
        }
    },

    checkHardLock(type, target) {
        if (!target) return false;

        // [FIXED] Use this.api.engine.state.get for blocked status
        if (type === 'scene' || type === 'to_scene') {
            return !!this.api.engine.state.get('scene.blocked', { id: target });
        }
        if (type !== 'router') return false;
        const currentSceneId = this.api.engine.state.get('sceneId');
        const ownerSceneId = this.src?.path?.routers?.[target] || currentSceneId;
        if (!ownerSceneId || !this.src?.scenes?.[ownerSceneId]?.routers?.[target]) return false;
        return !!this.api.engine.state.get('router.blocked', { sceneId: ownerSceneId, routerId: target });
    }
};