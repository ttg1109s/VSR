import { timeAgo } from '../utils.js?v=2';
import { ContactRow } from '../../../../components/Contact.js';

export const ContactList = {
    render(ui) {
        const listContainer = document.getElementById('contact-list-content');
        if (!listContainer) return;
        listContainer.innerHTML = '';

        // 1. Render "You" (Entry Character)
        const entryChar = engine.state.meta?.entryCharacter || 'player';
        const pChar = engine.state.characters[entryChar];

        // [FIX V9.2] Strict Schema: meta.name
        const pName = pChar ? (pChar.meta?.name || 'You') : 'You';

        const playerItem = document.createElement('div');
        playerItem.className = `p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-colors ${ui.currentContactId === entryChar ? 'bg-[var(--vsr-tint-10)] border border-[var(--vsr-border)]' : 'hover:bg-[var(--vsr-tint-05)] border border-transparent'}`;

        playerItem.innerHTML = ContactRow({
            cid: entryChar,
            name: pName,
            unreadCount: 0,
            preview: 'Personal Stats',
            timeDisplay: '',
            isActive: ui.currentContactId === entryChar,
            isPlayer: true,
            avatarHtml: `<div class="w-12 h-12 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-700 font-bold">P</div>`
        });

        playerItem.onclick = () => {
            if (engine.chatState && engine.chatState.blocking) return;
            ui.selectContact(entryChar);
        };
        listContainer.appendChild(playerItem);

        const sep = document.createElement('div'); sep.className = "h-px bg-[var(--vsr-border)] my-2 mx-2"; listContainer.appendChild(sep);

        // 2. Render Spam/Unknown
        const spamThreads = engine.getThreads('spam');
        if (spamThreads.length > 0) {
            const isActive = ui.currentContactId === 'spam';
            const unreadCount = spamThreads.filter(t => t.isUnread).length;
            const latestTime = spamThreads.length > 0 ? spamThreads[0].time : 0;

            const spamEl = document.createElement('div');
            spamEl.className = `p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-colors group ${isActive ? 'bg-[var(--vsr-tint-10)] border-[var(--vsr-border)]' : 'hover:bg-[var(--vsr-tint-05)] border-transparent'} border relative mb-2`;

            spamEl.innerHTML = ContactRow({
                cid: 'spam',
                name: 'Unknown',
                unreadCount: unreadCount,
                preview: `${spamThreads.length} signals`,
                timeDisplay: timeAgo(latestTime),
                isActive: isActive,
                isPlayer: false,
                avatarHtml: `<div class="w-12 h-12 rounded-full bg-[var(--vsr-surface-2)] flex items-center justify-center text-[var(--vsr-ink-400)] font-bold border border-[var(--vsr-border)] border-dashed group-hover:border-[var(--vsr-border-strong)] transition-colors">?</div>`
            });

            spamEl.onclick = () => {
                if (engine.chatState.blocking) return;
                ui.selectContact('spam');
            };
            listContainer.appendChild(spamEl);
        }

        // 3. Render NPCs
        const chars = engine.state.characters;
        const validChars = Object.keys(chars).filter(k => {
            if (k === entryChar) return false;
            // [Check Schema]
            if (!chars[k]) return false;

            if (engine.state.faker.active && k === engine.state.faker.targetId) return false;

            // Kiểm tra list 'met'
            const viewer = chars[entryChar];
            const metList = (viewer && Array.isArray(viewer.met)) ? viewer.met : [];

            const isMet = metList.some(item => {
                const parts = item.split(':');
                return parts[0] === k;
            });

            const threads = engine.getThreads(k);
            return isMet || threads.length > 0;
        });

        // Logic Sort
        validChars.sort((a, b) => {
            const threadsA = engine.getThreads(a);
            const threadsB = engine.getThreads(b);

            const hasUnreadA = threadsA.some(t => t.isUnread);
            const hasUnreadB = threadsB.some(t => t.isUnread);

            if (hasUnreadA && !hasUnreadB) return -1;
            if (!hasUnreadA && hasUnreadB) return 1;

            const timeA = threadsA.length > 0 ? threadsA[0].time : 0;
            const timeB = threadsB.length > 0 ? threadsB[0].time : 0;
            return timeB - timeA;
        });

        validChars.forEach(cid => {
            const char = chars[cid];

            // [FIX V9.2] Strict Schema: meta.name
            const name = char.meta?.name || "Unknown";
            const desc = char.meta?.desc;

            const threads = engine.getThreads(cid);
            const isActive = ui.currentContactId === cid;

            let preview = "No messages";
            let timeDisplay = "";
            let unreadCount = 0;

            if (threads.length > 0) {
                preview = `${threads.length} topics`;
                timeDisplay = timeAgo(threads[0].time);
                unreadCount = threads.filter(t => t.isUnread).length;
            } else if (desc) {
                preview = "New contact";
            }

            const el = document.createElement('div');
            el.className = `p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-colors group ${isActive ? 'bg-[var(--vsr-tint-10)] border-[var(--vsr-border)]' : 'hover:bg-[var(--vsr-tint-05)] border-transparent'} border relative`;

            el.innerHTML = ContactRow({
                cid: cid,
                name: name,
                unreadCount: unreadCount,
                preview: preview,
                timeDisplay: timeDisplay,
                isActive: isActive,
                avatarHtml: `<div class="w-12 h-12 rounded-full bg-[var(--vsr-surface-3)] flex items-center justify-center text-[var(--vsr-ink-700)] font-bold border border-[var(--vsr-border)] group-hover:border-[var(--vsr-border-strong)] transition-colors">${(name && name.length > 0) ? name.charAt(0) : '?'}</div>`
            });

            el.onclick = () => {
                if (engine.chatState.blocking) return;
                ui.selectContact(cid);
            };
            listContainer.appendChild(el);
        });
    }
};