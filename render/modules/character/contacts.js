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

        // UI Transition logic
        if (this.isMobileView) {
            document.getElementById('contact-list-panel').classList.add('hidden');
            document.getElementById('contact-detail-panel').classList.remove('hidden');
            document.getElementById('contact-detail-panel').classList.add('flex');
        } else {
            document.getElementById('contact-empty-state').classList.add('hidden');
            document.getElementById('contact-detail-view').classList.remove('hidden');
            document.getElementById('contact-detail-view').classList.add('flex');
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

        if (this.isMobileView) {
            document.getElementById('contact-list-panel').classList.remove('hidden');
            document.getElementById('contact-detail-panel').classList.add('hidden');
            document.getElementById('contact-detail-panel').classList.remove('flex');
        } else {
            document.getElementById('contact-detail-panel').classList.remove('hidden');
            document.getElementById('contact-detail-panel').classList.add('flex');

            document.getElementById('contact-empty-state').classList.remove('hidden');
            document.getElementById('contact-empty-state').classList.add('flex');

            document.getElementById('contact-detail-view').classList.add('hidden');
            document.getElementById('contact-detail-view').classList.remove('flex');
        }
    },

    openThread(chatId) {
        this.currentThreadId = chatId;
        this.loadContactDetails(this.currentContactId);
    }
};