import { NumberStrategy } from './Number.js';
import { StringStrategy } from './String.js';
import { FindWayStrategy } from './FindWay.js';
import { PuzzleStrategy } from './Puzzle.js';
import { SwitchStrategy } from './Switch.js';

export class PasswordSystem {
    constructor() {
        this.active = false;
        this.currentStrategy = null;

        // Cache strategies
        this.strategies = {
            number: new NumberStrategy(this),
            string: new StringStrategy(this),
            find_way: new FindWayStrategy(this),
            puzzle: new PuzzleStrategy(this),
            switch: new SwitchStrategy(this)
        };

        this.targetAction = null;
        this.targetId = null;
        this.attempts = 0;
        this.maxRetries = 3;

        // Track last target to manage persistence
        this.lastTargetId = null;
    }

    /**
     * @param {object} actionDef - Action definition from schema
     * @param {string} uniqueId - Unique ID of the action instance
     * @param {object} passDef - Password definition fetched from state (passwords.number.xxx)
     * @param {string} passType - Explicit type ('number', 'string', 'puzzle'...) passed from Engine
     */
    show(actionDef, actionKey, uniqueId, passDef, passType) {
        this.active = true;
        this.targetAction = actionDef;
        this.targetId = uniqueId;

        // Config Max Retries
        this.maxRetries = passDef?.retryMax ?? 3;

        // Persistence Logic: Reset attempts only if switching targets
        if (this.targetId !== this.lastTargetId) {
            this.attempts = 0;
            this.lastTargetId = this.targetId;
        }

        // 1. Determine Type
        let type = passType;
        if (!type) {
            if (passDef.value && typeof passDef.value === 'number') type = 'number';
            else if (passDef.street) type = 'find_way';
            else if (passDef.tiles || passDef.url) type = 'puzzle';
            else type = 'string';
        }

        console.log(`[PasswordSystem] Open: Type=${type} Attempts=${this.attempts}/${this.maxRetries}`, passDef);

        if (!this.strategies[type]) {
            console.error(`[PasswordSystem] Unknown strategy: ${type}. Fallback to string.`);
            type = 'string';
        }

        this.currentStrategy = this.strategies[type];

        // Inject Context into PassDef for Render
        const enrichedPassDef = {
            ...passDef,
            retryMax: this.maxRetries,
            currentAttempts: this.attempts
        };

        // Call Strategy
        this.currentStrategy.show(actionDef, uniqueId, enrichedPassDef);
    }

    hide() {
        if (this.currentStrategy) this.currentStrategy.hide();
        this.active = false;
        this.currentStrategy = null;
    }

    cancel() {
        if (!this.active) return;

        // [Logic Update] Reset attempts if max reached upon close
        if (this.maxRetries > 0 && this.attempts >= this.maxRetries) {
            this.attempts = 0;
        }

        this.hide();
        this.propagateResult('cancel');
    }

    finish(success) {
        if (success) {
            // Reset attempts on success
            this.attempts = 0;
            this.hide();
            this.propagateResult(true);
        } else {
            // Reset attempts on failure (fail_max) logic
            this.attempts = 0;
            this.hide();
            this.propagateResult(false);
        }
    }

    // Update attempts from Render result
    updateAttempts(count) {
        if (typeof count === 'number') {
            this.attempts = count;
        }
    }

    propagateResult(result) {
        // success=true/false works. 'cancel' works?
        // Engine expects boolean usually.
        // If cancel, we might want to just unlock busy state but not trigger success/fail effects?
        // Implementation depends on Engine.Action.
        // Assuming Engine handles 'cancel' or we pass false but no fail effect?

        if (window.API && window.API.engine && window.API.engine.action) {
            // Transform 'cancel' to appropriate signal if needed
            // For now, if result is 'cancel', we treat it as just closing without consequences (unless fail_max happened internally)
            if (result === 'cancel') {
                window.API.engine.action.finishPassword(this.targetAction, this.targetAction?.id, this.targetId, 'cancel');
            } else {
                window.API.engine.action.finishPassword(this.targetAction, this.targetAction?.id, this.targetId, result);
            }
        }
    }
}