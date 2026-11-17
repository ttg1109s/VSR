
export const SceneSystem = {

    // [NEW] API to get Scene Path from Loader's generated SceneTree
    getPath(sceneId) {
        const state = this.api.engine.state;
        if (!sceneId) sceneId = state.get('sceneId');
        return state.getRuntimeSnapshot('sceneTree.[id]', { id: sceneId }) || [];
    },

    shouldSkipTransition(targetSceneId) {
        const currentSceneId = this.api.engine.state.get('sceneId');
        if (!currentSceneId || !targetSceneId) return false;

        // [FIXED] Use Pre-calculated SceneTree to check relationship
        // Logic: specific parent-child relationship in any direction implies "inside" movement
        const currentPath = this.getPath(currentSceneId);
        const targetPath = this.getPath(targetSceneId);

        // Check if Target is a parent of Current (Moving Out)
        const isTargetParent = currentPath.some(node => node.id === targetSceneId);

        // Check if Current is a parent of Target (Moving In)
        const isCurrentParent = targetPath.some(node => node.id === currentSceneId);

        if (isTargetParent || isCurrentParent) return true;

        return false;
    },

    async enterScene(id, skipTransition = false) {
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

        const currentS = state.get('sceneId');
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

        const previousRouter = currentS
            ? state.getRuntimeSnapshot('scenes.[id]', { id: currentS })?.activeRouterId
            : undefined;

        // Apply these synchronous writes without yielding between them: leave effects
        // may still be running asynchronously and must not invalidate a queued transaction.
        if (previousRouter) state.set('prevRouter', previousRouter);
        state.set('sceneId', id);
        if (state.getRuntimeSnapshot('characters.[id]', { id: entryChar })) {
            state.set('char.scene_id', id, { id: entryChar });
        }

        const previousEntryScene = state.getRuntimeSnapshot('characters.[id]', { id: entryChar })?.place?.scene_id;
        try {
            const result = await this.enterRouter(activeRouter, true, true, skipTransition);
            if (result?.success === false) {
                state.set('sceneId', currentS || '');
                if (state.getRuntimeSnapshot('characters.[id]', { id: entryChar })) state.set('char.scene_id', previousEntryScene, { id: entryChar });
                return result;
            }
        } catch (error) {
            state.set('sceneId', currentS || '');
            if (state.getRuntimeSnapshot('characters.[id]', { id: entryChar })) state.set('char.scene_id', previousEntryScene, { id: entryChar });
            if (currentS) this.render();
            throw error;
        }

        // Character movement and entry effects are owned by each Character's moveList.

        if (this.api.presentation && this.api.presentation.components && this.api.presentation.components.updateCharacterList) {
            this.api.presentation.components.updateCharacterList();
        }
        if (!currentS) this.initCharactersMoving?.();
        this.commitState('scene.entered');
    },

    async enterRouter(routerId, forceRender = false, isSceneEntry = false, skipTransition = false) {
        const state = this.api.engine.state;
        const sId = state.get('sceneId');
        if (!routerId || !this.src?.scenes?.[sId]?.routers?.[routerId]) return;
        if (this.checkHardLock('router', routerId)) {
            return { success: false, reason: 'target_locked' };
        }

        const rKey = `${sId}_${routerId}`;
        if (!state.getRuntimeSnapshot('routers.[id]', { id: rKey })) {
            state.set('routers.[id]', { blocked: false, visited: false, countVisited: 0 }, { id: rKey });
        }

        const rd = this.src.scenes[sId].routers[routerId];
        const rSet = state.getRuntimeSnapshot('routers.[id]', { id: rKey });
        const rConfigSet = rd.set || {};

        let transType = null;
        let transDuration = 1.5;

        if (isSceneEntry) {
            const sSet = this.src.scenes[sId].set;
            transType = sSet.transition;
            transDuration = sSet.transitionDuration !== undefined ? sSet.transitionDuration : 1.5;
        } else {
            transType = rSet.transition !== undefined ? rSet.transition : rConfigSet.transition;
            transDuration = (rSet.transitionDuration !== undefined ? rSet.transitionDuration : rConfigSet.transitionDuration);
            if (transDuration === undefined) transDuration = 1.5;
        }

        if (skipTransition) {
            transType = null;
            transDuration = 0;
        }

        const totalTimeMs = transDuration * 1000;
        const timeIn = skipTransition ? 0 : totalTimeMs * 0.4;
        const timeOut = skipTransition ? 0 : totalTimeMs * 0.6;

        this.isTransitioning = true;
        try {
        if (transType && transType !== 'none' && !skipTransition) {
            await this.api.presentation.scene.transition('start', transType, timeIn / 1000);
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

        if (transType && transType !== 'none' && !skipTransition) {
            await this.api.presentation.scene.transition('end', transType, timeOut / 1000);
        }

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
                mode: 'interval',
                exe: () => {
                    const remainingSeconds = Math.ceil((endTime - Date.now()) / 1000);
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
                    this.taskManager.kill(uiTaskId);
                    this.taskManager.kill(endTaskId);

                    this.timerState = null;
                    this.api.presentation.scene.hideTimer();

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
        }
        } finally {
            this.isTransitioning = false;
        }
    },

    goBackParent() {
        const state = this.api.engine.state;
        const sId = state.get('sceneId');

        const sceneMeta = this.src.scenes[sId]?.meta;
        if (sceneMeta?.parentScene) {
            const parentId = sceneMeta.parentScene;
            if (this.src.scenes[parentId]) {
                this.enterScene(parentId, true);
            }
        }
    },

    goBackTimerEnd() {
        const state = this.api.engine.state;
        const target = state.get('prevRouter');
        if (!target) return;

        const sId = this.src.path.routers[target];
        if (sId && state.getRuntimeSnapshot('scenes.[id]', { id: sId })) {
            const isSameScene = sId === state.get('sceneId');
            state.set('scene.activeRouterId', target, { id: sId });

            if (isSameScene) this.enterRouter(target);
            else this.enterScene(sId, false);
        }
    },

    rehydrateRouterTasks(remainingTimers = {}, pausedTasks = []) {
        const state = this.api.engine.state;
        const sceneId = state.get('sceneId');
        const routerId = sceneId ? state.get('scene.activeRouterId', { id: sceneId }) : null;
        const router = this.src?.scenes?.[sceneId]?.routers?.[routerId];
        if (!router) return;
        const runtime = state.getRuntimeSnapshot('routers.[id]', { id: `${sceneId}_${routerId}`) || {};
        const config = router.set || {};
        const stillId = `router_still_${sceneId}_${routerId}`;
        const stillSeconds = runtime.secondsStill !== undefined ? runtime.secondsStill : (config.secondsStill || 0);
        if (router.loop?.still?.length && stillSeconds >= 5) {
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
        this.taskManager.addNew(uiId, { time: Math.min(1000, Math.max(1, remainingMs)), mode: 'interval', exe: refresh });
        this.taskManager.operator(uiId, 'enabled');
        this.activeTimerTasks.push(uiId);
        this.taskManager.addNew(endId, {
            time: remainingMs, mode: 'timeout', count: 1,
            exe: () => {
                this.taskManager.kill(uiId);
                this.taskManager.kill(endId);
                this.timerState = null;
                this.api.presentation.scene.hideTimer();
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
            displayText: `${m}:${s}`, updatedAt: Date.now()
        };
        this.api.presentation.scene.updateTimer(`${m}:${s}`);
    },

    render() {
        const state = this.api.engine.state;
        const sId = state.get('sceneId');
        if (!sId) return;
        const s = this.src.scenes[sId];
        if (!s) return;

        const rId = state.getRuntimeSnapshot('scenes.[id]', { id: sId })?.activeRouterId;
        const r = s.routers[rId];

        const actions = this.getEffectiveActions(sId, rId);

        // Publish a JSON-safe state projection independently of the UI adapter.
        if (this.commitState) this.commitState('scene.presentation');

        this.api.presentation.scene.render(s, r, actions);
    },
};