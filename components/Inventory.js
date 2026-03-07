// Component cho Item trong lưới Explorer (Inventory Grid)
export const ExplorerItem = ({ id, info, isEquipped, isBroken, isSelected }) => {
    const isMat = /^[a-z0-9_]+$/.test(info.icon);
    const iconHtml = isMat
        ? `<span class="material-icons-round text-4xl text-amber-500 drop-shadow-sm mb-1">${info.icon}</span>`
        : `<span class="text-4xl drop-shadow-sm mb-1 font-bold">${info.icon}</span>`;

    const selectedStyle = isSelected ? 'ring-2 ring-white bg-white/20' : '';

    return `
        <div class="explorer-item ${isEquipped ? 'bg-white/10 border-white/20' : ''} ${isBroken ? 'opacity-40 grayscale' : ''} ${selectedStyle} transition-all duration-200">
            ${isEquipped ? '<div class="absolute top-1 left-1 w-2 h-2 bg-green-500 rounded-full shadow-sm"></div>' : ''}
            ${iconHtml}
            <span class="text-xs text-slate-400 text-center truncate w-full font-medium">${info.name}</span>
            ${isBroken ? '<span class="absolute top-1 right-1 material-icons-round text-red-500 text-xs">broken_image</span>' : ''}
        </div>
    `;
};

// Component cho Item dưới Taskbar (Equipped Bar)
export const TaskbarItem = ({ id, info, isBroken }) => {
    const isMat = /^[a-z0-9_]+$/.test(info.icon);
    const icon = isMat
        ? `<span class="material-icons-round text-sm text-amber-500">${info.icon}</span>`
        : `<span class="text-sm font-bold">${info.icon}</span>`;

    return `
        <div class="h-10 bg-white/10 border border-white/20 rounded flex items-center px-3 gap-2 cursor-pointer transition-colors hover:bg-white/20 shrink-0 ${isBroken ? 'border-red-500/50' : ''}">
            ${icon}
            <span class="text-slate-200 text-xs font-bold truncate max-w-[80px]">${info.name}</span>
        </div>
    `;
};

// Component hiển thị Usage (Độ bền / Hạn mức)
export const ItemUsageDisplay = ({ info }) => {
    if (!info.usage) return '';

    const { current, max, status } = info.usage;
    // current: đã dùng bao nhiêu
    // max: giới hạn hỏng
    // 0 -> Good, Max -> Broken

    // Tính % đã sử dụng
    const pctUsed = max > 0 ? (current / max) * 100 : 0;
    const pctRemaining = Math.max(0, 100 - pctUsed);

    // Cấu hình Status mặc định (Semantics: Remaining % -> High is Good)
    // [Fix] Ensure status is an Array to avoid crashing if it was overwritten by string
    const statusConfig = (status && Array.isArray(status) && status.length > 0)
        ? status
        : [
            [0, 'Hỏng', 'text-red-500', 'bg-red-600'],
            [50, 'Đã dùng', 'text-amber-400', 'bg-amber-500'],
            [90, 'Mới cứng', 'text-green-400', 'bg-green-500']
        ];

    // Tìm status hiện tại
    // Logic: pctRemaining >= threshold
    const sorted = [...statusConfig].sort((a, b) => a[0] - b[0]);
    let activeState = sorted[0]; // Default to lowest threshold

    for (let i = 0; i < sorted.length; i++) {
        if (pctRemaining >= sorted[i][0]) {
            activeState = sorted[i];
        }
    }

    if (!activeState) activeState = [0, 'Unknown', 'text-slate-400', 'bg-slate-500'];
    const label = activeState[1] || 'Unknown';

    let textColor = activeState[2] || 'text-slate-400';
    let barColor = activeState[3] || 'bg-slate-500';

    const isStyle = (str) => str && (str.includes('#') || str.includes('rgb') || str.includes('--'));
    const textAttr = isStyle(textColor) ? `style="color:${textColor}"` : `class="${textColor}"`;

    let barHtml = '';
    if (isStyle(barColor)) {
        barHtml = `<div class="h-full transition-all duration-500" style="width: ${pctRemaining}%; background-color: ${barColor}"></div>`;
    } else {
        barHtml = `<div class="${barColor} h-full transition-all duration-500" style="width: ${pctRemaining}%"></div>`;
    }

    return `
        <div class="mb-4 p-3 bg-white/5 rounded-lg border border-white/5">
            <div class="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2 flex justify-between">
                <span>Hạn mức sử dụng</span>
                <span ${textAttr}>${label} (${Math.round(pctUsed)}%)</span>
            </div>
            <div class="w-full bg-black/50 h-2 rounded-full overflow-hidden mb-1 border border-white/5">
                ${barHtml}
            </div>
            <div class="text-[10px] text-slate-600 text-right mt-1 font-mono">${current} / ${max} lần</div>
        </div>`;
};

// Component hiển thị Stats (Chỉ số) - Tách biệt hoàn toàn
export const ItemStatsDisplay = ({ info }) => {
    if (!info.stats || Object.keys(info.stats).length === 0) {
        return `<div class="flex flex-col items-center justify-center h-40 text-slate-500 italic text-xs">
            <span class="material-icons-round text-3xl mb-2 opacity-20">bar_chart</span>
            Không có chỉ số đặc biệt.
        </div>`;
    }

    let html = `<div class="space-y-2">`;
    for (const [key, val] of Object.entries(info.stats)) {
        const hasColor = val.color && val.color.startsWith('#');
        const bgStyle = hasColor ? `background-color: ${val.color};` : '';
        const barClass = hasColor ? '' : 'bg-blue-600';

        const pct = val.max > 0 ? (val.current / val.max * 100) : 0;
        const displayLabel = val.label || key;

        html += `
            <div class="flex items-center justify-between p-3 bg-white/5 rounded border border-white/5">
            <span class="text-slate-300 text-xs font-bold capitalize">${displayLabel}</span>
            <div class="flex flex-col items-end w-1/2">
                <span class="text-white text-xs font-mono mb-1 opacity-90">${val.current}${val.max > 0 ? '/' + val.max : ''}</span>
                ${val.max > 0 ? `
                <div class="w-full bg-black/50 h-1.5 rounded-full overflow-hidden">
                    <div class="h-full ${barClass}" style="width: ${pct}%; ${bgStyle}"></div>
                </div>` : ''}
            </div>
            </div>`;
    }
    html += `</div>`;
    return html;
};