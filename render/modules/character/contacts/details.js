import { timeAgo } from '../utils.js?v=2';
import { RelationshipRow, ThreadRow } from '../../../../components/Contact.js';
import { StatBar } from '../../../../components/Common.js';

export const ContactDetails = {
    // State cục bộ để quản lý phân trang danh sách topic
    listState: {
        page: 1,
        limit: 30
    },

    load(ui, cid) {
        // Reset page khi chuyển contact
        if (this.currentCid !== cid) {
            this.listState.page = 1;
            this.currentCid = cid;
        }

        let char = engine.state.characters[cid];
        if (cid === 'spam') {
            char = {
                meta: { name: "Unknown Sender", desc: "Không thể xác định nguồn tín hiệu." },
                stats: {}
            };
        }

        if (!char) return;

        // [FIX V9.2] Strict Schema: meta.name / meta.desc
        const charName = char.meta?.name || "Unknown";
        const charDesc = char.meta?.desc || "No description.";

        // Render Avatar & Header Info
        const avatarEl = document.getElementById('detail-avatar');
        const entryChar = engine.state.meta?.entryCharacter || 'player';

        if (cid === 'spam') {
            avatarEl.innerHTML = '?';
            avatarEl.className = `w-10 h-10 rounded-full flex items-center justify-center text-[var(--vsr-ink-400)] font-bold bg-[var(--vsr-surface-2)] border border-dashed border-[var(--vsr-border-strong)]`;
        } else {
            avatarEl.innerHTML = cid === entryChar ? 'P' : charName.charAt(0);
            // [FIX v13] bg-blue-900 (không nằm trong danh sách "nền đậm -> chữ trắng"
            // tự động) đổi sang bg-blue-600 để tái dùng luật khôi phục text-white sẵn có.
            avatarEl.className = `w-10 h-10 rounded-full flex items-center justify-center text-white font-bold relative overflow-hidden ${cid === entryChar ? 'bg-blue-600' : 'bg-[var(--vsr-ink-700)]'}`;
        }

        document.getElementById('detail-title').innerText = charName;
        document.getElementById('detail-subtitle').innerText = cid === entryChar ? "Personal Stats" : (cid === 'spam' ? "Encrypted" : "Online");

        // Info Overlay
        document.getElementById('info-overlay-desc').innerText = charDesc;
        this.renderStats(char);

        // Render Relationships
        this.renderRelationships(char);

        // Control Views
        const threadContainer = document.getElementById('thread-list-container');
        const chatContainer = document.getElementById('contact-chat-area');
        const backBtn = document.getElementById('contact-back-btn');

        if (cid === entryChar) {
            threadContainer.classList.add('hidden');
            chatContainer.classList.add('hidden');
            document.getElementById('contact-info-overlay').classList.remove('translate-x-full', 'hidden');
            document.getElementById('contact-info-overlay').classList.add('translate-x-0');
            backBtn.classList.remove('hidden');
            if (!ui.isMobileView) backBtn.classList.add('md:hidden');
        } else {
            document.getElementById('contact-info-overlay').classList.add('translate-x-full');
            document.getElementById('contact-info-overlay').classList.remove('translate-x-0');

            if (ui.currentThreadId) {
                threadContainer.classList.add('hidden');
                chatContainer.classList.remove('hidden');
                chatContainer.classList.add('flex');

                const threadTitle = engine.state.chats[ui.currentThreadId]?.title || "Chat";
                document.getElementById('detail-subtitle').innerText = threadTitle;

                backBtn.classList.remove('hidden');
                if (!ui.isMobileView) backBtn.classList.remove('md:hidden');

                if (typeof ui.renderChatHistory === 'function') {
                    ui.renderChatHistory(ui.currentThreadId);
                }

                if (engine.chatState.waitingChoice) {
                    if (typeof ui.renderChoices === 'function') {
                        ui.renderChoices();
                    }
                } else if (engine.chatState.active) {
                    if (typeof ui.renderInputBar === 'function') {
                        ui.renderInputBar();
                    }
                }

                this.clearRelatedActions(ui.currentThreadId);

            } else {
                threadContainer.classList.remove('hidden');
                chatContainer.classList.add('hidden');
                chatContainer.classList.remove('flex');

                document.getElementById('detail-subtitle').innerText = "Topic List";

                if (!ui.isMobileView) backBtn.classList.add('md:hidden');

                this.renderThreadList(ui, cid);
            }
        }
    },

    toggleInfo() {
        const overlay = document.getElementById('contact-info-overlay');
        if (!overlay) return;

        if (overlay.classList.contains('translate-x-full')) {
            overlay.classList.remove('translate-x-full', 'hidden');
            overlay.classList.add('translate-x-0');
        } else {
            overlay.classList.add('translate-x-full');
            overlay.classList.remove('translate-x-0');
        }
    },

    renderRelationships(char) {
        let relContainer = document.getElementById('info-overlay-relationships');
        if (!relContainer) {
            relContainer = document.createElement('div');
            relContainer.id = 'info-overlay-relationships';
            relContainer.className = "mt-6 space-y-3 border-t border-[var(--vsr-border)] pt-4";
            const statsEl = document.getElementById('info-overlay-stats');
            if (statsEl && statsEl.parentNode) {
                statsEl.parentNode.appendChild(relContainer);
            }
        }
        relContainer.innerHTML = '';

        const relationships = char.relationship || char.set?.relationship || char.set?.relationships;
        if (!relationships || !Array.isArray(relationships) || relationships.length === 0) return;

        const titleObj = document.createElement('h3');
        titleObj.className = "text-xs font-bold text-[var(--vsr-ink-400)] uppercase tracking-wider mb-2 flex items-center gap-2";
        titleObj.innerHTML = `<span class="material-icons-round text-sm">group</span> Relationships`;
        relContainer.appendChild(titleObj);

        const entryChar = engine.state.meta?.entryCharacter || 'player';

        const sortedRels = [...relationships].sort((a, b) => {
            if (a[1] === entryChar) return -1;
            if (b[1] === entryChar) return 1;
            return 0;
        });

        sortedRels.forEach(rel => {
            const relTag = rel[0];
            const targetId = rel[1];
            if (!targetId) return;

            const targetChar = engine.state.characters[targetId];
            if (!targetChar) return;

            const hasThreads = engine.getThreads(targetId).length > 0;

            // [FIX V9.2] Strict Schema: meta.name
            const targetName = targetChar.meta?.name || "Unknown";
            const displayName = targetId === entryChar ? "Tôi" : targetName;
            const initials = targetId === entryChar ? "Me" : displayName.charAt(0).toUpperCase();

            const item = document.createElement('div');
            item.className = `flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${targetId === entryChar ? 'bg-blue-50 border-blue-200' : 'bg-[var(--vsr-tint-05)] border-[var(--vsr-border)] hover:bg-[var(--vsr-tint-10)]'}`;

            item.innerHTML = RelationshipRow({ targetId, displayName, initials, relTag, isPlayer: targetId === entryChar });
            relContainer.appendChild(item);
        });
    },

    clearRelatedActions(chatId) {
        if (!engine.state.actions) return;
        let hasChange = false;
        Object.keys(engine.state.actions).forEach(key => {
            const actState = engine.state.actions[key];
            const parts = key.split('_');
            const actionId = parts.pop();
            const routerId = parts.pop();
            const sceneId = parts.join('_');

            let actDef = null;
            if (engine.src.scenes[sceneId] &&
                engine.src.scenes[sceneId].routers[routerId] &&
                engine.src.scenes[sceneId].routers[routerId].actions) {
                actDef = engine.src.scenes[sceneId].routers[routerId].actions[actionId];
            }

            const type = actState.type || (actDef && actDef.set ? actDef.set.type : null);
            const target = actState.target || (actDef && actDef.set ? actDef.set.target : null);

            if (type === 'show_chat' && target === chatId) {
                if (actState.display !== 'hide') {
                    actState.display = 'hide';
                    hasChange = true;
                }
            }
        });

        if (hasChange && engine.state.sceneId) {
            const currentScene = engine.state.scenes[engine.state.sceneId];
            if (currentScene) {
                const actions = engine.getEffectiveActions(engine.state.sceneId, currentScene.activeRouterId);
                if (typeof ui !== 'undefined' && ui.renderActions) {
                    ui.renderActions(actions, engine.state.sceneId, currentScene.activeRouterId);
                }
            }
        }
    },

    renderStats(char) {
        const statsContainer = document.getElementById('info-overlay-stats');
        statsContainer.innerHTML = '';
        if (char.stats) {
            Object.keys(char.stats).forEach(k => {
                const s = char.stats[k];
                statsContainer.innerHTML += StatBar({ key: k, s: s });
            });
        }
    },

    renderThreadList(ui, cid) {
        const container = document.getElementById('thread-list-container');
        container.innerHTML = '';

        const allThreads = engine.getThreads(cid);

        if (allThreads.length === 0) {
            container.innerHTML = `<div class="h-full flex flex-col items-center justify-center text-[var(--vsr-ink-300)]"><span class="material-icons-round text-4xl mb-2 opacity-40">mail</span><span class="text-sm">No topics found</span></div>`;
            return;
        }

        const displayedCount = this.listState.page * this.listState.limit;
        const threads = allThreads.slice(0, displayedCount);

        const list = document.createElement('div');
        list.className = "flex flex-col divide-y divide-[var(--vsr-border)] pb-4";

        threads.forEach(t => {
            const item = document.createElement('div');
            item.className = `p-4 hover:bg-[var(--vsr-tint-05)] cursor-pointer transition-colors flex items-start gap-3 group ${t.isUnread ? 'bg-blue-50' : ''}`;

            item.innerHTML = ThreadRow({ t, timeStr: timeAgo(t.time) });

            item.onclick = () => ui.openThread(t.id);
            list.appendChild(item);
        });

        if (allThreads.length > displayedCount) {
            const loadMoreDiv = document.createElement('div');
            loadMoreDiv.className = "p-4 flex justify-center";
            loadMoreDiv.innerHTML = `
                <button class="px-4 py-2 bg-[var(--vsr-tint-05)] hover:bg-[var(--vsr-tint-10)] rounded-full text-xs text-[var(--vsr-ink-400)] font-bold uppercase tracking-wider transition-colors border border-[var(--vsr-border)]">
                    Show more (${allThreads.length - displayedCount})
                </button>
             `;
            loadMoreDiv.onclick = () => {
                this.listState.page++;
                this.renderThreadList(ui, cid);
            };
            list.appendChild(loadMoreDiv);
        }

        container.appendChild(list);
    }
};