/**
 * render/modules/pasword.js
 * Controller điều phối hiển thị và xử lý sự kiện cho hệ thống Password.
 * [REFAC] Sử dụng Strategy Pattern để tách biệt logic từng loại password.
 */

import { TaskManager } from '../../plugin/taskmanager.js';
import { StringStrategy } from './password/StringStrategy.js';
import { NumpadStrategy } from './password/NumpadStrategy.js';
import { CombinationStrategy } from './password/CombinationStrategy.js';

import { RotaryStrategy } from './password/RotaryStrategy.js';
import { PuzzleStrategy } from './password/PuzzleStrategy.js';

import { FindWayStrategy } from './password/FindWayStrategy.js';
import { SwitchStrategy } from './password/SwitchStrategy.js';

export const PasswordRender = {
    overlay: null,
    container: null,
    currentResolve: null,
    tm: null, // TaskManager instance

    // State quản lý
    config: null,
    currentStrategy: null,
    _closeTimeout: null,

    init() {
        this.overlay = document.getElementById('password-overlay');
        this.container = document.getElementById('password-content');
        this.tm = new TaskManager();

        // [CSS] Robust Injection
        if (!document.getElementById('pw-custom-styles')) {
            const style = document.createElement('style');
            style.id = 'pw-custom-styles';
            style.innerHTML = `
                @keyframes pw-shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-pw-shake {
                    animation: pw-shake 0.4s ease-in-out !important;
                }
                .pw-error-state {
                    border-color: #ef4444 !important;
                    box-shadow: 0 0 30px rgba(239, 68, 68, 0.5) !important;
                }
                .pw-success-state {
                    border-color: #22c55e !important;
                    box-shadow: 0 0 30px rgba(34, 197, 94, 0.5) !important;
                }
                .fw-cell.fw-start {
                    background-color: #3b82f6 !important; /* blue-500 */
                    box-shadow: 0 0 10px #3b82f6;
                    border-color: #60a5fa !important;
                }
                .fw-cell.fw-target {
                    background-color: #ef4444 !important; /* red-500 */
                    box-shadow: 0 0 10px #ef4444;
                    border-color: #f87171 !important;
                }
                .fw-cell.fw-path {
                    background-color: rgba(16, 185, 129, 0.5) !important; /* emerald-500/50 */
                    box-shadow: inset 0 0 10px rgba(16, 185, 129, 0.8);
                    border-color: #34d399 !important;
                }
            `;
            (document.head || document.documentElement).appendChild(style);
        }

        if (this.container) {
            ['click', 'mousedown', 'mouseup', 'touchstart', 'touchend'].forEach(evt => {
                this.container.addEventListener(evt, (e) => e.stopPropagation());
            });

            this.container.addEventListener('click', (e) => this._handleDelegatedClick(e));
            this.container.addEventListener('input', (e) => this._handleDelegatedInput(e));
            this.container.addEventListener('keydown', (e) => this._handleDelegatedKeydown(e));

            // Listen for custom submit request from strategies
            this.container.addEventListener('pw-submit-request', () => this.submit());
        }

        if (this.overlay) {
            ['click', 'mousedown', 'mouseup', 'touchstart', 'touchend'].forEach(evt => {
                this.overlay.addEventListener(evt, (e) => e.stopPropagation());
            });
        }
    },

    async show(type, data) {
        if (!this.overlay) this.init();

        if (this._closeTimeout) {
            clearTimeout(this._closeTimeout);
            this._closeTimeout = null;
        }

        this.config = { type, ...data };
        this.currentStrategy = this._createStrategy(type, data);

        if (!this.currentStrategy) {
            console.error(`Unknown password type: ${type}`);
            return;
        }

        this.currentStrategy.init();

        return new Promise((resolve) => {
            this.currentResolve = resolve;

            // Render HTML
            this.container.innerHTML = this.currentStrategy.getHTML();

            if (data.timer && data.timer > 0) this.renderTimerUI(data.timer);

            this.overlay.classList.remove('hidden');
            this.overlay.classList.remove('opacity-0');

            void this.overlay.offsetWidth; // Reflow

            this.currentStrategy.postRender();
        });
    },

    _createStrategy(type, data) {
        const strategyMap = {
            'string': StringStrategy,
            'find_way': FindWayStrategy,
            'puzzle': PuzzleStrategy,
            'switch': SwitchStrategy,
            'number': {
                'combination': CombinationStrategy,
                'rotary_dial': RotaryStrategy,
                'keyboard': NumpadStrategy
            }
        };

        const target = strategyMap[type];
        if (!target) return null;

        if (type === 'number') {
            // [LOGIC] Sanitize value: allow string but ensure only digits
            if (data.value !== undefined) {
                const valStr = String(data.value);
                // Remove non-digit chars
                const sanitized = valStr.replace(/[^0-9]/g, '');
                // Update config value
                this.config.value = sanitized;
                data.value = sanitized; // Update data passed to strategy
            }

            const mode = data.displayMode || 'keyboard';
            const StrategyClass = target[mode] || target['keyboard'];
            return new StrategyClass(this.container, data);
        }

        return new target(this.container, data);
    },

    close() {
        if (!this.overlay) return;

        if (this._closeTimeout) {
            clearTimeout(this._closeTimeout);
            this._closeTimeout = null;
        }

        this.overlay.classList.add('opacity-0');

        this._closeTimeout = setTimeout(() => {
            this.overlay.classList.add('hidden');
            this.container.innerHTML = '';
            this.stopTimerUI();
            this.currentResolve = null;
            this.currentStrategy = null;
            this._closeTimeout = null;
        }, 300);
    },

    // --- EVENT HANDLERS ---
    _handleDelegatedClick(e) {
        e.stopPropagation();
        const target = e.target;
        if (!target) return;

        // 1. GLOBAL BUTTONS
        if (target.closest('#pw-cancel-btn')) {
            // 2.1. Close button = 1 attempt
            this.config.currentAttempts = (this.config.currentAttempts || 0) + 1;
            const max = this.config.retryMax !== undefined ? this.config.retryMax : 3;

            // If retryMax reached via close? 
            let status = 'cancel';
            if (max > 0 && this.config.currentAttempts >= max) {
                status = 'fail_max';
            }

            // Special handling for puzzle giveup was in original, but now generalized logic?
            // Original: "if puzzle, giveup = fail". 
            // Logic above covers "fail_max". 
            // If user just cancels without max tries, it returns 'cancel'.

            this._resolveAndClose({ status: status, attempts: this.config.currentAttempts });
            return;
        }
        if (target.closest('#pw-submit-btn')) {
            this.submit();
            return;
        }

        // 2. STRATEGY SPECIFIC
        if (this.currentStrategy) {
            this.currentStrategy.handleClick(e, target);
        }
    },

    _handleDelegatedInput(e) {
        if (this.currentStrategy) {
            this.currentStrategy.handleInput(e, e.target);
        }
    },

    _handleDelegatedKeydown(e) {
        if (e.target.classList.contains('pw-char-input')) {
            if (e.key === 'Enter') {
                this.submit();
                return;
            }
        }
        if (this.currentStrategy) {
            this.currentStrategy.handleKeydown(e, e.target);
        }
    },

    // --- SUBMIT & VERIFY ---
    submit() {
        if (!this.currentStrategy) return;

        // 1. Get Input
        const currentInput = this.currentStrategy.getValue();

        // 2. Verify
        const isCorrect = this._verify(currentInput);

        // 3. Handle Result
        if (isCorrect) {
            this._handleSuccess(currentInput);
        } else {
            this._handleFailure(currentInput);
        }
    },

    _verify(input) {
        if (this.config.type === 'puzzle') {
            const val = this.config.value || "solved";
            return input === val;
        }

        if (this.config.type === 'find_way') {
            try {
                const userPath = JSON.parse(input);
                const correctPath = this.config.street;

                if (!Array.isArray(userPath) || !Array.isArray(correctPath)) return false;
                if (userPath.length !== correctPath.length) return false;

                for (let i = 0; i < correctPath.length; i++) {
                    // Check coords [x, y]
                    if (userPath[i][0] !== correctPath[i][0] || userPath[i][1] !== correctPath[i][1]) {
                        return false;
                    }
                }
                return true;
            } catch (e) {
                console.error("FindWay Parse Error", e);
                return false;
            }
        }

        // Standard comparison
        const correct = this.config.value ? this.config.value.toString().toUpperCase() : "";
        const userIn = input ? input.toString().toUpperCase() : "";
        return userIn === correct;
    },

    _handleSuccess(result) {
        this._setUIStatus('success');
        setTimeout(() => {
            this._resolveAndClose({ status: 'success', value: result });
        }, 500);
    },

    _handleFailure(failValue) {
        this._setUIStatus('error');
        this.shakeUI();

        if (this._errorTimeout) clearTimeout(this._errorTimeout);

        this._errorTimeout = setTimeout(() => {
            const mainCard = this.container ? this.container.querySelector('.pw-error-state') : null;
            if (mainCard) {
                mainCard.classList.remove('pw-error-state');
            }
        }, 3000);

        this.config.currentAttempts = (this.config.currentAttempts || 0) + 1;
        const max = this.config.retryMax !== undefined ? this.config.retryMax : 3;

        if (max === 0) {
            // Unlimited
            return;
        }

        if (this.config.currentAttempts >= max) {
            setTimeout(() => {
                this._resolveAndClose({ status: 'fail_max', attempts: this.config.currentAttempts });
            }, 500);
        } else {
            console.log(`[Password] Wrong. Attempts: ${this.config.currentAttempts}/${max}`);
        }
    },

    // --- HELPER UI ---
    _setUIStatus(status) {
        const mainCard = this.container.querySelector('.pw-main-card');
        if (!mainCard) return;

        mainCard.classList.remove('border-emerald-500/30', 'border-red-500/30', 'border-white/10', 'pw-error-state', 'pw-success-state');
        mainCard.classList.remove('border-green-500', 'shadow-[0_0_30px_rgba(34,197,94,0.5)]');
        mainCard.classList.remove('border-red-500', 'shadow-[0_0_30px_rgba(239,68,68,0.5)]');

        if (status === 'success') {
            mainCard.classList.add('pw-success-state');
        } else if (status === 'error') {
            mainCard.classList.add('pw-error-state');
        }
    },

    shakeUI() {
        if (this.container) {
            const content = this.container.firstElementChild;
            if (content) {
                content.classList.remove('animate-pw-shake');
                void content.offsetWidth;
                content.classList.add('animate-pw-shake');
            }
        }
    },

    _resolveAndClose(result) {
        this.close();
        if (this.currentResolve) this.currentResolve(result);
    },

    // --- TIMER (TaskManager) ---
    renderTimerUI(duration) {
        let timerDiv = document.getElementById("pw-modal-timer");
        if (!timerDiv) {
            timerDiv = document.createElement('div');
            timerDiv.className = "absolute top-4 right-4 bg-red-900/80 text-white font-mono font-bold px-3 py-1 rounded border border-red-500/50 shadow-lg z-50 pointer-events-none";
            timerDiv.id = "pw-modal-timer";
            this.container.appendChild(timerDiv);
        }

        let timeLeft = duration;
        const taskName = "password_timer";
        if (this.tm) this.tm.kill(taskName);

        this.tm.addNew(taskName, {
            time: 1000,
            mode: 'interval',
            exe: () => {
                const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
                const s = (timeLeft % 60).toString().padStart(2, '0');
                if (timerDiv) timerDiv.innerText = `${m}: ${s}`;

                if (timeLeft <= 0) {
                    this.stopTimerUI();
                    this._resolveAndClose({ status: 'fail_max', reason: 'timeout' });
                }
                timeLeft--;
            }
        });

        this.tm.operator(taskName, 'enabled');
        const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        const s = (timeLeft % 60).toString().padStart(2, '0');
        timerDiv.innerText = `${m}: ${s}`;
    },

    stopTimerUI() {
        if (this.tm) {
            this.tm.kill("password_timer");
        }
    }
};