// components/Overlays.js
// [KHÔI PHỤC] File này bị thiếu hoàn toàn — render/modules/common.js import 7
// template từ đây (GlobalPopoverTemplate, ItemModalShellTemplate,
// PlayerCardModalTemplate, ChatOverlayTemplate, AlertModalTemplate,
// PasswordOverlayShellTemplate, EndingScreenTemplate) để dựng renderAppShell().
// Import chết khiến toàn bộ module graph của app.js fail resolve (browser bắn
// 'error' lên thẻ <script type="module" src="app.js">) -> app không boot được,
// dù bản thân app.js tải về bình thường.
//
// Nội dung khôi phục từ index.html bản cũ, đối chiếu class wrapper hiện tại
// trong index.html (mount-point) để biết mỗi template chỉ cần trả về NỘI DUNG
// BÊN TRONG (wrapper ngoài + z-index/position đã có sẵn trong index.html,
// set(id, html) chỉ ghi đè innerHTML).
//
// [Theme — quyết định cho từng phần, đối chiếu component con mà mỗi overlay
// nhúng vào để tránh trộn sáng/tối trong cùng 1 khối UI]:
// - GlobalPopoverTemplate: sáng — #global-popover/.pop-thumb-header/.pop-content
//   đã token hoá sẵn trong main.css.
// - PlayerCardModalTemplate: sáng — nội dung bên trong #player-card-stats do
//   StatBar() (components/Common.js) render, đã dùng token var(--vsr-*).
// - ChatOverlayTemplate: sáng — components/Chat.js + ChatBubble.js đã migrate.
//   LƯU Ý: có vẻ #chat-overlay là UI CŨ đã bị thay thế — không còn chỗ nào
//   trong code hiện tại gọi getElementById('chat-overlay'); toggleChatOverlay()
//   giờ thao tác #screen-character/#contact-chat-footer (Contact Screen).
//   Giữ lại template cho đủ shell (an toàn nếu còn phụ thuộc ẩn), nhưng nên xác
//   nhận lại với Giang xem có thể coi #chat-overlay là dead code không.
// - AlertModalTemplate: sáng — dùng chung toàn app, đồng bộ Layouts.js/HomeScreen.js.
// - ItemModalShellTemplate: nội dung bị ghi đè hoàn toàn mỗi lần mở modal
//   (xem render/modules/inventory.js openItemModal() — set lại cả className
//   lẫn innerHTML của #item-modal ngay khi mở) nên shell ban đầu không bao giờ
//   thực sự hiển thị -> để trống, không suy đoán màu.
// - PasswordOverlayShellTemplate: TỐI có chủ đích (xem readme.md > Ghi chú kỹ
//   thuật > Ngoại lệ theme, và comment ngay trên #password-overlay trong
//   index.html) — chỉ trả về div rỗng làm điểm neo cho
//   render/modules/password/*Strategy.js.
// - EndingScreenTemplate: TỐI có chủ đích — wrapper #ending-screen ngoài
//   index.html vẫn giữ bg-black (màn kết thúc full-đen), nội dung chữ trắng
//   giữ nguyên như bản gốc.

export const GlobalPopoverTemplate = () => `
    <div class="pop-thumb-header" id="pop-thumb"></div>
    <div class="pop-content">
        <h4 class="text-red-600 font-bold text-sm mb-1" id="pop-title"></h4>
        <p class="text-xs text-[var(--vsr-ink-400)] leading-relaxed" id="pop-desc"></p>
    </div>
`;

// [FIX] Không cố dựng sẵn nội dung — render/modules/inventory.js
// openItemModal()/closeItemModal() luôn tự set lại className + innerHTML của
// #item-modal từ đầu mỗi lần mở/đóng, nên shell tĩnh ở đây chỉ tồn tại trong
// khoảnh khắc trước lần mở đầu tiên và không có ý nghĩa hiển thị.
export const ItemModalShellTemplate = () => ``;

