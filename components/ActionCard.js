export const ActionCard = ({ uId, meta, set, isLocked, isFakerActive, styleClass, statusBadge, cooldownHTML, thumbUrl, iconHtml, restricted = false, isVideo = false, showHint = false }) => {
    // 1. Xử lý Class trạng thái
    let statusClass = "";
    if (isLocked) statusClass += " opacity-60 grayscale-[0.8]";

    // Restricted Overrides
    if (restricted) {
        // Force specific border and background for restricted items
        statusClass += " border-amber-500/50 bg-amber-50 hover:border-amber-400";
    }

    // 2. Badge (Nhãn trạng thái)
    const badgeHTML = statusBadge
        ? `<div class="absolute top-2 left-2 z-20 pointer-events-none drop-shadow-md transform scale-90 origin-top-left">${statusBadge}</div>`
        : '';

    // --- VIEW MODE: GRID VIEW ONLY ---
    // User Request:
    // Desktop: 3 card/snap (approx 33%)
    // Tablet: 2 card/snap (approx 50%)
    // Mobile: 1 card/snap (max 80% device width)

    // Using Tailwind responsive classes:
    // Mobile (Default): w-[80%] max-w-[350px] (Center via parent flex)
    // Tablet (md): w-[calc(50%-12px)] (Gap handling might need adjustment in parent, assuming gap-4 = 1rem. 50% - 0.5gap approx)
    // Desktop (lg): w-[calc(33.33%-12px)]

    // [THEME v13] Card sáng (bìa sách/thẻ hành động kiểu "point & click"): nền trắng,
    // viền be nhạt, chữ ink. Lớp phủ dưới ảnh + overlay khoá GIỮ TỐI có chủ đích để luôn
    // đọc được trên ảnh thumbnail bất kỳ (xem readme.md > Ngoại lệ theme).
    return `
    <div class="action-card-grid-item group relative shrink-0 
                w-[80%] max-w-[380px] md:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-0.75rem)]
                bg-white border border-[var(--vsr-border)] 
                hover:border-red-400 hover:shadow-[0_4px_20px_rgba(220,38,38,0.15)] 
                transition-transform duration-300 rounded-xl overflow-hidden ${styleClass} ${statusClass}" 
            id="card-${uId}">
        
        ${cooldownHTML}

        <!-- Phần 1: Ảnh (Dọc) -->
        <div class="relative w-full aspect-[16/9] md:aspect-[4/3] bg-[var(--vsr-surface-3)] overflow-hidden border-b border-[var(--vsr-border)]">
            ${isVideo
            ? `<video src="${thumbUrl}" class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" autoplay loop muted playsinline></video>`
            : `<div class="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style="background-image: url('${thumbUrl}');"></div>`
        }
            <div class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent opacity-80"></div>
            
            ${badgeHTML}

            ${isLocked ?
            `<div class="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-[1px]">
                <span class="material-icons-round text-white/70 text-3xl mb-1">lock</span>
                <span class="text-[9px] font-bold text-white/60 uppercase tracking-widest">LOCKED</span>
                </div>` : ''}
        </div>

        <!-- Phần 2: Nội dung (Dưới) -->
        <div class="flex-1 flex flex-col p-3 relative">
            <div class="flex justify-between items-start">
                <h4 class="text-[var(--vsr-ink-900)] font-bold text-sm leading-5 line-clamp-2 min-h-[2.5rem] transition-colors">
                    ${meta.title || "Untitled Card Content"}
                </h4>
                ${meta.desc ?
            `<button class="info-trigger text-[var(--vsr-ink-300)] hover:text-red-500 transition-colors ${showHint ? 'animate-bounce text-amber-500' : ''}" 
                        data-pop-desc="${meta.desc}">
                    <span class="material-icons-round text-base">info</span>
                </button>` : ''}
            </div>
            <div class="mt-auto pt-2 border-t border-[var(--vsr-border)]">
                <button class="action-trigger w-full flex justify-between items-center p-2 bg-[var(--vsr-surface-2)] hover:bg-red-600 hover:text-white text-[var(--vsr-ink-700)] text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 border border-[var(--vsr-border)] hover:border-red-600 flex items-center justify-center gap-2 ${isLocked || restricted ? 'pointer-events-none opacity-40' : ''} ${restricted ? 'cursor-not-allowed bg-amber-100' : ''}">
                    ${iconHtml}
                    <span>${restricted ? "RESTRICTED" : (meta.buttonLabel || "SELECT")}</span>
                </button>
            </div>
        </div>
    </div>
    `;
};
