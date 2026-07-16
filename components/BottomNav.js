// components/BottomNav.js
// [KHÔI PHỤC] File này bị thiếu hoàn toàn trong bản build trước — import
// `BottomNavTemplate` từ đây trong components/SceneScreen.js là import chết,
// khiến toàn bộ module graph của app.js fail để resolve (browser bắn 'error'
// lên thẻ <script type="module" src="app.js">, dù bản thân app.js tải được
// bình thường) -> app không bao giờ boot.
//
// Nội dung khôi phục lại từ index.html bản cũ (trước khi tách component) —
// đây là <nav> chính (Home/Contact/Inventory/Notifications) + #notify-panel,
// vốn nằm LỒNG bên trong #screen-game (xem comment đầu SceneScreen.js).
// KHÔNG bao gồm #back-node-btn — nút đó đã có sẵn trong SceneScreen.js hiện
// tại (bản desktop + bản mobile trong #scene-bottom-toolbar), không cần lặp lại.
//
// [Theme] .nav-icon-btn / #notify-panel / .glass-panel / .notify-item / .icon-box
// đã được token hoá sẵn trong main.css (var(--vsr-*)) nên giữ nguyên 100% class
// gốc cho các phần đó. Chỉ đổi màu border của badge từ border-[#1a1a1a] (viền
// khớp nền tối cũ) sang border-[var(--vsr-surface)] (khớp nền sáng hiện tại) —
// đồng bộ với border-[var(--vsr-surface)] đã dùng cho #npc-badge-desktop trong
// SceneScreen.js. Text rỗng trong #notify-list đổi text-slate-500 ->
// text-[var(--vsr-ink-400)] cho đồng bộ theme sáng.
export const BottomNavTemplate = () => `
    <nav
        class="fixed bottom-0 w-full glass-panel border-t border-[var(--vsr-border)] h-16 z-50 flex justify-around items-center shrink-0 md:w-16 md:h-full md:right-0 md:top-0 md:bottom-auto md:flex-col md:justify-center md:gap-0 md:border-t-0 md:border-l p-0">
        <div class="flex-1 flex w-full h-full md:flex-col justify-around md:justify-center md:gap-4">
            <button onclick="app.showScreen('home')" class="nav-icon-btn group">
                <span class="material-icons-round text-2xl group-hover:text-[var(--vsr-ink-900)]">home</span>
                <span class="text-[9px] uppercase md:hidden">Home</span>
            </button>
            <button id="nav-btn-contact" onclick="app.showScreen('character')" class="nav-icon-btn group relative">
                <span class="material-icons-round text-2xl group-hover:text-[var(--vsr-ink-900)]">contacts</span>
                <span class="text-[9px] uppercase md:hidden">Msg</span>
                <span id="msg-badge"
                    class="absolute top-3 right-3 md:top-2 md:right-2 w-2.5 h-2.5 bg-red-600 rounded-full border border-[var(--vsr-surface)] hidden z-10"></span>
            </button>
            <button id="nav-btn-inventory" onclick="app.showScreen('inventory')"
                class="nav-icon-btn group relative">
                <span class="material-icons-round text-2xl group-hover:text-[var(--vsr-ink-900)]">folder</span>
                <span class="text-[9px] uppercase md:hidden">Items</span>
                <span id="inv-count"
                    class="absolute top-2 right-2 md:top-1 md:right-1 bg-red-600 text-white text-[8px] font-bold min-w-[14px] h-3.5 px-0.5 flex items-center justify-center rounded-full border border-[var(--vsr-surface)] hidden z-10">0</span>
            </button>
            <!-- Notification Button -->
            <button onclick="ui.toggleNotifications()" class="nav-icon-btn group relative">
                <span class="material-icons-round text-2xl group-hover:text-[var(--vsr-ink-900)]">notifications</span>
                <span class="text-[9px] uppercase md:hidden">Alerts</span>
                <span id="notify-badge"
                    class="absolute top-2 right-3 md:top-1 md:right-2 w-2.5 h-2.5 bg-red-500 rounded-full border border-[var(--vsr-surface)] hidden z-10 animate-pulse"></span>
            </button>
        </div>
    </nav>

    <!-- Notification Panel (Facebook Style) -->
    <div id="notify-panel" class="hidden-panel">
        <div
            class="h-12 border-b border-[var(--vsr-border)] flex items-center justify-between px-4 bg-[var(--vsr-tint-05)] rounded-t-xl shrink-0">
            <span class="text-sm font-bold text-[var(--vsr-ink-900)]">Notifications</span>
            <button onclick="ui.clearAllNotifications()"
                class="text-[10px] uppercase text-[var(--vsr-ink-400)] hover:text-[var(--vsr-ink-900)] font-bold">Clear All</button>
        </div>
        <div id="notify-list" class="flex-1 overflow-y-auto custom-scrollbar p-1">
            <!-- Notifications injected here -->
            <div class="text-center py-8 text-[var(--vsr-ink-400)] text-xs italic">No notifications</div>
        </div>
    </div>
`;
