import { ItemUsageDisplay, ItemStatsDisplay } from './Inventory.js';

// 1. Toolbar: Thanh công cụ nằm trên cùng (File/Edit style)
export const ItemToolbarTemplate = ({ itemName }) => {
    return `
        <div class="w-full h-12 bg-[#202020] border-b border-white/10 flex items-center px-2 justify-between shrink-0 shadow-lg relative z-50">
            <div class="flex items-center gap-1">
                <button id="toolbar-btn-info" class="px-3 py-1.5 rounded text-xs font-bold uppercase text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5">
                    <span class="material-icons-round text-sm">info</span> Info
                </button>
                <div class="w-px h-4 bg-white/10 mx-1"></div>
                <button id="toolbar-btn-stats" class="px-3 py-1.5 rounded text-xs font-bold uppercase text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5">
                    <span class="material-icons-round text-sm">bar_chart</span> Stats
                </button>
                <div class="w-px h-4 bg-white/10 mx-1"></div>
                <!-- Action Button có thêm mũi tên để ám chỉ dropdown -->
                <button id="toolbar-btn-action" class="px-3 py-1.5 rounded text-xs font-bold uppercase text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5">
                    <span class="material-icons-round text-sm">build</span> Thao tác
                    <span class="material-icons-round text-[10px] opacity-50">arrow_drop_down</span>
                </button>
            </div>
            
            <button id="toolbar-close-btn" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors">
                <span class="material-icons-round text-lg">close</span>
            </button>
        </div>
    `;
};

// 2. Info Window: Layout Header (Small Icon + Title) - Body (Desc + Usage)
export const ItemInfoWindow = ({ info, desc }) => {
    const isMat = /^[a-z0-9_]+$/.test(info.icon);
    const iconHtml = isMat
        ? `<span class="material-icons-round text-xl text-amber-500">${info.icon}</span>`
        : `<span class="text-xl font-bold">${info.icon}</span>`;

    // Usage component
    const usageHtml = ItemUsageDisplay({ info });

    return `
        <div class="flex flex-col h-full bg-[#1a1a1a] text-white animate-slide-up-mobile md:animate-fade-in shadow-2xl overflow-hidden rounded-t-xl md:rounded-xl border border-white/10">
            <!-- Header -->
            <header class="flex items-center gap-3 p-4 border-b border-white/10 bg-[#202020] shrink-0">
                <div class="w-8 h-8 rounded bg-black/40 flex items-center justify-center border border-white/5">
                    ${iconHtml}
                </div>
                <h3 class="font-bold text-sm uppercase tracking-wide flex-1 truncate">${info.name}</h3>
                <button class="window-close-btn text-slate-500 hover:text-white"><span class="material-icons-round">expand_more</span></button>
            </header>
            
            <!-- Body -->
            <div class="p-5 overflow-y-auto custom-scrollbar flex-1">
                <div class="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap mb-6 text-justify">
                    ${desc}
                </div>
                
                <!-- Usage Section (Tách biệt khỏi stats) -->
                ${usageHtml}
            </div>
        </div>
    `;
};

// 3. Stats Window: Chỉ hiển thị Stats list hoặc Empty
export const ItemStatsWindow = ({ info }) => {
    const statsHtml = ItemStatsDisplay({ info });

    return `
        <div class="flex flex-col h-full bg-[#1a1a1a] text-white animate-slide-up-mobile md:animate-fade-in shadow-2xl overflow-hidden rounded-t-xl md:rounded-xl border border-white/10">
            <header class="flex items-center justify-between p-4 border-b border-white/10 bg-[#202020] shrink-0">
                <h3 class="font-bold text-sm uppercase tracking-wide text-slate-400 flex items-center gap-2">
                    <span class="material-icons-round text-sm">bar_chart</span> Chỉ số
                </h3>
                <button class="window-close-btn text-slate-500 hover:text-white"><span class="material-icons-round">expand_more</span></button>
            </header>
            <div class="p-4 overflow-y-auto custom-scrollbar flex-1">
                ${statsHtml}
            </div>
        </div>
    `;
};

// 4. Action Dropdown: Menu sổ xuống
export const ItemActionDropdown = ({ isEquipped }) => {
    return `
        <div class="bg-[#252525] border border-white/10 rounded-lg shadow-2xl py-1 w-48 flex flex-col animate-scale-in origin-top-left z-[60]">
            <button id="action-btn-equip" class="w-full text-left px-4 py-3 hover:bg-white/10 flex items-center gap-3 transition-colors group border-b border-white/5">
                <span class="material-icons-round text-slate-400 group-hover:text-white">${isEquipped ? 'back_hand' : 'pan_tool'}</span>
                <div class="flex flex-col">
                    <span class="text-sm font-bold text-slate-200 group-hover:text-white">${isEquipped ? 'Bỏ xuống' : 'Cầm lên'}</span>
                </div>
            </button>
            
            <button id="action-btn-use" class="w-full text-left px-4 py-3 hover:bg-white/10 flex items-center gap-3 transition-colors group ${!isEquipped ? 'opacity-50 grayscale cursor-not-allowed' : ''}">
                <span class="material-icons-round text-slate-400 group-hover:text-amber-400">play_circle</span>
                <div class="flex flex-col">
                    <span class="text-sm font-bold text-slate-200 group-hover:text-white">Sử dụng</span>
                </div>
            </button>
        </div>
    `;
};