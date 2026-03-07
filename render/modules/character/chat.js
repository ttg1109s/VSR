// Module: Xử lý hiển thị nội dung chat (UI Render)
import { API } from '../../../api/index.js';
import { ChatBubble } from '../../../components/ChatBubble.js';
import { ChatInputBar, ChatChoiceItem } from '../../../components/Chat.js';

export const ChatMethods = {
    chatUiState: { limit: 20, isLoading: false },

    toggleChatOverlay(active) {
        const zIndex = active ? '110' : '';
        const charScreen = document.getElementById('screen-character');
        if (charScreen) charScreen.style.zIndex = zIndex;

        const footer = document.getElementById('contact-chat-footer');
        if (footer) footer.style.zIndex = zIndex;

        if (active) {
            document.body.style.cursor = 'default';
            const blockers = document.getElementsByClassName('ui-blocker');
            for (let b of blockers) { b.style.cursor = 'default'; }

            // [Fix Review Mode] Add global tap listener if in review mode
            if (charScreen && !charScreen.dataset.reviewListener) {
                const reviewClickListener = (e) => {
                    const engine = window.engine;
                    if (engine && engine.chatState && engine.chatState.isReview) {
                        e.stopPropagation();
                        API.engine.chat.next();
                    }
                };
                charScreen.addEventListener('click', reviewClickListener);
                charScreen.reviewListener = reviewClickListener; // Store ref on DOM element to remove later (hacky but works for module scope)
                charScreen.dataset.reviewListener = "true";
            }

        } else {
            document.body.style.cursor = '';

            // Cleanup listener
            if (charScreen && charScreen.reviewListener) {
                charScreen.removeEventListener('click', charScreen.reviewListener);
                delete charScreen.reviewListener;
                delete charScreen.dataset.reviewListener;
            }
        }
    },

    renderChatHistory(chatId) {
        const chatArea = document.getElementById('contact-chat-history');
        if (!chatArea) return;

        if (chatArea.dataset.chatId !== chatId) {
            this.chatUiState.limit = 20;
            chatArea.innerHTML = '';
            chatArea.dataset.chatId = chatId;
            chatArea.onscroll = null;
        }

        const history = API.engine.state.getChatHistory(chatId) || [];
        const chatData = API.engine.state.getChatData(chatId);

        const total = history.length;
        const limit = this.chatUiState.limit;
        const startIndex = Math.max(0, total - limit);
        const visibleHistory = history.slice(startIndex, total);

        const oldScrollHeight = chatArea.scrollHeight;
        const oldScrollTop = chatArea.scrollTop;

        chatArea.innerHTML = '';

        if (startIndex > 0) {
            const loader = document.createElement('div');
            loader.className = "flex justify-center py-2 opacity-50";
            loader.innerHTML = `<span class="material-icons-round text-sm animate-spin">refresh</span>`;
            chatArea.appendChild(loader);
        }

        if (chatData && chatData.set.activationTime && startIndex === 0) {
            const dateStr = new Date(chatData.set.activationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const sep = document.createElement('div');
            sep.className = "flex items-center justify-center my-4 opacity-50";
            sep.innerHTML = `<span class="text-[10px] text-slate-500 bg-[#1a1a1a] px-3 py-0.5 rounded-full border border-white/5">${dateStr}</span>`;
            chatArea.appendChild(sep);
        } else if (history.length === 0) {
            chatArea.innerHTML = `<div class="flex-1 flex flex-col items-center justify-center text-slate-600 space-y-2 opacity-50"><span class="text-xs italic">Start of conversation</span></div>`;
        }

        visibleHistory.forEach(line => this.renderBubble(line, chatArea));

        if (this.chatUiState.isLoading) {
            const newScrollHeight = chatArea.scrollHeight;
            chatArea.scrollTop = newScrollHeight - oldScrollHeight + oldScrollTop;
            this.chatUiState.isLoading = false;
        } else {
            setTimeout(() => chatArea.scrollTop = chatArea.scrollHeight, 10);
        }

        chatArea.onscroll = () => {
            if (chatArea.scrollTop === 0 && startIndex > 0 && !this.chatUiState.isLoading) {
                this.chatUiState.isLoading = true;
                setTimeout(() => {
                    this.chatUiState.limit += 20;
                    this.renderChatHistory(chatId);
                }, 200);
            }
        };
    },

    renderContactBubble(container, line) {
        this.renderBubble(line, container);
        if (container) container.scrollTop = container.scrollHeight;
    },

    renderBubble(line, containerEl) {
        const container = containerEl || document.getElementById('contact-chat-history');
        if (!container) return;

        const entryChar = API.engine.state.meta?.entryCharacter || 'player';
        const nameID = line.nameID;
        const isPlayer = nameID === entryChar || nameID === 'nguoi_choi';

        let displayName = nameID || "Unknown";
        if (isPlayer) displayName = "Player";
        else {
            const allChars = API.engine.state.getCharacters();
            const char = allChars && nameID ? allChars[nameID] : null;
            // [FIX V9.2] Strict Schema: meta.name
            if (char) displayName = char.meta?.name || displayName;
        }

        let avatar = '';
        if (!isPlayer) {
            const rawName = displayName || "?";
            const initials = rawName.substring(0, 1).toUpperCase();
            avatar = `<div class="flex-shrink-0 w-8 h-8 rounded-full bg-[#333] flex items-center justify-center mr-2 shadow-sm border border-white/10 mt-auto select-none"><span class="text-[10px] font-bold text-slate-400">${initials}</span></div>`;
        }

        const temp = document.createElement('div');
        temp.innerHTML = ChatBubble({ isPlayer, displayName, text: line.text, avatar });
        container.appendChild(temp.firstElementChild);
    },

    renderInputBar() {
        const footer = document.getElementById('contact-chat-footer');
        if (!footer) {
            const oldInput = document.getElementById('contact-chat-input');
            if (oldInput) oldInput.classList.remove('hidden');
            return;
        }

        if (typeof window.engine !== 'undefined' && window.engine.chatState && window.engine.chatState.active) {
            const src = window.engine.src;
            const chatData = src ? src.chat[window.engine.chatState.id] : null;
            if (chatData) {
                const block = chatData.block[window.engine.chatState.blockId];
                if (block && block.type === 'router') {
                    this.renderChatChoices(block.choices, block.text);
                    return;
                }
            }
        }

        if (footer.classList.contains('hidden')) footer.classList.remove('hidden');
        if (footer.style.display === 'none') footer.style.display = '';

        if (footer.innerHTML.includes('Tap to continue') && !footer.innerHTML.includes('selectChatChoice')) return;

        footer.innerHTML = '';
        footer.className = "shrink-0 bg-[#202020] border-t border-white/5 flex flex-col justify-center min-h-[70px] px-4 py-3 z-30 transition-all duration-300";

        const bar = document.createElement('div');
        bar.className = "flex items-center gap-3 w-full cursor-pointer group";

        bar.onclick = (e) => {
            if (e) e.stopPropagation();
            API.engine.chat.next();
        };

        bar.innerHTML = ChatInputBar();
        footer.appendChild(bar);
    },

    hideInputBar() {
        const footer = document.getElementById('contact-chat-footer');
        if (footer) {
            footer.innerHTML = '';
            footer.classList.add('hidden');
            footer.style.display = 'none';
        }
        const oldInput = document.getElementById('contact-chat-input');
        if (oldInput) oldInput.classList.add('hidden');
    },

    renderChatChoices(choices, promptText) {
        const footer = document.getElementById('contact-chat-footer');
        if (!footer) return;

        const hasChoiced = choices.some(c => c.set && c.set.choiced === true);
        if (hasChoiced) { footer.classList.add('hidden'); return; }

        footer.classList.remove('hidden');
        footer.style.display = '';

        footer.innerHTML = '';
        footer.className = "shrink-0 bg-[#1a1a1a] border-t border-white/5 flex flex-col justify-end p-3 gap-2 shadow-[0_-5px_15px_rgba(0,0,0,0.3)] z-30 animate-fade-in";

        if (promptText) {
            const p = document.createElement('div');
            p.className = "text-slate-500 text-[10px] uppercase font-bold tracking-widest text-center py-1 select-none";
            p.innerText = promptText;
            footer.appendChild(p);
        }

        const list = document.createElement('div');
        list.className = "flex flex-col gap-2 w-full max-h-[40vh] overflow-y-auto custom-scrollbar";

        choices.forEach((c, idx) => {
            if (c.set && c.set.active === false) return;
            if (c.req && API.engine.state.checkReq && !API.engine.state.checkReq(c.req).pass) return;

            const btn = document.createElement('button');
            const isLocked = c.set && c.set.locked === true;

            let btnClass = "w-full text-left p-3.5 rounded-xl border text-sm transition-all active:scale-[0.98] flex items-center justify-between group ";

            if (isLocked) {
                btnClass += "bg-[#151515] border-white/5 text-slate-600 cursor-not-allowed";
            } else {
                btnClass += "bg-[#252525] border-white/5 text-slate-200 hover:bg-blue-600 hover:text-white hover:border-transparent hover:shadow-lg hover:shadow-blue-900/20";
            }

            btn.className = btnClass;
            btn.innerHTML = ChatChoiceItem({ text: c.text, isLocked: isLocked });

            if (!isLocked) btn.onclick = () => API.engine.chat.selectChoice(idx);
            list.appendChild(btn);
        });

        footer.appendChild(list);
    },

    toggleChatClose(show) { const btn = document.getElementById('chat-back-btn'); if (show) btn.classList.remove('hidden'); else btn.classList.add('hidden'); }
};