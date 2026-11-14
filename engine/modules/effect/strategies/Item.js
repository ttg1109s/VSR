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
        // Let's modify `engine.state.itemInfo[eff.target]`.

        const itemId = resolveValue(eff.target, engine);
        const state = engine.api.engine.state;
        const item = state.getRuntimeSnapshot('itemInfo.[id]', { id: itemId });

        if (item) {
            if (!item.stats) item.stats = {};

            // [REFACTOR] Use 'exec' for ALL item stats operations
            const execMode = eff.exec || 'add'; // Default to add if missing/legacy? Or strictly exec.

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
    _getChar: (engine) => {
        const ownerId = engine.getOwnerId ? engine.getOwnerId() : (engine.state.meta?.entryCharacter || 'player');
        return engine.api.engine.state.getRuntimeSnapshot('characters.[id]', { id: ownerId });
    },

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
                engine.api.presentation.notification.add("Nhận vật phẩm", engine.state.itemInfo[eff.target]?.name || eff.target, "success");
                engine.api.presentation.components.explorer();
            }
        } else {
            // Fallback nếu hàm addItem chưa mixin (hiếm gặp)
            const char = ItemStrategies._getChar(engine);
            if (char && !(char.inventory || []).includes(eff.target)) {
                engine.api.engine.state.update('characters.[id].inventory', inventory => [...(inventory || []), eff.target], {
                    id: engine.getOwnerId ? engine.getOwnerId() : (engine.state.meta?.entryCharacter || 'player')
                });
                engine.api.presentation.notification.add("Nhận vật phẩm", engine.api.engine.state.getRuntime('itemInfo.[id].name', { id: eff.target }) || eff.target, "success");
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
            const ownerId = engine.getOwnerId ? engine.getOwnerId() : (engine.state.meta?.entryCharacter || 'player');
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
            const ownerId = engine.getOwnerId ? engine.getOwnerId() : (engine.state.meta?.entryCharacter || 'player');
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
                engine.api.presentation.notification.add("Không thể cầm", "Tay đã đầy.", "warn");
                return;
            }
            const ownerId = engine.getOwnerId ? engine.getOwnerId() : (engine.state.meta?.entryCharacter || 'player');
            engine.api.engine.state.update('characters.[id].hand', current => [...(current || []), eff.target], { id: ownerId });
            engine.api.presentation.components.explorer();
        }
    },

    usage: (engine, eff, context) => {
        ItemStrategies._tryHideAction(engine, eff, context);
        const state = engine.api.engine.state;
        const item = state.getRuntimeSnapshot('itemInfo.[id]', { id: eff.target });
        if (item?.usage) {
            const u = item.usage;
            const valToAdd = Number(resolveValue(eff.value));
            const oldVal = Number(u.current);
            u.current = Math.max(0, Math.min(u.max, oldVal + valToAdd));
            state.set('itemInfo.[id]', item, { id: eff.target });
            engine.api.presentation.components.explorer();
        }
    }
};