// htdocs/engine/modules/effect/strategies/Management.js

export const EffectKeyStrategies = {
    action: ({ sId, rId, aId, hook }) => (sId && rId && aId) ? `${sId}_${rId}_${aId}_${hook}` : null,
    character_move: ({ cId, moveIndex, hook }) =>
        (cId && Number.isSafeInteger(moveIndex) && moveIndex >= 0 && hook)
            ? `char_move_${cId}_${moveIndex}_${hook}` : null,
    character: ({ cId, hook }) => {
        if (!cId) return null;
        if (hook && hook.startsWith('meeting:')) return `char_${cId}_${hook.replace(':', '_')}`;
        return `char_${cId}_${hook}`;
    },
    router: ({ sId, rId, hook }) => (sId && rId) ? `${sId}_${rId}_${hook}` : null,
    chat: ({ chatId, blockId, choiceId }) =>
        [chatId, blockId, choiceId].every(value => value !== undefined && value !== null)
            ? `chat_${chatId}_${blockId}_${choiceId}`
            : null,
    item: ({ itemId, hook }) => (itemId && hook) ? `item_${itemId}_${hook}` : null
};

export const EffectScopeResolvers = {
    router: (cfg, ctx, engine) => ({
        scope: 'router',
        params: { sId: ctx.sceneId || engine.api.engine.state.sceneId, rId: cfg.target, hook: cfg.in }
    }),
    character_move: (cfg) => {
        if (!Number.isSafeInteger(cfg.moveIndex) || cfg.moveIndex < 0) {
            throw new TypeError('manage_effect space character_move requires a non-negative moveIndex.');
        }
        return { scope: 'character_move', params: { cId: cfg.target, moveIndex: cfg.moveIndex, hook: cfg.in } };
    },
    character: (cfg, ctx, engine) => ({
        scope: 'character',
        params: { cId: cfg.target, hook: cfg.in }
    }),
    action: (cfg, ctx, engine) => {
        const sId = ctx.sceneId || engine.api.engine.state.sceneId;
        let rId = ctx.routerId || (engine.api.engine.state.get('scene.activeRouterId', { id: sId }));
        return rId ? { scope: 'action', params: { sId, rId, aId: cfg.target, hook: cfg.in } } : null;
    },
    chat: (cfg, ctx, engine) => {
        const hook = String(cfg.in || '');
        const separator = hook.indexOf(':');
        if (separator < 0) return null;
        return {
            scope: 'chat',
            params: {
                chatId: cfg.target,
                blockId: hook.slice(0, separator),
                choiceId: hook.slice(separator + 1)
            }
        };
    },
    item: (cfg, ctx, engine) => ({
        scope: 'item',
        params: { itemId: cfg.target, hook: cfg.in }
    })
};

export const StaticListResolvers = {
    action: (src, { sId, rId, aId, hook }) => src.scenes[sId]?.routers[rId]?.actions[aId]?.effect?.[hook] || [],
    character_move: (src, { cId, moveIndex, hook }) => {
        const entry = src.characters?.[cId]?.moveList?.[moveIndex];
        if (!entry || !['enter', 'leave', 'still'].includes(hook)) return [];
        const list = entry.loop?.[hook];
        return Array.isArray(list) ? list : [];
    },
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
        // Canonical schema shape: chat[chatId].block[blockId].choice[choiceGroupId][].
        const chat = src.chat?.[chatId];
        const block = chat?.block?.[blockId];
        const choiceGroupId = block?.choice_id;
        if (choiceGroupId === undefined || choiceGroupId === null) return [];

        const choices = chat.choice?.[choiceGroupId];
        if (!Array.isArray(choices)) return [];

        // Choice IDs are optional in the schema. When absent, accept the
        // stable positional fallback used by ChatSystem (String(index)).
        const choiceIndex = choices.findIndex((choice, index) =>
            choice?.id === String(choiceId) || String(index) === String(choiceId)
        );
        return choiceIndex >= 0 ? (choices[choiceIndex]?.effect || []) : [];
    },
    item: (src, { itemId, hook }) => src.itemInfo?.[itemId]?.effect?.[hook] || []
};

const getEditableList = (engine, key, defaultList) => {
    const override = engine.api.engine.state.getRuntime('effect_overrides.[key]', { key });
    if (override) return structuredClone(override);
    return defaultList ? structuredClone(defaultList) : [];
};

const saveList = (engine, key, list) => {
    engine.api.engine.state.set('effect_overrides.[key]', list, { key });
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

        if (cfg.index === undefined || cfg.index === null) {
            list.push(cfg.content);
        } else {
            const indexes = Array.isArray(cfg.index)
                ? [...new Set(cfg.index)].sort((a, b) => b - a)
                : [cfg.index];

            // Insert from right to left so each index refers to the original
            // list position, as it does for locked/unlocked/remove_effect.
            for (const rawIndex of indexes) {
                if (!Number.isInteger(rawIndex) || rawIndex < 0) continue;
                list.splice(Math.min(rawIndex, list.length), 0, structuredClone(cfg.content));
            }
        }
        saveList(engine, key, list);
    },

    remove_effect: (engine, key, cfg, defaultList) => {
        const list = getEditableList(engine, key, defaultList);
        let indexesToRemove = [];
        if (Array.isArray(cfg.index)) indexesToRemove = [...cfg.index];
        else if (cfg.index !== undefined) indexesToRemove = [cfg.index];

        [...new Set(indexesToRemove)]
            .filter(idx => Number.isInteger(idx) && idx >= 0)
            .sort((a, b) => b - a)
            .forEach(idx => {
                if (idx < list.length) list.splice(idx, 1);
            });
        saveList(engine, key, list);
    },

};