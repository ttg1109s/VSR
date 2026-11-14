// engine/modules/Logic.js
import { resolveValue } from '../../engine/modules/Resolver.js';

// --- 1. Comparison Operations ---
const Operations = {
    '==': (a, b) => a == b,
    '=': (a, b) => a == b,
    '!=': (a, b) => a != b,
    '>': (a, b) => Number(a) > Number(b),
    '<': (a, b) => Number(a) < Number(b),
    '>=': (a, b) => Number(a) >= Number(b),
    '<=': (a, b) => Number(a) <= Number(b),
    'has': (a, b) => Array.isArray(a) ? a.includes(b) : false,
    '!has': (a, b) => Array.isArray(a) ? !a.includes(b) : true
};

const LogicGates = {
    AND: (results) => results.every(r => r.pass),
    OR: (results) => results.some(r => r.pass),
    NOT: (results) => !results[0].pass,
    XOR: (results) => results.filter(r => r.pass).length === 1
};

// [LEGACY] ObjectRetrievers maintained for 'set' checks which might need object references
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
        return state.getRuntime('chats.[chatId].blocks.[blockId].choices.[idx]', map);
    },
    automation: (engine, target) => engine.api.engine.state.getRuntime('automations.[id]', { id: target })
};

const ItemStrategies = {
    inventory: (engine, c) => {
        const { op, value, broken } = c;
        const val = resolveValue(value, engine);
        const inv = engine.getInventory ? engine.getInventory() : (engine.api.engine.state.getRuntime('inventory') || []);

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
        const hand = engine.getHand ? engine.getHand() : (engine.api.engine.state.getRuntime('hand') || []);

        // [UPDATED] Broken Logic: Default true
        const allowBroken = broken !== false;

        const validHand = allowBroken ? hand : hand.filter(id => {
            const usage = engine.api.engine.state.getRuntime('itemInfo.[id].usage', { id });
            return !usage || usage.current < usage.max;
        });

        // [UPDATED] Strict Check for Hand (Order & Exact Items)
        // If op is equality, verify strict array match
        if (op === '==' || op === '=') {
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
        // Schema keys: 'char.current' -> 'characters.[charId].stats.[statId].current'
        const fieldKey = (field === 'max') ? 'char.max' : 'char.current';

        const val = engine.api.engine.state.get(fieldKey, { charId, statId });
        return val !== undefined ? (Operations[op]?.(val, resolveValue(value, engine)) ?? false) : false;
    },
    item: (engine, { target, property, field, op, value }) => {
        // Assuming similar structure for item stats if needed, otherwise fallback to raw path?
        const itemId = target;
        const statId = property;
        const f = field || 'current';

        // Try direct path construction supported by API
        const path = `itemInfo.${itemId}.stats.${statId}.${f}`;
        const val = engine.api.engine.state.get(path);

        return val !== undefined ? (Operations[op]?.(val, resolveValue(value, engine)) ?? false) : false;
    }
};

const CheckTypeHandlers = {
    item: (engine, c) => ItemStrategies[c.subtype]?.(engine, c) ?? false,
    state: (engine, c) => {
        // [REFACTOR] Use API State (Global State)
        const val = engine.api.engine.state.get('globalState.value', { id: c.target });
        return val !== undefined ? (Operations[c.op]?.(val, resolveValue(c.value, engine)) ?? false) : false;
    },
    stats: (engine, c) => StatsStrategies[c.subtype]?.(engine, c) ?? false,
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
        if (!req) return { pass: true };
        if (req.logic && req.check?.length > 0) {
            const results = req.check.map(c => this.checkSingle(c));
            const gate = LogicGates[req.logic];
            if (gate) return { pass: gate(results) };
        }
        if (req.check?.length === 1) {
            return this.checkSingle(req.check[0]);
        }
        return { pass: true };
    },

    compare(v1, op, v2) {
        return Operations[op]?.(resolveValue(v1, this), resolveValue(v2, this)) ?? false;
    },

    checkSingle(c) {
        if (!c) return { pass: true };
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
            return this.api.engine.state.get('scene.blocked', { id: target });
        } else {
            // For router, we need sceneId to construct the context for API
            // Try to find the scene containing this router
            const sId = this.api.engine.state.get('sceneId');
            // Note: Schema for router blocked is 'router.blocked' -> 'scenes.[sceneId].routers.[routerId].set.blocked'

            // Priority 1: Check in current scene
            let isBlocked = this.api.engine.state.get('router.blocked', { sceneId: sId, routerId: target });

            // Priority 2: If undefined (maybe router is in another scene referenced globally), use legacy search logic
            if (isBlocked === undefined && this.src.path?.routers[target]) {
                const parentSceneId = this.src.path.routers[target][0];
                isBlocked = this.api.engine.state.get('router.blocked', { sceneId: parentSceneId, routerId: target });
            }

            return !!isBlocked;
        }
    }
};