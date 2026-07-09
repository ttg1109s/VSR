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
        ? `<div class="absolute top-1 left-1 md:top-2 md:left-2 z-20 pointer-events-none drop-shadow-md transform scale-75 md:scale-90 origin-top-left">${statusBadge}</div>`
        : '';

    // --- VIEW MODE ---
    // [UI mobile-first] Mobile: list-item NGANG (thumb vuông nhỏ bên trái, khối nội
    // dung — tiêu đề/info/nút hành động — bên phải), tránh ảnh thumbnail mặc định
    // (chưa có ảnh thật) chiếm quá nhiều diện tích dọc màn hình.
    // Desktop (md+): giữ nguyên layout card dọc cũ (ảnh trên full-width, nội dung dưới)
    // cho lưới nhiều cột như trước.
    //
    // Mobile (Default): w-full, flex-row, thumb w-24 h-24 shrink-0
    // Tablet (md): w-[calc(50%-12px)], flex-col, ảnh full-width aspect-[4/3]
    // Desktop (lg): w-[calc(33.33%-12px)]

    // [THEME v13] Card sáng (bìa sách/thẻ hành động kiểu "point & click"): nền trắng,
    // viền be nhạt, chữ ink. Lớp phủ dưới ảnh + overlay khoá GIỮ TỐI có chủ đích để luôn
    // đọc được trên ảnh thumbnail bất kỳ (xem readme.md > Ngoại lệ theme).
    return `
    <div class="action-card-grid-item group relative shrink-0 flex flex-row md:flex-col
                w-full md:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-0.75rem)]
                bg-white border border-[var(--vsr-border)] 
                hover:border-red-400 hover:shadow-[0_4px_20px_rgba(220,38,38,0.15)] 
                transition-transform duration-300 rounded-xl overflow-hidden ${styleClass} ${statusClass}" 
            id="card-${uId}">
        
        ${cooldownHTML}

        <!-- Phần 1: Ảnh (thumb vuông nhỏ bên trái trên mobile, dọc full-width trên desktop) -->
        <div class="relative shrink-0 w-24 h-24 md:w-full md:h-auto md:aspect-[4/3] bg-[var(--vsr-surface-3)] overflow-hidden border-r md:border-r-0 md:border-b border-[var(--vsr-border)]">
            ${isVideo
            ? `<video src="${thumbUrl}" class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" autoplay loop muted playsinline></video>`
            : `<div class="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style="background-image: url('${thumbUrl}');"></div>`
        }
            <div class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent opacity-80 hidden md:block"></div>
            
            ${badgeHTML}

            ${isLocked ?
            `<div class="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-[1px]">
                <span class="material-icons-round text-white/70 text-xl md:text-3xl md:mb-1">lock</span>
                <span class="hidden md:block text-[9px] font-bold text-white/60 uppercase tracking-widest">LOCKED</span>
                </div>` : ''}
        </div>

        <!-- Phần 2: Nội dung (bên phải trên mobile, bên dưới trên desktop) -->
        <div class="flex-1 min-w-0 flex flex-col justify-center md:justify-start p-3 relative">
            <div class="flex justify-between items-start gap-2">
                <h4 class="text-[var(--vsr-ink-900)] font-bold text-sm leading-5 line-clamp-2 md:min-h-[2.5rem] transition-colors">
                    ${meta.title || "Untitled Card Content"}
                </h4>
                ${meta.desc ?
            `<button class="info-trigger shrink-0 text-[var(--vsr-ink-300)] hover:text-red-500 transition-colors ${showHint ? 'animate-bounce text-amber-500' : ''}" 
                        data-pop-desc="${meta.desc}">
                    <span class="material-icons-round text-base">info</span>
                </button>` : ''}
            </div>
            <div class="mt-2 md:mt-auto md:pt-2 md:border-t border-[var(--vsr-border)]">
                <button class="action-trigger w-full flex justify-between items-center p-2 bg-[var(--vsr-surface-2)] hover:bg-red-600 hover:text-white text-[var(--vsr-ink-700)] text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 border border-[var(--vsr-border)] hover:border-red-600 flex items-center justify-center gap-2 ${isLocked || restricted ? 'pointer-events-none opacity-40' : ''} ${restricted ? 'cursor-not-allowed bg-amber-100' : ''}">
                    ${iconHtml}
                    <span>${restricted ? "RESTRICTED" : (meta.buttonLabel || "SELECT")}</span>
                </button>
            </div>
        </div>
    </div>
    `;
};
