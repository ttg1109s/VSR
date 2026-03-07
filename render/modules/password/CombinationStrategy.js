import { BaseStrategy } from './BaseStrategy.js';
import { CombinationTemplate } from '../../../components/PasswordUI.js';

export class CombinationStrategy extends BaseStrategy {
    init() {
        this.internalState = (this.config.initial || "0".repeat(this.config.length)).split('').map(Number);
    }

    getHTML() {
        return CombinationTemplate({ ...this.config, initial: this.internalState.join('') });
    }

    handleClick(e, target) {
        const wheelUp = target.closest('.btn-wheel-up');
        const wheelDown = target.closest('.btn-wheel-down');
        if (wheelUp || wheelDown) {
            const container = target.closest('.wheel-container');
            const idx = parseInt(container.dataset.index);
            const dir = wheelUp ? 1 : -1;
            this._updateWheel(idx, dir);
            return true;
        }
        return false;
    }

    _updateWheel(idx, dir) {
        let val = this.internalState[idx];
        val = (val + dir + 10) % 10;
        this.internalState[idx] = val;
        const digitEl = this.container.querySelector(`.wheel-container[data-index="${idx}"] .wheel-digit`);
        if (digitEl) digitEl.innerText = val;
    }

    getValue() {
        return this.internalState.join('');
    }
}
