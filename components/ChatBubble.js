// htdocs/components/ChatBubble.js

export const ChatBubble = ({ isPlayer, displayName, text, avatar }) => {
    const bubbleClass = isPlayer 
        ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm' 
        : 'bg-[var(--vsr-surface-2)] text-[var(--vsr-ink-900)] border border-[var(--vsr-border)] rounded-2xl rounded-bl-sm';

    return `
        <div class="flex w-full mb-3 ${isPlayer ? 'justify-end' : 'justify-start'} animate-fade-in">
            ${!isPlayer ? avatar : ''}
            <div class="max-w-[80%] ${bubbleClass} px-3.5 py-2.5 shadow-sm flex flex-col relative group">
                ${!isPlayer ? `<span class="text-[9px] text-[var(--vsr-ink-400)] font-bold mb-1 ml-0.5 uppercase tracking-wide hidden group-hover:block transition-all">${displayName}</span>` : ''}
                <span class="text-sm leading-relaxed whitespace-pre-wrap font-sans">${text}</span>
            </div>
        </div>
    `;
};