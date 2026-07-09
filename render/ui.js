// render/ui.js

// Import từ thư mục con ./modules/
import { commonMethods } from './modules/common.js?v=2';
import { inventoryMethods } from './modules/inventory.js?v=2';
import { characterMethods } from './modules/character.js?v=2';
import { actionMethods } from './modules/actions.js?v=5';
import { sceneMethods } from './modules/scene.js?v=3';
// Import Components
import { ReadMoreModalTemplate, FakerModalTemplate } from '../components/Modals.js';
import { TimerDisplayTemplate } from '../components/Visuals.js';
// Import từ thư mục password (ở root)
import { PasswordSystem } from '../password/index.js';

export class UIController {
    constructor() {
        this.openedItemId = null;
        this.notifications = [];
        this.currentContactId = null;
        this.isMobileView = window.innerWidth < 768;

        // [Refactor] Render toàn bộ shell tĩnh (tách từ index.html sang
        // components/*.js) TRƯỚC TIÊN — xem ghi chú tại renderAppShell().
        this.renderAppShell();

        this.ensureToastContainer();
        this.ensureReadMoreModal();
        this.ensureActionInfoModal();
        this.ensureTimerDisplay();

        this.ensureFakerModal();

        this.injectAnimationStyles();

        // Khởi tạo Keyboard Controller và Numpad
        this.keyboard = new PasswordSystem();

        // Expose keyboard ra global để Engine gọi được nếu cần
        window.keyboard = this.keyboard;

        // [REMOVED] initNumpad không còn cần thiết vì PasswordSystem tự quản lý UI
        // setTimeout(() => initNumpad(this.keyboard), 0);

        // Cooldown Ticker Loop
        this.cooldownInterval = setInterval(() => this.updateCooldownVisuals(), 100);

        window.addEventListener('resize', () => {
            const nowMobile = window.innerWidth < 768;
            if (this.isMobileView !== nowMobile) {
                this.isMobileView = nowMobile;
                if (engine.state.sceneId) this.renderContactScreen();
            }
        });
    }

    reset() {
        this.notifications = [];
        this.renderNotifications();
        const badge = document.getElementById('notify-badge');
        if (badge) badge.classList.add('hidden');
        const np = document.getElementById('notify-panel');
        if (np && !np.classList.contains('hidden-panel')) np.classList.add('hidden-panel');

        this.openedItemId = null;
        this.closeItemModal();
        this.closeDynamicPanel();

        const grid = document.getElementById('explorer-grid');
        if (grid) grid.innerHTML = '';
        const taskbar = document.getElementById('inventory-taskbar-content');
        if (taskbar) taskbar.innerHTML = '';

        this.currentContactId = null;
        const contactListPanel = document.getElementById('contact-list-panel');
        const contactDetailPanel = document.getElementById('contact-detail-panel');
        if (contactListPanel) contactListPanel.classList.remove('hidden');
        if (contactDetailPanel) {
            contactDetailPanel.classList.add('hidden');
            contactDetailPanel.classList.remove('flex');
        }
        const emptyState = document.getElementById('contact-empty-state');
        const detailView = document.getElementById('contact-detail-view');
        if (emptyState) {
            emptyState.classList.remove('hidden');
            emptyState.classList.add('flex');
        }
        if (detailView) {
            detailView.classList.add('hidden');
            detailView.classList.remove('flex');
        }
        const chatHist = document.getElementById('contact-chat-history');
        if (chatHist) chatHist.innerHTML = '';

        document.querySelectorAll('[id^="meeting-alert-"]').forEach(el => el.remove());
        this.closePlayerCard();
        this.closeReadMore();
        this.closeActionDetail();
        this.closeAlert();
        this.closeFakerModal();
        this.hideEnding();
        this.hideTimer();

        // Reset Keyboard nếu đang mở
        if (this.keyboard) this.keyboard.hide();
    }

    applyConfig() {
        if (!window.API || !API.engine) return;

        // Nav Contact
        const navContact = API.engine.getConfig ? API.engine.getConfig('navContact') : true;
        const btnContact = document.getElementById('nav-btn-contact');
        if (btnContact) btnContact.style.display = navContact ? '' : 'none';

        // Nav Inventory
        const navInventory = API.engine.getConfig ? API.engine.getConfig('navInventory') : true;
        const btnInventory = document.getElementById('nav-btn-inventory');
        if (btnInventory) btnInventory.style.display = navInventory ? '' : 'none';

        console.log(`UI Config Applied: Contact=${navContact}, Inventory=${navInventory}`);
    }
}

// Gộp các methods từ các modules vào prototype của UIController
Object.assign(UIController.prototype, commonMethods);
Object.assign(UIController.prototype, inventoryMethods);
Object.assign(UIController.prototype, characterMethods);
Object.assign(UIController.prototype, actionMethods);
Object.assign(UIController.prototype, sceneMethods);

// Override ensure methods để sử dụng component mới
UIController.prototype.ensureReadMoreModal = function () {
    if (document.getElementById('readmore-overlay')) return;
    const div = document.createElement('div');
    div.id = 'readmore-overlay';
    div.className = "fixed inset-0 bg-black/90 z-[1100] hidden flex items-center justify-center p-6 opacity-0 transition-opacity duration-300";
    // Use Component
    div.innerHTML = ReadMoreModalTemplate();
    document.body.appendChild(div);
};

UIController.prototype.ensureFakerModal = function () {
    if (document.getElementById('faker-overlay')) return;
    const div = document.createElement('div');
    div.id = 'faker-overlay';
    div.className = "fixed inset-0 bg-black/90 z-[1300] hidden flex items-center justify-center p-4 opacity-0 transition-opacity duration-300";
    // Use Component
    div.innerHTML = FakerModalTemplate();
    document.body.appendChild(div);
};

UIController.prototype.ensureTimerDisplay = function () {
    if (document.getElementById('game-timer')) return;
    const div = document.createElement('div');
    div.id = 'game-timer';
    div.className = "fixed top-20 left-1/2 transform -translate-x-1/2 z-40 hidden flex flex-col items-center pointer-events-none";
    // Use Component
    div.innerHTML = TimerDisplayTemplate();
    document.body.appendChild(div);
};
