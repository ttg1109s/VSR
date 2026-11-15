// Centralized CMS state mutations. Every update is applied to a transaction draft.
import { resolveValue } from './Logic.js';

function resolveCharacterId(engine, value) {
    return resolveValue(value, engine);
}

function resolveRouterKey(engine, value, tx) {
    const routerId = resolveValue(value, engine);
    if (tx.get(`routers.[routerKey]`, { routerKey: routerId })) return routerId;
    const sceneId = tx.get('sceneId');
    return `${sceneId}_${routerId}`;
}

function ensureArray(target, key) {
    if (!Array.isArray(target[key])) target[key] = [];
    return target[key];
}

function isPair(value) {
    return Array.isArray(value) && value.length === 2 &&
        typeof value[0] === 'string' && typeof value[1] === 'string';
}

function parseMetEntry(value) {
    let id;
    let count;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        id = value.id;
        count = value.count === undefined ? 1 : value.count;
    } else if (typeof value === 'string') {
        const parts = value.split(':');
        id = parts[0];
        count = parts[1] || '1';
    } else {
        return null;
    }

    const parsedCount = Number.parseInt(String(count), 10);
    if (typeof id !== 'string' || !id || !Number.isFinite(parsedCount)) return null;
    return { id, count: parsedCount, entry: `${id}:${parsedCount}` };
}

function mutateList(list, method, value, index, pairMode = false) {
    switch (method) {
        case 'add':
            if (pairMode) {
                if (!isPair(value)) return false;
                if (!list.some(item => item[0] === value[0] && item[1] === value[1])) list.push(value);
            } else {
                if (typeof value !== 'string' || !value) return false;
                if (!list.includes(value)) list.push(value);
            }
            return true;
        case 'remove': {
            if (pairMode && typeof value === 'string') {
                for (let i = list.length - 1; i >= 0; i--) if (list[i]?.[0] === value) list.splice(i, 1);
                return true;
            }
            if (pairMode ? (!isPair(value) && typeof value !== 'string') : (typeof value !== 'string' || !value)) return false;
            const idx = pairMode && Array.isArray(value)
                ? list.findIndex(item => item[0] === value[0] && item[1] === value[1])
                : (pairMode ? list.findIndex(item => item[0] === value) : list.indexOf(value));
            if (idx >= 0) list.splice(idx, 1);
            return true;
        }
        case 'insert': {
            if (pairMode ? !isPair(value) : (typeof value !== 'string' || !value)) return false;
            const indexes = index === undefined
                ? [list.length]
                : (Array.isArray(index) ? [...new Set(index)] : [index]);
            if (!indexes.length || indexes.some(i => !Number.isInteger(i) || i < 0)) return false;
            indexes.sort((a, b) => b - a).forEach(i => {
                list.splice(Math.min(i, list.length), 0, structuredClone(value));
            });
            return true;
        }
        case 'empty':
            list.length = 0;
            return true;
        case 'set':
            if (!Array.isArray(value)) return false;
            if (pairMode ? !value.every(isPair) : !value.every(item => typeof item === 'string')) return false;
            list.splice(0, list.length, ...structuredClone(value));
            return true;
        default:
            throw new TypeError(`Unsupported CMS list method: ${String(method)}`);
    }
}

function mutateMet(owner, method, value, index) {
    const met = ensureArray(owner, 'met');
    if (method === 'empty') {
        owner.met = [];
        return true;
    }
    if (method === 'remove') {
        if (typeof value !== 'string' || !value) return false;
        owner.met = met.filter(item => typeof item !== 'string' || item.split(':')[0] !== value);
        return true;
    }
    if (method === 'add') {
        const id = value;
        if (typeof id !== 'string' || !id) return false;
        const existingIndex = met.findIndex(item => typeof item === 'string' && item.split(':')[0] === id);
        if (existingIndex >= 0) {
            const parts = met[existingIndex].split(':');
            met[existingIndex] = `${id}:${Number.parseInt(parts[1] || '0', 10) + 1}`;
        } else met.push(`${id}:1`);
        return true;
    }
    if (method === 'set' || method === 'insert') {
        const parsed = parseMetEntry(value);
        if (!parsed) return false;
        const existingIndex = met.findIndex(item => typeof item === 'string' && item.split(':')[0] === parsed.id);

        if (method === 'set') {
            if (existingIndex >= 0) met[existingIndex] = parsed.entry;
            else met.push(parsed.entry);
            return true;
        }

        if (index !== undefined && (!Number.isInteger(index) || index < 0)) return false;
        if (existingIndex >= 0) met.splice(existingIndex, 1);
        const insertAt = index === undefined ? met.length : Math.min(index, met.length);
        met.splice(insertAt, 0, parsed.entry);
        return true;
    }
    throw new TypeError(`Unsupported CMS met method: ${String(method)}`);
}

export const CmsStrategies = {
    characters: async (engine, eff) => {
        const id = resolveCharacterId(engine, eff.id);
        const value = resolveValue(eff.value, engine);
        await engine.api.engine.state.transaction(tx => {
            const owner = tx.get('characters.[id]', { id });
            if (!owner) return;
            if (eff.column === 'relationship') {
                if (!owner.set) return;
                const relationship = ensureArray(owner.set, 'relationship');
                if (!mutateList(relationship, eff.method, value, eff.index, true)) {
                    throw new TypeError(`Invalid CMS relationship value for method '${eff.method}'.`);
                }
            } else if (eff.column === 'met') {
                if (!mutateMet(owner, eff.method, value, eff.index)) {
                    throw new TypeError(`Invalid CMS met value for method '${eff.method}'.`);
                }
            } else {
                throw new TypeError(`Unsupported CMS characters column: ${String(eff.column)}`);
            }
            tx.set('characters.[id]', owner, { id });
        });
    },

    routers: async (engine, eff) => {
        const value = resolveValue(eff.value, engine);
        await engine.api.engine.state.transaction(tx => {
            const key = resolveRouterKey(engine, eff.id, tx);
            const router = tx.get('routers.[routerKey]', { routerKey: key });
            if (!router) return;
            if (eff.column !== 'actions') {
                throw new TypeError(`Unsupported CMS routers column: ${String(eff.column)}`);
            }
            if (!mutateList(ensureArray(router, 'actions'), eff.method, value, eff.index)) {
                throw new TypeError(`Invalid CMS actions value for method '${eff.method}'.`);
            }
            tx.set('routers.[routerKey]', router, { routerKey: key });
        });
    }
};
