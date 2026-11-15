import { resolveValue } from './Logic.js';
import { StatsHelpers } from './Stats.js'; // [NEW]

export const ItemStrategies = {
    stats: (engine, eff, context) => {
        ItemStrategies._tryHideAction(engine, eff, context);
        // Item stats usually on itemInfo, but wait, itemInfo is global template.
        // If we modify item stats, are we modifying the global template or a specific instance?
        // The effect system usually modifies the global state or specific character state.
        // For items, `eff.target` is item ID.
        // Users likely want to modify the global item definition (e.g. upgrade a weapon's damage).
        // Item templates are updated through the controlled runtime-state API.

        const itemId = resolveValue(eff.target, engine);
        const state = engine.api.engine.state;
        const item = state.getRuntimeSnapshot('itemInfo.[id]', { id: itemId });

        if (item) {
            if (!item.stats) item.stats = {};

            // [REFACTOR] Use 'exec' for ALL item stats operations
            const execMode = eff.exec || 'add';
            const field = eff.field || 'current';
            if (!['current', 'max'].includes(field) ||
                !['add_stats', 'remove_stats', 'add', 'set', 'full'].includes(execMode) ||
                (field === 'max' && execMode === 'full')) {
                throw new TypeError(`Unsupported item.stats operation: ${String(execMode)} for field ${String(field)}`);
            }

            if (execMode === 'add_stats') {
                StatsHelpers.add_stats(item, eff, false, itemId, engine);
            } else if (execMode === 'remove_stats') {
                StatsHelpers.remove_stats(item, eff, false, itemId, engine);
            } else {
                // For value editing (add/set values), StatsHelpers expects 'mode'. 
                // We map 'exec' to 'mode' here.
                const mappedEff = { ...eff, mode: execMode };
                StatsHelpers.edit_value(item, mappedEff, false, itemId, engine);
            }
            state.set('itemInfo.[id]', item, { id: itemId });
        }
    },
    // Helper để lấy Inventory của nhân vật đang nhập vai
    _getOwnerId: (engine) => engine.getOwnerId?.() || engine.api.engine.state.getRuntimeSnapshot('meta.entryCharacter') || 'player',

    _getChar: (engine) => engine.api.engine.state.getRuntimeSnapshot('characters.[id]', { id: ItemStrategies._getOwnerId(engine) }),

    // Helper: Hide Action if requested
    _tryHideAction: (engine, eff, context) => {
        if (eff.hide === true && context && context.actionId && context.sceneId && context.routerId) {
            const actStateKey = `${context.sceneId}_${context.routerId}_${context.actionId}`;
            const state = engine.api.engine.state;
            if (state.getRuntimeSnapshot('actions.[id]', { id: actStateKey })) {
                state.update('actions.[id].display', () => 'hide', { id: actStateKey });
            }
        }
    },

    add: (engine, eff, context) => {
        ItemStrategies._tryHideAction(engine, eff, context);
        // [REFACTORED] Sử dụng engine.addItem (Logic Character)
        if (engine.addItem) {
            const added = engine.addItem(eff.target);
            if (added) {
                engine.api.notifications.add("Nhận vật phẩm", engine.api.engine.state.getRuntimeSnapshot('itemInfo.[id].name', { id: eff.target }) || eff.target, "success", { source: 'scenario', category: 'scenario.inventory.added' });
                engine.api.presentation.components.explorer();
            }
        } else {
            // Fallback nếu hàm addItem chưa mixin (hiếm gặp)
            const char = ItemStrategies._getChar(engine);
            if (char && !(char.inventory || []).includes(eff.target)) {
                engine.api.engine.state.update('characters.[id].inventory', inventory => [...(inventory || []), eff.target], {
                    id: ItemStrategies._getOwnerId(engine)
                });
                engine.api.notifications.add("Nhận vật phẩm", engine.api.engine.state.getRuntimeSnapshot('itemInfo.[id].name', { id: eff.target }) || eff.target, "success");
                engine.api.presentation.components.explorer();
            }
        }
    },

    remove: (engine, eff, context) => {
        ItemStrategies._tryHideAction(engine, eff, context);
        // [REFACTORED] Xóa khỏi Character Inventory
        const char = ItemStrategies._getChar(engine);
        if (!char || !char.inventory) return;

        const idx = (char.inventory || []).indexOf(eff.target);
        if (idx > -1) {
            const ownerId = ItemStrategies._getOwnerId(engine);
            engine.api.engine.state.update('characters.[id]', current => ({
                ...current,
                inventory: (current.inventory || []).filter(itemId => itemId !== eff.target),
                hand: (current.hand || []).filter(itemId => itemId !== eff.target)
            }), { id: ownerId });
            engine.api.presentation.components.explorer();
        }
    },

    hand_off: (engine, eff, context) => {
        ItemStrategies._tryHideAction(engine, eff, context);
        // [REFACTORED] Bỏ khỏi tay Character
        const char = ItemStrategies._getChar(engine);
        if (!char || !char.hand) return;

        const idx = (char.hand || []).indexOf(eff.target);
        if (idx > -1) {
            const ownerId = ItemStrategies._getOwnerId(engine);
            engine.api.engine.state.update('characters.[id].hand', hand => (hand || []).filter(itemId => itemId !== eff.target), { id: ownerId });
            engine.api.presentation.components.explorer();
        }
    },

    hand_on: (engine, eff, context) => {
        ItemStrategies._tryHideAction(engine, eff, context);
        // [REFACTORED] Cầm lên tay Character
        const char = ItemStrategies._getChar(engine);
        if (!char) return;
        if (!char.hand) char.hand = [];

        // Check max hand config
        const maxHand = (engine.getConfig && engine.getConfig('maxHandOn')) || 10;

        const hand = char.hand || [];
        const inventory = char.inventory || [];
        if (!hand.includes(eff.target) && inventory.includes(eff.target)) {
            if (hand.length >= maxHand) {
                engine.api.notifications.add("Không thể cầm", "Tay đã đầy.", "warn", { source: 'scenario', category: 'scenario.inventory.hand_full' });
                return;
            }
            const ownerId = ItemStrategies._getOwnerId(engine);
            engine.api.engine.state.update('characters.[id].hand', current => [...(current || []), eff.target], { id: ownerId });
            engine.api.presentation.components.explorer();
        }
    },

    usage: (engine, eff, context) => {
        ItemStrategies._tryHideAction(engine, eff, context);
        const state = engine.api.engine.state;
        const item = state.getRuntimeSnapshot('itemInfo.[id]', { id: eff.target });
        if (!item?.usage) return;

        const current = Number(item.usage.current);
        const max = Number(item.usage.max);
        const increment = Number(resolveValue(eff.value, engine));
        if (![current, max, increment].every(Number.isFinite)) return;

        item.usage.current = Math.max(0, Math.min(Math.max(0, max), current + increment));
        state.set('itemInfo.[id]', item, { id: eff.target });
        engine.api.presentation.components.explorer();
    }
};