import { ToastComponent, NotificationRow } from '../../components/Notification.js';
import { FakerRow } from '../../components/Common.js';

export const commonMethods = {
    injectAnimationStyles() {
        if (document.getElementById('custom-animations')) return;
        const style = document.createElement('style');
        style.id = 'custom-animations';
        style.innerHTML = `
            @keyframes floatRandom {
                0% { transform: translate(0, 0); }
                25% { transform: translate(10px, -15px); }
                50% { transform: translate(-5px, 10px); }
                75% { transform: translate(-10px, -5px); }
                100% { transform: translate(0, 0); }
            }
            @keyframes wavePulse {
                0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); }
                70% { box-shadow: 0 0 0 20px rgba(255, 255, 255, 0); }
                100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
            }
            .animate-float-random { animation: floatRandom 6s ease-in-out infinite; }
            .animate-wave-pulse { animation: wavePulse 2s infinite; }
            .cd-overlay { transition: height 0.1s linear; will-change: height; }
        `;
        document.head.appendChild(style);
    },

    // --- Notifications ---
    ensureToastContainer() {
        let tc = document.getElementById('toast-container');
        if (!tc) {
            tc = document.createElement('div');
            tc.id = 'toast-container';
            tc.className = "fixed bottom-20 right-4 flex flex-col gap-2 pointer-events-none";
            tc.style.zIndex = "1000";
            document.body.appendChild(tc);
        } else { tc.style.zIndex = "1000"; }
    },

    showTransientToast(title, msg, type) {
        this.ensureToastContainer();
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');

        let bgClass = 'bg-blue-600';
        if (type === 'success') bgClass = 'bg-green-600';
        if (type === 'danger') bgClass = 'bg-red-600';
        if (type === 'warn') bgClass = 'bg-amber-600';

        toast.className = `flex items-center gap-3 p-3 rounded-lg shadow-lg text-white transform transition-all duration-300 translate-x-full opacity-0 ${bgClass} w-72 backdrop-blur-md bg-opacity-90 border border-white/10`;

        toast.innerHTML = ToastComponent({ title, msg, type });

        container.appendChild(toast);

        requestAnimationFrame(() => { toast.classList.remove('translate-x-full', 'opacity-0'); });
        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-2');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    addNotification(title, msg, type) {
        this.showTransientToast(title, msg, type);
        const notif = { id: Date.now(), time: Date.now(), title: title, msg: msg, type: type };
        this.notifications.unshift(notif);
        if (this.notifications.length > 50) this.notifications.pop();

        const panel = document.getElementById('notify-panel');
        if (panel && panel.classList.contains('hidden-panel')) {
            const badge = document.getElementById('notify-badge');
            if (badge) badge.classList.remove('hidden');
        } else {
            this.renderNotifications();
        }
    },

    renderNotifications() {
        const container = document.getElementById('notify-list');
        if (!container) return;
        container.innerHTML = '';
        if (this.notifications.length === 0) {
            container.innerHTML = `<div class=\"text-center py-8 text-slate-500 text-xs italic\">No notifications</div>`;
            return;
        }
        const now = Date.now();
        this.notifications.forEach(n => {
            const el = document.createElement('div');
            el.className = `notify-item cursor-default hover:bg-white/5 transition-colors`;
            let icon = 'notifications'; let color = 'text-blue-400';
            if (n.type === 'success') { icon = 'check_circle'; color = 'text-green-400'; }
            else if (n.type === 'danger') { icon = 'error'; color = 'text-red-400'; }
            else if (n.type === 'warn') { icon = 'warning'; color = 'text-amber-400'; }

            const diff = Math.floor((now - n.time) / 1000);
            let timeStr = 'Just now';
            if (diff > 60) timeStr = `${Math.floor(diff / 60)}m ago`;
            if (diff > 3600) timeStr = `${Math.floor(diff / 3600)}h ago`;

            el.innerHTML = NotificationRow({ n, timeStr, color, icon });
            container.appendChild(el);
        });
    },

    clearAllNotifications() {
        this.notifications = [];
        this.renderNotifications();
    },

    removeNotification(id, e) {
        if (e) e.stopPropagation();
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.renderNotifications();
    },

    toggleNotifications() {
        const panel = document.getElementById('notify-panel');
        const badge = document.getElementById('notify-badge');
        if (!panel) return;

        panel.classList.toggle('hidden-panel');
        if (!panel.classList.contains('hidden-panel')) {
            if (badge) badge.classList.add('hidden');
            panel.style.zIndex = "1001";
        }
        this.renderNotifications();
    },

    // --- Alerts ---
    showAlert(t, m, type) {
        const box = document.getElementById('alert-box');
        const modal = document.getElementById('alert-modal');
        if (!box || !modal) return;

        document.getElementById('alert-title').innerText = t;
        document.getElementById('alert-msg').innerText = m;
        const icon = document.getElementById('alert-icon');
        icon.className = `material-icons-round text-4xl mb-3 block ${type === 'danger' ? 'text-red-500' : type === 'success' ? 'text-green-500' : 'text-blue-500'}`;
        icon.innerText = type === 'danger' ? 'error_outline' : type === 'success' ? 'check_circle_outline' : 'info_outline';

        modal.style.zIndex = "999";
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.replace('opacity-0', 'opacity-100');
            box.classList.replace('scale-95', 'scale-100');
        }, 10);
    },

    closeAlert() {
        const m = document.getElementById('alert-modal');
        if (!m) return;
        m.classList.replace('opacity-100', 'opacity-0');
        document.getElementById('alert-box').classList.replace('scale-100', 'scale-95');
        setTimeout(() => m.classList.add('hidden'), 300);
    },

    // --- ReadMore Modal ---
    ensureReadMoreModal() {
        if (document.getElementById('readmore-overlay')) return;
        const div = document.createElement('div');
        div.id = 'readmore-overlay';
        div.className = "fixed inset-0 bg-black/90 z-[1100] hidden flex items-center justify-center p-6 opacity-0 transition-opacity duration-300";
        div.innerHTML = `
            <div class="max-w-lg w-full max-h-[80vh] bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden flex flex-col shadow-2xl transform scale-95 transition-transform duration-300" id="readmore-box">
                <div class="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h3 class="text-white font-bold text-lg" id="readmore-title">Details</h3>
                    <button onclick="ui.closeReadMore()" class="text-slate-400 hover:text-white"><span class="material-icons-round">close</span></button>
                </div>
                <div class="p-6 overflow-y-auto custom-scrollbar">
                    <p class="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap" id="readmore-content"></p>
                </div>
            </div>`;
        document.body.appendChild(div);
    },

    openReadMore(title, content) {
        const ov = document.getElementById('readmore-overlay');
        const box = document.getElementById('readmore-box');
        if (!ov) return;
        document.getElementById('readmore-title').innerText = title;
        document.getElementById('readmore-content').innerText = content;
        ov.classList.remove('hidden');
        setTimeout(() => { ov.classList.remove('opacity-0'); box.classList.replace('scale-95', 'scale-100'); }, 10);
    },

    closeReadMore() {
        const ov = document.getElementById('readmore-overlay');
        const box = document.getElementById('readmore-box');
        if (!ov) return;
        ov.classList.add('opacity-0');
        box.classList.replace('scale-100', 'scale-95');
        setTimeout(() => ov.classList.add('hidden'), 300);
    },

    // --- Faker Modal ---
    ensureFakerModal() {
        if (document.getElementById('faker-overlay')) return;
        const div = document.createElement('div');
        div.id = 'faker-overlay';
        div.className = "fixed inset-0 bg-black/90 z-[1300] hidden flex items-center justify-center p-4 opacity-0 transition-opacity duration-300";
        div.innerHTML = `
            <div class="max-w-md w-full max-h-[70vh] bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden flex flex-col shadow-2xl transform scale-95 transition-transform duration-300" id="faker-box">
                <div class="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h3 class="text-white font-bold text-lg flex items-center gap-2">
                        <span class="material-icons-round text-purple-400">face_retouching_natural</span>
                        Chọn đối tượng
                    </h3>
                    <button onclick="ui.closeFakerModal()" class="text-slate-400 hover:text-white"><span class="material-icons-round">close</span></button>
                </div>
                <div class="p-2 overflow-y-auto custom-scrollbar flex-1" id="faker-list"></div>
            </div>`;
        document.body.appendChild(div);
    },

    renderFakerSelection(list) {
        const ov = document.getElementById('faker-overlay');
        const box = document.getElementById('faker-box');
        const listContainer = document.getElementById('faker-list');
        listContainer.innerHTML = '';

        list.forEach(cid => {
            const char = engine.state.characters[cid];
            // [FIX V9.2] Strict Schema: meta.name
            const name = char.meta?.name || "Unknown";
            const initials = name.substring(0, 1).toUpperCase();

            const el = document.createElement('div');
            el.className = "p-3 m-1 rounded-lg flex items-center gap-3 cursor-pointer hover:bg-white/10 border border-transparent hover:border-white/10 transition-colors bg-[#252525]";

            el.innerHTML = FakerRow({ name, initials });

            el.onclick = () => {
                this.closeFakerModal();
                engine.applyEffect({ type: 'faker', subtype: 'swap', target: cid }, { sceneId: engine.state.sceneId });
            };
            listContainer.appendChild(el);
        });

        ov.classList.remove('hidden');
        setTimeout(() => { ov.classList.remove('opacity-0'); box.classList.replace('scale-95', 'scale-100'); }, 10);
    },

    closeFakerModal() {
        const ov = document.getElementById('faker-overlay');
        const box = document.getElementById('faker-box');
        if (!ov) return;
        ov.classList.add('opacity-0');
        box.classList.replace('scale-100', 'scale-95');
        setTimeout(() => ov.classList.add('hidden'), 300);
    },

    // --- Timer ---
    ensureTimerDisplay() {
        if (document.getElementById('game-timer')) return;
        const div = document.createElement('div');
        div.id = 'game-timer';
        div.className = "fixed top-20 left-1/2 transform -translate-x-1/2 z-40 hidden flex flex-col items-center pointer-events-none";
        div.innerHTML = `
            <div class="bg-amber-600/90 text-white font-mono font-bold text-xl px-4 py-1 rounded shadow-lg border border-amber-400/30 flex items-center gap-2 backdrop-blur-sm animate-pulse">
                <span class="material-icons-round text-lg animate-spin" style="animation-duration: 3s;">hourglass_empty</span>
                <span id="game-timer-text">00:00</span>
            </div>`;
        document.body.appendChild(div);
    },

    updateTimer(text) {
        const t = document.getElementById('game-timer');
        if (t) {
            t.classList.remove('hidden');
            document.getElementById('game-timer-text').innerText = text;
        }
    },

    hideTimer() {
        const t = document.getElementById('game-timer');
        if (t) t.classList.add('hidden');
    }
};