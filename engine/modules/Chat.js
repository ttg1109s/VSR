// htdocs/engine/modules/Chat.js

import { hideInput } from './chat/Presentation.js';
import { ChatBlockHandlers } from './chat/BlockHandler.js';

export const ChatSystem = {
    // --- Helper: Quản lý lớp phủ Z-Index ---
    toggleChatOverlay(active) {
        if (this.api.presentation.navigation.setBlocking) {
            this.api.presentation.navigation.setBlocking(active);
        }
        if (this.api.presentation.chat.toggleOverlay) {
            this.api.presentation.chat.toggleOverlay(active);
        }
    },

    getChatOwner(chatId) {
        const sender = this.api.engine.state.get('chat.sender', { id: chatId });
        return sender || 'spam';
    },

    getThreads(charId) {
        let chatIds = [];
        const state = this.api.engine.state;
        const chats = state.getRuntimeSnapshot('chats') || {};
        const histories = state.getRuntimeSnapshot('chatHistory') || {};

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
            const playerChar = this._getCurrentIdentityKey?.() || this.api.engine.state.get('entryCharacter') || 'player';

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
                const entryChar = this._getCurrentIdentityKey?.() || this.api.engine.state.get('entryCharacter') || 'player';
                const senderID = last.nameID || last.char_id;
                preview = `${(senderID === entryChar) ? 'You: ' : ''}${last.text}`;
            }

            // [FIXED] Use API for Title
            const title = this.api.engine.state.get('chat.title', { id: id }) || (charId === 'spam' ? "Unknown Message" : "No Subject");

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
        const state = this.api.engine.state;
        const chatRuntime = state.getSnapshot('chat.data', { id }) || {};
        if (!chatRuntime.set) chatRuntime.set = { read: false, step: 0, bookmark: [] };

        // Normalize legacy single-value bookmarks without mutating the live state object.
        if (chatRuntime.set.bookmark && !Array.isArray(chatRuntime.set.bookmark)) {
            chatRuntime.set.bookmark = [chatRuntime.set.bookmark];
        } else if (!chatRuntime.set.bookmark) {
            chatRuntime.set.bookmark = [];
        }

        console.log(`[ChatSystem] State before init: Read=${chatRuntime.set.read}, Activation=${chatRuntime.set.activationTime}, BookmarkLen=${chatRuntime.set.bookmark.length}`);
        if (!chatRuntime.set.activationTime) {
            chatRuntime.set.activationTime = Date.now();
            if (chatRuntime.set.read !== true) chatRuntime.set.read = false;
        }
        chatRuntime.set.lastInteraction = Date.now();

        let chatHistory = state.getSnapshot('chat.history', { id }) || [];
        const isLoop = c.meta && c.meta.loop === true;
        const bookmark = chatRuntime.set.bookmark;
        const hasRead = bookmark.length > 0;
        console.log(`[ChatSystem] Logic check: isLoop=${isLoop}, hasRead=${hasRead}, readState=${chatRuntime.set.read}`);

        let startBlock = c.meta.entry;
        if (!startBlock || !Object.hasOwn(c.block || {}, startBlock)) {
            throw new Error(`Chat '${id}' has an invalid or missing meta.entry block.`);
        }
        const startIndex = 0;
        let shouldProcessBlock = true;

        if (hasRead || (chatRuntime.set.read === true && !isLoop)) {
            if (isLoop && !chatRuntime.set.read) {
                console.log(`[ChatSystem] Loop check: True. Restarting chat '${id}'.`);
                chatHistory = [];
                chatRuntime.set.bookmark = [];
                chatRuntime.set.read = false;

                // Reset scenario-local choice flags as before; these flags are read by resolveBlock.
                if (chatRuntime.block) {
                    Object.values(chatRuntime.block).forEach(variants => {
                        Object.values(variants).forEach(v => {
                            if (v.choiced) v.choiced = false;
                        });
                    });
                }
            } else {
                console.log(`[ChatSystem] Review/Replay '${id}'.`);
                chatHistory = [];
                let stopAtBlock = null;

                for (const blockId of bookmark) {
                    const blockInfo = this.resolveBlock(id, blockId);
                    if (!blockInfo) continue;

                    if (blockInfo.line) {
                        blockInfo.line.forEach(line => {
                            chatHistory.push({ ...line, nameID: line.nameID || line.char_id });
                        });
                    }

                    if (blockInfo.choices && blockInfo.choices.length > 0) {
                        const rawVariant = c.block[blockId];
                        let pickedChoice = null;
                        if (rawVariant && rawVariant.choiced) {
                            pickedChoice = blockInfo.choices.find(ch => ch.set && ch.set.choiced === true);
                        }
                        if (pickedChoice) {
                            const entryChar = this.api.engine.state.get('entryCharacter') || 'player';
                            chatHistory.push({ nameID: entryChar, text: pickedChoice.text });
                        } else {
                            stopAtBlock = blockId;
                            break;
                        }
                    } else if (!chatRuntime.set.read) {
                        stopAtBlock = blockId;
                        break;
                    }

                    startBlock = blockId;
                }

                if (stopAtBlock) {
                    startBlock = stopAtBlock;
                    shouldProcessBlock = true;
                } else if (!chatRuntime.set.read) {
                    shouldProcessBlock = true;
                } else {
                    shouldProcessBlock = false;
                }
            }
        }

        // Commit the complete progress projection before rendering or dispatching the next block.
        state.set('chat.data', chatRuntime, { id });
        state.set('chat.history', chatHistory, { id });

        const nextChatState = {
            active: true,
            id,
            blockId: startBlock,
            index: startIndex,
            blocking: true,
            waitingChoice: false,
            transitionPending: false,
            triggerActionId,
            actionModified: false,
            isProcessing: false,
            ...(!shouldProcessBlock ? { isReview: true } : {})
        };
        state.set('session.chat', nextChatState);

        if (!shouldProcessBlock && this.api.presentation?.chat?.renderChatHistory) {
            this.api.presentation.chat.renderChatHistory(id);
        }

        this.api.presentation.navigation.switchScreen('character');
        this.api.presentation.navigation.selectContact(ownerId);
        this.api.presentation.navigation.openThread(id);
        this.toggleChatOverlay(true);

        if (shouldProcessBlock) {
            this.processChatBlock();
        } else {
            console.log(`[ChatSystem] Chat '${id}' fully reviewed. Render only.`);
            this.api.presentation.chat.renderChatHistory(id);
            hideInput(this);
        }
    },

    _getCurrentIdentityKey() {
        const fakerState = this.api.engine.state.getRuntimeSnapshot('faker') || {};
        return fakerState.active ? fakerState.targetId : (this.api.engine.state.get('entryCharacter') || 'player');
    },

    resolveBlock(chatId, blockId) {
        const chat = this.api.engine.state.getSnapshot('chat.data', { id: chatId }) || this.src.chat[chatId];
        if (!chat || !chat.block) return null;

        let block = chat.block[blockId];
        if (!block) return null;

        // Clone block để xử lý dữ liệu động
        block = JSON.parse(JSON.stringify(block));

        if (block) {
            if (block.choice_id) {
                if (!chat.choice || !Object.hasOwn(chat.choice, block.choice_id)) {
                    throw new Error(`Chat '${chatId}' block '${blockId}' references missing choice group '${block.choice_id}'.`);
                }
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

        const state = this.api.engine.state;
        state.update('chat.data', current => {
            if (!current?.set) return current;
            current.set.lastInteraction = Date.now();
            if (!Array.isArray(current.set.bookmark)) current.set.bookmark = [];
            const bookmark = current.set.bookmark;
            if (bookmark.length === 0 || bookmark[bookmark.length - 1] !== this.chatState.blockId) {
                bookmark.push(this.chatState.blockId);
            }
            current.set.step = this.chatState.index;
            return current;
        }, { id: this.chatState.id });

        const block = this.resolveBlock(this.chatState.id, this.chatState.blockId);

        if (!block) {
            console.log(`[ChatSystem] Block '${this.chatState.blockId}' not found. Ending.`);
            this.endChat();
            return;
        }

        // Logic check choiced khi BẮT ĐẦU vào block (để chặn loop nếu cấu hình loop=false)
        const chatSrc = this.api.engine.state.getSnapshot('chat.data', { id: this.chatState.id }) || this.src.chat[this.chatState.id];
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
        const chatId = this.chatState.id;
        const blockId = this.chatState.blockId;
        this.api.engine.state.update('chat.data', current => {
            const rawBlock = current?.block?.[blockId];
            if (!rawBlock) return current;
            rawBlock.choiced = true;
            const choiceId = rawBlock.choice_id;
            const rawChoice = choiceId && current.choice?.[choiceId]?.[idx];
            if (rawChoice) {
                if (!rawChoice.set) rawChoice.set = {};
                rawChoice.set.choiced = true;
            }
            return current;
        }, { id: chatId });
        console.log(`[ChatSystem] Marked Block ${blockId} (and choice ${idx}) as CHOICED.`);

        // --- 2. Render tin nhắn ---
        const entryChar = this.api.engine.state.get('entryCharacter') || 'player';
        const playerLine = { nameID: entryChar, text: choice.text };

        this.api.engine.state.update('chat.history', history => [...(history || []), playerLine], { id: this.chatState.id });
        this.api.presentation.chat.renderBubble(playerLine, null);

        this.api.presentation.chat.clearChoices();

        this.api.engine.state.update('session.chat', current => ({ ...(current || {}), blocking: true, waitingChoice: false, transitionPending: true }));

        // --- 3. Run Effect ---
        if (choice.effect) {
            const choiceId = choice.id !== undefined && choice.id !== null ? choice.id : String(idx);
            this.processRunnables(choice.effect, {
                sceneId: this.api.engine.state.get('sceneId'),
                chatId,
                blockId,
                choiceId
            }).catch(e => {
                console.warn("Effect Error:", e);
            });
        }

        // --- 4. Logic JUMP + Kiểm tra CHOICED của Đích ---
        let nextBlockId = choice.jump;
        const chatData = this.api.engine.state.getSnapshot('chat.data', { id: this.chatState.id }) || this.src.chat[this.chatState.id];

        // Nếu jump hợp lệ, kiểm tra xem block đích có tồn tại không
        if (nextBlockId) {
            if (!chatData || !chatData.block || !Object.hasOwn(chatData.block, nextBlockId)) {
                throw new Error(`Chat '${this.chatState.id}' choice jump references missing block '${nextBlockId}'.`);
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
            this.scheduleDelay(500, () => {
                this.api.engine.state.update('session.chat', current => ({
                    ...current,
                    blockId: nextBlockId,
                    index: 0,
                    transitionPending: false
                }));
                this.api.engine.state.update('chat.data', current => {
                    if (current?.set) current.set.step = 0;
                    return current;
                }, { id: this.chatState.id });

                this.processChatBlock();
                this.toggleChatOverlay(true);
                this.api.presentation.refresh();
                this.api.presentation.components.inputBar();
                this.commitState('chat.block.transition');

            }, 'chat_transition');
        } else {
            // End Chat
            this.scheduleDelay(500, () => {
                this.endChat();
            }, 'chat_transition');
        }
    },

    endChat() {
        const chatId = this.chatState.id;
        console.log(`[ChatSystem] endChat: ${chatId}`);

        const state = this.api.engine.state;
        if (chatId) {
            state.update('chat.data', current => {
                if (current?.set) current.set.read = true;
                return current;
            }, { id: chatId });
            state.update('actions', current => {
                const actions = current || {};
                for (const actionState of Object.values(actions)) {
                    if (actionState.type === 'show_chat' && actionState.target === chatId) {
                        actionState.display = 'hide';
                    }
                }
                return actions;
            });
        }
        state.update('session.chat', current => ({
            ...(current || {}),
            active: false,
            blocking: false,
            waitingChoice: false,
            transitionPending: false
        }));

        this.toggleChatOverlay(false);
        hideInput(this);
        this.api.presentation.chat.renderContactList();
        this.api.presentation.refresh();
    }
};