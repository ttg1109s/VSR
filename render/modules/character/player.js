import { API } from '../../../api/index.js';
import { StatBar } from '../../../components/Common.js';
import { PlayerFakerBadge, PlayerNameDisplay } from '../../../components/Visuals.js';

export const PlayerMethods = {
    renderPlayerCard() {
        const chars = API.engine.state.getCharacters();
        const entryChar = API.engine.state.meta?.entryCharacter || 'player';
        const p = chars ? chars[entryChar] : null;

        const container = document.getElementById('player-card-stats');
        if (!p || !container) return;

        const nameEl = document.getElementById('player-card-name');
        const fakerState = API.engine.state.getFakerState();
        const isFakerActive = fakerState && fakerState.active;

        const badgeHtml = isFakerActive ? PlayerFakerBadge() : '';

        if (nameEl) {
            // [FIX V9.2] Strict Schema: meta.name
            const pName = p.meta?.name || "Player";

            nameEl.innerHTML = PlayerNameDisplay({
                name: pName,
                badgeHtml: badgeHtml
            });
        }

        container.innerHTML = '';
        if (p.stats) {
            Object.keys(p.stats).forEach(k => {
                const s = p.stats[k];
                container.innerHTML += StatBar({ key: k, s: s });
            });
        }
    },
    updatePlayerCard() { const m = document.getElementById('player-card-modal'); if (m && !m.classList.contains('hidden')) this.renderPlayerCard(); },
    openPlayerCard() { this.renderPlayerCard(); const m = document.getElementById('player-card-modal'); if (!m) return; m.classList.remove('hidden'); setTimeout(() => m.querySelector('.transform').classList.remove('translate-y-full'), 10); },
    closePlayerCard() { const m = document.getElementById('player-card-modal'); if (!m) return; m.querySelector('.transform').classList.add('translate-y-full'); setTimeout(() => m.classList.add('hidden'), 300); }
};