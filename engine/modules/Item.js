import { API } from '../../api/index.js';

export const ItemSystem = {
    getOwnerId() {
        // [Refactor] Luôn lấy theo entryCharacter (cơ thể gốc của người chơi)
        // Nếu faker mode = swap -> entryCharacter sẽ thay đổi.
        // Nếu faker mode = soul/mask -> entryCharacter vẫn là 'player' (hoặc char khởi đầu).
        return this.state.meta?.entryCharacter || 'player';
    },

    getInventory() {
        const ownerId = this.getOwnerId();
        const char = this.state.characters[ownerId];
        return char ? (char.inventory || []) : [];
    },

    getHand() {
        const ownerId = this.getOwnerId();
        const char = this.state.characters[ownerId];
        return char ? (char.hand || []) : [];
    },

    addItem(itemId) {
        const ownerId = this.getOwnerId();
        const char = this.state.characters[ownerId];
        if (!char) return false;
        if (!char.inventory) char.inventory = [];

        if (!char.inventory.includes(itemId)) {
            char.inventory.push(itemId);
            return true;
        }
        return false;
    },

    // [Refactor] Calculate status on-demand (Single Source of Truth)
    isBroken(itemId) {
        // [FIXED] Use API to read state via Schema
        const current = API.engine.state.get('item.current', { id: itemId });
        const max = API.engine.state.get('item.max', { id: itemId });

        // Broken if current usage exceeds or equals max usage (assuming max > 0)
        if (max > 0 && current >= max) {
            return true;
        }
        return false;
    },

    async toggleHand(id) {
        const ownerId = this.getOwnerId();
        const char = this.state.characters[ownerId];
        if (!char) return;
        if (!char.hand) char.hand = [];

        const idx = char.hand.indexOf(id);
        const info = this.state.itemInfo[id];

        if (!info) {
            API.render.notification.add("Lỗi", "Vật phẩm không tồn tại.", "danger");
            return;
        }

        if (idx > -1) {
            // --- UNEQUIP ---
            char.hand.splice(idx, 1);
            API.render.notification.add("Đã cất", "Bỏ vật phẩm vào túi", "info");

            if (info.effect && info.effect.unequip) {
                await this.processRunnables(info.effect.unequip, { itemId: id });
            }
        } else {
            // --- EQUIP ---
            const maxHand = (this.state.config && this.state.config.maxInventory && this.state.config.maxInventory.maxHandOn) || 10;
            if (char.hand.length >= maxHand) {
                API.render.notification.add("Không thể cầm", "Tay đã đầy.", "warn");
                return;
            }

            if (info.requirements) {
                const res = this.checkReq(info.requirements);
                if (!res.pass) { API.render.notification.add("Không thể cầm", "Chưa đủ điều kiện sử dụng.", "danger"); return; }
            }
            char.hand.push(id);
            API.render.notification.add("Đã cầm", `${info.name} đang ở trên tay`, "success");

            if (info.effect && info.effect.equip) {
                await this.processRunnables(info.effect.equip, { itemId: id });
            }
        }

        // Update UI
        API.render.components.updateItemModal(id);
        API.render.components.explorer(); // Refresh inventory grid
        this.render();
    },

    // [NEW] Xử lý hành động "Dùng" (Use) vật phẩm
    async use(id) {
        const info = this.state.itemInfo[id];
        if (!info) return;

        // 1. Kiểm tra Requirements (nếu có)
        if (info.requirements) {
            const res = this.checkReq(info.requirements);
            if (!res.pass) {
                API.render.notification.add("Không thể dùng", "Chưa đủ điều kiện sử dụng.", "danger");
                return;
            }
        }

        // 2. Kiểm tra độ bền/số lần sử dụng
        if (info.usage) {
            // Check broken status (On-demand)
            const isBroken = this.isBroken(id);

            // Config: brokenDisable
            // false (default) -> Broken items are disabled (Cannot use)
            // true -> Disable the "Broken" penalty (Can use even if broken)
            const disableBrokenPenalty = this.getConfig ? this.getConfig('brokenDisable') : false;

            if (isBroken && !disableBrokenPenalty) {
                API.render.notification.add("Hỏng", "Vật phẩm đã hỏng hoặc hết lượt dùng.", "warn");
                return;
            }

            // Tăng độ mòn/số lần đã dùng (Nếu chưa hỏng hẳn hoặc config cho phép dùng tiếp)
            // [UPDATED] Check autoInc config (Default: true)
            const autoInc = info.usage.autoInc !== false;

            if (typeof info.usage.current === 'number' && autoInc) {
                info.usage.current++;
                // [Refactor] No need to store state. logic is on-demand.
            }
        }

        // 3. Thực thi Effect 'use'
        if (info.effect && info.effect.use) {
            API.render.notification.add("Sử dụng", `Đã dùng ${info.name}`, "info");

            // Execute runnables defined in schema
            await this.processRunnables(info.effect.use, { itemId: id });

            // Nếu vật phẩm là loại tiêu hao (consumable) và logic game yêu cầu xóa khi hỏng/hết lượt
            // có thể thêm logic xóa tại đây. Hiện tại Engine giữ lại item (chỉ update status).
        } else {
            API.render.notification.add("Thông báo", "Vật phẩm này không có tác dụng khi sử dụng trực tiếp.", "info");
        }

        // 4. Update UI
        API.render.components.updateItemModal(id);
        API.render.components.explorer();
    }
};