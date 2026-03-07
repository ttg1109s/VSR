// Thanh Input mặc định (Tap to continue)
export const ChatInputBar = () => {
    return `
        <div class="flex-1 bg-[#151515] h-10 rounded-full px-4 flex items-center text-slate-500 text-sm border border-white/5 group-hover:bg-[#1a1a1a] transition-colors shadow-inner">
            <span class="mr-2 text-green-500 text-xs">●</span> 
            <span class="italic">Tap to continue...</span>
        </div>
        <button class="w-10 h-10 rounded-full bg-blue-600/20 text-blue-500 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all">
            <span class="material-icons-round text-lg">send</span>
        </button>
    `;
};

// Nút chọn lựa chọn hội thoại
export const ChatChoiceItem = ({ text, isLocked }) => {
    return `
        <span class="font-medium line-clamp-2">${text}</span>
        ${isLocked 
            ? '<span class="material-icons-round text-xs opacity-50">lock</span>' 
            : '<span class="material-icons-round text-xs opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all">send</span>'
        }
    `;
};