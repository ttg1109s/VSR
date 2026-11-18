export const ItemSystem = {
    getOwnerId() {
        return this.api.engine.state.get('entryCharacter') || 'player';
    },

    getInventory() {
        const ownerId = this.getOwnerId();
        return this.api.engine.state.getRuntimeSnapshot('characters.[id].inventory', { id: ownerId }) || [];
    },

    getHand() {
        const ownerId = this.getOwnerId();
        return this.api.engine.state.getRuntimeSnapshot('characters.[id].hand', { id: ownerId }) || [];
    },

    addItem(itemId) {
        const state = this.api.engine.state;
        const ownerId = this.getOwnerId();
        if (!state.getRuntimeSnapshot('characters.[id]', { id: ownerId })) return false;
        const inventory = state.getRuntimeSnapshot('characters.[id].inventory', { id: ownerId }) || [];
        if (inventory.includes(itemId)) return false;
        const maxInvList = (this.getConfig ? this.getConfig('maxInventory') : null) || [];
        const ownerLimitPair = Array.isArray(maxInvList) ? maxInvList.find(pair => Array.isArray(pair) && pair[1] === ownerId) : null;
        const limit = ownerLimitPair ? ownerLimitPair[0] : 0;
        if (limit > 0 && inventory.length >= limit) {
            this.api.presentation.notification.add("Cannot pick up item", "Inventory is full.", "warning");
            return false;
        }
        state.set('characters.[id].inventory', [...inventory, itemId], { id: ownerId });
        return true;
    },

    isBroken(itemId) {
        const current = this.api.engine.state.get('item.current', { id: itemId });
        const max = this.api.engine.state.get('item.max', { id: itemId });
        return max > 0 && current >= max;
    },

    async toggleHand(id) {
        const state = this.api.engine.state;
        const ownerId = this.getOwnerId();
        const info = state.getRuntimeSnapshot('itemInfo.[id]', { id });

        if (!info) {
            this.api.presentation.notification.add("Error", "Item does not exist.", "danger");
            return;
        }

        const idx = (this.getHand() || []).indexOf(id);
        const configuredMaxHand = Number(this.getConfig ? this.getConfig('maxHandOn') : state.get('maxHandOn'));
        const maxHand = Number.isFinite(configuredMaxHand) && configuredMaxHand > 0 ? configuredMaxHand : Infinity;
        if (idx < 0 && info.requirements) {
            const res = this.checkReq(info.requirements);
            if (!res.pass) {
                this.api.presentation.notification.add("Cannot hold item", "Requirements not met.", "danger");
                return;
            }
        }

        const result = await state.transaction(tx => {
            if (!tx.get('characters.[id]', { id: ownerId })) return 'missing';
            const hand = tx.get('characters.[id].hand', { id: ownerId }) || [];
            const currentIndex = hand.indexOf(id);
            if (currentIndex > -1) {
                hand.splice(currentIndex, 1);
                tx.set('characters.[id].hand', hand, { id: ownerId });
                return 'unequipped';
            }
            if (hand.length >= maxHand) return 'full';
            hand.push(id);
            tx.set('characters.[id].hand', hand, { id: ownerId });
            return 'equipped';
        });

        if (result === 'missing') return;
        if (result === 'full') {
            this.api.presentation.notification.add("Cannot hold item", "Hands are full.", "warning");
            return;
        }
        if (result === 'unequipped') {
            this.api.presentation.notification.add("Item stored", "Item added to inventory", "info");
            if (info.effect?.unequip) await this.processRunnables(info.effect.unequip, { itemId: id, hook: 'unequip' });
        } else {
            this.api.presentation.notification.add("Item equipped", `${info.name} is now in your hand`, "success");
            if (info.effect?.equip) await this.processRunnables(info.effect.equip, { itemId: id, hook: 'equip' });
        }

        this.api.presentation.components.updateItemModal(id);
        this.api.presentation.components.explorer();
        this.commitState('inventory.changed');
    },

    async use(id) {
        const state = this.api.engine.state;
        const info = state.getRuntimeSnapshot('itemInfo.[id]', { id });
        if (!info) return;

        if (info.requirements) {
            const res = this.checkReq(info.requirements);
            if (!res.pass) {
                this.api.presentation.notification.add("Cannot use item", "Requirements not met.", "danger");
                return;
            }
        }

        if (info.usage) {
            const isBroken = this.isBroken(id);
            const disableBrokenUse = this.getConfig ? this.getConfig('brokenDisable') : false;
            if (isBroken && disableBrokenUse) {
                this.api.presentation.notification.add("Broken", "The item is broken or has no uses remaining.", "warning");
                return;
            }
            const autoInc = info.usage.autoInc !== false;
            if (typeof info.usage.current === 'number' && autoInc) {
                state.set('item.current', info.usage.current + 1, { id });
            }
        }

        if (info.effect?.use) {
            this.api.presentation.notification.add("Used", `Used ${info.name}`, "info");
            await this.processRunnables(info.effect.use, { itemId: id, hook: 'use' });
        } else {
            this.api.presentation.notification.add("Notice", "This item has no effect when used directly.", "info");
        }

        this.api.presentation.components.updateItemModal(id);
        this.api.presentation.components.explorer();
    }
};
