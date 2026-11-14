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

function mutateList(list, method, value, index, pairMode = false) {
    switch (method) {
        case 'add':
            if (pairMode) {
                if (!Array.isArray(value) || value.length !== 2) return;
                if (!list.some(item => item[0] === value[0] && item[1] === value[1])) list.push(value);
            } else if (!list.includes(value)) list.push(value);
            break;
        case 'remove': {
            if (pairMode && typeof value === 'string') {
                for (let i = list.length - 1; i >= 0; i--) if (list[i]?.[0] === value) list.splice(i, 1);
                break;
            }
            const idx = pairMode && Array.isArray(value)
                ? list.findIndex(item => item[0] === value[0] && item[1] === value[1])
                : list.indexOf(value);
            if (idx >= 0) list.splice(idx, 1);
            break;
        }
        case 'insert':
            if (pairMode && (!Array.isArray(value) || value.length !== 2)) return;
            list.splice(index === undefined ? list.length : index, 0, value);
            break;
        case 'empty':
            list.length = 0;
            break;
        default:
            break;
    }
}

function mutateMet(owner, method, value) {
    const met = ensureArray(owner, 'met');
    if (method === 'empty') {
        owner.met = [];
        return;
    }
    if (method === 'remove') {
        owner.met = met.filter(item => item.split(':')[0] !== value);
        return;
    }
    if (method === 'add') {
        const id = value;
        if (!id) return;
        const index = met.findIndex(item => item.split(':')[0] === id);
        if (index >= 0) {
            const parts = met[index].split(':');
            met[index] = `${id}:${parseInt(parts[1] || '0', 10) + 1}`;
        } else met.push(`${id}:1`);
        return;
    }
    if (method === 'set') {
        let id, count;
        if (value && typeof value === 'object') {
            id = value.id;
            count = value.count === undefined ? 1 : value.count;
        } else if (typeof value === 'string') {
            const parts = value.split(':');
            id = parts[0];
            count = parseInt(parts[1] || '1', 10);
        } else {
            console.warn('[Cms] MetMethods.set: Invalid value', value);
            return;
        }
        if (!id) return;
        const index = met.findIndex(item => item.split(':')[0] === id);
        if (index >= 0) met[index] = `${id}:${count}`;
        else met.push(`${id}:${count}`);
    }
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
                mutateList(relationship, eff.method, value, eff.index, true);
            } else if (eff.column === 'met') {
                mutateMet(owner, eff.method, value);
            } else return;
            tx.set('characters.[id]', owner, { id });
        });
    },

    routers: async (engine, eff) => {
        const value = resolveValue(eff.value, engine);
        await engine.api.engine.state.transaction(tx => {
            const key = resolveRouterKey(engine, eff.id, tx);
            const router = tx.get('routers.[routerKey]', { routerKey: key });
            if (!router || eff.column !== 'actions') return;
            mutateList(ensureArray(router, 'actions'), eff.method, value, eff.index);
            tx.set('routers.[routerKey]', router, { routerKey: key });
        });
    }
};
