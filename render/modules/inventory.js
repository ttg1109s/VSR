import { API } from '../../api/index.js';
import { ExplorerItem, TaskbarItem } from '../../components/Inventory.js';
import { ItemToolbarTemplate, ItemInfoWindow, ItemStatsWindow, ItemActionDropdown } from '../../components/ItemModal.js';

export const inventoryMethods = {
    renderExplorerGrid() {
        const grid = document.getElementById('explorer-grid');
        const taskbar = document.getElementById('inventory-taskbar-content');
        if (!grid || !taskbar) return;

        grid.innerHTML = '';
        taskbar.innerHTML = '';

        const items = API.engine.state.getInventory();
        const hand = API.engine.state.getHand();

        // [FIX] 'maxInventory' là MẢNG các cặp [limit, char_id] (giới hạn riêng theo từng
        // nhân vật), không phải một số đơn. `[] || 0` luôn ra `[]` (mảng rỗng vẫn truthy
        // trong JS) nên trước đây bộ đếm hiển thị bị hỏng (vd "3/" thay vì "3/∞").
        // Tìm giới hạn áp dụng cho nhân vật đang sở hữu túi đồ hiện tại (entryCharacter);
        // không tìm thấy cặp nào khớp -> coi là vô hạn.
        const ownerId = (API.engine.state.meta && API.engine.state.meta.entryCharacter) || 'player';
        const maxInvList = (API.engine.getConfig && API.engine.getConfig('maxInventory')) || [];
        const ownerLimitPair = Array.isArray(maxInvList) ? maxInvList.find(pair => Array.isArray(pair) && pair[1] === ownerId) : null;
        const maxInv = ownerLimitPair ? ownerLimitPair[0] : 0;
        const limitDisplay = (!maxInv || maxInv === 0) ? '∞' : maxInv;
        const statusEl = document.getElementById('explorer-status');
        if (statusEl) statusEl.innerHTML = `<span class="font-mono">${items.length}/${limitDisplay}</span> items • ${hand.length} equipped`;

        const leftPanel = document.querySelector('.md\\:block.w-48');
        if (leftPanel) leftPanel.style.display = 'none';

        if (items.length === 0) {
            grid.innerHTML = `<div class=\"col-span-full text-center py-20 text-slate-400 text-xs italic\">Túi đồ trống</div>`;
        } else {
            items.forEach(id => {
                const info = API.engine.state.getItem(id);
                if (!info) return;
                const isEquipped = hand.includes(id);
                const isBroken = info.usage && info.usage.max > 0 && info.usage.current >= info.usage.max;

                // Highlight Selected Item
                const isSelected = (this.openedItemId === id);

                const el = document.createElement('div');
                el.innerHTML = ExplorerItem({ id, info, isEquipped, isBroken, isSelected });
                const actualEl = el.firstElementChild;
                actualEl.onclick = () => this.openItemModal(id);
                grid.appendChild(actualEl);
            });
        }

        if (hand.length === 0) {
            taskbar.innerHTML = `<span class=\"text-slate-600 text-xs italic pl-2 flex items-center h-full\">Chưa cầm gì</span>`;
        } else {
            hand.forEach(id => {
                const info = API.engine.state.getItem(id);
                if (!info) return;
                const isBroken = info.usage && info.usage.max > 0 && info.usage.current >= info.usage.max;
                const d = document.createElement('div');
                d.innerHTML = TaskbarItem({ id, info, isBroken });
                const actualEl = d.firstElementChild;
                actualEl.onclick = () => this.openItemModal(id);
                taskbar.appendChild(actualEl);
            });
        }
    },

    openItemModal(id) {
        const info = API.engine.state.getItem(id);
        if (!info) return;
        this.openedItemId = id;
        this.renderExplorerGrid(); // Refresh grid to apply highlight logic

        // Container chính cho modal (Toolbar + Windows)
        const modalContainer = document.getElementById('item-modal');
        // Reset nội dung cũ
        modalContainer.innerHTML = '';
        modalContainer.className = "fixed inset-0 z-50 pointer-events-none hidden"; // Pointer events none để click xuyên qua vùng trống

        // 1. Render Toolbar (Nằm trên cùng - Top Bar)
        const toolbarDiv = document.createElement('div');
        toolbarDiv.className = "pointer-events-auto absolute top-0 left-0 w-full animate-slide-down shadow-2xl";
        toolbarDiv.innerHTML = ItemToolbarTemplate({ itemName: info.name });
        modalContainer.appendChild(toolbarDiv);

        // 2. Container cho các Window (Info/Stats)
        // Trên mobile: Bottom Sheet. Trên Desktop: Center Popup
        const windowContainer = document.createElement('div');
        windowContainer.id = 'item-window-container';
        windowContainer.className = "pointer-events-auto absolute bottom-0 w-full h-[60vh] md:h-auto md:w-[400px] md:top-20 md:left-1/2 md:-translate-x-1/2 md:bottom-auto z-40 hidden";
        modalContainer.appendChild(windowContainer);

        // 3. Container cho Dropdown Action
        const dropdownContainer = document.createElement('div');
        dropdownContainer.id = 'item-action-dropdown';
        dropdownContainer.className = "pointer-events-auto absolute top-14 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 hidden z-50";
        modalContainer.appendChild(dropdownContainer);

        // Hiển thị Modal Overlay
        modalContainer.classList.remove('hidden');

        // --- Event Binding ---

        // Nút Close Toolbar -> Đóng toàn bộ
        toolbarDiv.querySelector('#toolbar-close-btn').onclick = () => this.closeItemModal();

        // Nút Info -> Toggle Window Info
        toolbarDiv.querySelector('#toolbar-btn-info').onclick = () => {
            this.toggleWindow('info', id, windowContainer, dropdownContainer);
        };

        // Nút Stats -> Toggle Window Stats
        toolbarDiv.querySelector('#toolbar-btn-stats').onclick = () => {
            this.toggleWindow('stats', id, windowContainer, dropdownContainer);
        };

        // Nút Action -> Toggle Dropdown
        const actionBtn = toolbarDiv.querySelector('#toolbar-btn-action');
        actionBtn.onclick = (e) => {
            e.stopPropagation();
            this.toggleActionDropdown(id, dropdownContainer, actionBtn);
        };

        // Click ra ngoài để đóng Dropdown/Window (Optional, thêm logic sau nếu cần)
    },

    toggleWindow(type, id, container, dropdownContainer) {
        // Đóng dropdown nếu đang mở
        dropdownContainer.classList.add('hidden');

        // Nếu đang mở đúng loại window này thì đóng lại (Toggle)
        if (!container.classList.contains('hidden') && container.dataset.activeType === type) {
            container.classList.add('hidden');
            container.dataset.activeType = '';
            return;
        }

        const info = API.engine.state.getItem(id);
        const desc = info.desc || "Không có mô tả.";

        let html = '';
        if (type === 'info') {
            html = ItemInfoWindow({ info, desc });
        } else if (type === 'stats') {
            html = ItemStatsWindow({ info });
        }

        container.innerHTML = html;
        container.classList.remove('hidden');
        container.dataset.activeType = type;

        // Bind nút close nhỏ trong window
        const closeBtn = container.querySelector('.window-close-btn');
        if (closeBtn) closeBtn.onclick = () => container.classList.add('hidden');
    },

    toggleActionDropdown(id, container, anchorBtn) {
        // Đóng Window nếu đang mở (để đỡ rối)
        const winContainer = document.getElementById('item-window-container');
        if (winContainer) winContainer.classList.add('hidden');

        if (!container.classList.contains('hidden')) {
            container.classList.add('hidden');
            return;
        }

        const hand = API.engine.state.getHand();
        const isEquipped = hand.includes(id);

        container.innerHTML = ItemActionDropdown({ isEquipped });

        // Định vị Dropdown ngay dưới nút Action (Trên Desktop)
        // Trên Mobile, ta có thể để nó fixed hoặc tính toán vị trí
        const rect = anchorBtn.getBoundingClientRect();
        if (window.innerWidth >= 768) {
            container.style.left = `${rect.left}px`;
            container.style.top = `${rect.bottom + 8}px`;
            container.style.transform = 'none'; // Reset translate
        }

        container.classList.remove('hidden');

        // Bind Events cho nút trong Dropdown
        const equipBtn = container.querySelector('#action-btn-equip');
        const useBtn = container.querySelector('#action-btn-use');

        if (equipBtn) {
            equipBtn.onclick = () => {
                API.engine.inventory.toggleHand(id);
                this.closeItemModal();
                setTimeout(() => this.renderExplorerGrid(), 50);
            };
        }

        if (useBtn) {
            useBtn.onclick = () => {
                if (isEquipped) {
                    this.closeItemModal();
                    if (window.engine && window.engine.use) window.engine.use(id);
                } else {
                    API.render.notification.add("Nhắc nhở", "Cầm vật phẩm lên tay để sử dụng.", "warn");
                }
            };
        }
    },

    closeItemModal() {
        const m = document.getElementById('item-modal');
        if (!m) return;
        m.innerHTML = ''; // Clear DOM
        m.classList.add('hidden');
        this.openedItemId = null;
        this.renderExplorerGrid(); // Refresh grid to remove highlight
    },

    closeDynamicPanel() { this.closeItemModal(); } // Alias cũ
};