// htdocs/engine/modules/Chat.js

import { hideInput } from './chat/UIHelper.js';
import { ChatBlockHandlers } from './chat/BlockHandler.js';
import { API } from '../../api/index.js';

export const ChatSystem = {
    // --- Helper: Quản lý lớp phủ Z-Index ---
    toggleChatOverlay(active) {
        if (API.render.navigation.setBlocking) {
            API.render.navigation.setBlocking(active);
        }
        if (API.render.chat.toggleOverlay) {
            API.render.chat.toggleOverlay(active);
        }
    },

    getChatOwner(chatId) {
        // [FIXED] Use API.engine.state.get with Schema key 'chat.sender'
        let sender = API.engine.state.get('chat.sender', { id: chatId });
        // Fallback to direct src lookup if State API fails (e.g. static data not in State)
        if (!sender && this.src.chat && this.src.chat[chatId] && this.src.chat[chatId].meta) {
            sender = this.src.chat[chatId].meta.sender;
        }
        return sender || 'spam';
    },

    getThreads(charId) {
        let chatIds = [];
        const chats = this.state.chats;
        const histories = this.state.chatHistory;

        if (charId === 'spam') {
            // Logic spam: Tìm các chat KHÔNG có sender rõ ràng hoặc sender không tồn tại
            const allDefinedChats = new Set();
            // Lấy danh sách các chat đã được assign cho character qua meta.sender
            if (this.src.chat) {
                Object.entries(this.src.chat).forEach(([cid, cData]) => {
                    if (cData.meta && cData.meta.sender) {
                        allDefinedChats.add(cid);
                    }
                });
            }
            chatIds = Object.keys(chats).filter(id => !allDefinedChats.has(id));
        } else {
            // Logic chuẩn: Tìm các chat có liên quan đến charId (Sender hoặc Receiver)
            const playerChar = this.state.meta?.entryCharacter || 'player';

            if (this.src.chat) {
                chatIds = Object.keys(this.src.chat).filter(cid => {
                    const meta = this.src.chat[cid].meta;
                    if (!meta) return false;

                    const isSender = meta.sender === charId;
                    const isRecipient = meta.to && Array.isArray(meta.to) && meta.to.includes(charId);

                    // Case 1: CharId gửi cho Player
                    if (isSender && meta.to && meta.to.includes(playerChar)) return true;

                    // Case 2: Player gửi cho CharId (nếu muốn hiển thị history chat mình gửi)
                    if (meta.sender === playerChar && isRecipient) return true;

                    // Case 3: CharId là sender (Legacy support nếu chưa có to)
                    if (isSender && !meta.to) return true;

                    return false;
                });
            }
        }

        const activeThreads = chatIds.filter(id => {
            const hasData = chats[id] && chats[id].set;
            const hasHistory = histories[id] && histories[id].length > 0;
            return (hasData && chats[id].set.activationTime > 0) || hasHistory;
        }).map(id => {
            const c = chats[id];
            const h = histories[id] || [];

            let preview = c.set.desc || "No content";
            if (h.length > 0) {
                const last = h[h.length - 1];
                const entryChar = this.state.meta?.entryCharacter || 'player';
                const senderID = last.nameID || last.char_id;
                preview = `${(senderID === entryChar) ? 'You: ' : ''}${last.text}`;
            }

            // [FIXED] Use API for Title
            const title = API.engine.state.get('chat.title', { id: id }) || (charId === 'spam' ? "Unknown Message" : "No Subject");

            return {
                id: id,
                title: title,
                preview: preview,
                time: c.set.lastInteraction || c.set.activationTime || 0,
                isUnread: c.set.read === false,
                isFinished: false
            };
        });

        activeThreads.sort((a, b) => b.time - a.time);
        return activeThreads;
    },

    startChat(id, triggerActionId = null) {
        const c = this.src.chat[id];
        if (!c) return;

        console.log(`[ChatSystem] startChat: ${id} Trigger: ${triggerActionId}`);

        const ownerId = this.getChatOwner(id);

        // [FIX] state.chats[id] ĐÃ tồn tại (Loader.js copy nguyên script.chat vào
        // state.chats từ lúc load), nên điều kiện cũ `if (!this.state.chats[id])`
        // luôn false với bất kỳ chat hợp lệ nào -> `.set` không bao giờ được khởi
        // tạo -> dòng ngay sau đó đọc `.set.bookmark` trên `undefined` -> crash
        // (TypeError). Đúng ra phải kiểm tra thiếu RIÊNG field `.set` (schema
        // chat.<id> vốn không khai báo `.set` — script hợp lệ theo schema sẽ luôn
        // rơi vào nhánh crash này). Giữ nguyên meta/block/choice đã có, chỉ bổ
        // sung `.set` nếu thiếu.
        if (!this.state.chats[id]) this.state.chats[id] = {};
        if (!this.state.chats[id].set) this.state.chats[id].set = { read: false, step: 0, bookmark: [] };

        // [MIGRATION] Upgrade bookmark to array
        if (this.state.chats[id].set.bookmark && !Array.isArray(this.state.chats[id].set.bookmark)) {
            this.state.chats[id].set.bookmark = [this.state.chats[id].set.bookmark];
        } else if (!this.state.chats[id].set.bookmark) {
            this.state.chats[id].set.bookmark = [];
        }

        console.log(`[ChatSystem] State before init: Read=${this.state.chats[id].set.read}, Activation=${this.state.chats[id].set.activationTime}, BookmarkLen=${this.state.chats[id].set.bookmark.length}`);

        if (!this.state.chats[id].set.activationTime) {
            this.state.chats[id].set.activationTime = Date.now();
            // [FIX] Only reset read to false if it is not already true (preserved state)
            if (this.state.chats[id].set.read !== true) {
                this.state.chats[id].set.read = false;
            }
        }

        this.state.chats[id].set.lastInteraction = Date.now();
        if (!this.state.chatHistory[id]) this.state.chatHistory[id] = [];

        // --- Logic: Handle Loop & Bookmark Replay ---
        const isLoop = c.meta && c.meta.loop === true;
        const bookmark = this.state.chats[id].set.bookmark;
        const hasRead = bookmark.length > 0;

        console.log(`[ChatSystem] Logic check: isLoop=${isLoop}, hasRead=${hasRead}, readState=${this.state.chats[id].set.read}`);

        let startBlock = c.meta?.entry || c.entry;
        let startIndex = 0;
        let shouldProcessBlock = true;

        if (hasRead || (this.state.chats[id].set.read === true && !isLoop)) {
            if (isLoop && !this.state.chats[id].set.read) {
                // CLAUSE: Loop = True && Read -> Clear History, Reset Choiced, Restart
                console.log(`[ChatSystem] Loop check: True. Restarting chat '${id}'.`);
                this.state.chatHistory[id] = [];
                this.state.chats[id].set.bookmark = [];
                this.state.chats[id].set.read = false;

                // Reset Choiced in SRC (Runtime)
                if (c.block) {
                    Object.values(c.block).forEach(variants => {
                        Object.values(variants).forEach(v => {
                            if (v.choiced) v.choiced = false;
                        });
                    });
                }
                // startBlock defaults to entry
            } else {
                // CLAUSE: Loop = False OR Read -> Replay Bookmark (Review Mode)
                console.log(`[ChatSystem] Review/Replay '${id}'.`);
                this.state.chatHistory[id] = [];

                let stopAtBlock = null;

                for (const blockId of bookmark) {
                    const blockInfo = this.resolveBlock(id, blockId);
                    if (!blockInfo) continue;

                    // 1. Always Load Content first
                    if (blockInfo.line) {
                        blockInfo.line.forEach(line => {
                            const lineObj = { ...line, nameID: line.nameID || line.char_id };
                            this.state.chatHistory[id].push(lineObj);
                        });
                    }

                    // 2. Check Choices & Reconstruct Player Line
                    if (blockInfo.choices && blockInfo.choices.length > 0) {
                        const rawVariant = c.block[blockId];

                        // Find if any choice was made
                        let pickedChoice = null;
                        if (rawVariant && rawVariant.choiced) {
                            pickedChoice = blockInfo.choices.find(ch => ch.set && ch.set.choiced === true);
                        }

                        if (pickedChoice) {
                            // Found a made choice. Reconstruct player line.
                            const entryChar = this.state.meta?.entryCharacter || 'player';
                            this.state.chatHistory[id].push({ nameID: entryChar, text: pickedChoice.text });
                        } else {
                            // Block is Un-choiced -> STOP load, show this block
                            stopAtBlock = blockId;
                            break;
                        }
                    } else {
                        // [FIX] If checking HISTORY (Read=True), do NOT stop on dialogue blocks.
                        // Only stop if we are NOT read (meaning we reached the end of current progress).
                        if (!this.state.chats[id].set.read) {
                            stopAtBlock = blockId;
                            break;
                        }
                    }

                    startBlock = blockId; // Update cursor
                }

                // [FIX] Render history immediately so context is visible
                if (API.render && API.render.chat && API.render.chat.renderChatHistory) {
                    API.render.chat.renderChatHistory(id);
                }

                if (stopAtBlock) {
                    startBlock = stopAtBlock;
                    shouldProcessBlock = true;
                } else if (!this.state.chats[id].set.read) {
                    // If NOT read and no stopAtBlock? Continue?
                    // Usually implies we reached end of bookmark but not end of chat?
                    shouldProcessBlock = true;
                } else {
                    // Replay finished and Read is True. Show history. 
                    shouldProcessBlock = false;
                }
            }
        }

        this.chatState = {
            active: true,
            id: id,
            blockId: startBlock,
            index: startIndex,
            blocking: true,
            triggerActionId: triggerActionId,
            actionModified: false,
            isProcessing: false
        };

        API.render.navigation.switchScreen('character');
        API.render.navigation.selectContact(ownerId);
        API.render.navigation.openThread(id);

        this.toggleChatOverlay(true);

        if (shouldProcessBlock) {
            this.processChatBlock();
        } else {
            // Just refresh render
            console.log(`[ChatSystem] Chat '${id}' fully reviewed. Render only.`);
            API.render.chat.renderChatHistory(id);
            // [FIX] Hide input (User requirement: No button)
            // Interaction with screen will trigger nextChat -> endChat via isReview flag
            hideInput();
            this.chatState.isReview = true;
        }
    },

    _getCurrentIdentityKey() {
        const fakerState = this.state.faker;
        return fakerState.active ? fakerState.targetId : (this.state.meta?.entryCharacter || 'player');
    },

    resolveBlock(chatId, blockId) {
        const chat = this.src.chat[chatId];
        if (!chat || !chat.block) return null;

        let block = chat.block[blockId];
        if (!block) return null;

        // Clone block để xử lý dữ liệu động
        block = JSON.parse(JSON.stringify(block));

        if (block) {
            if (block.choice_id && chat.choice && chat.choice[block.choice_id]) {
                block.choices = chat.choice[block.choice_id];
            } else {
                block.choices = [];
            }

            if (block.line && Array.isArray(block.line)) {
                block.line = block.line.map(lineItem => ({
                    ...lineItem,
                    nameID: lineItem.char_id || lineItem.nameID || (chat.meta && chat.meta.sender ? chat.meta.sender : null)
                }));
            }

            if (block.line) {
                block.type = 'dialogue';
            } else if (block.choices && block.choices.length > 0) {
                block.type = 'router';
            } else {
                block.type = 'dialogue';
            }

            return { id: blockId, ...block };
        }

        return null;
    },

    async processChatBlock() {
        if (!this.chatState.active) return;

        if (this.state.chats[this.chatState.id].set) {
            this.state.chats[this.chatState.id].set.lastInteraction = Date.now();

            // [Bookmark] Append to history array
            if (!Array.isArray(this.state.chats[this.chatState.id].set.bookmark)) {
                this.state.chats[this.chatState.id].set.bookmark = [];
            }
            const b = this.state.chats[this.chatState.id].set.bookmark;
            // Prevent duplicate adjacent entries
            if (b.length === 0 || b[b.length - 1] !== this.chatState.blockId) {
                b.push(this.chatState.blockId);
            }

            this.state.chats[this.chatState.id].set.step = this.chatState.index;
        }

        const block = this.resolveBlock(this.chatState.id, this.chatState.blockId);

        if (!block) {
            console.log(`[ChatSystem] Block '${this.chatState.blockId}' not found. Ending.`);
            this.endChat();
            return;
        }

        // Logic check choiced khi BẮT ĐẦU vào block (để chặn loop nếu cấu hình loop=false)
        const chatSrc = this.src.chat[this.chatState.id];
        const rawBlock = chatSrc.block[block.id];
        const isChoiced = rawBlock && rawBlock.choiced === true;
        const isLoopAllowed = chatSrc.meta && chatSrc.meta.loop === true;

        if (isChoiced && !isLoopAllowed) {
            console.log(`[ChatSystem] Block '${block.id}' visited & Loop=False. Ending.`);
            this.endChat();
            return;
        }

        const handler = ChatBlockHandlers[block.type];
        if (handler) handler(this, block);
        else this.endChat();
    },

    nextChat() {
        if (!this.chatState.active) return;
        // [FIX] If reviewing history, next tap closes the chat.
        if (this.chatState.isReview) {
            this.endChat();
            return;
        }
        this.processChatBlock();
    },

    async selectChatChoice(idx) {
        const block = this.resolveBlock(this.chatState.id, this.chatState.blockId);

        if (!block || !block.choices || !block.choices[idx]) return;

        const choice = block.choices[idx];

        // --- 1. Đánh dấu 'choiced = true' NGAY LẬP TỨC ---
        if (this.src.chat[this.chatState.id].block[this.chatState.blockId]) {
            // [FIX] Mark both Block AND Choice as choiced
            this.src.chat[this.chatState.id].block[this.chatState.blockId].choiced = true;

            // Access raw choice via ID mapping if possible, or index
            if (this.src.chat[this.chatState.id].block[this.chatState.blockId].choice_id) {
                const cId = this.src.chat[this.chatState.id].block[this.chatState.blockId].choice_id;
                if (this.src.chat[this.chatState.id].choice && this.src.chat[this.chatState.id].choice[cId]) {
                    if (this.src.chat[this.chatState.id].choice[cId][idx]) {
                        if (!this.src.chat[this.chatState.id].choice[cId][idx].set) {
                            this.src.chat[this.chatState.id].choice[cId][idx].set = {};
                        }
                        this.src.chat[this.chatState.id].choice[cId][idx].set.choiced = true;
                    }
                }
            }

            console.log(`[ChatSystem] Marked Block ${this.chatState.blockId} (and choice ${idx}) as CHOICED.`);
        }

        // --- 2. Render tin nhắn ---
        const entryChar = this.state.meta?.entryCharacter || 'player';
        const playerLine = { nameID: entryChar, text: choice.text };

        this.state.chatHistory[this.chatState.id].push(playerLine);
        API.render.chat.renderBubble(playerLine, document.getElementById('contact-chat-history'));

        const footer = document.getElementById('contact-chat-footer');
        if (footer) {
            footer.innerHTML = '';
            footer.classList.add('hidden');
        }

        this.chatState.blocking = true;

        // --- 3. Run Effect ---
        if (choice.effect) {
            this.processRunnables(choice.effect, { sceneId: this.state.sceneId }).catch(e => {
                console.warn("Effect Error:", e);
            });
        }

        // --- 4. Logic JUMP + Kiểm tra CHOICED của Đích ---
        let nextBlockId = choice.jump;
        const chatData = this.src.chat[this.chatState.id];

        // Nếu jump hợp lệ, kiểm tra xem block đích có tồn tại không
        if (nextBlockId) {
            if (!chatData || !chatData.block || !chatData.block[nextBlockId]) {
                console.warn(`[ChatSystem] Target '${nextBlockId}' not found. End.`);
                nextBlockId = null;
            } else {
                const targetBlockInfo = this.resolveBlock(this.chatState.id, nextBlockId);
                if (targetBlockInfo) {
                    const rawTarget = chatData.block[nextBlockId];

                    if (rawTarget && rawTarget.choiced === true) {
                        console.log(`[ChatSystem] Jump target '${nextBlockId}' is ALREADY CHOICED. Treating as END.`);
                        nextBlockId = null; // FORCE END
                    }
                }
            }
        }

        if (nextBlockId) {
            setTimeout(() => {
                this.chatState.blockId = nextBlockId;
                this.chatState.index = 0;

                if (this.state.chats[this.chatState.id].set) {
                    // [FIX] Do NOT overwrite bookmark with single ID. It is an array.
                    // ProcessChatBlock will append the new ID.
                    this.state.chats[this.chatState.id].set.step = 0;
                }

                this.processChatBlock();
                this.toggleChatOverlay(true);
                API.render.refresh();
                API.render.components.inputBar();

            }, 500);
        } else {
            // End Chat
            setTimeout(() => {
                this.endChat();
            }, 500);
        }
    },

    endChat() {
        console.log(`[ChatSystem] endChat: ${this.chatState.id}`);
        if (this.state.chats[this.chatState.id] && this.state.chats[this.chatState.id].set) {
            this.state.chats[this.chatState.id].set.read = true;
            console.log(`chat '${this.chatState.id}' marked as READ.`);
        }

        if (this.state.actions) {
            Object.keys(this.state.actions).forEach(key => {
                const actState = this.state.actions[key];
                if (actState.type === 'show_chat' && actState.target === this.chatState.id) {
                    actState.display = 'hide';
                }
            });
        }

        this.chatState.active = false;
        this.chatState.blocking = false;
        this.toggleChatOverlay(false);
        hideInput();

        API.render.chat.renderContactList();
        API.render.refresh();
    }
};