import { getFakerActingIds } from './entity/Identity.js';

export const ActionSystem = {
    getEffectiveActions(sId, rId) {
        const router = this.src?.scenes?.[sId]?.routers?.[rId];
        if (!router) return [];
        if (!Array.isArray(router.actions)) {
            throw new TypeError(`Router '${sId}.${rId}' actions must be an array of global Action IDs.`);
        }
        return router.actions.map(actionId => {
            if (typeof actionId !== 'string' || !actionId.trim()) {
                throw new TypeError(`Router '${sId}.${rId}' contains an invalid Action reference; inline Actions are not supported.`);
            }
            const definition = this.src.actions?.[actionId];
            if (!definition) {
                throw new Error(`Router '${sId}.${rId}' references unknown Action ID '${actionId}'.`);
            }
            const runtime = this.api.engine.state.getRuntimeSnapshot('actions.[id]', { id: actionId }) || {};
            const count = runtime.count || {};
            const effectiveAction = { ...definition, id: actionId, source: 'global' };

            // Requirement is a runtime-mutable Action property. Project an explicit
            // runtime override into the effective definition so handleAction reads
            // the updated gate on the next click without changing the source script.
            if (typeof runtime.requirement === 'boolean') {
                effectiveAction.set = {
                    ...(effectiveAction.set || {}),
                    requirement: runtime.requirement
                };
            }

            return {
                ...effectiveAction,
                count: {
                    normal: Number.isSafeInteger(count.normal) && count.normal >= 0 ? count.normal : 0,
                    pass: Number.isSafeInteger(count.pass) && count.pass >= 0 ? count.pass : 0,
                    fail: Number.isSafeInteger(count.fail) && count.fail >= 0 ? count.fail : 0,
                    pwFailed: Number.isSafeInteger(count.pwFailed) && count.pwFailed >= 0 ? count.pwFailed : 0
                }
            };
        });
    },

    markAsRead(uniqueId) {
        const state = this.api.engine.state;
        const sceneId = state.get('sceneId');
        const routerId = sceneId ? state.get('scene.activeRouterId', { id: sceneId }) : null;
        if (!sceneId || !routerId) {
            this.notifyActionFailure('Action unavailable', 'No valid action context remains.', 'action.invalid_context');
            return { success: false, reason: 'invalid_context' };
        }

        // Only the active router may mutate an action's read state.
        const action = this.getEffectiveActions(sceneId, routerId)
            .find(item => `${sceneId}_${routerId}_${item.id}` === uniqueId);
        if (!action) {
            this.notifyActionFailure('Action unavailable', 'This action is no longer part of the current game.', 'action.not_found');
            return { success: false, reason: 'action_not_found' };
        }

        const current = state.getRuntimeSnapshot('actions.[id]', { id: action.id });
        if (current?.readDesc === true) return { success: true, alreadyRead: true };
        state.update('actions.[id]', value => ({
            count: { normal: 0, pass: 0, fail: 0, pwFailed: 0 },
            display: 'show',
            ...(value || {}),
            readDesc: true
        }), { id: action.id });
        return { success: true };
    },

    notifyActionFailure(title, message, category, dedupeKey) {
        this.api.notifications.add(title, message, "warning", {
            source: 'engine',
            category: category || 'action.failed',
            dedupeKey: dedupeKey || undefined,
            duration: 5000
        });
    },

    async handleAction(actionKey, uniqueId = actionKey) {
        if (this.isActionProcessing || this.isTransitioning) {
            const reason = this.isTransitioning ? 'transitioning' : 'busy';
            console.warn(`[Flow] Action ignored. Busy: Processing=${this.isActionProcessing}, Trans=${this.isTransitioning}`);
            this.notifyActionFailure('Action unavailable', this.isTransitioning ? 'The Engine is transitioning scenes. Please wait for it to finish.' : 'The Engine is processing another action.', `action.${reason}`);
            return { success: false, reason };
        }
        // A password challenge owns the action flow until it is submitted or cancelled.
        if (this.pendingPasswordAction) {
            this.notifyActionFailure('Action unavailable', 'Complete or cancel the current password challenge first.', 'action.challenge_active');
            return { success: false, reason: 'challenge_active' };
        }

        const state = this.api.engine.state;
        const sId = state.get('sceneId');
        const rId = state.get('scene.activeRouterId', { id: sId });

        if (!rId || !this.src?.scenes?.[sId]?.routers?.[rId]) {
            this.notifyActionFailure('Action unavailable', 'No valid action context remains.', 'action.invalid_context');
            return { success: false, reason: 'invalid_context' };
        }

        // The active router is the authority for action membership. A global
        // action definition is not executable unless this router references it.
        const effective = this.getEffectiveActions(sId, rId);
        const actDef = effective.find(action => action.id === actionKey);
        if (!actDef) {
            this.notifyActionFailure('Action unavailable', 'This action is no longer part of the current game.', 'action.not_found');
            return { success: false, reason: 'action_not_found' };
        }

        const actStateKey = actionKey;
        const currentActionState = state.getRuntimeSnapshot('actions.[id]', { id: actStateKey }) || {};
        const display = currentActionState.display ?? actDef.set?.display ?? 'show';
        if (display === 'hide') {
            this.notifyActionFailure('Action unavailable', 'This action is currently hidden.', 'action.hidden');
            return { success: false, reason: 'action_hidden' };
        }
        if (display === 'locked') {
            this.notifyActionFailure('Action locked', 'This action is locked.', 'action.locked');
            return { success: false, reason: 'locked' };
        }


        console.log(`[Flow] >>> CLICK ACTION: ${actionKey}`);

        const set = actDef.set || {};

        // --- Identity / Faker Logic ---
        // Determine Current Identity (Who is the player acting as?)
        // --- Identity / Faker Logic ---
        const entryChar = state.get('entryCharacter') || 'player';
        const faker = state.getRuntimeSnapshot('faker') || {};
        const fakerMode = faker.mode || (this.getConfig ? this.getConfig('fakerMode') : 'soul');
        const actingIds = getFakerActingIds(entryChar, faker, fakerMode);

        let isAllowed = true;
        let blockReason = "The current identity cannot perform this action.";

        // Normalize charAllow
        const charAllow = Array.isArray(set.charAllow) ? set.charAllow : [];

        // Permission Check
        if (charAllow.length > 0) {
            // Check if ANY of our actingIds are in the allowed list
            const hasPermission = actingIds.some(id => charAllow.includes(id));

            if (!hasPermission) {
                isAllowed = false;
                // Determine sensible block reason
                if (faker.active) {
                    blockReason = `You are in ${fakerMode} form and do not have this character's permissions.`;
                } else {
                    blockReason = `You must be ${charAllow.map(id => state.getRuntimeSnapshot('characters.[id]', { id })?.set?.name || id).join(', ')} to perform this action.`;
                }
            }
        } else {
            // Empty charAllow -> Usually means "Anyone" or "Default Player".
        }

        if (!isAllowed) {
            this.incrementActionCount(actStateKey, 'normal');
            if (actDef.effect?.normal) {
                await this.processRunnables(actDef.effect.normal, { sceneId: sId, routerId: rId, actionId: actionKey, hook: 'normal' });
            }
            this.api.presentation.effects.shake(uniqueId);
            this.notifyActionFailure("Blocked", blockReason, "action.permission_denied", `action.permission_denied:${actStateKey}`);
            this.commitState('action.changed'); // Re-render to update UI states if needed
            return { success: false, reason: 'permission_denied' };
        }

        // --- Desc Read Validation ---
        const allDescRead = this.getConfig('allDescRead');
        // Ensure state checking
        const currentState = this.api.engine.state.getRuntimeSnapshot('actions.[id]', { id: actStateKey }) || {};

        // Does this action effectively require reading?
        const requiresRead = (allDescRead || set.readDesc === true) && !!(actDef.meta?.desc ?? actDef.meta?.description);
        const hasBeenRead = currentState.readDesc === true;

        if (requiresRead && !hasBeenRead) {
            this.notifyActionFailure('Description not read', 'Please read the description before performing this action.', 'action.not_read', `action.not_read:${actStateKey}`);
            return { success: false, reason: 'not_read' };
        }

        // Enforce cooldown before counters, normal effects, or any other side effect.
        const cooldownUntil = currentState.cooldownEnd;
        if (set.cooldown > 0 && Number.isFinite(cooldownUntil) && cooldownUntil > Date.now()) {
            const remainingSeconds = Math.ceil((cooldownUntil - Date.now()) / 1000);
            this.api.presentation.effects.shake(uniqueId);
            this.notifyActionFailure('Action on cooldown', `Please wait ${remainingSeconds}s before trying again.`, 'action.cooldown', `action.cooldown:${actStateKey}`);
            return { success: false, reason: 'cooldown', remainingSeconds };
        }

        // --- Execution ---
        try {
            this.isActionProcessing = true;

            // Stop Automations
            const automations = state.getRuntimeSnapshot('automations') || {};
            Object.keys(automations).forEach(autoId => {
                if (automations[autoId].active) this.stopAutomation(autoId);
            });

            this.incrementActionCount(actStateKey, 'normal');

            // Normal Effect (Always run if present)
            if (actDef.effect?.normal) {
                console.log(`[Flow] Effect 'normal' start`);
                await this.processRunnables(actDef.effect.normal, { sceneId: sId, routerId: rId, actionId: actionKey, hook: 'normal' });
            }

            // Type 'none' shortcut REMOVED (Legacy)

            // Hard Lock Check REMOVED (Legacy)

            // Requirement Check
            let checkPassed = true;
            let failType = null;

            if (set.requirement === true) {
                // An explicitly enabled requirement without a definition is a
                // configuration error, never an implicit pass.
                const checkRes = actDef.requirement
                    ? this.checkReq(actDef.requirement)
                    : { pass: false, type: 'invalid_requirement' };
                checkPassed = checkRes.pass;
                failType = checkRes.type;
            }

            if (!checkPassed) {
                this.incrementActionCount(actStateKey, 'fail');
                this.api.presentation.effects.shake(uniqueId);

                const failActions = {
                    item_surplus: () => this.notifyActionFailure("Warning", "You are carrying too many items!", "action.requirement_failed"),
                    item_missing: () => this.notifyActionFailure("Warning", "Required item missing!", "action.requirement_failed"),
                    item_order: () => this.notifyActionFailure("Warning", "Incorrect item order!", "action.requirement_failed")
                };
                // A Story-authored fail notification is more specific than the
                // generic engine warning. Avoid stacking both for one failed Action.
                const hasStoryFailNotice = Array.isArray(actDef.effect?.fail)
                    && actDef.effect.fail.some(effect => effect?.type === 'notify');
                let notificationEmitted = hasStoryFailNotice;
                if (!hasStoryFailNotice) {
                    if (failType && failActions[failType]) {
                        failActions[failType]();
                        notificationEmitted = true;
                    } else if (this.getConfig && this.getConfig('defaultNotice')) {
                        this.notifyActionFailure("Action failed", "Requirements not met.", "action.requirement_failed");
                        notificationEmitted = true;
                    }
                }

                // Fail Effect
                if (actDef.effect?.fail) {
                    console.log(`[Flow] Effect 'fail' start`);
                    await this.processRunnables(actDef.effect.fail, { sceneId: sId, routerId: rId, actionId: actionKey, hook: 'fail' });
                }

                // Requirement failure is a completed action attempt. Release the global
                // processing lock before publishing the snapshot; otherwise every Action
                // is projected as `busy` and the client receives no unlocked snapshot
                // (the protocol's post-command commit is skipped after this commit).
                this.isActionProcessing = false;
                this.commitState('action.changed');
                return { success: false, reason: 'requirement_failed', failType, notificationEmitted };
            }

            // Password Check — fail closed: a malformed or missing definition
            // must never fall through to successful action execution.
            if (set.password) {
                const parts = typeof set.password === 'string' ? set.password.split(':') : [];
                if (parts.length !== 2 || !parts[0] || !parts[1]) {
                    throw new Error(`Invalid password reference: ${String(set.password)}`);
                }
                const [passType, passId] = parts;
                const passDef = this.src?.passwords?.[passType]?.[passId];
                if (!passDef) {
                    throw new Error(`Password definition not found: ${set.password}`);
                }

                const challenge = this.passwordSystem.open({
                    actionId: actionKey, uniqueId, sceneId: sId, routerId: rId,
                    type: passType, passwordId: passId, config: passDef
                });
                this.pendingPasswordAction = challenge;
                this.schedulePasswordExpiry(challenge, actDef);
                state.set('session.passwordChallenge', challenge);
                this.api.presentation.components.keyboard(
                    { id: actionKey, meta: { title: actDef.meta?.title, desc: actDef.meta?.desc } },
                    actionKey,
                    uniqueId,
                    {
                        type: passType, desc: passDef.desc, retryMax: challenge.retryMax,
                        timer: passDef.timer, challengeId: challenge.challengeId,
                        countTest: challenge.countTest,
                        remainingAttempts: challenge.retryMax === 0 ? null : challenge.retryMax,
                        deadlineAt: challenge.deadlineAt,
                        ...(passType === 'puzzle' ? {
                            puzzle: { url: passDef.url, ratio: passDef.ratio ?? [3, 3], level: passDef.level }
                        } : {}),
                        ...(passType === 'find_way' ? {
                            findWay: {
                                area: passDef.area, start: passDef.start,
                                target: passDef.target
                            }
                        } : {})
                    }
                );
                // The player may now interact; do not hold the global action lock.
                this.isActionProcessing = false;
                return;
            }

            // Success Execution
            await this.executeActionSuccess(actDef, sId, rId, actionKey, uniqueId);

            if (!this.isTransitioning) {
                this.commitState('action.changed');
            }

        } catch (err) {
            console.error("[Flow] Action execution error:", err);
            throw err;
        } finally {
            // Only release lock if NOT a password action (password UI handles its own flow)
            if (!this.pendingPasswordAction || this.pendingPasswordAction.actionId !== actionKey) {
                this.isActionProcessing = false;
            }
        }
        return { success: true };
    },

    incrementActionCount(actionStateKey, phase) {
        if (!['normal', 'pass', 'fail', 'pwFailed'].includes(phase)) throw new TypeError(`Unsupported Action count phase: ${phase}`);
        const state = this.api.engine.state;
        state.update('actions.[id]', current => {
            const count = current?.count || {};
            return { ...(current || {}), count: {
                normal: Number.isSafeInteger(count.normal) && count.normal >= 0 ? count.normal : 0,
                pass: Number.isSafeInteger(count.pass) && count.pass >= 0 ? count.pass : 0,
                fail: Number.isSafeInteger(count.fail) && count.fail >= 0 ? count.fail : 0,
                pwFailed: Number.isSafeInteger(count.pwFailed) && count.pwFailed >= 0 ? count.pwFailed : 0,
                [phase]: (Number.isSafeInteger(count[phase]) && count[phase] >= 0 ? count[phase] : 0) + 1
            }};
        }, { id: actionStateKey });
    },

    async executeActionSuccess(actDef, sId, rId, actionKey, uniqueId) {
        const set = actDef.set || {};
        const state = this.api.engine.state;
        const actStateKey = actionKey;

        // Set Cooldown
        if (set.cooldown && set.cooldown > 0 && state.getRuntimeSnapshot('actions.[id]', { id: actStateKey })) {
            state.update('actions.[id]', current => ({
                ...(current || {}),
                cooldownEnd: Date.now() + (set.cooldown * 1000),
                cooldownDuration: set.cooldown
            }), { id: actStateKey });
        }

        this.incrementActionCount(actStateKey, 'pass');
        if (actDef.effect?.pass) {
            // Logic for requirement === true or false (but success reached)
            if (set.requirement !== true && set.requirement !== false && typeof set.requirement !== 'undefined') {
                // Strict check? No, just run it if it exists.
            }
            console.log(`[Flow] Effect 'pass' start`);
            await this.processRunnables(actDef.effect.pass, { sceneId: sId, routerId: rId, actionId: actionKey, hook: 'pass' });
        }
    },

    // executeActionResult REMOVED

    async finishPasswordAction(actDef, actionKey, uniqueId, result) {
        const state = this.api.engine.state;
        const sId = state.get('sceneId');
        const rId = state.get('scene.activeRouterId', { id: sId });
        this.isActionProcessing = true;
        try {
            if (result === 'cancel') {
                console.log(`[Flow] Action '${actionKey}' cancelled by user.`);
                return { success: false, reason: 'cancelled' };
            }
            if (result === 'expired') {
                this.protocol?.publish?.('password.expired', { actionId: actionKey, uniqueId });
                this.commitState('password.expired');
                return { success: false, reason: 'expired' };
            }
            if (result === true) {
                await this.executeActionSuccess(actDef, sId, rId, actionKey, uniqueId);
                if (!this.isTransitioning) this.commitState('action.changed');
                return { success: true };
            }
            if (result === 'exhausted') {
                const actStateKey = actionKey;
                if (actDef.effect?.pwFailed) {
                    this.incrementActionCount(actStateKey, 'pwFailed');
                    await this.processRunnables(actDef.effect.pwFailed, {
                        sceneId: sId, routerId: rId, actionId: actionKey, hook: 'pwFailed'
                    });
                }
                this.commitState('password.exhausted');
                return { success: false, reason: 'exhausted' };
            }
            return { success: false, reason: 'invalid_result' };
        } finally {
            this.isActionProcessing = false;
        }
    }
};