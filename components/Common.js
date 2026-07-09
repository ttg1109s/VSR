import { StatStyles } from '../render/modules/character/utils.js';

// Item trong danh sách Faker (Nhập hồn)
export const FakerRow = ({ name, initials }) => {
    return `
        <div class="w-10 h-10 rounded-full bg-purple-100 border border-purple-300 flex items-center justify-center text-purple-700 font-bold">${initials}</div>
        <div class="flex-1 min-w-0">
            <h4 class="text-[var(--vsr-ink-900)] font-bold text-sm">${name}</h4>
            <p class="text-[10px] text-[var(--vsr-ink-400)] uppercase tracking-wide">Nhập hồn</p>
        </div>
        <span class="material-icons-round text-[var(--vsr-ink-400)]">chevron_right</span>
    `;
};

// Alert nổi khi gặp nhân vật
export const MeetingAlertBubble = ({ initial, name, colorClass }) => {
    return `
        <div class="relative w-16 h-16 rounded-full bg-white border-2 ${colorClass} flex items-center justify-center shadow-lg animate-wave-pulse">
            <span class="text-[var(--vsr-ink-900)] font-bold text-2xl">${initial}</span>
            <div class="absolute -bottom-6 bg-black/80 px-2 py-0.5 rounded text-[10px] text-white whitespace-nowrap border border-white/10">${name}</div>
        </div>
    `;
};

// Thanh chỉ số chung (Dùng cho Player Card, Info Overlay)
export const StatBar = ({ key, s }) => {
    const pct = s.max > 0 ? Math.min(100, Math.max(0, (s.current/s.max)*100)) : 0;
    let colorStyle = ''; let bgClass = 'bg-blue-500'; let icon = 'bolt';
    
    if (s.color && s.color.startsWith('#')) { 
        colorStyle = `background-color: ${s.color}`; 
        bgClass = ''; 
    } else { 
        const style = StatStyles[key] || StatStyles.default; 
        bgClass = style.bgClass; 
        icon = style.icon; 
    }
    
    const displayLabel = s.label || key;

    return `
        <div>
            <div class="flex justify-between items-center mb-1">
                <div class="flex items-center gap-2">
                    <span class="material-icons-round text-[var(--vsr-ink-400)] text-sm">${icon}</span>
                    <span class="text-sm font-bold text-[var(--vsr-ink-400)] uppercase tracking-wide">${displayLabel}</span>
                </div>
                <span class="text-sm font-bold text-[var(--vsr-ink-900)]">${s.current} <span class="text-[var(--vsr-ink-400)] text-xs">/ ${s.max}</span></span>
            </div>
            <div class="w-full bg-[var(--vsr-surface-2)] h-2 rounded-full overflow-hidden border border-[var(--vsr-border)]">
                <div class="${bgClass} h-full transition-all duration-500 shadow-sm" style="width: ${pct}%; ${colorStyle}"></div>
            </div>
        </div>
    `;
};

// Thông tin kịch bản (Meta Details) — dạng khối kiểu "Information" của App Store:
// icon nhỏ + nhãn + giá trị.
export const ScriptInfoMeta = ({ label, value, icon }) => {
    return `
        ${icon ? `<span class="material-icons-round meta-icon">${icon}</span>` : ''}
        <div class="meta-label">${label}</div>
        <div class="meta-value">${value}</div>
    `;
};

export const ScriptTag = ({ tag }) => {
    return `<span class="px-2 py-1 rounded bg-[var(--vsr-surface-2)] border border-[var(--vsr-border)] text-[10px] uppercase text-[var(--vsr-ink-500)] font-bold tracking-wider">${tag}</span>`;
};