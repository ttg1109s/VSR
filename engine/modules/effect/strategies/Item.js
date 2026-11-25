import { resolveValue } from './Logic.js';
import { StatsHelpers } from './Stats.js'; // [NEW]

export const ItemStrategies = {
    stats: (engine, eff, context) => {
        // Item stats usually on itemInfo, but wait, itemInfo is global template.
        // If we modify item stats, are we modifying the global template or a specific instance?
        // The effect system usually modifies the global state or specific character state.
        // For items, `eff.target` is item ID.
        // Users likely want to modify the global item definition (e.g. upgrade a weapon's damage).
        // Item templates are updated through the controlled runtime-state API.

        const itemId = resolveValue(eff.target, engine);
        const state = engine.api.engine.state;
        const item = state.getRuntimeSnapshot('itemInfo.[id]', { id: itemId });

        let succeeded = false;
        if (item) {
            if (!item.stats) item.stats = {};

            // [REFACTOR] Use 'exec' for ALL item stats operations
            const execMode = eff.exec || 'adjust';
            const field = eff.field || 'current';
            if (!['current', 'max'].includes(field) ||
                !['add_stats', 'remove_stats', 'adjust', 'set', 'full'].includes(execMode) ||
                (field === 'max' && execMode === 'full')) {
                throw new TypeError(`Unsupported item.stats operation: ${String(execMode)} for field ${String(field)}`);
            }

            if (execMode === 'add_stats') {
                succeeded = StatsHelpers.add_stats(item, eff, false, itemId, engine) === true;
            } else if (execMode === 'remove_stats') {
                const property = resolveValue(eff.property, engine);
                succeeded = Boolean(item.stats && Object.prototype.hasOwnProperty.call(item.stats, property));
                if (succeeded) StatsHelpers.remove_stats(item, eff, false, itemId, engine);
            } else {
                // For value editing (adjust/set values), StatsHelpers expects 'mode'. 
                // We map 'exec' to 'mode' here.
                const mappedEff = { ...eff, mode: execMode };
                succeeded = StatsHelpers.edit_value(item, mappedEff, false, itemId, engine) === true;
            }
            if (succeeded) state.set('itemInfo.[id]', item, { id: itemId });
        }
        ItemStrategies._tryHideAction(engine, eff, context, succeeded);
    },
    // Helper để lấy Inventory của nhân vật đang nhập vai
    _getOwnerId: (engine) => {
        const state = engine.api.engine.state;
        return state.get?.('entryCharacter') || state.getRuntimeSnapshot?.('meta.entryCharacter') || null;
    },

    _getChar: (engine) => engine.api.engine.state.getRuntimeSnapshot('characters.[id]', { id: ItemStrategies._getOwnerId(engine) }),

    // Helper: Hide Action if requested
    _tryHideAction: (engine, eff, context, succeeded) => {
        if (succeeded === true && eff.hide === true && context && context.actionId && context.sceneId && context.routerId) {
            const actionId = context.actionId;
            const state = engine.api.engine.state;
            if (state.getRuntimeSnapshot('actions.[id]', { id: actionId })) {
                state.update('actions.[id].display', () => 'hide', { id: actionId });
            }
        }
    },

    add: (engine, eff, context) => {
        let succeeded = false;
        const added = engine.addItem(eff.target);
        if (added) {
            succeeded = true;
            engine.api.notifications.notify({ title: "Item received", message: engine.api.engine.state.getRuntimeSnapshot('itemInfo.[id].name', { id: eff.target }) || eff.target, level: "success", source: 'engine', category: 'inventory.added', metadata: { operation: "add", itemId: eff.target } });
            engine.api.presentation.components.explorer();
        }
        ItemStrategies._tryHideAction(engine, eff, context, succeeded);
    },

    remove: async (engine, eff, context) => {
        // Inventory and hand are changed atomically. If the item was equipped,
        // run its unequip hook after commit and publish even if that hook fails.
        const state = engine.api.engine.state;
        const ownerId = ItemStrategies._getOwnerId(engine);
        const info = state.getRuntimeSnapshot('itemInfo.[id]', { id: eff.target });
        const character = state.getRuntimeSnapshot('characters.[id]', { id: ownerId });
        if (!character) return { removed: false, itemId: eff.target, ownerId, reason: 'missing' };
        const inventory = character.inventory || [];
        if (!inventory.includes(eff.target)) {
            ItemStrategies._tryHideAction(engine, eff, context, false);
            return { removed: false, itemId: eff.target, ownerId, reason: 'not_owned' };
        }
        const result = (character.hand || []).includes(eff.target) ? 'removed_equipped' : 'removed';
        state.update('characters.[id]', current => ({
            ...current,
            inventory: (current.inventory || []).filter(itemId => itemId !== eff.target),
            hand: (current.hand || []).filter(itemId => itemId !== eff.target)
        }), { id: ownerId });
        const succeeded = result === 'removed' || result === 'removed_equipped';
        try {
            if (result === 'removed_equipped' && info?.effect?.unequip) {
                await engine.processRunnables(info.effect.unequip, { itemId: eff.target, hook: 'unequip' }, false, true);
            }
            if (succeeded) {
                engine.api.presentation.components.explorer();
                if (eff.notify) engine.api.notifications.notify({ title: "Item removed", message: eff.target, level: "info", source: "engine", category: "inventory.removed", metadata: { operation: "remove", itemId: eff.target, ownerId } });
            }
        } finally {
            if (succeeded) engine.commitState?.('inventory.changed');
        }
        ItemStrategies._tryHideAction(engine, eff, context, succeeded);
        return { removed: succeeded, itemId: eff.target, ownerId, reason: result };
    },

    hand_off: async (engine, eff, context) => {
        const state = engine.api.engine.state;
        const ownerId = ItemStrategies._getOwnerId(engine);
        const info = state.getRuntimeSnapshot('itemInfo.[id]', { id: eff.target });
        const character = state.getRuntimeSnapshot('characters.[id]', { id: ownerId });
        if (!character) return { unequipped: false, itemId: eff.target, ownerId, reason: 'missing' };
        const hand = character.hand || [];
        if (!hand.includes(eff.target)) {
            ItemStrategies._tryHideAction(engine, eff, context, false);
            return { unequipped: false, itemId: eff.target, ownerId, reason: 'not_equipped' };
        }
        const result = 'unequipped';
        state.update('characters.[id].hand', current => (current || []).filter(itemId => itemId !== eff.target), { id: ownerId });
        const succeeded = result === 'unequipped';
        try {
            if (succeeded && info?.effect?.unequip) await engine.processRunnables(info.effect.unequip, { itemId: eff.target, hook: 'unequip' }, false, true);
            if (succeeded) {
                engine.api.presentation.components.explorer();
                if (eff.notify) engine.api.notifications.notify({ title: "Item unequipped", message: eff.target, level: "info", source: "engine", category: "inventory.unequipped", metadata: { operation: "hand_off", itemId: eff.target, ownerId } });
            }
        } finally {
            if (succeeded) engine.commitState?.('inventory.changed');
        }
        ItemStrategies._tryHideAction(engine, eff, context, succeeded);
        return { unequipped: succeeded, itemId: eff.target, ownerId, reason: result };
    },

    hand_on: async (engine, eff, context) => {
        const state = engine.api.engine.state;
        const ownerId = ItemStrategies._getOwnerId(engine);
        const info = state.getRuntimeSnapshot('itemInfo.[id]', { id: eff.target });
        const configuredMaxHand = engine.getConfig ? engine.getConfig('maxHandOn') : undefined;
        const maxHand = configuredMaxHand === undefined || configuredMaxHand === null ? 10 : Number(configuredMaxHand);
        const character = state.getRuntimeSnapshot('characters.[id]', { id: ownerId });
        if (!character) return { equipped: false, itemId: eff.target, ownerId, reason: 'missing' };
        const inventory = character.inventory || [];
        const hand = character.hand || [];
        if (!inventory.includes(eff.target)) {
            ItemStrategies._tryHideAction(engine, eff, context, false);
            return { equipped: false, itemId: eff.target, ownerId, reason: 'not_owned' };
        }
        if (hand.includes(eff.target)) {
            ItemStrategies._tryHideAction(engine, eff, context, true);
            return { equipped: true, itemId: eff.target, ownerId, reason: 'already_equipped' };
        }
        if (maxHand > 0 && hand.length >= maxHand) {
            engine.api.notifications.add("Cannot hold item", "Hands are full.", "warning", { source: 'engine', category: 'inventory.hand_full' });
            ItemStrategies._tryHideAction(engine, eff, context, false);
            return { equipped: false, itemId: eff.target, ownerId, reason: 'full' };
        }
        const result = 'equipped';
        state.update('characters.[id].hand', current => (current || []).includes(eff.target) ? current : [...(current || []), eff.target], { id: ownerId });
        const succeeded = result === 'equipped' || result === 'already_equipped';
        try {
            if (result === 'equipped' && info?.effect?.equip) await engine.processRunnables(info.effect.equip, { itemId: eff.target, hook: 'equip' }, false, true);
            if (result === 'equipped') {
                engine.api.presentation.components.explorer();
                if (eff.notify) engine.api.notifications.notify({ title: "Item equipped", message: eff.target, level: "success", source: "engine", category: "inventory.equipped", metadata: { operation: "hand_on", itemId: eff.target, ownerId } });
            }
        } finally {
            if (result === 'equipped') engine.commitState?.('inventory.changed');
        }
        ItemStrategies._tryHideAction(engine, eff, context, succeeded);
        return { equipped: succeeded, itemId: eff.target, ownerId, reason: result };
    },

    usage: (engine, eff, context) => {
        const state = engine.api.engine.state;
        const item = state.getRuntimeSnapshot('itemInfo.[id]', { id: eff.target });
        if (!item?.usage) return;

        const current = Number(item.usage.current);
        const max = Number(item.usage.max);
        const increment = Number(resolveValue(eff.value, engine));
        if (![current, max, increment].every(Number.isFinite)) return;

        const oldUsage = current;
        item.usage.current = Math.max(0, Math.min(Math.max(0, max), current + increment));
        state.set('itemInfo.[id]', item, { id: eff.target });
        if (eff.notify && item.usage.current !== oldUsage) engine.api.notifications.notify({ title: "Item usage changed", message: `${item.name || eff.target}: ${oldUsage} → ${item.usage.current}/${max}`, level: item.usage.current < oldUsage ? "warning" : "success", source: "engine", category: "item.usage_changed", metadata: { operation: "usage", itemId: eff.target, oldValue: oldUsage, newValue: item.usage.current, max, delta: item.usage.current - oldUsage } });
        engine.api.presentation.components.explorer();
        ItemStrategies._tryHideAction(engine, eff, context, true);
    }
};