// engine/modules/Logic.js
import { resolveValue } from '../../engine/modules/Resolver.js';
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
        const state = engine.api.engine.state;
        const sceneId = state.sceneId;
        const routerId = state.get('scene.activeRouterId', { id: sceneId });
        const key = `${sceneId}_${routerId}_${target}`;
        return state.getRuntime('actions.[actionKey]', { actionKey: key });
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

        // [UPDATED] Strict Check for Hand (Order & Exact Items)
        // If op is equality, verify strict array match
        if (op === '==') {
            const compareVal = Array.isArray(val) ? val : [val];
            // Convert to string to ensure exact items and order
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

        let definition = req;
        if (req && typeof req === 'object' && typeof req.ref === 'string') {
            definition = this.src?.templates?.requirements?.[req.ref];
        }
        if (
            !definition ||
            typeof definition !== 'object' ||
            Array.isArray(definition) ||
            !Object.prototype.hasOwnProperty.call(definition, 'logic') ||
            !Array.isArray(definition.check) ||
            definition.check.length === 0
        ) {
            return { pass: false, type: 'invalid_requirement' };
        }

        const results = definition.check.map(check => this.checkSingle(check));
        if (definition.logic === null) {
            return results.length === 1 ? results[0] : { pass: false, type: 'invalid_requirement' };
        }
        const gate = LogicGates[definition.logic];
        if (!gate || (definition.logic === 'NOT' && results.length !== 1)) {
            return { pass: false, type: 'invalid_requirement' };
        }
        return { pass: gate(results) };
    },

    compare(v1, op, v2) {
        return Operations[op]?.(resolveValue(v1, this), resolveValue(v2, this)) ?? false;
    },

    checkSingle(c) {
        if (!c || typeof c !== 'object' || Array.isArray(c)) return { pass: false };
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