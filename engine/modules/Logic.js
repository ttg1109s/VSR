// engine/modules/Logic.js
import { resolveValue } from '../../engine/modules/Resolver.js';
import { API } from '../../api/index.js';

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
    scene: (engine, target) => engine.state.scenes[target],
    router: (engine, target) => {
        let rKey = `${engine.state.sceneId}_${target}`;
        if (!engine.state.routers[rKey] && engine.src.path.routers[target]) {
            rKey = `${engine.src.path.routers[target][0]}_${target}`;
        }
        return engine.state.routers[rKey];
    },
    action: (engine, target) => {
        let aKey = `${engine.state.sceneId}_${engine.state.scenes[engine.state.sceneId].activeRouterId}_${target}`;
        if (!engine.state.actions[aKey] && engine.src.path.actions[target]) {
            const p = engine.src.path.actions[target];
            aKey = `${p[1]}_${p[0]}_${target}`;
        }
        return engine.state.actions[aKey];
    },
    characters: (engine, target) => engine.state.characters[engine.redirectTarget(target)],
    chat: (engine, target) => engine.state.chats[target],
    chat_choice: (engine, target) => {
        const map = engine.state.map.choices[target];
        if (map) {
            const chat = engine.state.chats[map.chatId];
            return chat?.blocks?.[map.blockId]?.choices?.[map.idx];
        }
        return null;
    },
    automation: (engine, target) => engine.state.automations[target]
};

const ItemStrategies = {
    inventory: (engine, c) => {
        const { op, value, broken } = c;
        const val = resolveValue(value, engine);
        const inv = engine.getInventory ? engine.getInventory() : engine.state.inventory;

        // [UPDATED] Broken Logic: Default true (Allow broken items)
        // Set broken: false in logic config to filter them out.
        const allowBroken = broken !== false;

        const validInventory = allowBroken ? inv : inv.filter(id => {
            const usage = engine.state.itemInfo[id]?.usage;
            return !usage || usage.current < usage.max;
        });

        return Operations[op]?.(validInventory, val) ?? false;
    },
    hand: (engine, c) => {
        const { op, value, broken } = c;
        const val = resolveValue(value, engine);
        const hand = engine.getHand ? engine.getHand() : engine.state.hand;

        // [UPDATED] Broken Logic: Default true
        const allowBroken = broken !== false;

        const validHand = allowBroken ? hand : hand.filter(id => {
            const usage = engine.state.itemInfo[id]?.usage;
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
        const current = API.engine.state.get('item.current', { id: target });
        return current !== undefined ? (Operations[op]?.(current, resolveValue(value, engine)) ?? false) : false;
    }
};

const StatsStrategies = {
    characters: (engine, { target, property, field, op, value }) => {
        const charId = engine.redirectTarget(target);
        const statId = property;
        // Schema keys: 'char.current' -> 'characters.[charId].stats.[statId].current'
        const fieldKey = (field === 'max') ? 'char.max' : 'char.current';

        const val = API.engine.state.get(fieldKey, { charId, statId });
        return val !== undefined ? (Operations[op]?.(val, resolveValue(value, engine)) ?? false) : false;
    },
    item: (engine, { target, property, field, op, value }) => {
        // Assuming similar structure for item stats if needed, otherwise fallback to raw path?
        const itemId = target;
        const statId = property;
        const f = field || 'current';

        // Try direct path construction supported by API
        const path = `itemInfo.${itemId}.stats.${statId}.${f}`;
        const val = API.engine.state.get(path);

        return val !== undefined ? (Operations[op]?.(val, resolveValue(value, engine)) ?? false) : false;
    }
};

const CheckTypeHandlers = {
    item: (engine, c) => ItemStrategies[c.subtype]?.(engine, c) ?? false,
    state: (engine, c) => {
        // [REFACTOR] Use API State (Global State)
        const val = API.engine.state.get('globalState.value', { id: c.target });
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

        // [FIXED] Use API.engine.state.get for blocked status
        if (type === 'scene' || type === 'to_scene') {
            return API.engine.state.get('scene.blocked', { id: target });
        } else {
            // For router, we need sceneId to construct the context for API
            // Try to find the scene containing this router
            const sId = this.state.sceneId;
            // Note: Schema for router blocked is 'router.blocked' -> 'scenes.[sceneId].routers.[routerId].set.blocked'

            // Priority 1: Check in current scene
            let isBlocked = API.engine.state.get('router.blocked', { sceneId: sId, routerId: target });

            // Priority 2: If undefined (maybe router is in another scene referenced globally), use legacy search logic
            if (isBlocked === undefined && this.src.path?.routers[target]) {
                const parentSceneId = this.src.path.routers[target][0];
                isBlocked = API.engine.state.get('router.blocked', { sceneId: parentSceneId, routerId: target });
            }

            return !!isBlocked;
        }
    }
};