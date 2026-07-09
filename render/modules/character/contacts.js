// Module: Quản lý danh bạ - Main Controller
// Điều phối giữa List View và Details View

import { ContactList } from './contacts/list.js';
import { ContactDetails } from './contacts/details.js';
import { ContactScreenLayout } from '../../../components/Layouts.js';

export const ContactMethods = {
    // --- Public API ---
    openContactChat(charId) { this.selectContact(charId); },

    setBlockingMode(blocking) {
        const closeBtn = document.getElementById('contact-screen-close');
        const listPanel = document.getElementById('contact-list-panel');
        if (blocking) {
            if (closeBtn) closeBtn.classList.add('hidden');
            if (!this.isMobileView && listPanel) listPanel.classList.add('pointer-events-none', 'opacity-50');
        } else {
            if (closeBtn) closeBtn.classList.remove('hidden');
            if (!this.isMobileView && listPanel) listPanel.classList.remove('pointer-events-none', 'opacity-50');
        }
    },

    renderCharScreen() { this.renderContactScreen(); },

    // --- Main Layout ---
    renderContactScreen() {
        const container = document.getElementById('screen-character');
        if (!container) return;

        // Use Component Layout
        container.innerHTML = ContactScreenLayout({
            currentContactId: this.currentContactId,
            isMobileView: this.isMobileView
        });

        this.renderContactList();
        if (this.currentContactId) this.loadContactDetails(this.currentContactId);
        if (engine && engine.chatState && engine.chatState.blocking) this.setBlockingMode(true);
    },

    // --- Delegation to Modules ---
    renderContactList() {
        ContactList.render(this);
    },

    loadContactDetails(cid) {
        ContactDetails.load(this, cid);
    },

    toggleDetailInfo() {
        ContactDetails.toggleInfo();
    },

    updateContactDetails(cid) {
        console.log(`[Contact Debug] updateContactDetails called for ${cid}. Current=${this.currentContactId}`);
        if (this.currentContactId === cid) {
            this.loadContactDetails(cid);
        }
    },

    // --- Interaction Logic ---
    selectContact(cid) {
        this.currentContactId = cid;
        this.currentThreadId = null;
        this.renderContactList();

        // [FIX] #contact-empty-state / #contact-detail-view phải luôn đồng bộ
        // theo currentContactId, BẤT KỂ mobile hay desktop — trước đây chỉ
        // nhánh desktop (else) toggle 2 phần tử này. Trên mobile, nhánh if chỉ
        // toggle panel NGOÀI (contact-list-panel/contact-detail-panel) nên dù
        // panel phải đã hiện ra, bên trong vẫn kẹt ở placeholder
        // "Select a contact..." — vì #contact-detail-view (chứa cả
        // #contact-info-overlay dùng cho Personal Stats khi bấm vào chính
        // mình) vẫn còn class "hidden" từ lúc render lần đầu, không bao giờ
        // được gỡ trên mobile.
        document.getElementById('contact-empty-state').classList.add('hidden');
        document.getElementById('contact-detail-view').classList.remove('hidden');
        document.getElementById('contact-detail-view').classList.add('flex');

        // UI Transition logic — chuyển panel ngoài, chỉ cần thiết trên mobile
        // (desktop luôn hiện đồng thời cả 2 panel nên không cần ẩn/hiện panel).
        if (this.isMobileView) {
            document.getElementById('contact-list-panel').classList.add('hidden');
            document.getElementById('contact-detail-panel').classList.remove('hidden');
            document.getElementById('contact-detail-panel').classList.add('flex');
        }

        this.loadContactDetails(cid);
    },

    onContactBackBtn() {
        if (engine.chatState.blocking) return;
        if (this.currentThreadId) {
            this.currentThreadId = null;
            this.loadContactDetails(this.currentContactId);
            return;
        }
        this.backToContactList();
    },

    backToContactList() {
        this.currentContactId = null;
        this.currentThreadId = null;
        this.renderContactList();

        // [FIX] Luôn reset empty-state/detail-view bất kể mobile/desktop — lý
        // do tương tự selectContact() ở trên (đồng bộ, không phụ thuộc nhánh).
        document.getElementById('contact-empty-state').classList.remove('hidden');
        document.getElementById('contact-empty-state').classList.add('flex');
        document.getElementById('contact-detail-view').classList.add('hidden');
        document.getElementById('contact-detail-view').classList.remove('flex');

        if (this.isMobileView) {
            document.getElementById('contact-list-panel').classList.remove('hidden');
            document.getElementById('contact-detail-panel').classList.add('hidden');
            document.getElementById('contact-detail-panel').classList.remove('flex');
        } else {
            document.getElementById('contact-detail-panel').classList.remove('hidden');
            document.getElementById('contact-detail-panel').classList.add('flex');
        }
    },

    openThread(chatId) {
        this.currentThreadId = chatId;
        this.loadContactDetails(this.currentContactId);
    }
};