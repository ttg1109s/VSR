
export const ActionSystem = {
    getEffectiveActions(sId, rId) {
        if (!this.src || !this.src.scenes[sId] || !this.src.scenes[sId].routers[rId]) return [];

        const router = this.src.scenes[sId].routers[rId];
        let actions = [];
        const ensureThumb = (act) => {
            // Do not mutate nested metadata shared with the immutable scenario source.
            act.meta = { ...(act.meta || {}) };
            if (!act.meta.thumb) act.meta.thumb = 'assets/images/thumbnail.jpg';
            return act;
        };

        // [Refactor] Strict Mode: Prioritize Array format (Global Refs or Inline)
        if (Array.isArray(router.actions)) {
            router.actions.forEach(item => {
                if (typeof item === 'string') {
                    // Global Reference
                    const globalAct = this.src.actions ? this.src.actions[item] : null;
                    if (globalAct) {
                        let act = { id: item, source: 'global', ...globalAct };
                        ensureThumb(act);
                        actions.push(act);
                    } else {
                        console.error(`ActionSystem: Missing Global Action '${item}' in Router '${rId}'`);
                    }
                } else if (typeof item === 'object') {
                    // Inline Definition
                    let act = { ...item, source: 'inline' };
                    if (!act.id) act.id = `inline_${Math.random().toString(36).substr(2, 9)}`;
                    ensureThumb(act);
                    actions.push(act);
                }
            });
        } else if (router.actions && typeof router.actions === 'object') {
            // [DEPRECATED] Legacy Object/Map support
            // console.warn(`[Deprecation] Router '${rId}' uses Object-style actions.`);
            Object.keys(router.actions).forEach(key => {
                let act = { id: key, source: 'local', ...router.actions[key] };
                ensureThumb(act);
                actions.push(act);
            });
        }

        // Imports (Legacy feature)
        if (router.importAction && Array.isArray(router.importAction)) {
            router.importAction.forEach(imp => {
                try {
                    const targetRouterId = imp.of || rId;
                    const targetRouter = this.src.scenes[sId]?.routers?.[targetRouterId];
                    if (targetRouter && targetRouter.actions) {
                        // Complex resolve omitted for brevity
                    }
                } catch (e) {
                    console.error("ActionSystem: Error in importAction loop", e);
                }
            });
        }
        return actions;
        return actions;
    },

    markAsRead(uniqueId) {
        const state = this.api.engine.state;
        const current = state.getRuntimeSnapshot('actions.[id]', { id: uniqueId });
        if (current?.readDesc === true) return;
        state.update('actions.[id]', value => ({
            countClicks: 0,
            countFails: 0,
            display: 'show',
            ...(value || {}),
            readDesc: true
        }), { id: uniqueId });
        console.log(`[Action] Marked as read: ${uniqueId}`);
    },

    async handleAction(actionKey, uniqueId) {
        if (this.isActionProcessing || this.isTransitioning) {
            console.warn(`[Flow] Action ignored. Busy: Processing=${this.isActionProcessing}, Trans=${this.isTransitioning}`);
            return;
        }

        const state = this.api.engine.state;
        const sId = state.get('sceneId');
        const rId = state.get('scene.activeRouterId', { id: sId });

        if (!rId || !this.src.scenes[sId].routers[rId]) return;

        let actDef = null;

        // 1. Try Global Direct Lookup first
        if (this.src.actions && this.src.actions[actionKey]) {
            actDef = this.src.actions[actionKey];
        }

        // 2. If not found or specific override needed, search in effective actions
        if (!actDef) {
            const effective = this.getEffectiveActions(sId, rId);
            const found = effective.find(a => a.id === actionKey);
            if (found) actDef = found;
        }

        if (!actDef) return;

        console.log(`[Flow] >>> CLICK ACTION: ${actionKey}`);

        const set = actDef.set || {};

        // --- Identity / Faker Logic ---
        // Determine Current Identity (Who is the player acting as?)
        // --- Identity / Faker Logic ---
        const entryChar = state.get('entryCharacter') || 'player';
        const faker = state.getRuntimeSnapshot('faker') || {};
        const fakerMode = this.getConfig ? this.getConfig('fakerMode') : 'soul';

        let actingIds = [entryChar]; // Default: Only the true body can act

        if (faker.active) {
            const targetId = faker.targetId;
            // [Faker Mode Logic]
            if (fakerMode === 'mask') {
                // Mask Mode: Allow acting as the disguised Identity
                actingIds.push(targetId);
            } else if (fakerMode === 'swap') {
                // Swap Mode: Entry Character is ALREADY the targetId (handled in FakerSystem)
                // So entryChar == targetId. actingIds is correct.
            } else {
                // Soul Mode: Do NOT add targetId. Can only act as 'player' (entryChar).
                // Requirement: "Không được hưởng quyền action dù đang link với char_id" -> Strict Soul.
            }
        }

        let isAllowed = true;
        let blockReason = "Danh tính hiện tại không thể thực hiện hành động này.";

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
                    blockReason = `Bạn đang ở dạng ${fakerMode} và không có quyền của nhân vật này.`;
                } else {
                    blockReason = `Cần phải là ${charAllow.map(id => state.getRuntimeSnapshot('characters.[id]', { id })?.set?.name || id).join(', ')} mới thực hiện được.`;
                }
            }
        } else {
            // Empty charAllow -> Usually means "Anyone" or "Default Player".
        }

        if (!isAllowed) {
            if (actDef.effect?.normal) {
                await this.processRunnables(actDef.effect.normal, { sceneId: sId, routerId: rId, actionId: actionKey, hook: 'normal' });
            }
            this.api.presentation.effects.shake(uniqueId);
            this.api.presentation.notification.add("Bị chặn", blockReason, "warn");
            this.commitState('action.changed'); // Re-render to update UI states if needed
            return { success: false, reason: 'permission_denied' };
        }

        // --- Desc Read Validation ---
        const allDescRead = this.getConfig('allDescRead');
        const actStateKey = `${sId}_${rId}_${actionKey}`;
        // Ensure state checking
        const currentState = this.api.engine.state.getRuntimeSnapshot('actions.[id]', { id: actStateKey }) || {};

        // Does this action effectively require reading?
        const requiresRead = (allDescRead || set.readDesc === true) && !!actDef.meta?.desc;
        const hasBeenRead = currentState.readDesc === true;

        if (requiresRead && !hasBeenRead) {
            console.log(`[Flow] Blocked: Description not read for ${actionKey}`);
            return { success: false, reason: 'not_read' };
        }

        // --- Execution ---
        try {
            this.isActionProcessing = true;

            // Stop Automations
            const automations = state.getRuntimeSnapshot('automations') || {};
            Object.keys(automations).forEach(autoId => {
                if (automations[autoId].active) this.stopAutomation(autoId);
            });

            // Update the action counter without retaining a mutable state reference.
            const actStateKey = `${sId}_${rId}_${actionKey}`;
            state.update('actions.[id]', current => ({
                countClicks: 0,
                countFails: 0,
                display: 'show',
                ...(current || {}),
                countClicks: ((current || {}).countClicks || 0) + 1
            }), { id: actStateKey });
            const actState = state.getRuntimeSnapshot('actions.[id]', { id: actStateKey });

            // Check Cooldown
            // [FIXED] Use internal logic for Cooldown timestamps as they are runtime only (not mapped in Schema for 'End Time')
            if (set.cooldown && set.cooldown > 0 && actState.cooldownEnd && actState.cooldownEnd > Date.now()) {
                this.api.presentation.effects.shake(uniqueId);
                const rem = Math.ceil((actState.cooldownEnd - Date.now()) / 1000);
                this.api.presentation.notification.add("Thao tác thất bại", `Vui lòng đợi ${rem}s`, "warn");
                this.isActionProcessing = false;
                return;
            }

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
                const checkRes = this.checkReq(actDef.requirement);
                checkPassed = checkRes.pass;
                failType = checkRes.type;
            }

            if (!checkPassed) {
                state.update('actions.[id].countFails', current => (Number(current) || 0) + 1, { id: actStateKey });
                this.api.presentation.effects.shake(uniqueId);

                const failActions = {
                    item_surplus: () => this.api.presentation.notification.add("Cảnh báo", "Bạn đang cầm thừa vật phẩm!", "warn"),
                    item_missing: () => this.api.presentation.notification.add("Cảnh báo", "Thiếu vật phẩm yêu cầu!", "warn"),
                    item_order: () => this.api.presentation.notification.add("Cảnh báo", "Sai thứ tự vật phẩm!", "warn")
                };
                if (failType && failActions[failType]) {
                    failActions[failType]();
                } else if (this.getConfig && this.getConfig('defaultNotice')) {
                    this.api.presentation.notification.add("Thất bại", "Chưa đủ điều kiện thực hiện.", "warn");
                }

                // Fail Effect
                if (actDef.effect?.fail) {
                    console.log(`[Flow] Effect 'fail' start`);
                    await this.processRunnables(actDef.effect.fail, { sceneId: sId, routerId: rId, actionId: actionKey, hook: 'fail' });
                }

                this.commitState('action.changed');
                return;
            }

            // Password Check
            if (set.password) {
                const parts = set.password.split(':');
                if (parts.length >= 2) {
                    const passType = parts[0];
                    const passId = parts[1];
                    const passDef = this.src.passwords && this.src.passwords[passType] ? this.src.passwords[passType][passId] : null;

                    if (passDef) {
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
                                deadlineAt: challenge.deadlineAt
                            }
                        );
                        // The player may now interact; do not hold the global action lock while waiting.
                        this.isActionProcessing = false;
                        return;
                    } else {
                        console.error(`[Flow] Password Definition NOT FOUND: ${set.password}`);
                        this.api.presentation.notification.add("Lỗi Config", "Không tìm thấy định nghĩa mật khẩu.", "error");
                        this.isActionProcessing = false; // Release lock manually because finally block skips this check
                    }
                }
            }

            // Success Execution
            await this.executeActionSuccess(actDef, sId, rId, actionKey, uniqueId);

            if (!this.isTransitioning) {
                this.commitState('action.changed');
            }

        } catch (err) {
            console.error("[Flow] Action execution error:", err);
        } finally {
            // Only release lock if NOT a password action (password UI handles its own flow)
            if (!set.password) {
                this.isActionProcessing = false;
            }
        }
        return { success: true };
    },

    async executeActionSuccess(actDef, sId, rId, actionKey, uniqueId) {
        const set = actDef.set || {};
        const state = this.api.engine.state;
        const actStateKey = `${sId}_${rId}_${actionKey}`;

        // Set Cooldown
        if (set.cooldown && set.cooldown > 0 && state.getRuntimeSnapshot('actions.[id]', { id: actStateKey })) {
            state.update('actions.[id]', current => ({
                ...(current || {}),
                cooldownEnd: Date.now() + (set.cooldown * 1000),
                cooldownDuration: set.cooldown
            }), { id: actStateKey });
        }

        // Pass Effect
        // Pass Effect
        // [MOD] Allow pass effect to run if requirement is true OR if it's explicitly false (general success)
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
                return { success: false, reason: 'expired' };
            }
            if (result === true) {
                await this.executeActionSuccess(actDef, sId, rId, actionKey, uniqueId);
                if (!this.isTransitioning) this.commitState('action.changed');
                return { success: true };
            }
            if (result === 'exhausted') {
                const actStateKey = `${sId}_${rId}_${actionKey}`;
                if (state.getRuntimeSnapshot('actions.[id]', { id: actStateKey })) {
                    state.update('actions.[id].countFails', current => (Number(current) || 0) + 1, { id: actStateKey });
                }
                if (actDef.effect?.pwFailed) {
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