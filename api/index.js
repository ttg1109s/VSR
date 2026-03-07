// htdocs/api/index.js
// Cầu nối giao tiếp giữa Engine (Logic) và Render (UI)

import State from './state.js';
import { fb } from '../plugin/basefunction.js'; // Plugin: BaseFunction

export const API = {
    // -------------------------------------------------------------------------
    // UI (Render) gọi xuống Engine (Logic)
    // -------------------------------------------------------------------------
    engine: {
        init: (script) => window.engine?.init(script),
        getConfig: (key) => window.engine?.getConfig(key),

        action: {
            trigger: (actionId, uniqueId) => window.engine?.handleAction(actionId, uniqueId),
            finishPassword: (actDef, key, uId, success) => window.engine?.finishPasswordAction(actDef, key, uId, success),
            markAsRead: (uId) => window.engine?.markAsRead(uId)
        },

        chat: {
            next: () => window.engine?.nextChat(),
            selectChoice: (idx) => window.engine?.selectChatChoice(idx)
        },

        inventory: {
            toggleHand: (itemId) => window.engine?.toggleHand(itemId)
        },

        // [NEW] Scene API
        scene: {
            getPath: (id) => window.engine?.getPath(id),
            enterScene: (id, skip) => window.engine?.enterScene(id, skip)
        },

        // [STATE MANAGER] Hệ thống truy xuất dữ liệu tập trung
        state: {
            // Lấy dữ liệu theo Schema Key (Khuyên dùng)
            // Ví dụ: API.engine.state.get('action.title', { id: 'act_01' })
            get: (key, context) => State.get(key, context),

            // Các hàm tiện ích (Helper) vẫn giữ để backward compatibility
            getCharacters: () => window.engine?.state?.characters,
            getItem: (itemId) => window.engine?.state?.itemInfo[itemId],

            // Get Meta nhanh (thường dùng)
            // Get Meta nhanh (thường dùng)
            get meta() { return window.engine?.state?.meta; },

            // [NEW] Get Current Scene ID
            get sceneId() { return window.engine?.state?.sceneId; },

            // Action & Faker State
            getFakerState: () => window.engine?.state?.faker,
            getActionState: (uId) => window.engine?.state?.actions[uId],

            // Chat State
            getChatHistory: (chatId) => window.engine?.state?.chatHistory[chatId],
            getChatData: (chatId) => window.engine?.state?.chats[chatId],

            // Utils
            checkReq: (req) => window.engine?.checkReq(req),
            getInventory: () => window.engine?.getInventory(),
            getHand: () => window.engine?.getHand(),
        }
    },

    // -------------------------------------------------------------------------
    // Engine (Logic) gọi lên UI (Render)
    // -------------------------------------------------------------------------
    render: {
        refresh: () => {
            if (window.engine && window.ui && window.ui.renderScene) {
                // Trigger render lại scene hiện tại
                window.engine.render();
            }
        },

        updateContactDetails: (cid) => window.ui?.updateContactDetails(cid),

        notification: {
            add: (title, msg, type) => window.ui?.addNotification(title, msg, type),
            toast: (title, msg, type) => window.ui?.showTransientToast(title, msg, type),
            alert: (t, m, type) => window.ui?.showAlert(t, m, type)
        },

        setup: {
            scriptInfo: (script) => window.ui?.renderScriptInfo(script)
        },

        scene: {
            transition: async (phase, type, duration) => {
                if (window.ui && window.ui.handleTransition) {
                    await window.ui.handleTransition(phase, type, duration);
                }
            },
            updateTimer: (text) => window.ui?.updateTimer(text),
            hideTimer: () => window.ui?.hideTimer(),
            render: (s, r, actions) => window.ui?.renderScene(s, r, actions)
        },

        navigation: {
            switchScreen: (id) => window.ui?.switchScreen(id),
            openThread: (id) => window.ui?.openThread(id),
            selectContact: (id) => window.ui?.selectContact(id),
            setBlocking: (active) => window.ui?.setBlockingMode(active)
        },

        chat: {
            get threadId() { return window.ui?.currentThreadId; },
            renderBubble: (line, container) => window.ui?.renderBubble(line, container),
            renderContactList: () => window.ui?.renderContactList(),
            toggleOverlay: (active) => window.ui?.toggleChatOverlay(active),
            renderChoices: (choices, prompt) => window.ui?.renderChatChoices(choices, prompt),
            renderChatHistory: (chatId) => window.ui?.renderChatHistory(chatId)
        },

        components: {
            actionGrid: (actions, sId, rId) => window.ui?.renderActions(actions, sId, rId),
            explorer: () => window.ui?.renderExplorerGrid(),
            playerCard: () => window.ui?.updatePlayerCard(),
            closePlayerCard: () => window.ui?.closePlayerCard(),
            updatePlayerCard: () => window.ui?.updatePlayerCard(),
            updateItemModal: (id) => window.ui?.updateItemModalBtn(id),
            chatHistory: (chatId) => window.ui?.renderChatHistory(chatId),
            inputBar: () => window.ui?.renderInputBar(),
            hideInput: () => window.ui?.hideInputBar(),
            fakerSelection: (candidates) => window.ui?.renderFakerSelection(candidates),
            ending: (target) => window.ui?.showEnding(target),
            meetingAlert: (charId, type) => {
                if (type) window.ui?.showMeetingAlert(charId, type);
                else window.ui?.hideMeetingAlert(charId);
            },
            updateCharacterList: () => window.ui?.renderCharacterFooter && window.ui.renderCharacterFooter(),
            keyboard: (actDef, actionKey, uniqueId, passDef) => {
                if (window.keyboard) {
                    // Logic detect type cơ bản nếu Engine chưa phân loại
                    let type = null;
                    if (passDef && passDef._type) type = passDef._type; // Engine đã gắn type

                    console.log("[API] Calling Keyboard Show:", { actDef, uniqueId, passDef, type });
                    window.keyboard.show(actDef, actionKey, uniqueId, passDef, type);
                } else {
                    console.error("Keyboard plugin not initialized");
                }
            }
        },

        effects: {
            shake: (uId) => window.ui?.shakeCard(uId)
        },

        vfx: {
            exec: (type, id, params) => window.vfx?.exec(type, id, params)
        }
    },

    // -------------------------------------------------------------------------
    // Plugins & Extension
    // -------------------------------------------------------------------------
    plugins: {
        fb: fb
    }
};

window.API = API;