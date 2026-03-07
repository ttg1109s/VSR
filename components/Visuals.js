// Các hiệu ứng hình ảnh, badge, overlay nhỏ

export const TimerDisplayTemplate = () => {
    return `
        <div class="bg-amber-600/90 text-white font-mono font-bold text-xl px-4 py-1 rounded shadow-lg border border-amber-400/30 flex items-center gap-2 backdrop-blur-sm animate-pulse">
            <span class="material-icons-round text-lg animate-spin" style="animation-duration: 3s;">hourglass_empty</span>
            <span id="game-timer-text">00:00</span>
        </div>
    `;
};

export const ActionCooldownOverlay = ({ end, total }) => {
    return `
        <div class="action-cooldown-overlay absolute inset-0 bg-black/80 z-20 flex items-end justify-center pointer-events-none cd-overlay" 
             data-end="${end}" 
             data-total="${total}">
            <div class="absolute inset-0 bg-blue-600/20 cd-bar" style="height: 100%; width: 100%; align-self: flex-end;"></div>
            <span class="text-white font-bold text-2xl font-mono cd-text relative mb-12 animate-pulse">Wait...</span>
        </div>
    `;
};

export const PlayerFakerBadge = () => {
    return `
        <div class="inline-flex items-center gap-2 ml-2 relative">
            <span class="relative flex h-3 w-3">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span class="text-[10px] font-bold text-red-400 uppercase tracking-widest border border-red-500/30 px-1.5 py-0.5 rounded bg-red-900/20">
                Faker Mode
            </span>
        </div>
    `;
};

export const PlayerNameDisplay = ({ name, badgeHtml }) => {
    return `
        <div class="flex items-center">
            <span>${name}</span>
            ${badgeHtml}
        </div>
    `;
};