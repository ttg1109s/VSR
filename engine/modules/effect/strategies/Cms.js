// htdocs/engine/modules/effect/strategies/Cms.js

import { resolveValue } from './Logic.js';

// --- Character Helper ---
const getCharacter = (engine, id) => {
    const charId = resolveValue(id, engine);
    return engine.state.characters[charId];
};

// --- Router Helper ---
const getRouter = (engine, id) => {
    const rawId = resolveValue(id, engine);
    // Try explicit global ID first
    if (engine.state.routers[rawId]) return engine.state.routers[rawId];

    // Try current scene ID prefix
    const sId = engine.state.sceneId;
    const globalId = `${sId}_${rawId}`;
    return engine.state.routers[globalId];
};

const ensureArray = (obj, prop) => {
    if (!Array.isArray(obj[prop])) obj[prop] = [];
    return obj[prop];
};

// --- Action Methods ---
const ActionMethods = {
    add: (targetArray, value) => {
        if (!targetArray.includes(value)) targetArray.push(value);
    },
    remove: (targetArray, value) => {
        const idx = targetArray.indexOf(value);
        if (idx > -1) targetArray.splice(idx, 1);
    },
    insert: (targetArray, value, index) => {
        const i = index !== undefined ? index : targetArray.length;
        targetArray.splice(i, 0, value);
    },
    empty: (targetArray) => {
        if (Array.isArray(targetArray)) {
            targetArray.length = 0;
        }
    }
};

// --- Relationship Methods ---
const RelationshipMethods = {
    add: (targetArray, value) => {
        if (Array.isArray(value) && value.length === 2) {
            const exists = targetArray.some(r => r[0] === value[0] && r[1] === value[1]);
            if (!exists) targetArray.push(value);
        }
    },
    remove: (targetArray, value, owner) => { // owner is character
        if (Array.isArray(value) && value.length === 2) {
            const idx = targetArray.findIndex(r => r[0] === value[0] && r[1] === value[1]);
            if (idx > -1) targetArray.splice(idx, 1);
        } else if (typeof value === 'string') {
            owner.set.relationship = targetArray.filter(r => r[0] !== value);
        }
    },
    insert: (targetArray, value, index) => {
        if (Array.isArray(value) && value.length === 2) {
            const i = index !== undefined ? index : targetArray.length;
            targetArray.splice(i, 0, value);
        }
    }
    // empty handled in dispatcher
};

// --- Met Methods ---
const MetMethods = {
    add: (owner, targetCharId) => {
        ensureArray(owner, 'met');
        let found = false;
        for (let i = 0; i < owner.met.length; i++) {
            const parts = owner.met[i].split(':');
            if (parts[0] === targetCharId) {
                const count = parseInt(parts[1] || '0') + 1;
                owner.met[i] = `${targetCharId}:${count}`;
                found = true;
                break;
            }
        }
        if (!found) {
            owner.met.push(`${targetCharId}:1`);
        }
    },
    set: (owner, value) => {
        ensureArray(owner, 'met');

        let targetId, targetCount;

        if (typeof value === 'object' && value !== null) {
            targetId = value.id;
            targetCount = value.count !== undefined ? value.count : 1;
        } else if (typeof value === 'string') {
            const inputParts = value.split(':');
            targetId = inputParts[0];
            targetCount = parseInt(inputParts[1] || '1');
        } else {
            console.warn("[Cms] MetMethods.set: Invalid value", value);
            return;
        }

        if (!targetId) return;

        let found = false;
        for (let i = 0; i < owner.met.length; i++) {
            const parts = owner.met[i].split(':');
            if (parts[0] === targetId) {
                owner.met[i] = `${targetId}:${targetCount}`;
                found = true;
                break;
            }
        }
        if (!found) {
            owner.met.push(`${targetId}:${targetCount}`);
        }
    },
    remove: (owner, targetCharId) => {
        ensureArray(owner, 'met');
        owner.met = owner.met.filter(item => {
            const parts = item.split(':');
            return parts[0] !== targetCharId;
        });
    },
    empty: (owner) => {
        owner.met = [];
    }
};


export const CmsStrategies = {
    characters: (engine, eff) => {
        const owner = getCharacter(engine, eff.id);
        if (!owner) return;

        const value = resolveValue(eff.value, engine);

        if (eff.column === 'relationship') {
            if (!owner.set) return;
            const targetArray = ensureArray(owner.set, 'relationship');

            if (eff.method === 'empty') {
                owner.set.relationship = [];
            } else if (eff.method === 'remove') {
                RelationshipMethods.remove(targetArray, value, owner);
            } else {
                RelationshipMethods[eff.method]?.(targetArray, value, eff.index);
            }

        } else if (eff.column === 'met') {
            MetMethods[eff.method]?.(owner, value);
        }
    },

    routers: (engine, eff) => {
        const router = getRouter(engine, eff.id);
        if (!router) return;

        const value = resolveValue(eff.value, engine);

        if (eff.column === 'actions') {
            const targetArray = ensureArray(router, 'actions');

            if (eff.method === 'empty') {
                ActionMethods.empty(targetArray);
            } else {
                ActionMethods[eff.method]?.(targetArray, value, eff.index);
            }
        }
    }
};