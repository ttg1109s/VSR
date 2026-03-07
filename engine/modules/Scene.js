import { API } from '../../api/index.js';

export const SceneSystem = {

    // [NEW] API to get Scene Path from Loader's generated SceneTree
    getPath(sceneId) {
        if (!sceneId) sceneId = this.state.sceneId;
        return this.state.sceneTree[sceneId] || [];
    },

    shouldSkipTransition(targetSceneId) {
        const currentSceneId = this.state.sceneId;
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
        if (!this.state.scenes[id]) {
            console.error(`Scene '${id}' not found.`);
            return;
        }

        const currentS = this.state.sceneId;
        // [FIX] Define currentIdentity early to use for both Leave and Meeting logic
        const currentIdentity = this.state.faker.active ? this.state.faker.targetId : (this.state.meta?.entryCharacter || 'player');

        // Logic: Player LEAVES current scene (trigger 'leave' effect on NPCs staying there)
        if (currentS && currentS !== id) {
            Object.keys(this.state.characters).forEach(charId => {
                const entryChar = this.state.meta?.entryCharacter || 'player';
                if (charId === entryChar) return;

                const char = this.state.characters[charId];
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

        if (currentS && this.state.scenes[currentS]) {
            this.state.prevRouter = this.state.scenes[currentS].activeRouterId;
        }

        let effectiveSkip = skipTransition;
        this.state.sceneId = id;

        // [REFACTOR] Update Entry Character's Place
        const entryChar = this.state.meta?.entryCharacter || 'player';
        if (this.state.characters[entryChar]) {
            this.state.characters[entryChar].place.scene_id = id;
        }

        const activeRouter = this.state.scenes[id].activeRouterId;
        if (!activeRouter || !this.src.scenes[id].routers[activeRouter]) {
            console.error(`Active Router '${activeRouter}' in Scene '${id}' invalid.`);
            return;
        }

        await this.enterRouter(activeRouter, true, true, effectiveSkip);

        // Logic: Player ENTERS new scene (trigger 'meeting' effect on NPCs here)
        Object.keys(this.state.characters).forEach(charId => {
            if (charId === entryChar) return;
            if (charId === currentIdentity) return;

            const char = this.state.characters[charId];
            // [REFACTOR] Use 'char.place.scene_id'
            if (char.place.scene_id === id) {
                // [FIX] Use shared updateMetState from EntitySystem (mixed into API.engine)
                if (API.engine.updateMetState) {
                    API.engine.updateMetState(charId, currentIdentity);
                } else {
                    console.warn("API.engine.updateMetState not found, using valid fallback or check mixin.");
                }

                // [FIX V9.2] Meeting Logic: Access Object by currentIdentity Key
                if (char.effect && char.effect.meeting) {
                    const meetingEffects = char.effect.meeting[currentIdentity];

                    if (Array.isArray(meetingEffects)) {
                        this.processRunnables(meetingEffects, {
                            sceneId: id,
                            charId: charId,
                            hook: `meeting:${currentIdentity}`
                        }, true).catch(e => console.warn("Char meeting err:", e));
                    }
                }
            }
        });

        if (API.render && API.render.components && API.render.components.updateCharacterList) {
            API.render.components.updateCharacterList();
        }
    },

    async enterRouter(routerId, forceRender = false, isSceneEntry = false, skipTransition = false) {
        const sId = this.state.sceneId;
        if (!routerId || !this.src.scenes[sId].routers[routerId]) return;

        const rKey = `${sId}_${routerId}`;
        if (!this.state.routers[rKey]) this.state.routers[rKey] = { blocked: false, visited: false, countVisited: 0 };

        const rd = this.src.scenes[sId].routers[routerId];
        const rSet = this.state.routers[rKey];
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

        if (transType && transType !== 'none' && !skipTransition) {
            await API.render.scene.transition('start', transType, timeIn / 1000);
        }

        if (this.currentStillTask) { taskManager.kill(this.currentStillTask); this.currentStillTask = null; }
        this.activeTimerTasks.forEach(taskId => taskManager.kill(taskId));
        this.activeTimerTasks = [];

        API.render.scene.hideTimer();

        const oldRouterId = this.state.scenes[sId].activeRouterId;
        if (!isSceneEntry && oldRouterId && oldRouterId !== routerId) {
            const oldRd = this.src.scenes[sId].routers[oldRouterId];
            if (oldRd && oldRd.loop && oldRd.loop.leave) {
                this.processRunnables(oldRd.loop.leave, { sceneId: sId, routerId: oldRouterId, hook: 'leave' }, true)
                    .catch(e => console.warn("Router leave err:", e));
            }
            this.state.prevRouter = oldRouterId;
        }

        this.state.scenes[sId].activeRouterId = routerId;
        this.state.routers[rKey].visited = true;
        this.state.routers[rKey].countVisited++;

        this.render();

        const ovType = rSet.overlay !== undefined ? rSet.overlay : rConfigSet.overlay;
        const ovFlick = rSet.overlayFlick !== undefined ? rSet.overlayFlick : rConfigSet.overlayFlick;

        let ovDuration = null; // Lifetime duration (legacy assumption: usually permanent)
        let ovFlicker = null;

        if (typeof ovFlick === 'number') {
            if (ovFlick >= 2) {
                // It is a flicker interval
                ovFlicker = ovFlick;
            } else if (ovFlick > 0) {
                // Backward compatibility? 
                // Schema says: "If < 2, null or empty -> false" (for flicker logic).
                // So if < 2, no flicker.
                ovFlicker = null;
            }
        }

        if (API.render.vfx && API.render.vfx.exec) {
            API.render.vfx.exec('overlay', ovType || 'none', {
                element: 'vfx-layer',
                duration: null, // Router overlays are usually permanent until changed
                flicker: ovFlicker,
                id: 'router_overlay' // Fixed ID for router overlay to ensure replacement
            });
        }

        if (transType && transType !== 'none' && !skipTransition) {
            await API.render.scene.transition('end', transType, timeOut / 1000);
        }

        this.isTransitioning = false;

        if (rd.loop && rd.loop.enter) {
            this.processRunnables(rd.loop.enter, { sceneId: sId, routerId, hook: 'enter' }, true)
                .catch(e => console.error("Router Enter Loop Error:", e));
        }

        const secondsStill = (rSet.secondsStill !== undefined) ? rSet.secondsStill : (rConfigSet.secondsStill || 0);
        if (rd.loop && rd.loop.still && rd.loop.still.length > 0 && secondsStill >= 5) {
            const taskId = `router_still_${sId}_${routerId}`;
            this.currentStillTask = taskId;
            taskManager.addNew(taskId, {
                time: secondsStill * 1000,
                mode: 'interval',
                exe: () => {
                    if (this.state.sceneId === sId && this.state.scenes[sId].activeRouterId === routerId) {
                        this.processRunnables(rd.loop.still, { sceneId: sId, routerId, hook: 'still' }, true)
                            .catch(e => console.error("Still Loop Error:", e));
                    }
                }
            });
            taskManager.operator(taskId, 'enabled');
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

            taskManager.addNew(uiTaskId, {
                time: 1000,
                mode: 'interval',
                exe: () => {
                    const remainingSeconds = Math.ceil((endTime - Date.now()) / 1000);
                    if (remainingSeconds >= 0) {
                        this.updateTimerUI(remainingSeconds, displayMode, maxTimeSeconds);
                    }
                }
            });
            taskManager.operator(uiTaskId, 'enabled');
            this.activeTimerTasks.push(uiTaskId);

            taskManager.addNew(endTaskId, {
                time: durationMs,
                mode: 'timeout',
                count: 1,
                exe: () => {
                    taskManager.kill(uiTaskId);
                    taskManager.kill(endTaskId);

                    API.render.scene.hideTimer();

                    const endMode = rConfigSet.timerEnd || 'out';
                    if (endMode === 'out') this.goBackTimerEnd();
                    else if (endMode === 'still') {
                        if (rd.timer && rd.timer.end) {
                            this.processRunnables(rd.timer.end, { sceneId: sId, routerId, hook: 't_end' }, true);
                        }
                    }
                }
            });
            taskManager.operator(endTaskId, 'enabled');
            this.activeTimerTasks.push(endTaskId);
        }
    },

    goBackParent() {
        const entryChar = this.state.meta?.entryCharacter || 'player';
        const sId = this.state.sceneId;

        const sceneMeta = this.src.scenes[sId]?.meta;
        if (sceneMeta && sceneMeta.inside && sceneMeta.parentScene) {
            const parentId = sceneMeta.parentScene;
            if (this.src.scenes[parentId]) {
                this.enterScene(parentId, true);
            }
        }
    },

    goBackTimerEnd() {
        const target = this.state.prevRouter;
        if (!target) return;

        const sId = this.src.path.routers[target]?.[0];
        if (sId && this.state.scenes[sId]) {
            const isSameScene = sId === this.state.sceneId;
            this.state.scenes[sId].activeRouterId = target;

            if (isSameScene) this.enterRouter(target);
            else this.enterScene(sId, false);
        }
    },

    updateTimerUI(currentVal, mode, maxVal) {
        let displayVal = 0;
        if (mode === 'dec') displayVal = currentVal;
        else displayVal = maxVal - currentVal;

        const m = Math.floor(displayVal / 60).toString().padStart(2, '0');
        const s = (displayVal % 60).toString().padStart(2, '0');

        API.render.scene.updateTimer(`${m}:${s}`);
    },

    render() {
        if (!this.state.sceneId) return;

        const sId = this.state.sceneId;
        const s = this.src.scenes[sId];
        if (!s) return;

        const rId = this.state.scenes[sId].activeRouterId;
        const r = s.routers[rId];

        const actions = this.getEffectiveActions(sId, rId);

        API.render.scene.render(s, r, actions);
    },
};