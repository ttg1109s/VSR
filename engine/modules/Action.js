import { getFakerActingIds } from './entity/Identity.js';

export const ActionSystem = {
    getActionPresentationData(action) {
        if (!action) return null;
        return {
            id: action.id,
            meta: {
                title: action.meta?.title ?? action.title ?? action.name ?? action.id,
                desc: action.meta?.desc ?? action.meta?.description ?? '',
                buttonLabel: action.meta?.buttonLabel,
                buttonIcon: action.meta?.buttonIcon
            }
        };
    },

    getEffectiveActions(sId, rId) {
        const router = this.src?.scenes?.[sId]?.routers?.[rId];
        if (!router) return [];
        const routerKey = `${sId}_${rId}`;
        const stateAccess = this.api.engine.state;
        // Runtime Router membership is optional and only queried through the
        // mutable runtime getter; mocks/projections without it retain source IDs.
        const runtimeRouter = typeof stateAccess.getRuntime === 'function'
            ? stateAccess.getRuntime('routers.[id]', { id: routerKey }) : null;
        const runtimeActions = runtimeRouter?.actions;
        const spriteMode = router.meta?.sprite === true;
        const actionIds = spriteMode
            ? (Array.isArray(router.sprites) ? [...new Set(router.sprites.map(spriteId => this.src.sprite?.[spriteId]?.action).filter(Boolean))] : undefined)
            : (Array.isArray(runtimeActions) ? runtimeActions : router.actions);
        if (!Array.isArray(actionIds)) {
            throw new TypeError(`Router '${sId}.${rId}' must define the correct action/sprite membership for its presentation mode.`);
        }
        return actionIds.map(actionId => {
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
        const state = this.api.engine.state;
        const sId = state.get('sceneId');
        const rId = state.get('scene.activeRouterId', { id: sId });

        // Keep one challenge alive while allowing its owning Action to reopen
        // the same challenge. Other Actions remain blocked until it terminates.
        const activeChallenge = this.pendingPasswordAction;
        const resumingPasswordChallenge = activeChallenge?.actionId === actionKey &&
            activeChallenge.sceneId === sId && activeChallenge.routerId === rId &&
            activeChallenge.status === 'active';
        if (activeChallenge && !resumingPasswordChallenge) {
            this.notifyActionFailure('Action unavailable', 'Complete the active password challenge first.', 'action.challenge_active');
            return { success: false, reason: 'challenge_active' };
        }

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
            // Permission-denied Actions may still run authored normal effects.
            // Those effects can be async and mutate gameplay state, so acquire the
            // same global processing lock as the regular execution path.
            this.isActionProcessing = true;
            try {
                this.incrementActionCount(actStateKey, 'normal');
                if (actDef.effect?.normal) {
                    await this.processRunnables(actDef.effect.normal, { sceneId: sId, routerId: rId, actionId: actionKey, hook: 'normal' });
                }
                this.api.presentation.effects.shake(uniqueId);
                this.notifyActionFailure("Blocked", blockReason, "action.permission_denied", `action.permission_denied:${actStateKey}`);
            } finally {
                this.isActionProcessing = false;
            }
            this.commitState('action.changed'); // Re-render to update UI states if needed
            return { success: false, reason: 'permission_denied' };
        }

        // --- Desc Read Validation ---
        const allDescRead = this.getConfig('allDescRead');
        // Ensure state checking
        const currentState = this.api.engine.state.getRuntimeSnapshot('actions.[id]', { id: actStateKey }) || {};

        // Does this action effectively require reading?
        const activeRouterDefinition = this.src?.scenes?.[sId]?.routers?.[rId];
        const spriteMode = activeRouterDefinition?.meta?.sprite === true;
        const requiresRead = !spriteMode && (allDescRead || set.readDesc === true) && !!(actDef.meta?.desc ?? actDef.meta?.description);
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

            

            undefined

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

            // Password Check — reuse the active Engine-owned challenge for this
            // action instead of opening a fresh challenge when the player reopens
            // its card after dismissing the dialog.
            if (set.password) {
                const activeChallenge = this.pendingPasswordAction;
                if (activeChallenge?.actionId === actionKey &&
                    activeChallenge.sceneId === sId && activeChallenge.routerId === rId &&
                    activeChallenge.status === 'active') {
                    const activePassword = this.src?.passwords?.[activeChallenge.type]?.[activeChallenge.passwordId];
                    if (!activePassword) throw new Error('Active password definition is no longer available.');
                    this.schedulePasswordExpiry(activeChallenge, actDef);
                    state.set('session.passwordChallenge', activeChallenge);
                    this.api.presentation.components.keyboard(
                        { id: actionKey, meta: { title: actDef.meta?.title, desc: actDef.meta?.desc } },
                        actionKey, uniqueId,
                        {
                            type: activeChallenge.type, desc: activePassword.desc,
                            retryMax: activeChallenge.retryMax, timer: activePassword.timer,
                            challengeId: activeChallenge.challengeId, countTest: activeChallenge.countTest,
                            remainingAttempts: activeChallenge.retryMax === 0 ? null : Math.max(0, activeChallenge.retryMax - activeChallenge.countTest),
                            deadlineAt: activeChallenge.deadlineAt,
                            ...(activeChallenge.type === 'number' ? { display: activePassword.display || 'keyboard' } : {}),
                            ...(activeChallenge.type === 'string' ? {
                                hint: Array.isArray(activePassword.hint) ? activePassword.hint.filter(index => Number.isInteger(index) && index >= 0 && index < activePassword.value.length) : [],
                                revealed: Array.isArray(activePassword.hint) ? activePassword.value.split('').map((char, index) => activePassword.hint.includes(index) ? char : null) : []
                            } : {}),
                            ...(activeChallenge.type === 'switch' ? { switchPanel: { count: Math.max(1, Math.min(100, String(activePassword.value || '').length)) } } : {}),
                            ...(activeChallenge.type === 'puzzle' ? { puzzle: { url: activePassword.url, ratio: activePassword.ratio ?? [3, 3], level: activePassword.level } } : {}),
                            ...(activeChallenge.type === 'find_way' ? { findWay: { area: activePassword.area, start: activePassword.start, target: activePassword.target } } : {})
                        }
                    );
                    this.isActionProcessing = false;
                    return { success: true, resumed: true, challengeId: activeChallenge.challengeId };
                }
                if (activeChallenge) {
                    this.notifyActionFailure('Action unavailable', 'Complete the active password challenge first.', 'action.challenge_active');
                    return { success: false, reason: 'challenge_active' };
                }
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
                        ...(passType === 'number' ? {
                            display: passDef.display || 'keyboard'
                        } : {}),
                        ...(passType === 'string' ? {
                            hint: Array.isArray(passDef.hint) ? passDef.hint.filter(index => Number.isInteger(index) && index >= 0 && index < passDef.value.length) : [],
                            revealed: Array.isArray(passDef.hint) ? passDef.value.split('').map((char, index) => passDef.hint.includes(index) ? char : null) : []
                        } : {}),
                        ...(passType === 'switch' ? {
                            switchPanel: { count: Math.max(1, Math.min(100, String(passDef.value || '').length)) }
                        } : {}),
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

    controlActionCooldown(actionId, control) {
        if (typeof actionId !== 'string' || !actionId || !['pause', 'resume'].includes(control)) return { success: false, reason: 'invalid_cooldown_control' };
        const state = this.api.engine.state;
        const actionDef = this.src?.actions?.[actionId];
        const runtime = state.getRuntimeSnapshot('actions.[id]', { id: actionId });
        if (!actionDef || !runtime || !(Number(actionDef.set?.cooldown) > 0)) return { success: false, reason: 'cooldown_not_found' };
        const now = Date.now();
        if (control === 'pause') {
            const cooldownEnd = runtime.cooldownEnd;
            if (!Number.isFinite(cooldownEnd) || cooldownEnd <= now || runtime.cooldownPaused === true) return { success: false, reason: runtime.cooldownPaused ? 'already_paused' : 'cooldown_not_active' };
            const remainingMs = Math.max(0, cooldownEnd - now);
            state.update('actions.[id]', current => ({ ...(current || {}), cooldownEnd: null, cooldownPaused: true, cooldownRemainingMs: remainingMs }), { id: actionId });
        } else {
            if (runtime.cooldownPaused !== true || !Number.isFinite(runtime.cooldownRemainingMs) || runtime.cooldownRemainingMs <= 0) return { success: false, reason: 'not_paused' };
            state.update('actions.[id]', current => ({ ...(current || {}), cooldownEnd: Date.now() + current.cooldownRemainingMs, cooldownPaused: false, cooldownRemainingMs: null }), { id: actionId });
        }
        const updated = state.getRuntimeSnapshot('actions.[id]', { id: actionId }) || {};
        this.protocol?.publish?.('action.cooldown.control', { actionId, control, remainingMs: updated.cooldownRemainingMs ?? (updated.cooldownEnd ? Math.max(0, updated.cooldownEnd - Date.now()) : null) });
        this.commitState?.('action.cooldown.control');
        return { success: true, actionId, paused: control === 'pause' };
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
                cooldownDuration: set.cooldown,
                cooldownPaused: false,
                cooldownRemainingMs: null
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

    async finishPasswordAction(actDef, actionKey, uniqueId, result, context = {}) {
        const state = this.api.engine.state;
        const sId = context.sceneId || state.get('sceneId');
        const rId = context.routerId || state.get('scene.activeRouterId', { id: sId });
        this.isActionProcessing = true;
        let commitAfterUnlock = null;
        try {
            if (result === 'cancel') {
                console.log(`[Flow] Action '${actionKey}' cancelled by user.`);
                return { success: false, reason: 'cancelled' };
            }
            if (result === true) {
                await this.executeActionSuccess(actDef, sId, rId, actionKey, uniqueId);
                if (!this.isTransitioning) this.commitState('action.changed');
                return { success: true };
            }
            if (result === 'expired' || result === 'exhausted') {
                const actStateKey = actionKey;
                // Every password failure, including deadline expiry, uses the
                // same authored pwFailed hook and counter.
                this.incrementActionCount(actStateKey, 'pwFailed');
                if (Array.isArray(actDef.effect?.pwFailed)) {
                    await this.processRunnables(actDef.effect.pwFailed, {
                        sceneId: sId, routerId: rId, actionId: actionKey, hook: 'pwFailed'
                    });
                }
                // The state snapshot must be published after isActionProcessing
                // is cleared; otherwise the projection can remain stuck as busy.
                commitAfterUnlock = result === 'expired' ? 'password.expired' : 'password.exhausted';
                return { success: false, reason: result };
            }
            return { success: false, reason: 'invalid_result' };
        } finally {
            this.isActionProcessing = false;
            if (commitAfterUnlock && !this.isTransitioning) this.commitState(commitAfterUnlock);
        }
    }
};