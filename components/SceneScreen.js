// components/SceneScreen.js
// Layout màn Scene/Game (đọc truyện + hành động, 2 panel mobile-first) — trước đây
// viết cứng trong index.html. Ghép BottomNavTemplate (nav dưới + notify-panel) vào
// đúng vị trí cũ — 2 khối này vốn nằm LỒNG bên trong #screen-game (không phải
// section riêng), giữ nguyên vị trí đó vì .glass-panel nav dùng position:fixed nên
// không phụ thuộc DOM nesting để hiển thị đúng chỗ, nhưng opacity của #screen-game
// (qua .screen-hidden) vẫn cascade xuống nav khi màn Scene bị ẩn — đúng hành vi cũ.
//
// [FIX UI mobile] 3 lỗi từ đợt tái cấu trúc mobile-first trước chưa tính tới:
// 1) #breadcrumbs trước đây nằm trong #rp-header (hidden md:flex) — trên mobile
//    HOÀN TOÀN không thấy breadcrumb ở đâu cả. Đã chuyển #breadcrumbs ra thành 1
//    thanh riêng luôn hiển thị (#scene-breadcrumb-bar) ở NGAY ĐẦU #scene-container,
//    trên cả mobile lẫn desktop — không cần sửa gì ở render/modules/scene.js vì
//    logic vẫn chỉ query đúng id "breadcrumbs" như cũ, chỉ đổi vị trí DOM.
// 2) #left-panel dùng justify-end (mobile) — khi chưa có ảnh nền cảnh, tiêu đề +
//    mô tả bị dồn xuống ĐÁY panel, để trống cả khoảng lớn phía trên trông như vỡ
//    layout. Đổi sang justify-start (mobile) — thông tin lên đầu ngay dưới thanh
//    breadcrumb, đúng luồng đọc tự nhiên. Desktop giữ md:justify-center như cũ.
// 3) #scene-container chỉ chừa pb-16 (64px, đúng bằng chiều cao thanh nav chính)
//    nhưng #scene-bottom-toolbar (52px) còn nằm ĐÈ THÊM lên trên nav — tổng
//    khoảng cần chừa là 64+52=116px, thiếu 52px khiến nội dung/card dưới cùng
//    dính sát vào thanh toolbar. Đổi thành pb-[7.25rem] (116px).
import { BottomNavTemplate } from './BottomNav.js';

