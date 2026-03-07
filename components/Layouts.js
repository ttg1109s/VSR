// Cấu trúc layout lớn cho các màn hình

export const ContactScreenLayout = ({ currentContactId, isMobileView }) => {
    // Logic xác định class hiển thị
    const listPanelClass = `w-full md:w-80 lg:w-96 flex flex-col border-r border-white/5 bg-[#1f1f1f] shrink-0 h-full ${currentContactId && isMobileView ? 'hidden' : 'flex'}`;
    const detailPanelClass = `flex-1 bg-[#151515] flex flex-col h-full relative ${!currentContactId && isMobileView ? 'hidden' : 'flex'}`;
    const emptyStateClass = `${currentContactId ? 'hidden' : 'flex'} w-full h-full flex-col items-center justify-center text-slate-600`;
    const detailViewClass = `${currentContactId ? 'flex' : 'hidden'} w-full h-full flex-col relative`;

    return `
        <div class="flex h-full w-full overflow-hidden bg-[#262626]">
            <!-- Left Panel: Contact List -->
            <div id="contact-list-panel" class="${listPanelClass}">
                <header class="h-16 px-4 flex items-center justify-between border-b border-white/5 shrink-0">
                    <h1 class="text-xl font-bold text-white tracking-tight">Messages</h1>
                    <button id="contact-screen-close" onclick="app.showScreen('game')" class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"><span class="material-icons-round">close</span></button>
                </header>
                <div class="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1" id="contact-list-content"></div>
            </div>

            <!-- Right Panel: Details / Chat -->
            <div id="contact-detail-panel" class="${detailPanelClass}">
                
                <!-- Empty State -->
                <div id="contact-empty-state" class="${emptyStateClass}">
                    <span class="material-icons-round text-6xl mb-4 opacity-20">chat_bubble_outline</span>
                    <span class="text-sm">Select a contact to view threads</span>
                </div>

                <!-- Detail View -->
                <div id="contact-detail-view" class="${detailViewClass}">
                    <header class="h-16 bg-[#202020] border-b border-white/5 flex items-center px-4 justify-between shrink-0 z-10">
                        <div class="flex items-center gap-3">
                            <button id="contact-back-btn" onclick="ui.onContactBackBtn()" class="text-slate-400 hover:text-white"><span class="material-icons-round">arrow_back</span></button>
                            <div class="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold relative overflow-hidden" id="detail-avatar"></div>
                            <div class="cursor-pointer" onclick="ui.toggleDetailInfo()">
                                <h3 class="text-white font-bold text-sm hover:text-blue-400 transition-colors truncate max-w-[200px]" id="detail-title">User</h3>
                                <p class="text-slate-400 text-xs" id="detail-subtitle">Status</p>
                            </div>
                        </div>
                        <button onclick="ui.toggleDetailInfo()" class="text-slate-500 hover:text-white"><span class="material-icons-round">info</span></button>
                    </header>

                    <div class="flex-1 overflow-hidden relative w-full h-full">
                        <!-- Topic List Area -->
                        <div id="thread-list-container" class="absolute inset-0 overflow-y-auto custom-scrollbar p-0 bg-[#151515] hidden"></div>
                        
                        <!-- Chat Area -->
                        <div id="contact-chat-area" class="absolute inset-0 flex flex-col bg-[#101010] hidden">
                            <div id="contact-chat-history" class="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col justify-start gap-3"></div>
                            <div id="contact-chat-footer" class="shrink-0 bg-[#202020] border-t border-white/5 min-h-[70px] flex flex-col justify-end z-30 transition-all duration-300"></div>
                        </div>
                        
                        <!-- Info Overlay -->
                        <div id="contact-info-overlay" class="absolute inset-0 bg-[#1a1a1a] z-20 flex-col p-6 overflow-y-auto custom-scrollbar hidden transform translate-x-full transition-transform duration-300">
                            <h2 class="text-xl font-bold text-white mb-4">Profile</h2>
                            <p id="info-overlay-desc" class="text-slate-400 text-sm mb-6"></p>
                            <div id="info-overlay-stats" class="space-y-4"></div>
                            <div id="info-overlay-relationships"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
};