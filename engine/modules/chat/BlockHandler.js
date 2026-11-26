// engine/modules/chat/BlockHandler.js
// [FIXED] Hybrid Logic: Content -> Choice -> (If Null Choice) End

import { ensureInputVisible, hideInput } from './Presentation.js';

export const ChatBlockHandlers = {
    dialogue: (engine, block) => {

        // 1. Kiểm tra đã chạy hết Content chưa
        if (!block.line || engine.chatState.index >= block.line.length) {

            // 2. [HYBRID] Hết content thì tìm xem có Choices không
            if (block.choices && block.choices.length > 0) {
                hideInput(engine);
                engine.api.engine.state.update('session.chat', current => ({ ...(current || {}), waitingChoice: true }));

                engine.api.presentation.chat.renderChoices(block.choices, null);
                return; // Dừng lại đợi user chọn
            }

            // 3. [AUTO-END] Không có Choices (VD: chat2) -> End Chat
            // Schema V9.2 không có 'next' block tự động, mọi điều hướng phải qua 'choice'.
            // Nếu không có choice -> Dead end -> Kết thúc.
            engine.endChat();
            return;
        }

        // 4. Render dòng thoại tiếp theo
        ensureInputVisible(engine);
        const line = block.line[engine.chatState.index];

        const state = engine.api.engine.state;
        state.update('session.chat', current => ({
            ...(current || {}),
            index: (current?.index || 0) + 1
        }));

        state.update('chat.history', history => [...(history || []), line], { id: engine.chatState.id });

        engine.api.presentation.chat.renderBubble(line, null);

        state.update('chat.data', chatData => {
            if (chatData?.set) {
                chatData.set.step = engine.chatState.index;
                chatData.set.lastInteraction = Date.now();
            }
            return chatData;
        }, { id: engine.chatState.id });
    },

    router: (engine, block) => {
        // Trường hợp block thuần Router (không content)
        hideInput(engine);
        engine.api.engine.state.update('session.chat', current => ({ ...(current || {}), waitingChoice: true }));
        engine.api.presentation.chat.renderChoices(block.choices, null);
    }
};
