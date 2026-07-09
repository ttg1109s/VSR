// components/InfoScreen.js
// Layout màn Info (metadata kịch bản) — trước đây viết cứng trong index.html.
// Nội dung động (title/subtitle/tags/meta/synopsis) vẫn được điền qua các id
// giữ nguyên (info-title, info-subtitle, info-tags, meta-details-grid, info-desc,
// info-copyright, info-updated) bởi API.render.setup.scriptInfo — không đổi logic,
// chỉ tách phần khung HTML + tái bố cục.
//
// [FIX] #screen-info (index.html) thiếu class "flex-col" — .screen chỉ có
// display:flex nhưng không set flex-direction, nên header + main (2 con trực
// tiếp) bị xếp NGANG thay vì dọc trên mọi kích thước màn hình, kể cả mobile —
// đây là nguyên nhân chính khiến layout vỡ thành "2 cột chồng lệch" trước đó.
//
// [Redesign] Tags (thể loại) chuyển vào khối hero (dưới subtitle, trước CTA)
// cho giống cách App Store hiển thị category ngay dưới tên app — trước đây tags
// nằm ở cột phải nên trên mobile (stack dọc) mới hiện SAU khối hero khá xa.
// Khối Information mỗi ô có icon nhỏ (kiểu App Store info row).
export const InfoScreenLayout = () => `
    <header class="h-14 border-b border-[var(--vsr-border)] flex items-center px-4 justify-between shrink-0"
        style="padding-top: env(safe-area-inset-top);">
        <div class="flex items-center gap-3 text-xs text-[var(--vsr-ink-400)]">
            <span class="material-icons-round text-base">description</span>
            <span class="font-mono">metadata.json</span>
        </div>
        <button onclick="if(window.app)app.showScreen('home');else console.error('App not loaded')"
            class="w-9 h-9 rounded-full hover:bg-[var(--vsr-tint-10)] flex items-center justify-center text-[var(--vsr-ink-400)] hover:text-[var(--vsr-ink-900)] transition-all"><span
                class="material-icons-round">close</span></button>
    </header>
    <main class="flex-1 overflow-hidden flex flex-col md:flex-row">
        <div
            class="w-full md:w-5/12 lg:w-4/12 flex-shrink-0 bg-[var(--vsr-surface-2)] md:border-r border-[var(--vsr-border)] p-6 md:p-8 flex flex-col justify-center items-center text-center overflow-y-auto">
            <div
                class="w-20 h-20 md:w-32 md:h-32 bg-white rounded-[22px] border border-[var(--vsr-border)] flex items-center justify-center shadow-[var(--vsr-shadow-md)] relative overflow-hidden group mb-4">
                <span
                    class="material-icons-round text-4xl md:text-5xl text-[var(--vsr-ink-300)] group-hover:scale-110 transition-transform duration-500">auto_stories</span>
            </div>
            <h2 id="info-title" class="anime-font text-2xl md:text-4xl text-[var(--vsr-ink-900)] font-bold tracking-tight mb-1">
                Title</h2>
            <h3 id="info-subtitle" class="text-base text-red-600 font-medium mb-3">Subtitle</h3>
            <div id="info-tags" class="flex flex-wrap justify-center gap-2 mb-6"></div>
            <div class="w-full max-w-xs grid grid-cols-2 gap-3 mt-auto pt-4">
                <button onclick="if(window.app)app.showScreen('home');else console.error('App not loaded')"
                    class="py-3 border border-[var(--vsr-border)] hover:bg-[var(--vsr-tint-10)] bg-white rounded-xl text-xs text-[var(--vsr-ink-500)] transition-all font-bold uppercase tracking-wider">Home</button>
                <button onclick="if(window.app)app.startGame();else console.error('App not loaded')"
                    class="py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs shadow-lg shadow-red-900/10 transition-all font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-[0.98]">
                    <span>Start</span> <span class="material-icons-round text-sm">arrow_forward</span>
                </button>
            </div>
        </div>
        <div class="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar">
            <h4
                class="text-xs uppercase tracking-widest text-[var(--vsr-ink-400)] mb-3 font-bold border-b border-[var(--vsr-border)] pb-2">
                Information</h4>
            <div class="meta-grid mb-6" id="meta-details-grid"></div>
            <h4
                class="text-xs uppercase tracking-widest text-[var(--vsr-ink-400)] mb-3 font-bold border-b border-[var(--vsr-border)] pb-2">
                Synopsis</h4>
            <div class="bg-[var(--vsr-surface-2)] rounded-2xl p-5 border border-[var(--vsr-border)] mb-6">
                <p id="info-desc" class="text-[var(--vsr-ink-700)] text-sm leading-7 font-light text-justify">...</p>
            </div>
            <div class="w-full flex justify-between text-[10px] text-[var(--vsr-ink-300)] font-mono pt-4">
                <span id="info-copyright"></span>
                <span id="info-updated"></span>
            </div>
        </div>
    </main>
`;
