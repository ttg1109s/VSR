import { getSpritePresentationData } from './Sprite.js';


export const SceneSystem = {
    snapshotRouterTasks(sceneId, routerId) {
        if (!sceneId || !routerId) return { remainingTimers: {}, pausedTasks: [], timerState: this.timerState ? { ...this.timerState } : null };
        const ids = [
            `router_still_${sceneId}_${routerId}`,
            `timer_ui_${sceneId}_${routerId}`,
            `timer_end_${sceneId}_${routerId}`
        ];
        const remainingTimers = {};
        const pausedTasks = [];
        ids.forEach(id => {
            const task = this.taskManager?.plan?.[id];
            if (!task || !this.taskManager?.running?.[id]) return;
            const remaining = this.taskManager.getRemaining?.(id);
            if (Number.isFinite(remaining)) remainingTimers[id] = Math.max(1, remaining);
            if (task.isPaused) pausedTasks.push(id);
        });
        return { remainingTimers, pausedTasks, restoreStill: !!this.taskManager?.running?.[ids[0]], timerState: this.timerState ? { ...this.timerState } : null };
    },

    restoreRouterTasks(snapshot, sceneId, routerId) {
        if (!snapshot || !sceneId || !routerId) return;
        const state = this.api.engine.state;
        if (state.get('sceneId') !== sceneId || state.get('scene.activeRouterId', { id: sceneId }) !== routerId) return;
        this.currentStillTask = null;
        this.activeTimerTasks = [];
        this.timerState = snapshot.timerState ? { ...snapshot.timerState } : null;
        this.rehydrateRouterTasks(snapshot.remainingTimers || {}, snapshot.pausedTasks || [], snapshot.restoreStill);
    },

    // Navigation requests are serialized across scene/router entry points.
    // The coordinator is runtime-local and rejects stale work after reset.
    withNavigationTransition(work) {
        this._navigationQueue ||= Promise.resolve();
        this._navigationSequence ||= 0;
        const runtime = this.runtime;
        const generation = this._lifecycleGeneration || 0;
        const run = async () => {
            if (runtime && (this.runtime !== runtime || (this._lifecycleGeneration || 0) !== generation)) {
                return { success: false, reason: 'stale_transition' };
            }
            if (this.endingState) return { success: false, reason: 'scenario_ended' };
            const token = Object.freeze({
                id: ++this._navigationSequence,
                generation,
                runtime
            });
            this._navigationOwner = token;
            try {
                return await work(token);
            } finally {
                if (this._navigationOwner === token) this._navigationOwner = null;
            }
        };
        const result = this._navigationQueue.then(run, run);
        this._navigationQueue = result.catch(() => undefined);
        return result;
    },

    isNavigationOwner(token) {
        return !!token && this._navigationOwner === token &&
            (!token.runtime || (this.runtime === token.runtime && (this._lifecycleGeneration || 0) === token.generation));
    },

    enterScene(id, skipTransition = false) {
        return this.withNavigationTransition(() => {
            // Automatically skip animation when navigation stays within a parent-child
            // Scene relationship. Keep explicit skipTransition as an unconditional override.
            const autoSkipTransition = this.shouldSkipTransition(id);
            return this._enterSceneCore(id, skipTransition || autoSkipTransition);
        });
    },

    enterRouter(routerId, forceRender = false, isSceneEntry = false, skipTransition = false) {
        return this.withNavigationTransition(() => this._enterRouterCore(routerId, forceRender, isSceneEntry, skipTransition));
    },

    // [NEW] API to get Scene Path from Loader's generated SceneTree
    getPath(sceneId) {
        const state = this.api.engine.state;
        if (!sceneId) sceneId = state.get('sceneId');
        return state.getRuntimeSnapshot('sceneTree.[id]', { id: sceneId }) || [];
    },

    shouldSkipTransition(targetSceneId) {
        const currentSceneId = this.api.engine.state.get('sceneId');
        if (!currentSceneId || !targetSceneId) return false;

        // Skip transition only when navigating upward from a child Scene to an ancestor.
        const currentPath = this.getPath(currentSceneId);
        const isTargetParent = currentPath.some(node => node.id === targetSceneId);
        return isTargetParent;
    },

    async _enterSceneCore(id, skipTransition = false) {
        const state = this.api.engine.state;
        if (!state.getRuntimeSnapshot('scenes.[id]', { id })) {
            console.error(`Scene '${id}' not found.`);
            return;
        }
        if (this.checkHardLock('scene', id)) {
            return { success: false, reason: 'target_locked' };
        }
        const activeRouter = state.getRuntimeSnapshot('scenes.[id]', { id })?.activeRouterId;
        if (!activeRouter || !this.src?.scenes?.[id]?.routers?.[activeRouter]) {
            return { success: false, reason: 'invalid_target_router' };
        }
        if (this.checkHardLock('router', activeRouter)) {
            return { success: false, reason: 'target_locked' };
        }

        const configuredTransition = this.src.scenes[id].set?.transition;
        const transitionBlockMayBeActive = !skipTransition && configuredTransition && configuredTransition !== 'none';
        const currentS = state.get('sceneId');
        const currentRouter = currentS ? state.getRuntimeSnapshot('scenes.[id]', { id: currentS })?.activeRouterId : null;
        const previousCurrentRouterTasks = this.snapshotRouterTasks(currentS, currentRouter);
        const targetRouterKey = `${id}_${activeRouter}`;
        const previousTargetRouterState = state.getRuntimeSnapshot('routers.[id]', { id: targetRouterKey });
        this._transitionPhase = 'PREPARE';
        this.pauseSceneTransitionRuntime();
        const faker = state.getRuntimeSnapshot('faker') || {};
        const entryChar = state.get('entryCharacter') || 'player';
        const currentIdentity = faker.active ? faker.targetId : entryChar;

        // Logic: Entry identity leaves the current scene (trigger character leave effects for characters remaining there)
        if (currentS && currentS !== id) {
            const characters = state.getRuntimeSnapshot('characters') || {};
            Object.keys(characters).forEach(charId => {
                if (charId === entryChar) return;

                const char = characters[charId];
                // [REFACTOR] Use 'char.place.scene_id'
                if (char.place.scene_id === currentS) {
                    // [FIX V9.2] Leave Logic: Access Object by currentIdentity Key
                    if (char.effect && char.effect.leave) {
                        const leaveEffects = char.effect.leave[currentIdentity];

                        if (Array.isArray(leaveEffects)) {
                            this.processRunnables(leaveEffects, {
                                sceneId: currentS,
                                charId: charId,
                                hook: `leave:${currentIdentity}`
                            }, true).catch(e => console.warn("Char leave err:", e));
                        }
                    }
                }
            });
        }

        const previousEntryScene = state.getRuntimeSnapshot('characters.[id]', { id: entryChar })?.place?.scene_id;
        const previousPrevRouter = state.get('prevRouter');

        // Scene state remains Engine-internal PREPARE data until START has
        // acknowledged its cover peak. The target Scene ID is passed separately.
        try {
            const result = await this._enterRouterCore(activeRouter, true, true, skipTransition, id);
            if (result?.success === false) {
                this.resumeSceneTransitionRuntime();
                this.isTransitioning = false;
                this._transitionPhase = 'IDLE';
                state.set('sceneId', currentS || '');
                state.set('prevRouter', previousPrevRouter ?? null);
                if (previousTargetRouterState) state.set('routers.[id]', previousTargetRouterState, { id: targetRouterKey });
                else state.delete('routers.[id]', { id: targetRouterKey });
                if (state.getRuntimeSnapshot('characters.[id]', { id: entryChar })) state.set('char.scene_id', previousEntryScene, { id: entryChar });
                if (currentS) { this.render(); this.restoreRouterTasks(previousCurrentRouterTasks, currentS, currentRouter); }
                if (transitionBlockMayBeActive) { try { await this.releaseSceneTransitionUiBlock(); } catch (releaseError) { console.warn('UI release failed', releaseError); } }
                this.isTransitioning = false;
                this._transitionPhase = 'IDLE';
                return result;
            }
        } catch (error) {
            this.resumeSceneTransitionRuntime();
            this.isTransitioning = false;
            this._transitionPhase = 'IDLE';
            state.set('sceneId', currentS || '');
            state.set('prevRouter', previousPrevRouter ?? null);
            if (previousTargetRouterState) state.set('routers.[id]', previousTargetRouterState, { id: targetRouterKey });
            else state.delete('routers.[id]', { id: targetRouterKey });
            if (state.getRuntimeSnapshot('characters.[id]', { id: entryChar })) state.set('char.scene_id', previousEntryScene, { id: entryChar });
            if (currentS) { this.render(); this.restoreRouterTasks(previousCurrentRouterTasks, currentS, currentRouter); }
            if (transitionBlockMayBeActive) {
                try { await this.releaseSceneTransitionUiBlock(); } catch (releaseError) { console.warn('Transition UI block release failed during rollback:', releaseError); }
            }
            this.isTransitioning = false;
            this._transitionPhase = 'IDLE';
            throw error;
        }

        // Character movement and entry effects are owned by each Character's moveList.

        if (this.api.presentation && this.api.presentation.components && this.api.presentation.components.updateCharacterList) {
            this.api.presentation.components.updateCharacterList();
        }
        if (!currentS) this.initCharactersMoving?.();
        try {
            this._transitionPhase = 'COMMIT';
            // Engine transition is complete after END/render-ready. Publish the
            // committed Scene with actions no longer marked busy, while UI stays
            // input-blocked until the explicit release request is acknowledged.
            this.isTransitioning = false;
            this.commitState('scene.entered');
            this.resumeSceneTransitionRuntime();
            this._transitionPhase = 'ACTIVATE';
            this.activateRouterPostTransition({
                state,
                sId: id,
                routerId: activeRouter,
                rd: this.src.scenes[id].routers[activeRouter],
                rSet: state.getRuntimeSnapshot('routers.[id]', { id: `${id}_${activeRouter}` }) || {},
                rConfigSet: this.src.scenes[id].routers[activeRouter].set || {}
            });
            if (transitionBlockMayBeActive) await this.releaseSceneTransitionUiBlock();
        } finally {
            this.isTransitioning = false;
            this._transitionPhase = 'IDLE';
        }
        return { success: true, sceneId: id, routerId: activeRouter };
    },

        pauseSceneTransitionRuntime() {
        this.pauseBackgroundTasks?.();
        this.pauseEffectQueues?.();
    },

    resumeSceneTransitionRuntime() {
        this.resumeEffectQueues?.();
        this.resumeBackgroundTasks?.();
    },

    applySceneTransitionTargetState(state, sceneId, routerId, routerKey) {
        const previousSceneId = state.get('sceneId');
        const entryChar = state.get('entryCharacter') || 'player';
        const previousRouter = previousSceneId
            ? state.getRuntimeSnapshot('scenes.[id]', { id: previousSceneId })?.activeRouterId
            : null;
        if (previousRouter) state.set('prevRouter', previousRouter);
        state.set('sceneId', sceneId);
        if (state.getRuntimeSnapshot('characters.[id]', { id: entryChar })) {
            state.set('char.scene_id', sceneId, { id: entryChar });
        }
        state.set('scene.activeRouterId', routerId, { id: sceneId });
        state.update('routers.[id]', current => ({
            blocked: false,
            visited: false,
            countVisited: 0,
            ...(current || {}),
            visited: true,
            countVisited: ((current || {}).countVisited || 0) + 1
        }), { id: routerKey });
        this.render();
        this._transitionPhase = 'TARGET_RENDERED';
    },

    async runSceneTransitionStartPhase(type, durationSeconds) {
        return this.requestSceneTransitionPhase('start', type, durationSeconds);
    },

    async waitForSceneTargetRenderReady(sceneId, routerId) {
        this._transitionPhase = 'TARGET_RENDER_READY';
        return this.requestSceneRenderReady({ stage: 'target', sceneId, routerId, revision: this.protocol?.stateRevision ?? null });
    },

    async runSceneTransitionEndPhase(type, durationSeconds) {
        this._transitionPhase = 'TRANSITION_END';
        return this.requestSceneTransitionPhase('end', type, durationSeconds);
    },

    async waitForSceneTransitionCompletion(sceneId, routerId) {
        this._transitionPhase = 'RENDER_READY';
        return this.requestSceneRenderReady({ stage: 'complete', sceneId, routerId, revision: this.protocol?.stateRevision ?? null });
    },

    async releaseSceneTransitionUiBlock() {
        const release = this.api.presentation.scene.releaseTransitionBlock;
        if (typeof release !== 'function') return { status: 'headless' };
        const acknowledgement = await release();
        if (acknowledgement && !['committed', 'completed', 'ready', 'headless'].includes(acknowledgement.status)) {
            throw new Error(`Transition UI block release was not acknowledged (status: ${acknowledgement?.status || 'missing'}).`);
        }
        return acknowledgement;
    },

    async requestSceneTransitionPhase(phase, transitionType, durationSeconds) {
        const acknowledgement = await this.api.presentation.scene.transition(phase, transitionType, durationSeconds);
        if (acknowledgement && !['committed', 'completed', 'ready', 'headless'].includes(acknowledgement.status)) {
            throw new Error(`Scene transition ${phase} was not acknowledged by UI (status: ${acknowledgement?.status || 'missing'}).`);
        }
        return acknowledgement;
    },

    async requestSceneRenderReady(payload) {
        const acknowledgement = await this.api.presentation.scene.renderReady(payload, { timeoutMs: 10000 });
        if (acknowledgement && !['committed', 'completed', 'ready', 'headless'].includes(acknowledgement.status)) {
            throw new Error(`Scene render-ready was not acknowledged by UI (status: ${acknowledgement?.status || 'missing'}).`);
        }
        return acknowledgement;
    },

async _enterRouterCore(routerId, forceRender = false, isSceneEntry = false, skipTransition = false, targetSceneId = null) {
        const state = this.api.engine.state;
        const sId = isSceneEntry && targetSceneId ? targetSceneId : state.get('sceneId');
        if (!routerId || !this.src?.scenes?.[sId]?.routers?.[routerId]) return;
        if (this.checkHardLock('router', routerId)) {
            return { success: false, reason: 'target_locked' };
        }

        const rKey = `${sId}_${routerId}`;
        const previousRouterRuntime = state.getRuntimeSnapshot('routers.[id]', { id: rKey });
        const previousRouterTasks = this.snapshotRouterTasks(sId, state.getRuntimeSnapshot('scenes.[id]', { id: sId })?.activeRouterId);
        const previousActiveRouter = state.getRuntimeSnapshot('scenes.[id]', { id: sId })?.activeRouterId;
        const previousPrevRouter = state.get('prevRouter');
        this._transitionPhase = 'PREPARE';
        if (!state.getRuntimeSnapshot('routers.[id]', { id: rKey })) {
            state.set('routers.[id]', { blocked: false, visited: false, countVisited: 0 }, { id: rKey });
        }

        const rd = this.src.scenes[sId].routers[routerId];
        const rSet = state.getRuntimeSnapshot('routers.[id]', { id: rKey });
        const rConfigSet = rd.set || {};

        let transType = null;
        let transDuration = 1.5;

        if (isSceneEntry) {
            const sSet = this.src.scenes[sId].set || {};
            const runtimeSceneSet = state.getRuntimeSnapshot('scenes.[id]', { id: sId }) || {};
            const minimum = Number(this.getConfig?.('minTransition') ?? 2);
            transType = runtimeSceneSet.transition ?? sSet.transition;
            const authoredDuration = runtimeSceneSet.transitionDuration ?? sSet.transitionDuration ?? minimum;
            transDuration = Math.max(Number.isFinite(minimum) && minimum >= 0 ? minimum : 2, Number.isFinite(Number(authoredDuration)) ? Number(authoredDuration) : 0);
        } else {
            // Router navigation is intentionally instant; transitions belong to Scene entry only.
            transType = null;
            transDuration = 0;
        }

        if (skipTransition) {
            transType = null;
            transDuration = 0;
        }

        const totalTimeMs = transDuration * 1000;
        const timeIn = skipTransition ? 0 : totalTimeMs * 0.4;
        const timeOut = skipTransition ? 0 : totalTimeMs * 0.6;

        this.isTransitioning = true;
        // _enterSceneCore already pauses runtime work for Scene entry. Router
        // navigation pauses here; avoid a duplicate pause for Scene navigation.
        if (!isSceneEntry) this.pauseSceneTransitionRuntime();
        try {
        if (transType && transType !== 'none' && !skipTransition) {
            await this.runSceneTransitionStartPhase(transType, timeIn / 1000);
        }
        if (this.currentStillTask) { this.taskManager.kill(this.currentStillTask); this.currentStillTask = null; }
        this.activeTimerTasks.forEach(taskId => this.taskManager.kill(taskId));
        this.activeTimerTasks = [];

        this.timerState = null;
        this.api.presentation.scene.hideTimer();

        const oldRouterId = state.getRuntimeSnapshot('scenes.[id]', { id: sId })?.activeRouterId;
        if (!isSceneEntry && oldRouterId && oldRouterId !== routerId) {
            const oldRd = this.src.scenes[sId].routers[oldRouterId];
            if (oldRd && oldRd.loop && oldRd.loop.leave) {
                this.processRunnables(oldRd.loop.leave, { sceneId: sId, routerId: oldRouterId, hook: 'leave' }, true)
                    .catch(e => console.warn("Router leave err:", e));
            }
        }

        if (!isSceneEntry && oldRouterId && oldRouterId !== routerId) state.set('prevRouter', oldRouterId);
        if (isSceneEntry) {
            this.applySceneTransitionTargetState(state, sId, routerId, rKey);
        } else {
            state.set('scene.activeRouterId', routerId, { id: sId });
            state.update('routers.[id]', current => ({
                blocked: false,
                visited: false,
                countVisited: 0,
                ...(current || {}),
                visited: true,
                countVisited: ((current || {}).countVisited || 0) + 1
            }), { id: rKey });
            this.render();
            this._transitionPhase = 'TARGET_RENDERED';
        }

        const ovType = rSet.overlay !== undefined ? rSet.overlay : rConfigSet.overlay;
        const ovFlick = rSet.overlayFlick !== undefined ? rSet.overlayFlick : rConfigSet.overlayFlick;

        const ovFlicker = typeof ovFlick === 'number' && ovFlick >= 2 ? ovFlick : null;

        if (this.api.presentation.vfx && this.api.presentation.vfx.exec) {
            this.api.presentation.vfx.exec('overlay', ovType || 'none', {
                element: 'vfx-layer',
                duration: null, // Router overlays are usually permanent until changed
                flicker: ovFlicker,
                id: 'router_overlay' // Fixed ID for router overlay to ensure replacement
            });
        }

        // Wait until the target React render is committed before continuing.
        await this.waitForSceneTargetRenderReady(sId, routerId);

        if (transType && transType !== 'none' && !skipTransition) {
            await this.runSceneTransitionEndPhase(transType, timeOut / 1000);
        }

        if (!skipTransition && this.api.presentation.scene.renderReady) {
            await this.waitForSceneTransitionCompletion(sId, routerId);
        }

        this._transitionPhase = 'COMMIT';
        if (!isSceneEntry) {
            this.commitState?.('router.entered');
            this.resumeEffectQueues?.();
            this.resumeBackgroundTasks?.();
        }

        if (!isSceneEntry) {
            this.activateRouterPostTransition({ state, sId, routerId, rd, rSet, rConfigSet });
        }
        return { success: true, sceneId: sId, routerId };
        } catch (error) {
            // Roll back state mutations made during PREPARE/RENDER_READY/TRANSITION_END.
            if (!isSceneEntry) {
                if (previousRouterRuntime) state.set('routers.[id]', previousRouterRuntime, { id: rKey });
                else state.delete('routers.[id]', { id: rKey });
                if (previousActiveRouter !== undefined) state.set('scene.activeRouterId', previousActiveRouter, { id: sId });
                if (previousPrevRouter !== undefined) state.set('prevRouter', previousPrevRouter);
                else state.set('prevRouter', null);
                try { this.render(); this.restoreRouterTasks(previousRouterTasks, sId, previousActiveRouter); } catch (renderError) { console.warn('Transition rollback restoration failed:', renderError); }
            }
            throw error;
        } finally {
            if (!isSceneEntry) {
                this.isTransitioning = false;
                this._transitionPhase = 'IDLE';
                this.resumeSceneTransitionRuntime();
            }
        }
    },

    activateRouterPostTransition({ state, sId, routerId, rd, rSet, rConfigSet }) {
        try {
            if (rd.loop && rd.loop.enter) {
            this.processRunnables(rd.loop.enter, { sceneId: sId, routerId, hook: 'enter' }, true)
                .catch(e => console.error("Router Enter Loop Error:", e));
        }

        const secondsStill = (rSet.secondsStill !== undefined) ? rSet.secondsStill : (rConfigSet.secondsStill || 0);
        if (rd.loop && rd.loop.still && rd.loop.still.length > 0 && secondsStill >= 5) {
            const taskId = `router_still_${sId}_${routerId}`;
            this.currentStillTask = taskId;
            this.taskManager.addNew(taskId, {
                time: secondsStill * 1000,
                mode: 'interval',
                exe: () => {
                    if (state.get('sceneId') === sId && state.get('scene.activeRouterId', { id: sId }) === routerId) {
                        this.processRunnables(rd.loop.still, { sceneId: sId, routerId, hook: 'still' }, true)
                            .catch(e => console.error("Still Loop Error:", e));
                    }
                }
            });
            this.taskManager.operator(taskId, 'enabled');
        }

        if (rConfigSet.timer && rConfigSet.timerSeconds >= 1.5) {
            if (rd.timer && rd.timer.start) {
                this.processRunnables(rd.timer.start, { sceneId: sId, routerId, hook: 't_start' }, true);
            }

            const maxTimeSeconds = rConfigSet.timerSeconds;
            const displayMode = rConfigSet.timerDisplay || 'dec';
            const durationMs = maxTimeSeconds * 1000;
            const endTime = Date.now() + durationMs;

            const uiTaskId = `timer_ui_${sId}_${routerId}`;
            const endTaskId = `timer_end_${sId}_${routerId}`;

            this.updateTimerUI(maxTimeSeconds, displayMode, maxTimeSeconds);

            this.taskManager.addNew(uiTaskId, {
                time: 1000,
                mode: 'timeout',
                exe: () => {
                    if (state.get('sceneId') !== sId || state.get('scene.activeRouterId', { id: sId }) !== routerId) return;
                    const remainingMs = this.taskManager.getRemaining(endTaskId);
                    const remainingSeconds = remainingMs === null
                        ? Math.ceil((endTime - Date.now()) / 1000)
                        : Math.max(0, Math.ceil(remainingMs / 1000));
                    if (remainingSeconds >= 0) {
                        this.updateTimerUI(remainingSeconds, displayMode, maxTimeSeconds);
                    }
                }
            });
            this.taskManager.operator(uiTaskId, 'enabled');
            this.activeTimerTasks.push(uiTaskId);

            this.taskManager.addNew(endTaskId, {
                time: durationMs,
                mode: 'timeout',
                count: 1,
                exe: () => {
                    if (state.get('sceneId') !== sId || state.get('scene.activeRouterId', { id: sId }) !== routerId) return;
                    this.taskManager.kill(uiTaskId);
                    this.taskManager.kill(endTaskId);

                    this.timerState = null;
                    this.api.presentation.scene.hideTimer();
                    this.protocol?.publish?.('router.timer.expired', { sceneId: sId, routerId, timer: null });
                    this.commitState?.('router.timer.expired');

                    const endMode = rConfigSet.timerEnd || 'out';
                    if (endMode === 'out') this.goBackTimerEnd();
                    else if (endMode === 'still') {
                        if (rd.timer && rd.timer.end) {
                            this.processRunnables(rd.timer.end, { sceneId: sId, routerId, hook: 't_end' }, true);
                        }
                    }
                }
            });
            this.taskManager.operator(endTaskId, 'enabled');
            this.activeTimerTasks.push(endTaskId);
            this.timerState = { ...(this.timerState || {}), active: true, sceneId: sId, routerId, paused: false, remainingMs: null };
        }
        } catch (error) {
            console.error('Post-transition router activation failed after commit:', error);
        }
    },

    async goBackParent() {
        const state = this.api.engine.state;
        const sId = state.get('sceneId');
        const parentId = this.src?.scenes?.[sId]?.meta?.parentScene;

        if (!parentId || !this.src?.scenes?.[parentId]) {
            return { success: false, reason: 'no_parent' };
        }

        const result = await this.enterScene(parentId, true);
        if (result?.success === false) return result;
        return { success: true, sceneId: parentId };
    },

    goBackTimerEnd() {
        const state = this.api.engine.state;
        const target = state.get('prevRouter');
        if (!target) return;

        const sId = this.src.path.routers[target];
        if (sId && state.getRuntimeSnapshot('scenes.[id]', { id: sId })) {
            const isSameScene = sId === state.get('sceneId');
            if (isSameScene) this.enterRouter(target).catch(error => console.error('Timer router transition failed:', error));
            else this.enterScene(sId, false).catch(error => console.error('Timer scene transition failed:', error));
        }
    },

    rehydrateRouterTasks(remainingTimers = {}, pausedTasks = [], restoreStill = true) {
        const state = this.api.engine.state;
        const sceneId = state.get('sceneId');
        const routerId = sceneId ? state.get('scene.activeRouterId', { id: sceneId }) : null;
        const router = this.src?.scenes?.[sceneId]?.routers?.[routerId];
        if (!router) return;
        const runtime = state.getRuntimeSnapshot('routers.[id]', { id: `${sceneId}_${routerId}` }) || {};
        const config = router.set || {};
        const stillId = `router_still_${sceneId}_${routerId}`;
        const stillSeconds = runtime.secondsStill !== undefined ? runtime.secondsStill : (config.secondsStill || 0);
        if (restoreStill && router.loop?.still?.length && stillSeconds >= 5) {
            const delay = Number.isFinite(remainingTimers[stillId]) ? remainingTimers[stillId] : stillSeconds * 1000;
            this.currentStillTask = stillId;
            this.taskManager.addNew(stillId, {
                time: Math.max(1, delay), mode: 'interval',
                exe: () => {
                    if (state.get('sceneId') === sceneId && state.get('scene.activeRouterId', { id: sceneId }) === routerId) {
                        this.processRunnables(router.loop.still, { sceneId, routerId, hook: 'still' }, true)
                            .catch(error => console.error('Restored router still loop failed:', error));
                    }
                }
            });
            this.taskManager.operator(stillId, 'enabled');
            if (pausedTasks.includes(stillId)) this.taskManager.pause(stillId);
        }

        const endId = `timer_end_${sceneId}_${routerId}`;
        const uiId = `timer_ui_${sceneId}_${routerId}`;
        if (!config.timer || !(config.timerSeconds >= 1.5) || !Number.isFinite(remainingTimers[endId])) return;
        const maxSeconds = config.timerSeconds;
        const mode = config.timerDisplay || 'dec';
        const remainingMs = Math.max(1, remainingTimers[endId]);
        const endAt = Date.now() + remainingMs;
        const refresh = () => {
            const seconds = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
            this.updateTimerUI(seconds, mode, maxSeconds);
        };
        refresh();
        this.taskManager.addNew(uiId, { time: 1000, mode: 'timeout', exe: refresh });
        this.taskManager.operator(uiId, 'enabled');
        this.activeTimerTasks.push(uiId);
        this.taskManager.addNew(endId, {
            time: remainingMs, mode: 'timeout', count: 1,
            exe: () => {
                if (state.get('sceneId') !== sceneId || state.get('scene.activeRouterId', { id: sceneId }) !== routerId) return;
                this.taskManager.kill(uiId);
                this.taskManager.kill(endId);
                this.timerState = null;
                this.api.presentation.scene.hideTimer();
                this.protocol?.publish?.('router.timer.expired', { sceneId, routerId, timer: null });
                this.commitState?.('router.timer.expired');
                const endMode = config.timerEnd || 'out';
                if (endMode === 'out') this.goBackTimerEnd();
                else if (endMode === 'still' && router.timer?.end) {
                    this.processRunnables(router.timer.end, { sceneId, routerId, hook: 't_end' }, true)
                        .catch(error => console.error('Restored router timer end failed:', error));
                }
            }
        });
        this.taskManager.operator(endId, 'enabled');
        this.activeTimerTasks.push(endId);
        if (pausedTasks.includes(uiId)) this.taskManager.pause(uiId);
        if (pausedTasks.includes(endId)) this.taskManager.pause(endId);
        if (pausedTasks.includes(endId)) this.timerState = { ...this.timerState, paused: true, remainingMs: this.taskManager.getRemaining(endId) };
    },

    controlRouterTimer(targetRouterId, control, context = {}) {
        if (typeof targetRouterId !== 'string' || !targetRouterId || !['pause', 'resume'].includes(control)) return { success: false, reason: 'invalid_timer_control' };
        const sceneId = this.src?.path?.routers?.[targetRouterId];
        const routerDef = sceneId ? this.src?.scenes?.[sceneId]?.routers?.[targetRouterId] : null;
        if (!sceneId || !routerDef) return { success: false, reason: 'router_not_found' };
        if (context.sceneId === sceneId && context.routerId === targetRouterId && !context.charId && !context.actionId && !context.itemId && context.effectScope !== 'character_move') {
            const loopHooks = { enter: 'enter', leave: 'leave', still: 'still' };
            const timerHooks = { t_start: 'start', t_end: 'end' };
            const loopKey = loopHooks[context.hook], timerKey = timerHooks[context.hook];
            if ((loopKey && Array.isArray(routerDef.loop?.[loopKey]) && routerDef.loop[loopKey].length) ||
                (timerKey && Array.isArray(routerDef.timer?.[timerKey]) && routerDef.timer[timerKey].length)) return { success: false, reason: 'forbidden_self_hook' };
        }
        const uiTaskId = `timer_ui_${sceneId}_${targetRouterId}`, endTaskId = `timer_end_${sceneId}_${targetRouterId}`;
        const endTask = this.taskManager.plan?.[endTaskId];
        if (!this.timerState?.active || this.timerState.sceneId !== sceneId || this.timerState.routerId !== targetRouterId || !endTask || !this.taskManager.running?.[endTaskId]) return { success: false, reason: 'timer_not_active' };
        if (control === 'pause') {
            if (endTask.isPaused) return { success: false, reason: 'already_paused' };
            const remaining = this.taskManager.getRemaining(endTaskId);
            if (Number.isFinite(remaining)) this.updateTimerUI(Math.max(0, Math.ceil(remaining/1000)), this.timerState.mode, this.timerState.maxSeconds);
            this.taskManager.pause(endTaskId);
            if (this.taskManager.plan?.[uiTaskId] && this.taskManager.running?.[uiTaskId]) this.taskManager.pause(uiTaskId);
            this.timerState = { ...this.timerState, paused: true, remainingMs: this.taskManager.getRemaining(endTaskId) };
        } else {
            if (!endTask.isPaused) return { success: false, reason: 'not_paused' };
            this.taskManager.resume(endTaskId);
            if (this.taskManager.plan?.[uiTaskId] && this.taskManager.running?.[uiTaskId]) this.taskManager.resume(uiTaskId);
            this.timerState = { ...this.timerState, paused: false, remainingMs: null };
        }
        this.commitState?.(`router.timer.${control}`);
        this.protocol?.publish?.('router.timer.control', { sceneId, routerId: targetRouterId, control, remainingMs: this.taskManager.getRemaining(endTaskId), timer: { ...this.timerState } });
        return { success: true, sceneId, routerId: targetRouterId, paused: control === 'pause' };
    },

    updateTimerUI(currentVal, mode, maxVal) {
        let displayVal = 0;
        if (mode === 'dec') displayVal = currentVal;
        else displayVal = maxVal - currentVal;

        const m = Math.floor(displayVal / 60).toString().padStart(2, '0');
        const s = (displayVal % 60).toString().padStart(2, '0');

        this.timerState = {
            active: true,
            sceneId: this.api.engine.state.get('sceneId'),
            routerId: this.api.engine.state.get('scene.activeRouterId', { id: this.api.engine.state.get('sceneId') }),
            mode, maxSeconds: maxVal, remainingSeconds: currentVal,
            paused: this.timerState?.paused || false,
            displayText: `${m}:${s}`, updatedAt: Date.now()
        };
        this.api.presentation.scene.updateTimer(`${m}:${s}`);
        this.protocol?.publish?.('router.timer.tick', { timer: { ...this.timerState } });
    },

    render() {
        const state = this.api.engine.state;
        const sId = state.get('sceneId');
        if (!sId) return;
        const s = this.src.scenes[sId];
        if (!s) return;

        const rId = state.getRuntimeSnapshot('scenes.[id]', { id: sId })?.activeRouterId;
        const r = s.routers[rId];

        const spriteMode = r?.meta?.sprite === true;
        const effectiveActions = this.getEffectiveActions(sId, rId);
        const actions = spriteMode ? [] : effectiveActions;
        const sprites = spriteMode && Array.isArray(r.sprites)
            ? r.sprites.map(spriteId => {
                const definition = this.src.sprite?.[spriteId];
                const action = definition ? effectiveActions.find(item => item.id === definition.action) || null : null;
                if (!definition) return null;
                const actionPresentation = this.getActionPresentationData(action);
                return getSpritePresentationData(this.api.engine, spriteId, actionPresentation);
            }).filter(Boolean)
            : [];

        // Publish a JSON-safe state projection independently of the UI adapter.
        if (this.commitState) this.commitState('scene.presentation');

        // The fourth argument is additive for older render adapters. Sprite mode
        // deliberately supplies no Action buttons and instead supplies Sprite data.
        this.api.presentation.scene.render(s, r, actions, sprites);
    },
};