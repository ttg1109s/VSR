// components/InventoryScreen.js
// [KHÔI PHỤC] File này bị thiếu hoàn toàn — render/modules/common.js import
// `InventoryScreenLayout` từ đây để set('screen-inventory', ...) trong
// renderAppShell(). Import chết khiến toàn bộ module graph của app.js fail
// resolve (browser bắn 'error' lên thẻ <script type="module" src="app.js">)
// -> app không boot được, dù bản thân app.js tải về bình thường.
//
// CHỈ trả về nội dung BÊN TRONG #screen-inventory — thẻ <section> ngoài đã có
// sẵn trong index.html (class screen/bg/text đã set tĩnh ở đó), đồng bộ pattern
// với HomeScreenLayout/InfoScreenLayout/SceneScreenLayout/ContactScreenLayout.
//
// [Theme] Đổi từ bg-[#262626]/text-slate-300 (bản gốc) sang token sáng
// var(--vsr-*), vì .explorer-item trong main.css ĐÃ được viết sẵn theo token
// sáng (background: var(--vsr-surface)...) — comment ngay trong main.css ghi
// rõ class này "bị thiếu hoàn toàn ở bản gốc", tức là phần CSS cho theme sáng
// đã được chuẩn bị trước cho màn này.
//
// [LƯU Ý — CẦN GIANG XÁC NHẬN] components/Inventory.js (ExplorerItem/TaskbarItem)
// và components/ItemModal.js vẫn còn nguyên class tối cứng (bg-white/10,
// text-slate-400, bg-[#1f1f1f]...) — CHƯA được migrate sang token sáng. Nghĩa
// là item trong lưới (nền bg-white/10 = gần trong suốt, chữ dò trên nền sáng)
// sẽ hiển thị sai/mờ trên #screen-inventory sáng vừa khôi phục ở đây. Đây là
// vấn đề của 2 file đó (nằm ngoài phạm vi khôi phục file bị thiếu), chưa sửa —
// cần 1 lượt migrate riêng giống Layouts.js đã làm cho ContactScreenLayout.
export const InventoryScreenLayout = () => `
    <header
        class="bg-[var(--vsr-surface)] h-12 flex items-center px-4 border-b border-[var(--vsr-border)] select-none shrink-0 shadow-[var(--vsr-shadow-sm)] z-10 gap-3">
        <button onclick="app.showScreen('game')"
            class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--vsr-tint-10)] text-[var(--vsr-ink-400)] transition-colors"><span
                class="material-icons-round">arrow_back</span></button>
        <div
            class="flex-1 flex items-center bg-[var(--vsr-surface-2)] h-8 rounded px-3 text-xs text-[var(--vsr-ink-400)] border border-[var(--vsr-border)]">
            <span class="material-icons-round text-[14px] mr-2 text-amber-500">folder</span> Inventory / Items
        </div>
        <div
            class="w-32 md:w-48 bg-[var(--vsr-surface-2)] h-8 rounded px-3 text-xs text-[var(--vsr-ink-400)] border border-[var(--vsr-border)] flex items-center">
            Search...</div>
    </header>
    <div class="flex-1 flex overflow-hidden">
        <div class="w-48 border-r border-[var(--vsr-border)] bg-[var(--vsr-surface)] hidden md:block p-4">
            <div class="text-[10px] font-bold uppercase tracking-wider text-[var(--vsr-ink-400)] mb-3">Quick Access</div>
            <div
                class="flex items-center gap-2 px-3 py-2 bg-[var(--vsr-tint-10)] text-[var(--vsr-ink-900)] rounded-md text-xs font-medium cursor-pointer">
                <span class="material-icons-round text-sm text-blue-600">inventory_2</span> All Items
            </div>
        </div>
        <div id="explorer-grid"
            class="flex-1 p-6 overflow-y-auto custom-scrollbar grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-4 content-start">
        </div>
    </div>
    <div class="h-16 bg-[var(--vsr-surface)] border-t border-[var(--vsr-border)] flex items-center px-4 justify-between shrink-0">
        <div class="flex items-center gap-4 overflow-hidden h-full">
            <div class="text-[10px] font-bold uppercase tracking-wider text-[var(--vsr-ink-400)] shrink-0">Hand:</div>
            <div class="flex gap-2 overflow-x-auto no-scrollbar items-center h-full" id="inventory-taskbar-content">
            </div>
        </div>
        <div class="text-[10px] text-[var(--vsr-ink-400)] shrink-0 ml-4" id="explorer-status">0 items</div>
    </div>
`;
