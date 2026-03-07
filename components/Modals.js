// Các khung Modal (Popup) của giao diện

export const ReadMoreModalTemplate = () => {
    return `
        <div class="max-w-lg w-full max-h-[80vh] bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden flex flex-col shadow-2xl transform scale-95 transition-transform duration-300" id="readmore-box">
            <div class="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                <h3 class="text-white font-bold text-lg" id="readmore-title">Details</h3>
                <button onclick="ui.closeReadMore()" class="text-slate-400 hover:text-white"><span class="material-icons-round">close</span></button>
            </div>
            <div class="p-6 overflow-y-auto custom-scrollbar">
                <p class="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap" id="readmore-content"></p>
            </div>
        </div>
    `;
};

export const FakerModalTemplate = () => {
    return `
        <div class="max-w-md w-full max-h-[70vh] bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden flex flex-col shadow-2xl transform scale-95 transition-transform duration-300" id="faker-box">
            <div class="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                <h3 class="text-white font-bold text-lg flex items-center gap-2">
                    <span class="material-icons-round text-purple-400">face_retouching_natural</span>
                    Chọn đối tượng
                </h3>
                <button onclick="ui.closeFakerModal()" class="text-slate-400 hover:text-white"><span class="material-icons-round">close</span></button>
            </div>
            <div class="p-2 overflow-y-auto custom-scrollbar flex-1" id="faker-list"></div>
        </div>
    `;
};

export const ActionInfoModalTemplate = () => {
    return `
        <div class="max-w-md w-full bg-[#151515] border border-white/10 rounded-lg shadow-2xl transform scale-95 transition-transform duration-300 flex flex-col" id="action-info-box">
            <div class="p-5 flex justify-between items-start">
                <h3 class="text-white font-bold text-xl leading-tight pr-4" id="action-info-title">Action Title</h3>
                <button onclick="ui.closeActionDetail()" class="text-slate-500 hover:text-white transition-colors bg-white/5 rounded-full p-1"><span class="material-icons-round text-lg">close</span></button>
            </div>
            <div class="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent w-full"></div>
            <div class="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
                <p class="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap" id="action-info-desc">Description content...</p>
            </div>
        </div>
    `;
};