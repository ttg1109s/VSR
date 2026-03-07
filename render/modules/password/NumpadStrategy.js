import { BaseStrategy } from './BaseStrategy.js';
import { NumpadTemplate } from '../../../components/PasswordUI.js';

export class NumpadStrategy extends BaseStrategy {
    init() {
        this.internalState = "";
    }

    getHTML() {
        return NumpadTemplate(this.config);
    }

    handleClick(e, target) {
        const numBtn = target.closest('.numpad-btn');
        if (numBtn) {
            this._handleNumpadInput(numBtn.dataset.value);
            return true; // Handled
        }
        return false;
    }

    _handleNumpadInput(val) {
        // Note: 'OK' and 'Cancel' are often handled by the main controller via global IDs, 
        // but 'Clear' might be specific.
        // In the original, OK calls submit(), Clear resets state.

        if (val === 'Clear') {
            this.internalState = "";
        } else if (val === 'OK') {
            // Controller handles submission separately via #pw-submit-btn logic usually, 
            // but Numpad often has its own OK button.
            // We'll rely on the Controller to intercept valid "submit" actions or we need a callback.
            // Actually, the original pasword.js called this.submit() on 'OK'.
            // We can fire a custom event or let the controller handle it.
            // For now, let's treat it as a special value that the Controller checks?
            // No, better: The Controller calls strategy.handleInput, if it returns 'SUBMIT', controller submits.
            // But wait, the methods return void currently.
            // Let's attach a 'requestSubmit' callback or emit event.
            const event = new CustomEvent('pw-submit-request', { bubbles: true });
            this.container.dispatchEvent(event);
            return;
        } else {
            // Number input
            if (this.internalState.length < this.config.length) {
                this.internalState += val;
            }
        }
        this._updateUI();
    }

    _updateUI() {
        const dots = this.container.querySelectorAll('.pw-dot');
        dots.forEach((dot, i) => {
            if (i < this.internalState.length) {
                dot.classList.add('bg-green-500', 'scale-125', 'shadow-lg');
                dot.classList.remove('bg-slate-700');
            } else {
                dot.classList.remove('bg-green-500', 'scale-125', 'shadow-lg');
                dot.classList.add('bg-slate-700');
            }
        });
    }

    getValue() {
        return this.internalState;
    }
}
