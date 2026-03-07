import { BaseStrategy } from './BaseStrategy.js';
import { StringTemplate } from '../../../components/PasswordUI.js';

export class StringStrategy extends BaseStrategy {
    init() {
        // Internal state not strictly needed as we read from DOM, but could track valid state
        this.internalState = "";
    }

    getHTML() {
        return StringTemplate(this.config);
    }

    postRender() {
        const firstInput = this.container.querySelector('.pw-char-input:not([disabled])');
        if (firstInput) firstInput.focus();
    }

    handleInput(e, target) {
        if (target.classList.contains('pw-char-input')) {
            target.value = target.value.toUpperCase();
            if (target.value.length === 1) {
                let next = target.nextElementSibling;
                while (next && next.disabled) next = next.nextElementSibling;
                if (next) next.focus();
            }
        }
    }

    handleKeydown(e, target) {
        if (target.classList.contains('pw-char-input')) {
            if (e.key === 'Backspace') {
                if (target.value === '') {
                    let prev = target.previousElementSibling;
                    while (prev && prev.disabled) prev = prev.previousElementSibling;
                    if (prev) prev.focus();
                }
            } else if (e.key === 'Enter') {
                // Submit triggered by controller via global listener, but we can expose a way if needed.
                // The controller listens for Enter on these inputs already to call submit.
            }
        }
    }

    getValue() {
        const inputs = this.container.querySelectorAll('.pw-char-input');
        return Array.from(inputs).map(i => i.value).join('');
    }
}
