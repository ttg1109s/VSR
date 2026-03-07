// htdocs/engine/modules/effect/strategies/Management.js

export const EffectKeyStrategies = {
    action: ({ sId, rId, aId, hook }) => (sId && rId && aId) ? `${sId}_${rId}_${aId}_${hook}` : null,
    character: ({ cId, hook }) => {
        if (!cId) return null;
        if (hook && hook.startsWith('meeting:')) return `char_${cId}_${hook.replace(':', '_')}`;
        return `char_${cId}_${hook}`;
    },
    router: ({ sId, rId, hook }) => (sId && rId) ? `${sId}_${rId}_${hook}` : null,
    chat: ({ chatId, blockId, choiceId }) => (chatId && blockId && choiceId) ? `chat_${chatId}_${blockId}_${choiceId}` : null,
    item: ({ itemId, hook }) => (itemId && hook) ? `item_${itemId}_${hook}` : null
};

export const EffectScopeResolvers = {
    router: (cfg, ctx, engine) => ({
        scope: 'router',
        params: { sId: ctx.sceneId || engine.state.sceneId, rId: cfg.target, hook: cfg.in }
    }),
    character: (cfg, ctx, engine) => ({
        scope: 'character',
        params: { cId: cfg.target, hook: cfg.in }
    }),
    action: (cfg, ctx, engine) => {
        const sId = ctx.sceneId || engine.state.sceneId;
        let rId = ctx.routerId || (engine.state.scenes[sId] ? engine.state.scenes[sId].activeRouterId : null);
        return rId ? { scope: 'action', params: { sId, rId, aId: cfg.target, hook: cfg.in } } : null;
    },
    chat: (cfg, ctx, engine) => {
        const parts = (cfg.in || "").split(':');
        if (parts.length < 2) return null;
        return { scope: 'chat', params: { chatId: cfg.target, blockId: parts[0], choiceId: parts[1] } };
    },
    item: (cfg, ctx, engine) => ({
        scope: 'item',
        params: { itemId: cfg.target, hook: cfg.in }
    })
};

export const StaticListResolvers = {
    action: (src, { sId, rId, aId, hook }) => src.scenes[sId]?.routers[rId]?.actions[aId]?.effect?.[hook] || [],
    character: (src, { cId, hook }) => {
        if (!src.characters[cId]) return [];
        if (hook && hook.startsWith('meeting:')) {
            const targetCharId = hook.split(':')[1];
            return src.characters[cId].effect?.meeting?.[targetCharId] || [];
        }
        return src.characters[cId].effect?.[hook] || [];
    },
    router: (src, { sId, rId, hook }) => {
        const r = src.scenes[sId]?.routers[rId];
        if (!r) return [];
        const hookMap = {
            enter: (r) => r.loop?.enter,
            leave: (r) => r.loop?.leave,
            still: (r) => r.loop?.still,
            t_start: (r) => r.timer?.start,
            t_end: (r) => r.timer?.end
        };
        return hookMap[hook]?.(r) || [];
    },
    chat: (src, { chatId, blockId, choiceId }) => {
        const chat = src.chat?.[chatId];
        if (!chat) return [];
        const block = chat.blocks?.[blockId];
        if (!block) return [];
        const choice = block.choices?.find(c => c.id === choiceId);
        return choice?.apply || [];
    },
    item: (src, { itemId, hook }) => src.itemInfo?.[itemId]?.effect?.[hook] || []
};

const getEditableList = (engine, key, defaultList) => {
    if (engine.state.effect_overrides && engine.state.effect_overrides[key]) {
        return JSON.parse(JSON.stringify(engine.state.effect_overrides[key]));
    }
    return defaultList ? JSON.parse(JSON.stringify(defaultList)) : [];
};

const saveList = (engine, key, list) => {
    if (!engine.state.effect_overrides) engine.state.effect_overrides = {};
    engine.state.effect_overrides[key] = list;
};

export const ManageSubtypeHandlers = {
    // [REFACTOR] Use 'skip' instead of '_disabled'
    locked: (engine, key, cfg, defaultList) => {
        if (!Array.isArray(cfg.index)) return;
        const list = getEditableList(engine, key, defaultList);
        cfg.index.forEach(idx => { if (list[idx]) list[idx].skip = true; });
        saveList(engine, key, list);
    },

    unlocked: (engine, key, cfg, defaultList) => {
        if (!Array.isArray(cfg.index)) return;
        const list = getEditableList(engine, key, defaultList);
        cfg.index.forEach(idx => { if (list[idx]) list[idx].skip = false; });
        saveList(engine, key, list);
    },

    add_effect: (engine, key, cfg, defaultList) => {
        if (!cfg.content || !cfg.content.type) return;
        const list = getEditableList(engine, key, defaultList);
        const idx = (cfg.index !== undefined && cfg.index !== null) ? cfg.index : list.length;
        list.splice(idx, 0, cfg.content);
        saveList(engine, key, list);
    },

    remove_effect: (engine, key, cfg, defaultList) => {
        const list = getEditableList(engine, key, defaultList);
        let indexesToRemove = [];
        if (Array.isArray(cfg.index)) indexesToRemove = [...cfg.index];
        else if (cfg.index !== undefined) indexesToRemove = [cfg.index];

        indexesToRemove.sort((a, b) => b - a);
        indexesToRemove.forEach(idx => {
            if (idx >= 0 && idx < list.length) list.splice(idx, 1);
        });
        saveList(engine, key, list);
    },

    cms: (engine, key, cfg, defaultList) => {
        // [PENDING] CMS Implementation
    }
};