export const SceneScreenLayout = () => `
    <!-- [FIX] Breadcrumb — luôn hiển thị (cả mobile lẫn desktop), nằm NGOÀI
         #scene-container (là sibling trước <main>) để không bị cuốn vào
         md:flex-row của scene-container (nếu nằm trong sẽ biến thành cột dọc
         cạnh game-slider trên desktop thay vì thanh ngang cố định trên đầu). -->
    <div id="scene-breadcrumb-bar"
        class="shrink-0 h-9 flex items-center px-3 bg-[var(--vsr-surface-2)] border-b border-[var(--vsr-border)] overflow-x-auto no-scrollbar relative z-20"
        style="padding-top: env(safe-area-inset-top);">
        <div id="breadcrumbs" class="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest whitespace-nowrap"></div>
    </div>

    <main id="scene-container"
        class="flex-1 overflow-hidden relative z-10 flex flex-col overflow-y-auto md:flex-row md:overflow-hidden md:divide-x md:divide-[var(--vsr-border)] pb-[7.25rem] md:pb-0 md:mr-16">
        <div id="vfx-layer" class="absolute inset-0 pointer-events-none z-[5]"></div>

        <!-- [FIX] Alert nổi khi NPC xuất hiện — trước đây đổ vào #rp-footer, nay
             rp-footer bị ẩn vĩnh viễn (đã chuyển thành NPC sheet) nên cần chỗ riêng. -->
        <div id="meeting-alert-strip"></div>

        <!-- Slider Wrapper: mobile = 2 panel full-view trượt ngang; desktop = 2 cột cố định (cấu trúc cũ) -->
        <div id="game-slider">

            <!-- Left Panel: màn "đọc truyện" (ảnh cảnh + tiêu đề + mô tả) -->
            <div id="left-panel"
                class="flex-shrink-0 relative z-20 flex flex-col justify-start p-6 md:p-8 space-y-4 md:bg-[var(--vsr-surface-2)] md:justify-center md:h-full md:overflow-y-auto custom-scrollbar"
                style="padding-top: 1.25rem;">

                <!-- Tay cầm trượt sang phải, nằm giữa rìa phải màn hình (yêu cầu b) -->
                <button class="slider-toggle-btn btn-slide-right md:hidden" onclick="if(window.ui)ui.slideGame('right');else console.error('UI not loaded')" aria-label="Xem danh sách hành động">
                    <span class="material-icons-round">chevron_right</span>
                </button>

                <div class="animate-fade-in flex-shrink-0 z-10" style="animation-delay: 0.1s">
                    <h2 id="scene-title"
                        class="anime-font text-2xl md:text-4xl font-bold text-white md:text-[var(--vsr-ink-900)] leading-tight drop-shadow-2xl md:drop-shadow-none mb-2 md:mb-4">
                    </h2>
                </div>
                <div class="animate-fade-in flex-shrink-0 z-10" style="animation-delay: 0.2s">
                    <div
                        class="bg-white/90 backdrop-blur-xl border border-[var(--vsr-border)] p-4 md:p-5 rounded-2xl text-[var(--vsr-ink-900)] text-sm md:text-base leading-relaxed font-light max-h-40 overflow-y-auto custom-scrollbar">
                        <p id="scene-desc"></p>
                    </div>
                </div>
            </div>

            <!-- Right Panel: danh sách hành động — full-view trên mobile (yêu cầu b) -->
            <div id="right-panel" class="flex-1 relative bg-[var(--vsr-canvas)] flex flex-col md:h-full overflow-hidden">

                <!-- Tay cầm trượt về trái -->
                <button class="slider-toggle-btn btn-slide-left md:hidden" onclick="if(window.ui)ui.slideGame('left');else console.error('UI not loaded')" aria-label="Quay lại màn đọc truyện">
                    <span class="material-icons-round">chevron_left</span>
                </button>

                <!-- Header: chỉ hiện ở desktop (mobile dùng scene-bottom-toolbar) —
                     breadcrumb đã chuyển ra #scene-breadcrumb-bar dùng chung, header
                     này giờ chỉ còn nút chuyển view (grid/list/npc). -->
                <header id="rp-header"
                    class="shrink-0 h-11 border-b border-[var(--vsr-border)] items-center px-4 bg-[var(--vsr-surface-2)] hidden md:flex justify-end z-20">
                    <div class="flex items-center gap-1">
                        <button id="btn-view-grid" onclick="if(window.ui)ui.toggleActionView('grid');else console.error('UI not loaded')" class="p-1.5 rounded-md transition-colors text-[var(--vsr-ink-900)] bg-[var(--vsr-tint-10)]"><span class="material-icons-round text-base">grid_view</span></button>
                        <button id="btn-view-list" onclick="if(window.ui)ui.toggleActionView('list');else console.error('UI not loaded')" class="p-1.5 rounded-md transition-colors text-[var(--vsr-ink-400)] hover:text-[var(--vsr-ink-900)]"><span class="material-icons-round text-base">view_list</span></button>
                        <button id="nav-btn-npc-desktop" onclick="if(window.ui)ui.toggleNpcSheet();else console.error('UI not loaded')" class="p-1.5 rounded-md transition-colors text-[var(--vsr-ink-400)] hover:text-[var(--vsr-ink-900)] relative">
                            <span class="material-icons-round text-base">groups</span>
                            <span id="npc-badge-desktop" class="hidden absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-red-600 text-white text-[8px] font-bold flex items-center justify-center border border-[var(--vsr-surface)]">0</span>
                        </button>
                    </div>
                </header>

                <!-- Body: Actions (Grid by default) -->
                <div id="rp-body"
                    class="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 relative"
                    style="padding-bottom: calc(env(safe-area-inset-bottom) + 1rem);">
                    <div id="actions-list" class="flex flex-wrap justify-center pb-4 transition-all">
                        <!-- Actions injected here -->
                    </div>
                </div>

                <!-- Footer NPC cũ đã được thay bằng #npc-sheet (mobile) / nav-btn-npc-desktop (desktop) -->
                <footer id="rp-footer" class="hidden"></footer>
            </div>

        </div>
    </main>

    <!-- Back button nổi — chỉ desktop (mobile dùng nút trong scene-bottom-toolbar) -->
    <!-- [FIX] onclick thật được gán động trong render/modules/scene.js (renderScene) —
         engine.goBack() không tồn tại trong bản gốc và không bao giờ thực sự chạy được. -->
    <button id="back-node-btn"
        class="back-node-btn fixed bottom-6 right-20 z-40 w-12 h-12 bg-white hover:bg-[var(--vsr-surface-2)] rounded-full border border-[var(--vsr-border)] hidden md:flex items-center justify-center group">
        <span
            class="material-icons-round text-xl text-[var(--vsr-ink-500)] group-hover:text-[var(--vsr-ink-900)] transition-colors">reply</span>
    </button>

    <!-- ==================== SCENE BOTTOM TOOLBAR (mobile) — yêu cầu (c) + (d) ==================== -->
    <div id="scene-bottom-toolbar" class="md:hidden">
        <div class="scene-toolbar-group">
            <button id="back-node-btn-mobile" class="back-node-btn scene-toolbar-btn hidden">
                <span class="material-icons-round">reply</span>
            </button>
            <span id="scene-title-badge" class="scene-toolbar-label"></span>
        </div>
        <div class="scene-toolbar-group">
            <button id="btn-view-grid-m" onclick="if(window.ui)ui.toggleActionView('grid');else console.error('UI not loaded')" class="scene-toolbar-btn active">
                <span class="material-icons-round text-lg">grid_view</span>
            </button>
            <button id="btn-view-list-m" onclick="if(window.ui)ui.toggleActionView('list');else console.error('UI not loaded')" class="scene-toolbar-btn">
                <span class="material-icons-round text-lg">view_list</span>
            </button>
            <!-- Icon NPC trong scene — bấm mở list (yêu cầu d) -->
            <button id="nav-btn-npc" onclick="if(window.ui)ui.toggleNpcSheet();else console.error('UI not loaded')" class="scene-toolbar-btn">
                <span class="material-icons-round text-lg">groups</span>
                <span id="npc-badge" class="scene-toolbar-badge hidden">0</span>
            </button>
        </div>
    </div>

    <!-- NPC sheet: danh sách nhân vật đang có mặt trong scene (yêu cầu d) -->
    <div id="npc-sheet-backdrop" onclick="if(window.ui)ui.toggleNpcSheet(false);else console.error('UI not loaded')"></div>
    <div id="npc-sheet">
        <div class="w-10 h-1 rounded-full bg-[var(--vsr-border-strong)] mx-auto mt-3 mb-1 shrink-0"></div>
        <div class="flex items-center justify-between px-5 py-2 shrink-0">
            <h3 class="text-sm font-bold text-[var(--vsr-ink-900)] uppercase tracking-wide">Đang có mặt tại đây</h3>
            <button onclick="if(window.ui)ui.toggleNpcSheet(false);else console.error('UI not loaded')" class="w-8 h-8 rounded-full hover:bg-[var(--vsr-tint-10)] flex items-center justify-center text-[var(--vsr-ink-400)]"><span class="material-icons-round">close</span></button>
        </div>
        <div id="npc-sheet-list" class="flex-1 overflow-y-auto custom-scrollbar px-3 pb-3"></div>
    </div>

    ${BottomNavTemplate()}
`;
