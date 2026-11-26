import { resolveValue } from './effect/strategies/Logic.js';
import { StatsHelpers } from './Stats.js';

export const ItemSystem = {
    getOwnerId() {
        return this.api.engine.state.get('entryCharacter') || null;
    },

    getInventory() {
        const ownerId = this.getOwnerId();
        if (!ownerId) return [];
        return this.api.engine.state.getRuntimeSnapshot('characters.[id].inventory', { id: ownerId }) || [];
    },

    getHand() {
        const ownerId = this.getOwnerId();
        if (!ownerId) return [];
        return this.api.engine.state.getRuntimeSnapshot('characters.[id].hand', { id: ownerId }) || [];
    },

    addItem(itemId) {
        const state = this.api.engine.state;
        const ownerId = this.getOwnerId();
        if (!ownerId) return false;
        // Inventory IDs must refer to an item definition. Otherwise a save can
        // contain an item that can never be projected, used, or removed cleanly.
        if (!state.getRuntimeSnapshot('itemInfo.[id]', { id: itemId })) return false;
        if (!state.getRuntimeSnapshot('characters.[id]', { id: ownerId })) return false;
        const inventory = state.getRuntimeSnapshot('characters.[id].inventory', { id: ownerId }) || [];
        if (inventory.includes(itemId)) return false;
        const maxInvList = (this.getConfig ? this.getConfig('maxInventory') : null) || [];
        const ownerLimitPair = Array.isArray(maxInvList) ? maxInvList.find(pair => Array.isArray(pair) && pair[1] === ownerId) : null;
        const limit = ownerLimitPair ? ownerLimitPair[0] : 0;
        if (limit > 0 && inventory.length >= limit) {
            this.api.notifications.add("Cannot pick up item", "Inventory is full.", "warning", { source: "engine", category: "inventory.full" });
            return false;
        }
        state.set('characters.[id].inventory', [...inventory, itemId], { id: ownerId });
        return true;
    },

    async removeFromInventory(itemId) {
        const state = this.api.engine.state;
        const ownerId = this.getOwnerId();
        if (!ownerId) throw new Error('Inventory owner is not configured.');
        const info = state.getRuntimeSnapshot('itemInfo.[id]', { id: itemId });
        if (!info) throw new Error('Item does not exist.');
        const character = state.getRuntimeSnapshot('characters.[id]', { id: ownerId });
        if (!character) throw new Error('Inventory owner does not exist.');
        const inventory = character.inventory || [];
        if (!inventory.includes(itemId)) throw new Error('Item is not in the active inventory.');
        const result = (character.hand || []).includes(itemId) ? 'removed_equipped' : 'removed';
        // One synchronous update avoids transaction conflicts with asynchronous
        // item hooks and other Engine effects while preserving atomicity for
        // this character's inventory/hand pair.
        state.update('characters.[id]', current => ({
            ...current,
            inventory: (current.inventory || []).filter(id => id !== itemId),
            hand: (current.hand || []).filter(id => id !== itemId)
        }), { id: ownerId });
        try {
            if (result === 'removed_equipped' && info.effect?.unequip) {
                await this.processRunnables(info.effect.unequip, { itemId, hook: 'unequip' });
            }
        } finally {
            this.commitState('inventory.changed');
        }
        return { removed: true, itemId, ownerId };
    },

    async transferItem(itemId, targetCharacterId) {
        const state = this.api.engine.state;
        const sourceCharacterId = this.getOwnerId();
        if (!sourceCharacterId) throw new Error('Inventory owner is not configured.');
        if (typeof targetCharacterId !== 'string' || !targetCharacterId || targetCharacterId === sourceCharacterId) {
            throw new TypeError('A different target character is required.');
        }
        const info = state.getRuntimeSnapshot('itemInfo.[id]', { id: itemId });
        if (!info) throw new Error('Item does not exist.');
        const limits = this.getConfig?.('maxInventory') || [];
        const targetLimit = Array.isArray(limits)
            ? (limits.find(pair => Array.isArray(pair) && pair[1] === targetCharacterId)?.[0] || 0)
            : 0;
        const source = state.getRuntimeSnapshot('characters.[id]', { id: sourceCharacterId });
        const target = state.getRuntimeSnapshot('characters.[id]', { id: targetCharacterId });
        if (!source || !target) throw new Error('Source or target character does not exist.');
        const sourceInventory = source.inventory || [];
        const targetInventory = target.inventory || [];
        if (!sourceInventory.includes(itemId)) throw new Error('Item is not in the active inventory.');
        if (targetInventory.includes(itemId)) throw new Error('Target already owns this item.');
        if (targetLimit > 0 && targetInventory.length >= targetLimit) throw new Error('Target inventory is full.');
        const result = (source.hand || []).includes(itemId) ? 'transferred_equipped' : 'transferred';
        // A single root update commits source inventory, source hand, and target
        // inventory together. The updater is synchronous, so concurrent callers
        // observe one atomic ownership transfer without async transaction races.
        state.update('characters', characters => ({
            ...characters,
            [sourceCharacterId]: {
                ...characters[sourceCharacterId],
                inventory: (characters[sourceCharacterId].inventory || []).filter(id => id !== itemId),
                hand: (characters[sourceCharacterId].hand || []).filter(id => id !== itemId)
            },
            [targetCharacterId]: {
                ...characters[targetCharacterId],
                inventory: [...(characters[targetCharacterId].inventory || []), itemId]
            }
        }));
        try {
            if (result === 'transferred_equipped' && info.effect?.unequip) {
                await this.processRunnables(info.effect.unequip, { itemId, hook: 'unequip' });
            }
        } finally {
            this.commitState('inventory.transferred');
        }
        return { transferred: true, itemId, sourceCharacterId, targetCharacterId };
    },

    isBroken(itemId) {
        const current = this.api.engine.state.get('item.current', { id: itemId });
        const max = this.api.engine.state.get('item.max', { id: itemId });
        return max > 0 && current >= max;
    },

    async toggleHand(id) {
        const state = this.api.engine.state;
        const ownerId = this.getOwnerId();
        if (!ownerId) return;
        const info = state.getRuntimeSnapshot('itemInfo.[id]', { id });

        if (!info) {
            this.api.notifications.add("Error", "Item does not exist.", "danger", { source: "engine", category: "inventory.equip_failed" });
            return;
        }

        const configuredMaxHand = Number(this.getConfig ? this.getConfig('maxHandOn') : state.get('maxHandOn'));
        const maxHand = Number.isFinite(configuredMaxHand) && configuredMaxHand > 0 ? configuredMaxHand : Infinity;

        const character = state.getRuntimeSnapshot('characters.[id]', { id: ownerId });
        if (!character) return;
        if (!(character.inventory || []).includes(id)) {
            this.api.notifications.add("Cannot equip item", "Item is not in the active inventory.", "warning", { source: "engine", category: "inventory.equip_failed" });
            return;
        }
        const hand = character.hand || [];
        const currentIndex = hand.indexOf(id);
        let result;
        if (currentIndex > -1) {
            state.update('characters.[id].hand', current => (current || []).filter(itemId => itemId !== id), { id: ownerId });
            result = 'unequipped';
        } else {
            if (info.requirements) {
                const req = this.checkReq(info.requirements);
                if (!req.pass) {
                    this.api.notifications.add("Cannot equip item", "Requirements not met.", "danger", { source: "engine", category: "inventory.equip_failed" });
                    return;
                }
            }
            if (hand.length >= maxHand) {
                this.api.notifications.add("Cannot equip item", "Hands are full.", "warning", { source: "engine", category: "inventory.hand_full" });
                return;
            }
            state.update('characters.[id].hand', current => (current || []).includes(id) ? current : [...(current || []), id], { id: ownerId });
            result = 'equipped';
        }

        try {
            if (result === 'unequipped') {
                this.api.notifications.add("Item unequipped", `${info.name} was returned to inventory`, "info", { source: "engine", category: "inventory.unequipped" });
                if (info.effect?.unequip) await this.processRunnables(info.effect.unequip, { itemId: id, hook: 'unequip' });
            } else {
                this.api.notifications.add("Item equipped", `${info.name} is now in your hand`, "success", { source: "engine", category: "inventory.equipped" });
                if (info.effect?.equip) await this.processRunnables(info.effect.equip, { itemId: id, hook: 'equip' });
            }
            this.api.presentation.components.updateItemModal(id);
            this.api.presentation.components.explorer();
        } finally {
            // State is changed synchronously before hooks run. Publish it
            // even when an equip/unequip hook fails, rather than leaving the
            // protocol revision behind the actual runtime state.
            this.commitState('inventory.changed');
        }
    },


    // Domain-owned execution for the `item.add` effect. The Effect module only
    // dispatches this operation; inventory policy and its side effects live here.
    applyAddEffect(eff, context = {}) {
        let succeeded = false;
        const added = this.addItem(eff.target);
        if (added) {
            succeeded = true;
            this.api.notifications.notify({
                title: "Item received",
                message: this.api.engine.state.getRuntimeSnapshot('itemInfo.[id].name', { id: eff.target }) || eff.target,
                level: "success", source: 'engine', category: 'inventory.added',
                metadata: { operation: "add", itemId: eff.target }
            });
            this.api.presentation.components.explorer();
        }
        if (succeeded === true && eff.hide === true && context && context.actionId && context.sceneId && context.routerId) {
            const actionId = context.actionId;
            const state = this.api.engine.state;
            if (state.getRuntimeSnapshot('actions.[id]', { id: actionId })) {
                state.update('actions.[id].display', () => 'hide', { id: actionId });
            }
        }
        return added;
    },

    async use(id) {
        const state = this.api.engine.state;
        const info = state.getRuntimeSnapshot('itemInfo.[id]', { id });
        if (!info) return { accepted: false, reason: 'item_not_found' };
        const ownerId = this.getOwnerId();
        if (!ownerId) return { accepted: false, reason: 'owner_not_configured' };
        const inventory = state.getRuntimeSnapshot('characters.[id].inventory', { id: ownerId }) || [];
        if (!inventory.includes(id)) {
            this.api.notifications.add("Cannot use item", "Item is not in the active inventory.", "warning", { source: "engine", category: "inventory.use_failed" });
            return { accepted: false, reason: 'not_owned' };
        }
        const hand = state.getRuntimeSnapshot('characters.[id].hand', { id: ownerId }) || [];
        if (!hand.includes(id)) {
            this.api.notifications.add("Cannot use item", "Item must be equipped in hand before it can be used.", "warning", { source: "engine", category: "inventory.use_not_equipped" });
            return { accepted: false, reason: 'not_equipped' };
        }

        if (info.requirements) {
            const res = this.checkReq(info.requirements);
            if (!res.pass) {
                this.api.notifications.add("Cannot use item", "Requirements not met.", "danger", { source: "engine", category: "inventory.use_failed" });
                return { accepted: false, reason: 'requirements_failed' };
            }
        }
        if (info.usage) {
            const isBroken = this.isBroken(id);
            const disableBrokenUse = this.getConfig ? this.getConfig('brokenDisable') : false;
            if (isBroken && disableBrokenUse) {
                this.api.notifications.add("Broken", "The item is broken or has no uses remaining.", "warning", { source: "engine", category: "inventory.use_broken" });
                this.commitState('inventory.use.completed');
                return { accepted: false, reason: 'broken' };
            }
        }

        const useEffects = Array.isArray(info.effect?.use) ? info.effect.use : [];
        // Register a unique use request. Usage is reserved/committed only when
        // this request reaches the head of the Sync queue and is still equipped.
        const runtime = this.runtime;
        runtime.itemUseSequence = (runtime.itemUseSequence || 0) + 1;
        const useId = `item-use-${runtime.itemUseSequence}`;
        const request = { useId, itemId: id, ownerId, status: 'pending', cancelReason: null, cancelNotified: false };
        runtime.itemUses ||= new Map();
        runtime.itemUses.set(useId, request);

        const notifyCancelled = (reason, message) => {
            if (request.cancelNotified) return;
            request.cancelNotified = true;
            request.status = 'cancelled';
            request.cancelReason = reason;
            this.api.notifications.add("Use cancelled", message, "warning", {
                source: "engine", category: "inventory.use_cancelled",
                dedupeKey: `item-use-cancel:${useId}`, metadata: { useId, itemId: id, ownerId, reason }
            });
        };

        const onQueueStart = () => {
            if (request.status !== 'pending') return false;
            const currentOwner = this.getOwnerId();
            const currentInventory = state.getRuntimeSnapshot('characters.[id].inventory', { id: ownerId }) || [];
            const currentHand = state.getRuntimeSnapshot('characters.[id].hand', { id: ownerId }) || [];
            if (currentOwner !== ownerId || !currentInventory.includes(id) || !currentHand.includes(id)) {
                notifyCancelled('not_equipped_or_owned', `${info.name || id} is no longer equipped in your hand. Its use was cancelled.`);
                return false;
            }
            const currentInfo = state.getRuntimeSnapshot('itemInfo.[id]', { id }) || info;
            if (currentInfo.requirements) {
                const req = this.checkReq(currentInfo.requirements);
                if (!req.pass) {
                    notifyCancelled('requirements_changed', `${info.name || id} can no longer be used because its requirements are not met.`);
                    return false;
                }
            }
            if (currentInfo.usage) {
                const isBroken = this.isBroken(id);
                const disableBrokenUse = this.getConfig ? this.getConfig('brokenDisable') : false;
                if (isBroken && disableBrokenUse) {
                    notifyCancelled('broken', `${info.name || id} has no uses remaining. The queued use was cancelled.`);
                    return false;
                }
                const autoInc = currentInfo.usage.autoInc !== false;
                if (typeof currentInfo.usage.current === 'number' && autoInc) {
                    const max = Number(currentInfo.usage.max);
                    state.update('itemInfo.[id].usage', usage => {
                        const current = Number(usage?.current);
                        if (!Number.isFinite(current)) return usage;
                        const next = current + 1;
                        usage.current = Number.isFinite(max) && max > 0 ? Math.min(max, next) : next;
                        return usage;
                    }, { id });
                }
            }
            request.status = 'committed';
            this.api.notifications.add("Using", `Using ${info.name || id}…`, "info", {
                source: "engine", category: "inventory.using",
                dedupeKey: `item-use-start:${useId}`, metadata: { useId, itemId: id, ownerId }
            });
            return true;
        };

        try {
            // Empty use-effect lists are still valid consumable uses in the
            // legacy contract. There is no queue work to wait for, so commit
            // synchronously after the same equipped-state validation.
            if (!useEffects.length) {
                if (!onQueueStart()) return { accepted: true, useId, cancelled: true, reason: request.cancelReason };
                await this.processRunnables(useEffects, { itemId: id, hook: 'use', useId, shouldContinue: () => request.status === 'pending' || request.status === 'committed' });
                request.status = 'completed';
                this.api.notifications.add("Used", `${info.name || id} was used successfully.`, "success", {
                    source: "engine", category: "inventory.used",
                    dedupeKey: `item-use-success:${useId}`, metadata: { useId, itemId: id, ownerId }
                });
                this.api.notifications.add("Notice", "This item has no effect when used directly.", "info", {
                    source: "engine", category: "inventory.use_no_effect", metadata: { useId, itemId: id, ownerId }
                });
                return { accepted: true, useId, used: true, noEffect: true };
            }
            const result = await this.processRunnables(useEffects, {
                itemId: id, hook: 'use', useId,
                onQueueStart,
                shouldContinue: () => request.status === 'pending' || request.status === 'committed'
            });
            if (result?.cancelled || request.status !== 'committed') {
                if (!request.cancelNotified) notifyCancelled(result?.reason || 'queue_cancelled', `${info.name || id} use was cancelled before it could start.`);
                return { accepted: true, useId, cancelled: true, reason: request.cancelReason || result?.reason || 'cancelled' };
            }
            if (result?.error) {
                this.api.notifications.add("Use failed", `${info.name || id} started, but its effect failed: ${result.error.message || result.error}`, "warning", {
                    source: "engine", category: "inventory.use_failed_execution",
                    dedupeKey: `item-use-error:${useId}`, metadata: { useId, itemId: id, ownerId }
                });
                throw result.error;
            }
            request.status = 'completed';
            this.api.notifications.add("Used", `${info.name || id} was used successfully.`, "success", {
                source: "engine", category: "inventory.used",
                dedupeKey: `item-use-success:${useId}`, metadata: { useId, itemId: id, ownerId }
            });
            this.api.presentation.components.updateItemModal(id);
            this.api.presentation.components.explorer();
            return { accepted: true, useId, used: true };
        } catch (error) {
            if (request.status === 'committed') {
                this.api.notifications.add("Use failed", `${info.name || id} started, but its effect failed.`, "warning", {
                    source: "engine", category: "inventory.use_failed_execution",
                    dedupeKey: `item-use-error:${useId}`, metadata: { useId, itemId: id, ownerId, error: String(error?.message || error) }
                });
            }
            throw error;
        } finally {
            runtime.itemUses?.delete(useId);
            // Recover a stale global action lock only after every effect queue is
            // idle. Item use must not unlock while async effects or transitions
            // still own the engine's blocking state.
            const queuesIdle = !this.runtime?.isSyncQueueRunning
                && !this.runtime?.isAsyncQueueRunning
                && !(this.runtime?.effectQueue?.sync?.length)
                && !(this.runtime?.effectQueue?.async?.length);
            if (queuesIdle && !this.isTransitioning && this.isActionProcessing) {
                this.isActionProcessing = false;
                this.api.presentation.navigation.setBlocking(false);
            }
            this.commitState('inventory.use.completed');
        }
    }
};


// Domain-owned effect handlers. The dispatcher only selects an operation.

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

    add: (engine, eff, context) => engine.applyAddEffect(eff, context),

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

export const ItemEffectSystem = {
    executeItemEffect(eff, context = {}) {
        const handler = ItemStrategies[eff.subtype];
        if (typeof handler !== 'function') throw new TypeError(`Unsupported item subtype: ${String(eff.subtype)}`);
        return handler(this, eff, context);
    }
};
