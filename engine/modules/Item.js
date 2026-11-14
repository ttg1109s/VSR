export const ItemSystem = {
    getOwnerId() {
        return this.api.engine.state.getRuntime('meta.entryCharacter') || 'player';
    },

    getInventory() {
        const ownerId = this.getOwnerId();
        return this.api.engine.state.getRuntimeSnapshot('characters.[id].inventory', { id: ownerId }) || [];
    },

    getHand() {
        const ownerId = this.getOwnerId();
        return this.api.engine.state.getRuntimeSnapshot('characters.[id].hand', { id: ownerId }) || [];
    },

    async addItem(itemId) {
        const state = this.api.engine.state;
        const ownerId = this.getOwnerId();
        const maxInvList = (this.getConfig ? this.getConfig('maxInventory') : null) || [];
        const ownerLimitPair = Array.isArray(maxInvList) ? maxInvList.find(pair => Array.isArray(pair) && pair[1] === ownerId) : null;
        const limit = ownerLimitPair ? ownerLimitPair[0] : 0;
        const result = await state.transaction(tx => {
            if (!tx.get('characters.[id]', { id: ownerId })) return 'missing';
            const inventory = tx.get('characters.[id].inventory', { id: ownerId }) || [];
            if (inventory.includes(itemId)) return 'duplicate';
            if (limit > 0 && inventory.length >= limit) return 'full';
            inventory.push(itemId);
            tx.set('characters.[id].inventory', inventory, { id: ownerId });
            return 'added';
        });
        if (result === 'full') this.api.presentation.notification.add("Không thể nhặt", "Túi đồ đã đầy.", "warn");
        return result === 'added';
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
            this.api.presentation.notification.add("Lỗi", "Vật phẩm không tồn tại.", "danger");
            return;
        }

        const idx = (this.getHand() || []).indexOf(id);
        const maxHand = (this.getConfig ? this.getConfig('maxHandOn') : state.getRuntime('config.maxHandOn')) || 10;
        if (idx < 0 && info.requirements) {
            const res = this.checkReq(info.requirements);
            if (!res.pass) {
                this.api.presentation.notification.add("Không thể cầm", "Chưa đủ điều kiện sử dụng.", "danger");
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
            this.api.presentation.notification.add("Không thể cầm", "Tay đã đầy.", "warn");
            return;
        }
        if (result === 'unequipped') {
            this.api.presentation.notification.add("Đã cất", "Bỏ vật phẩm vào túi", "info");
            if (info.effect?.unequip) await this.processRunnables(info.effect.unequip, { itemId: id });
        } else {
            this.api.presentation.notification.add("Đã cầm", `${info.name} đang ở trên tay`, "success");
            if (info.effect?.equip) await this.processRunnables(info.effect.equip, { itemId: id });
        }

        this.api.presentation.components.updateItemModal(id);
        this.api.presentation.components.explorer();
        this.commitState('inventory.changed');
    },

    async use(id) {
        const state = this.api.engine.state;
        const info = state.getRuntime('itemInfo.[id]', { id });
        if (!info) return;

        if (info.requirements) {
            const res = this.checkReq(info.requirements);
            if (!res.pass) {
                this.api.presentation.notification.add("Không thể dùng", "Chưa đủ điều kiện sử dụng.", "danger");
                return;
            }
        }

        if (info.usage) {
            const isBroken = this.isBroken(id);
            const disableBrokenPenalty = this.getConfig ? this.getConfig('brokenDisable') : false;
            if (isBroken && !disableBrokenPenalty) {
                this.api.presentation.notification.add("Hỏng", "Vật phẩm đã hỏng hoặc hết lượt dùng.", "warn");
                return;
            }
            const autoInc = info.usage.autoInc !== false;
            if (typeof info.usage.current === 'number' && autoInc) {
                state.set('item.current', info.usage.current + 1, { id });
            }
        }

        if (info.effect?.use) {
            this.api.presentation.notification.add("Sử dụng", `Đã dùng ${info.name}`, "info");
            await this.processRunnables(info.effect.use, { itemId: id });
        } else {
            this.api.presentation.notification.add("Thông báo", "Vật phẩm này không có tác dụng khi sử dụng trực tiếp.", "info");
        }

        this.api.presentation.components.updateItemModal(id);
        this.api.presentation.components.explorer();
    }
};
