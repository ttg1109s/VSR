// htdocs/components/ChatBubble.js

export const ChatBubble = ({ isPlayer, displayName, text, avatar }) => {
    const bubbleClass = isPlayer 
        ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm' 
        : 'bg-[#2a2a2a] text-slate-200 border border-white/5 rounded-2xl rounded-bl-sm';

    return `
        <div class="flex w-full mb-3 ${isPlayer ? 'justify-end' : 'justify-start'} animate-fade-in">
            ${!isPlayer ? avatar : ''}
            <div class="max-w-[80%] ${bubbleClass} px-3.5 py-2.5 shadow-sm flex flex-col relative group">
                ${!isPlayer ? `<span class="text-[9px] text-slate-500 font-bold mb-1 ml-0.5 uppercase tracking-wide hidden group-hover:block transition-all">${displayName}</span>` : ''}
                <span class="text-sm leading-relaxed whitespace-pre-wrap font-sans">${text}</span>
            </div>
        </div>
    `;
};