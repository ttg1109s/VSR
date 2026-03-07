// Main Aggregator Module for Character UI
// Import các module con
import { AlertMethods } from './character/utils.js?v=2';
import { PlayerMethods } from './character/player.js?v=2';
import { ChatMethods } from './character/chat.js?v=2';
import { ContactMethods } from './character/contacts.js?v=2';

export const characterMethods = {
    // State Variables (được dùng chung bởi các methods)
    currentContactId: null,
    currentThreadId: null,

    // Gộp tất cả methods từ các module con vào object này
    ...AlertMethods,
    ...PlayerMethods,
    ...ChatMethods,
    ...ContactMethods
};