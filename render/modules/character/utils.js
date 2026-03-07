import { MeetingAlertBubble } from '../../../components/Common.js';

export const timeAgo = (date) => {
    if (!date) return "";
    const seconds = Math.floor((Date.now() - date) / 1000);
    if (seconds < 60) return "Just now";
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m";
    return Math.floor(seconds) + "s";
};

export const StatStyles = {
    hp: { bgClass: 'bg-rose-500', icon: 'favorite' },
    sanity: { bgClass: 'bg-violet-500', icon: 'psychology' },
    ammo: { bgClass: 'bg-amber-500', icon: 'whatshot' },
    default: { bgClass: 'bg-blue-500', icon: 'bolt' }
};

export const AlertMethods = {
    showMeetingAlert(charId, type = 'notice') {
        const char = engine.state.characters[charId];
        if (!char) return;
        if (engine.state.faker.active && charId === engine.state.faker.targetId) return;

        if (document.getElementById(`char-footer-item-${charId}`)) return;

        const container = document.getElementById('rp-footer');
        if (!container) return;

        const colors = { 'danger': 'border-red-500 shadow-red-500/50 text-red-100', 'warning': 'border-amber-500 shadow-amber-500/50 text-amber-100', 'success': 'border-green-500 shadow-green-500/50 text-green-100', 'notice': 'border-blue-500 shadow-blue-500/50 text-blue-100' };
        const colorClass = colors[type] || colors['notice'];

        // [FIX V9.2] Strict Schema: meta.name
        const charName = char.meta?.name || "?";
        const initial = charName.charAt(0).toUpperCase();

        const item = document.createElement('div');
        item.id = `char-footer-item-${charId}`;
        item.className = `w-10 h-10 rounded-full bg-[#1a1a1a] border-2 ${colorClass} flex items-center justify-center text-sm font-bold shadow-lg shrink-0 cursor-pointer hover:scale-105 transition-transform select-none relative group animate-fade-in`;

        item.innerHTML = `
            ${initial}
            <div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 backdrop-blur text-[10px] text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10 z-50">
                ${charName}
            </div>
        `;

        item.onclick = () => {
            if (window.ui && window.ui.openContactChat) {
                window.ui.switchScreen('character');
                window.ui.openContactChat(charId);
            }
        };

        container.appendChild(item);
    },

    hideMeetingAlert(charId) {
        const el = document.getElementById(`char-footer-item-${charId}`);
        if (el) {
            el.classList.add('scale-0', 'opacity-0');
            setTimeout(() => el.remove(), 200);
        }
    }
};