export const PlayerCardModalTemplate = () => `
    <div class="absolute inset-0 bg-[var(--vsr-scrim)] backdrop-blur-sm pointer-events-auto transition-opacity"
        onclick="ui.closePlayerCard()"></div>
    <div
        class="bg-[var(--vsr-surface)] w-full max-w-lg mx-auto rounded-t-2xl shadow-[var(--vsr-shadow-lg)] transform translate-y-full transition-transform duration-300 pointer-events-auto p-6 pb-10 text-[var(--vsr-ink-900)] border-t border-[var(--vsr-border)] relative">
        <button onclick="ui.closePlayerCard()"
            class="absolute top-4 right-4 text-[var(--vsr-ink-400)] hover:text-[var(--vsr-ink-900)] transition-colors bg-[var(--vsr-tint-10)] rounded-full p-1"><span
                class="material-icons-round">close</span></button>
        <div class="w-12 h-1.5 bg-[var(--vsr-border-strong)] rounded-full mx-auto mb-6"></div>
        <div class="flex items-center gap-4 mb-6">
            <div
                class="w-16 h-16 rounded-full bg-[var(--vsr-surface-2)] shadow-inner flex items-center justify-center text-2xl font-bold text-[var(--vsr-ink-400)] border border-[var(--vsr-border)]">
                P</div>
            <div>
                <h2 id="player-card-name" class="text-2xl font-bold text-[var(--vsr-ink-900)] tracking-tight">Player Status</h2>
                <p class="text-sm text-[var(--vsr-ink-400)]">Personal Information</p>
            </div>
        </div>
        <div id="player-card-stats" class="space-y-5">
        </div>
    </div>
`;

export const ChatOverlayTemplate = () => `
    <header class="h-16 bg-[var(--vsr-surface)] border-b border-[var(--vsr-border)] flex items-center px-4 justify-between shrink-0">
        <div class="flex items-center gap-3">
            <button id="chat-back-btn" onclick="engine.endChat()" class="text-blue-600 hidden"><span
                    class="material-icons-round">arrow_back_ios</span></button>
            <div class="w-10 h-10 rounded-full bg-[var(--vsr-surface-3)] flex items-center justify-center text-[var(--vsr-ink-900)] font-bold relative"
                id="chat-header-avatar">?</div>
            <div>
                <h3 class="text-[var(--vsr-ink-900)] font-bold text-sm" id="chat-header-title">Chat</h3>
                <p class="text-[var(--vsr-ink-400)] text-xs" id="chat-header-status">Active now</p>
            </div>
        </div>
    </header>
    <div id="chat-messages" class="chat-container custom-scrollbar bg-[var(--vsr-canvas)]"></div>
    <div id="chat-choices-area" class="p-4 flex flex-col gap-2 bg-[var(--vsr-surface-2)] border-t border-[var(--vsr-border)] hidden"></div>
    <div id="chat-input-bar"
        class="h-14 bg-[var(--vsr-surface)] border-t border-[var(--vsr-border)] px-4 flex items-center gap-3 cursor-pointer shrink-0 group">
        <div class="flex-1 bg-[var(--vsr-surface-2)] h-9 rounded-full px-4 flex items-center text-[var(--vsr-ink-400)] text-sm">Tap to
            continue...</div>
    </div>
`;

export const AlertModalTemplate = () => `
    <div id="alert-box"
        class="bg-[var(--vsr-surface)] border border-[var(--vsr-border)] p-0 rounded-xl max-w-sm w-[85%] mx-4 shadow-[var(--vsr-shadow-lg)] transform scale-95 transition-transform overflow-hidden">
        <div class="p-6 text-center">
            <span id="alert-icon" class="material-icons-round text-4xl mb-3 text-amber-500 block">warning</span>
            <h3 id="alert-title" class="text-[var(--vsr-ink-900)] font-bold text-lg mb-2">Notification</h3>
            <p id="alert-msg" class="text-[var(--vsr-ink-400)] text-sm leading-relaxed whitespace-pre-wrap">...</p>
        </div>
        <div class="border-t border-[var(--vsr-border)] flex">
            <button onclick="ui.closeAlert()"
                class="flex-1 py-3 text-sm font-bold text-blue-600 hover:bg-[var(--vsr-tint-10)] transition-colors uppercase tracking-wide">OK</button>
        </div>
    </div>
`;

export const PasswordOverlayShellTemplate = () => `
    <div id="password-content">
        <!-- Content injected via JS -->
    </div>
`;

export const EndingScreenTemplate = () => `
    <div class="space-y-6 max-w-md">
        <h1 id="end-title" class="anime-font text-5xl font-bold text-white mb-4">THE END</h1>
        <p id="end-desc" class="text-slate-400 text-sm font-light leading-relaxed">...</p>
        <div class="pt-8"><button onclick="ui.hideEnding(); app.showScreen('home')"
                class="px-8 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs uppercase tracking-widest rounded-full">Main
                Menu</button></div>
    </div>
`;
