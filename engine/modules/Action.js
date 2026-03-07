import { API } from '../../api/index.js';

export const ActionSystem = {
    getEffectiveActions(sId, rId) {
        if (!this.src || !this.src.scenes[sId] || !this.src.scenes[sId].routers[rId]) return [];

        const router = this.src.scenes[sId].routers[rId];
        let actions = [];
        const ensureThumb = (act) => { if (!act.meta.thumb) act.meta.thumb = 'assets/images/thumbnail.jpg'; return act; };

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
        if (!this.state.actions[uniqueId]) {
            this.state.actions[uniqueId] = { countClicks: 0, countFails: 0, display: 'show', readDesc: false };
        }
        // Only update if not already read
        if (!this.state.actions[uniqueId].readDesc) {
            this.state.actions[uniqueId].readDesc = true;
            console.log(`[Action] Marked as read: ${uniqueId}`);
        }
    },

    async handleAction(actionKey, uniqueId) {
        if (this.isActionProcessing || this.isTransitioning) {
            console.warn(`[Flow] Action ignored. Busy: Processing=${this.isActionProcessing}, Trans=${this.isTransitioning}`);
            return;
        }

        const sId = this.state.sceneId;
        const rId = this.state.scenes[sId].activeRouterId;

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
        const entryChar = this.state.meta?.entryCharacter || 'player';
        const fakerMode = this.getConfig ? this.getConfig('fakerMode') : 'soul';

        let actingIds = [entryChar]; // Default: Only the true body can act

        if (this.state.faker && this.state.faker.active) {
            const targetId = this.state.faker.targetId;
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
                if (this.state.faker.active) {
                    blockReason = `Bạn đang ở dạng ${fakerMode} và không có quyền của nhân vật này.`;
                } else {
                    blockReason = `Cần phải là ${charAllow.map(id => this.state.characters[id]?.set?.name || id).join(', ')} mới thực hiện được.`;
                }
            }
        } else {
            // Empty charAllow -> Usually means "Anyone" or "Default Player".
        }

        if (!isAllowed) {
            if (actDef.effect?.normal) {
                await this.processRunnables(actDef.effect.normal, { sceneId: sId, routerId: rId, actionId: actionKey, hook: 'normal' });
            }
            API.render.effects.shake(uniqueId);
            API.render.notification.add("Bị chặn", blockReason, "warn");
            this.render(); // Re-render to update UI states if needed
            return { success: false, reason: 'permission_denied' };
        }

        // --- Desc Read Validation ---
        const allDescRead = this.getConfig('allDescRead');
        const actStateKey = `${sId}_${rId}_${actionKey}`;
        // Ensure state checking
        const currentState = this.state.actions[actStateKey] || {};

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
            Object.keys(this.state.automations).forEach(autoId => {
                if (this.state.automations[autoId].active) this.stopAutomation(autoId);
            });

            // Update State (Write Operation - Keep Direct Access)
            const actStateKey = `${sId}_${rId}_${actionKey}`;
            if (!this.state.actions[actStateKey]) {
                this.state.actions[actStateKey] = { countClicks: 0, countFails: 0, display: 'show' };
            }
            const actState = this.state.actions[actStateKey];
            actState.countClicks++;

            // Check Cooldown
            // [FIXED] Use internal logic for Cooldown timestamps as they are runtime only (not mapped in Schema for 'End Time')
            if (set.cooldown && set.cooldown > 0 && actState.cooldownEnd && actState.cooldownEnd > Date.now()) {
                API.render.effects.shake(uniqueId);
                const rem = Math.ceil((actState.cooldownEnd - Date.now()) / 1000);
                API.render.notification.add("Thao tác thất bại", `Vui lòng đợi ${rem}s`, "warn");
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
                actState.countFails++;
                API.render.effects.shake(uniqueId);

                const failActions = {
                    item_surplus: () => API.render.notification.add("Cảnh báo", "Bạn đang cầm thừa vật phẩm!", "warn"),
                    item_missing: () => API.render.notification.add("Cảnh báo", "Thiếu vật phẩm yêu cầu!", "warn"),
                    item_order: () => API.render.notification.add("Cảnh báo", "Sai thứ tự vật phẩm!", "warn")
                };
                if (failType && failActions[failType]) {
                    failActions[failType]();
                } else if (this.getConfig && this.getConfig('defaultNotice')) {
                    API.render.notification.add("Thất bại", "Chưa đủ điều kiện thực hiện.", "warn");
                }

                // Fail Effect
                if (actDef.effect?.fail) {
                    console.log(`[Flow] Effect 'fail' start`);
                    await this.processRunnables(actDef.effect.fail, { sceneId: sId, routerId: rId, actionId: actionKey, hook: 'fail' });
                }

                this.render();
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
                        passDef._type = passType;
                        API.render.components.keyboard(actDef, actionKey, uniqueId, passDef);
                        // Return here and let the PasswordSystem callback handle the rest
                        return;
                    } else {
                        console.error(`[Flow] Password Definition NOT FOUND: ${set.password}`);
                        API.render.notification.add("Lỗi Config", "Không tìm thấy định nghĩa mật khẩu.", "error");
                        this.isActionProcessing = false; // Release lock manually because finally block skips this check
                    }
                }
            }

            // Success Execution
            await this.executeActionSuccess(actDef, sId, rId, actionKey, uniqueId);

            if (!this.isTransitioning) {
                this.render();
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
        const actState = this.state.actions[`${sId}_${rId}_${actionKey}`];

        // Set Cooldown
        if (set.cooldown && set.cooldown > 0 && actState) {
            actState.cooldownEnd = Date.now() + (set.cooldown * 1000);
            actState.cooldownDuration = set.cooldown;
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

    async finishPasswordAction(actDef, actionKey, uniqueId, success) {
        const sId = this.state.sceneId;
        const rId = this.state.scenes[sId].activeRouterId;

        this.isActionProcessing = true;
        try {
            if (success === 'cancel') {
                console.log(`[Flow] Action '${actionKey}' cancelled by user.`);
                return; // Finally block will release lock
            }

            if (success) {
                await this.executeActionSuccess(actDef, sId, rId, actionKey, uniqueId);
                if (!this.isTransitioning) this.render();
            } else {
                const actState = this.state.actions[`${sId}_${rId}_${actionKey}`];
                if (actState) {
                    actState.countFails++;
                    // [REQ] countTest = retryMax => pwFail effect ONLY. Do NOT lock action.
                    // actState.display = 'locked'; 
                }

                API.render.effects.shake(uniqueId);

                if (actDef.effect?.pwFailed) {
                    console.log(`[Flow] Effect 'pwFailed' start`);
                    await this.processRunnables(actDef.effect.pwFailed, {
                        sceneId: sId, routerId: rId, actionId: actionKey, hook: 'pwFailed'
                    });
                }
            }
        } finally {
            this.isActionProcessing = false;
        }
    }
};