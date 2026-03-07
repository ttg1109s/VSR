import { resolveValue } from './Logic.js';
import { API } from '../../../../api/index.js';
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
        const item = engine.state.itemInfo[itemId];

        if (item) {
            if (!item.stats) item.stats = {};

            // [REFACTOR] Use 'exec' for ALL item stats operations
            const execMode = eff.exec || 'add'; // Default to add if missing/legacy? Or strictly exec.

            if (execMode === 'add_stats') {
                StatsHelpers.add_stats(item, eff, false, itemId);
            } else if (execMode === 'remove_stats') {
                StatsHelpers.remove_stats(item, eff, false, itemId);
            } else {
                // For value editing (add/set values), StatsHelpers expects 'mode'. 
                // We map 'exec' to 'mode' here.
                const mappedEff = { ...eff, mode: execMode };
                StatsHelpers.edit_value(item, mappedEff, false, itemId);
            }
        }
    },
    // Helper để lấy Inventory của nhân vật đang nhập vai
    _getChar: (engine) => {
        const ownerId = engine.getOwnerId ? engine.getOwnerId() : (engine.state.meta?.entryCharacter || 'player');
        return engine.state.characters[ownerId];
    },

    // Helper: Hide Action if requested
    _tryHideAction: (engine, eff, context) => {
        if (eff.hide === true && context && context.actionId && context.sceneId && context.routerId) {
            const actStateKey = `${context.sceneId}_${context.routerId}_${context.actionId}`;
            if (engine.state.actions[actStateKey]) {
                engine.state.actions[actStateKey].display = 'hide';
            }
        }
    },

    add: (engine, eff, context) => {
        ItemStrategies._tryHideAction(engine, eff, context);
        // [REFACTORED] Sử dụng engine.addItem (Logic Character)
        if (engine.addItem) {
            const added = engine.addItem(eff.target);
            if (added) {
                API.render.notification.add("Nhận vật phẩm", engine.state.itemInfo[eff.target]?.name || eff.target, "success");
                API.render.components.explorer();
            }
        } else {
            // Fallback nếu hàm addItem chưa mixin (hiếm gặp)
            const char = ItemStrategies._getChar(engine);
            if (char && !char.inventory.includes(eff.target)) {
                char.inventory.push(eff.target);
                API.render.notification.add("Nhận vật phẩm", engine.state.itemInfo[eff.target]?.name || eff.target, "success");
                API.render.components.explorer();
            }
        }
    },

    remove: (engine, eff, context) => {
        ItemStrategies._tryHideAction(engine, eff, context);
        // [REFACTORED] Xóa khỏi Character Inventory
        const char = ItemStrategies._getChar(engine);
        if (!char || !char.inventory) return;

        const idx = char.inventory.indexOf(eff.target);
        if (idx > -1) {
            char.inventory.splice(idx, 1);

            // Nếu đang cầm trên tay cũng xóa luôn
            if (char.hand) {
                const handIdx = char.hand.indexOf(eff.target);
                if (handIdx > -1) char.hand.splice(handIdx, 1);
            }

            API.render.components.explorer();
            // Có thể thêm notify nếu cần thiết
        }
    },

    hand_off: (engine, eff, context) => {
        ItemStrategies._tryHideAction(engine, eff, context);
        // [REFACTORED] Bỏ khỏi tay Character
        const char = ItemStrategies._getChar(engine);
        if (!char || !char.hand) return;

        const idx = char.hand.indexOf(eff.target);
        if (idx > -1) {
            char.hand.splice(idx, 1);
            API.render.components.explorer();
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

        if (!char.hand.includes(eff.target) && char.inventory.includes(eff.target)) {
            if (char.hand.length >= maxHand) {
                API.render.notification.add("Không thể cầm", "Tay đã đầy.", "warn");
                return;
            }
            char.hand.push(eff.target);
            API.render.components.explorer();
        }
    },

    usage: (engine, eff, context) => {
        ItemStrategies._tryHideAction(engine, eff, context);
        const item = engine.state.itemInfo[eff.target];
        if (item?.usage) {
            const u = item.usage;
            const valToAdd = Number(resolveValue(eff.value));

            // Logic tăng giảm usage
            const oldVal = Number(u.current);
            u.current = Math.max(0, Math.min(u.max, oldVal + valToAdd));

            // [API FIX] Refresh UI
            API.render.components.explorer();
        }
    }
};