// Item trong danh sách liên hệ (Contact List)
export const ContactRow = ({ cid, name, unreadCount, preview, timeDisplay, isActive, avatarHtml }) => {
    return `
        <div class="relative">
            ${avatarHtml}
            ${unreadCount > 0 ? `<div class="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full border-2 border-[#1f1f1f] shadow-sm flex items-center justify-center text-[9px] font-bold text-white px-1">${unreadCount}</div>` : ''}
        </div>
        <div class="flex-1 min-w-0">
            <div class="flex justify-between items-baseline mb-0.5">
                <span class="text-sm font-bold ${unreadCount > 0 ? 'text-white' : 'text-slate-200'} truncate mr-2">${name}</span>
                <span class="text-[10px] text-slate-500 whitespace-nowrap">${timeDisplay}</span>
            </div>
            <p class="text-xs text-slate-500 truncate ${unreadCount > 0 ? 'font-bold text-slate-300' : ''}">${preview}</p>
        </div>
    `;
};

// Item hiển thị mối quan hệ (Details Overlay)
export const RelationshipRow = ({ targetId, displayName, initials, relTag, isPlayer }) => {
    // Falls back to checking targetId if isPlayer not explicitly provided, but caller should provide it for safety
    const isP = isPlayer !== undefined ? isPlayer : (targetId === 'player');
    return `
        <div class="w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${isP ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-white/10 text-slate-400'}">
            ${initials}
        </div>
        <div class="min-w-0 w-full flex justify-between items-center">
            <div class="text-md truncate leading-tight">${displayName}</div>
            <div class="text-[10px] text-blue-400 uppercase tracking-wide truncate mt-0.5">${relTag}</div>
        </div>
    `;
};

// Item danh sách chủ đề (Thread List)
export const ThreadRow = ({ t, timeStr }) => {
    return `
        <div class="w-10 h-10 rounded-full ${t.isUnread ? 'bg-blue-600 text-white' : 'bg-[#252525] text-slate-500'} flex items-center justify-center shrink-0 mt-1">
            <span class="material-icons-round text-lg">${t.isUnread ? 'mark_chat_unread' : 'chat_bubble_outline'}</span>
        </div>
        <div class="flex-1 min-w-0">
            <div class="flex justify-between items-baseline mb-1">
                <h4 class="text-sm font-bold ${t.isUnread ? 'text-white' : 'text-slate-300'} truncate pr-2">${t.title}</h4>
                <span class="text-[10px] text-slate-500 whitespace-nowrap">${timeStr}</span>
            </div>
            <p class="text-xs text-slate-400 truncate line-clamp-2 leading-relaxed group-hover:text-slate-300 transition-colors">${t.preview}</p>
        </div>
        ${t.isUnread ? '<div class="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0"></div>' : ''}
    `;
};