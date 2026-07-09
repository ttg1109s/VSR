// components/HomeScreen.js
// Layout màn Home — trước đây viết cứng trong index.html, nay tách thành component
// (đồng bộ với components/Layouts.js cho màn Contact) và được render động bởi
// render/modules/common.js (renderHomeScreen).
//
// Thiết kế lại mobile-first theo tham khảo UI/UX trang sản phẩm kiểu App Store/
// Play Store: hero (icon app + tên + tagline) -> dải chip tính năng ngắn ->
// nút CTA chính nổi bật kiểu nút "GET/OPEN" -> hàng phụ dạng list-row (icon +
// tiêu đề + mô tả phụ + chevron) cho việc import file JSON của người dùng,
// thay vì 2 nút cùng cấp trực quan như bản cũ.
export const HomeScreenLayout = () => `
    <div class="relative z-10 w-full max-w-sm space-y-8">

        <!-- Hero: icon app + tên + tagline -->
        <div class="relative text-center">
            <div class="absolute -inset-10 bg-gradient-to-tr from-red-100/60 to-amber-100/60 blur-3xl rounded-full"></div>
            <div class="relative">
                <div class="w-20 h-20 mx-auto mb-4 rounded-[22px] bg-white border border-[var(--vsr-border)] shadow-[var(--vsr-shadow-md)] flex items-center justify-center">
                    <span class="anime-font text-3xl font-bold text-red-600">VSR</span>
                </div>
                <h1 class="anime-font text-3xl font-bold text-[var(--vsr-ink-900)] tracking-tight mb-1">VSR Engine</h1>
                <p class="text-xs text-[var(--vsr-ink-400)] px-4 leading-relaxed">Kể chuyện tương tác kiểu point-and-click,
                    chạy ngay trên trình duyệt</p>
            </div>
        </div>

        <!-- Dải chip tính năng ngắn (kiểu badge trên trang app store) -->
        <div class="flex flex-wrap justify-center gap-2">
            <span
                class="px-3 py-1 rounded-full bg-[var(--vsr-surface-2)] border border-[var(--vsr-border)] text-[10px] font-bold text-[var(--vsr-ink-500)] uppercase tracking-wide">Không
                cần cài đặt</span>
            <span
                class="px-3 py-1 rounded-full bg-[var(--vsr-surface-2)] border border-[var(--vsr-border)] text-[10px] font-bold text-[var(--vsr-ink-500)] uppercase tracking-wide">Hỗ
                trợ import JSON</span>
        </div>

        <!-- CTA chính — nổi bật kiểu nút "GET/OPEN" trên App Store -->
        <button onclick="if(window.app)app.loadDemo();else console.error('App not loaded')"
            class="group w-full py-4 bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white rounded-2xl shadow-lg shadow-red-900/20 transition-all flex items-center justify-center gap-2 font-bold text-sm uppercase tracking-wide">
            <span class="material-icons-round text-lg group-active:scale-110 transition-transform">play_arrow</span>
            Chơi thử Demo
        </button>

        <!-- Hành động phụ — dạng list-row (kiểu hàng "More"/settings trên App Store),
             có cấp bậc thị giác thấp hơn CTA chính, tap target đủ lớn cho ngón tay -->
        <div class="relative">
            <input type="file" id="script-upload" class="hidden" accept=".json"
                onchange="if(window.app)app.importScript(event);else console.error('App not loaded')">
            <button onclick="document.getElementById('script-upload').click()"
                class="w-full bg-white border border-[var(--vsr-border)] rounded-2xl px-4 py-3.5 flex items-center gap-3 text-left hover:bg-[var(--vsr-surface-2)] active:scale-[0.98] transition-all">
                <span class="w-9 h-9 rounded-full bg-[var(--vsr-surface-2)] flex items-center justify-center shrink-0">
                    <span class="material-icons-round text-base text-[var(--vsr-ink-500)]">folder_open</span>
                </span>
                <span class="flex-1 min-w-0">
                    <span class="block text-sm font-bold text-[var(--vsr-ink-900)]">Nhập kịch bản của bạn</span>
                    <span class="block text-[11px] text-[var(--vsr-ink-400)]">Chọn file .json để chơi</span>
                </span>
                <span class="material-icons-round text-[var(--vsr-ink-300)]">chevron_right</span>
            </button>
        </div>
    </div>
`;
