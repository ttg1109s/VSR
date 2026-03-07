// engine/modules/chat/BlockHandler.js
// [FIXED] Hybrid Logic: Content -> Choice -> (If Null Choice) End

import { ensureInputVisible, hideInput } from './UIHelper.js';
import { API } from '../../../api/index.js';

export const ChatBlockHandlers = {
    dialogue: (engine, block) => {
        console.log(`[BlockHandler] Processing 'dialogue'. ID: ${engine.chatState.blockId}, Index: ${engine.chatState.index}`);

        // 1. Kiểm tra đã chạy hết Content chưa
        if (!block.line || engine.chatState.index >= block.line.length) {
            console.log(`[BlockHandler] Content finished.`);

            // 2. [HYBRID] Hết content thì tìm xem có Choices không
            if (block.choices && block.choices.length > 0) {
                console.log(`[BlockHandler] Rendering choices...`);
                hideInput();

                if (API.render.chat.threadId === engine.chatState.id) {
                    API.render.chat.renderChoices(block.choices, null);
                }
                return; // Dừng lại đợi user chọn
            }

            // 3. [AUTO-END] Không có Choices (VD: chat2) -> End Chat
            // Schema V9.2 không có 'next' block tự động, mọi điều hướng phải qua 'choice'.
            // Nếu không có choice -> Dead end -> Kết thúc.
            console.log(`[BlockHandler] No choices found -> End Chat.`);
            engine.endChat();
            return;
        }

        // 4. Render dòng thoại tiếp theo
        ensureInputVisible();
        const line = block.line[engine.chatState.index];

        engine.chatState.index++;

        const history = API.engine.state.get('chat.history', { id: engine.chatState.id });
        if (history) history.push(line);

        if (API.render.chat.threadId === engine.chatState.id) {
            API.render.chat.renderBubble(line, null);
        }

        const chatData = API.engine.state.get('chat.data', { id: engine.chatState.id });
        if (chatData?.set) {
            chatData.set.step = engine.chatState.index;
            chatData.set.lastInteraction = Date.now();
        }
    },

    router: (engine, block) => {
        // Trường hợp block thuần Router (không content)
        hideInput();
        if (API.render.chat.threadId === engine.chatState.id) {
            API.render.chat.renderChoices(block.choices, null);
        }
    }
};
