import { BaseStrategy } from './BaseStrategy.js';
import { SwitchTemplate } from '../../../components/PasswordUI.js';

export class SwitchStrategy extends BaseStrategy {
    init() {
        this.internalState = Array(this.config.length).fill(0);
    }

    getHTML() {
        return SwitchTemplate(this.config);
    }

    postRender() {
        super.postRender();
        this.internalState.forEach((val, i) => this._updateSwitchVisual(i, val));
    }

    handleClick(e, target) {
        const track = target.closest('.switch-track');
        if (track) {
            const rect = track.getBoundingClientRect();
            // Calculate position from bottom
            const yFromBottom = rect.bottom - e.clientY;
            let percent = yFromBottom / rect.height;
            if (percent < 0) percent = 0;
            if (percent > 1) percent = 1;

            let level = Math.floor(percent * 10);
            if (level >= 10) level = 10;

            const idx = parseInt(track.dataset.index);
            this._setSwitch(idx, level);
            return true;
        }
        return false;
    }

    _setSwitch(idx, level) {
        this.internalState[idx] = level;
        this._updateSwitchVisual(idx, level);
    }

    _updateSwitchVisual(idx, level) {
        const swUnits = this.container.querySelectorAll('.switch-unit');
        if (!swUnits[idx]) return;

        const container = swUnits[idx];
        const handle = container.querySelector('.switch-handle');
        const valText = container.querySelector(`#sw-val-${idx}`);
        const light = container.querySelector(`#sw-light-${idx}`);


        const pct = (level / 10) * 100;
        handle.style.bottom = `${pct}%`;

        valText.innerText = level;

        const baseClass = "w-3 h-3 rounded-full border border-gray-700 shadow-inner transition-colors duration-300";
        let color = 'bg-black';
        if (level > 0 && level < 4) color = 'bg-blue-900';
        else if (level >= 4 && level < 7) color = 'bg-blue-600';
        else if (level >= 7) color = 'bg-cyan-400 shadow-[0_0_8px_cyan]';

        light.className = `${baseClass} ${color}`;
    }

    getValue() {
        return this.internalState.join('');
    }
}
