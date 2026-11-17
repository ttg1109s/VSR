// htdocs/engine/modules/Entity.js
import { MoveAlgorithms } from './entity/Movement.js';
import { FakerSystem } from './entity/Faker.js';
import { resolveValue } from '../../engine/modules/Resolver.js';

export const EntitySystem = {
    ...FakerSystem,

    getCurrentIdentity() {
        const state = this.api.engine.state;
        const faker = state.getRuntimeSnapshot('faker') || {};
        return faker.active ? faker.targetId : (state.get('entryCharacter') || 'player');
    },

    createCharacterVisitToken(charId) {
        this.characterVisitTokens ||= new Map();
        this.characterVisitSequence = (this.characterVisitSequence || 0) + 1;
        const token = this.characterVisitSequence;
        this.characterVisitTokens.set(charId, token);
        return token;
    },

    getCharacterVisitToken(charId) {
        this.characterVisitTokens ||= new Map();
        return this.characterVisitTokens.get(charId) ?? null;
    },

    isCharacterVisitValid(charId, token, sceneId, moveIndex) {
        if (token === null || token === undefined || this.getCharacterVisitToken(charId) !== token) return false;
        const state = this.api.engine.state;
        const char = state.getRuntimeSnapshot('characters.[id]', { id: charId });
        if (!char || char.place?.scene_id !== sceneId || char.place?.currentIndex !== moveIndex) return false;
        return this.getCurrentIdentity() !== charId;
    },

    cancelCharacterStill(charId) {
        this.characterStillTaskIds ||= new Map();
        const taskId = this.characterStillTaskIds.get(charId);
        if (taskId) this.taskManager.kill(taskId);
        this.characterStillTaskIds.delete(charId);
    },

    invalidateCharacterVisit(charId) {
        this.cancelCharacterStill(charId);
        this.characterVisitTokens ||= new Map();
        this.characterVisitTokens.delete(charId);
    },

    syncCharacterMovementIdentity() {
        const state = this.api.engine.state;
        const characters = state.getRuntimeSnapshot('characters') || {};
        const currentIdentity = this.getCurrentIdentity();
        for (const charId of Object.keys(characters)) {
            if (charId === currentIdentity) {
                this.taskManager.kill(`move_char_${charId}`);
                this.invalidateCharacterVisit(charId);
                continue;
            }
            let needsStart = false;
            if (this.getCharacterVisitToken(charId) === null) {
                const token = this.createCharacterVisitToken(charId);
                this.scheduleCharacterStill(charId, token);
                needsStart = true;
            }
            const moveTask = this.taskManager.plan?.[`move_char_${charId}`];
            if (this.validateMoveState(charId) && (needsStart || !moveTask || !moveTask.isRunning)) {
                this.scheduleCharacterMove(charId);
            }
        }
    },

    initCharactersMoving() {
        const characters = this.api.engine.state.getRuntimeSnapshot('characters') || {};
        for (const charId of Object.keys(characters)) {
            this.taskManager.kill(`move_char_${charId}`);
            this.invalidateCharacterVisit(charId);
        }
        this.syncCharacterMovementIdentity();
    },

    validateMoveState(charId) {
        const char = this.api.engine.state.getRuntimeSnapshot('characters.[id]', { id: charId });
        return !!(
            char &&
            char.set?.moving &&
            char.set?.move &&
            Array.isArray(char.moveList) &&
            char.moveList.some(item => item && !item.skip)
        );
    },

    scheduleCharacterMove(charId, delayOverride = null) {
        const state = this.api.engine.state;
        if (charId === this.getCurrentIdentity()) {
            this.taskManager.kill(`move_char_${charId}`);
            this.invalidateCharacterVisit(charId);
            return;
        }
        const char = state.getRuntimeSnapshot('characters.[id]', { id: charId });
        if (!char || !Array.isArray(char.moveList) || char.moveList.length === 0) return;

        let token = this.getCharacterVisitToken(charId);
        if (token === null) {
            token = this.createCharacterVisitToken(charId);
            this.scheduleCharacterStill(charId, token);
        }
        if (!this.validateMoveState(charId)) {
            this.taskManager.kill(`move_char_${charId}`);
            return;
        }

        const currentItem = char.moveList[char.place?.currentIndex ?? 0];
        const minTime = this.getConfig ? this.getConfig('minCharacterMoving') : 30;
        const rawStep = currentItem?.nextStep ? resolveValue(currentItem.nextStep, this) : minTime;
        const waitTime = Math.max(minTime, Number(rawStep) || minTime);
        const delay = Number.isFinite(delayOverride) && delayOverride >= 0 ? delayOverride : waitTime * 1000;
        const taskId = `move_char_${charId}`;

        this.taskManager.kill(taskId);
        this.taskManager.addNew(taskId, {
            time: Math.max(1, delay),
            mode: 'timeout',
            count: 1,
            exe: () => this.executeCharacterMove(charId)
        });
        this.taskManager.operator(taskId, 'enabled');
    },

    scheduleCharacterStill(charId, token = this.getCharacterVisitToken(charId), delayOverride = null) {
        const state = this.api.engine.state;
        const char = state.getRuntimeSnapshot('characters.[id]', { id: charId });
        if (!char || token === null || token === undefined) return;
        const moveIndex = char.place?.currentIndex ?? 0;
        const sceneId = char.place?.scene_id ?? '';
        const item = char.moveList?.[moveIndex];
        const still = item?.loop?.still;
        const seconds = item?.stillActive;
        const taskId = `move_still_${charId}_${token}`;
        this.cancelCharacterStill(charId);
        if (!Array.isArray(still) || still.length === 0 || !Number.isFinite(seconds) || seconds <= 0) return;

        const delay = Number.isFinite(delayOverride) && delayOverride >= 0 ? delayOverride : seconds * 1000;
        this.characterStillTaskIds ||= new Map();
        this.characterStillTaskIds.set(charId, taskId);
        this.taskManager.addNew(taskId, {
            time: Math.max(1, delay),
            mode: 'interval',
            count: 0,
            exe: async () => {
                if (!this.isCharacterVisitValid(charId, token, sceneId, moveIndex)) {
                    this.cancelCharacterStill(charId);
                    return;
                }
                await this.processRunnables(still, {
                    sceneId,
                    charId,
                    hook: 'still',
                    moveIndex,
                    visitToken: token,
                    shouldContinue: () => this.isCharacterVisitValid(charId, token, sceneId, moveIndex)
                }, true);
            }
        });
        this.taskManager.operator(taskId, 'enabled');
    },

    resumeCharacterMovement() {
        this.syncCharacterMovementIdentity();
    },

    isLocationBlocked(sceneId) {
        const state = this.api.engine.state;
        if (!state.has('scene.blocked', { id: sceneId })) return true;
        if (state.get('scene.blocked', { id: sceneId })) return true;
        const activeRouterId = state.get('scene.activeRouterId', { id: sceneId });
        return activeRouterId
            ? !!state.get('router.blocked', { sceneId, routerId: activeRouterId })
            : false;
    },

    executeCharacterMove(charId) {
        this.characterTransitionQueues ||= new Map();
        const previous = this.characterTransitionQueues.get(charId) || Promise.resolve();
        const current = previous.catch(error => {
            console.error(`[Entity] Previous transition failed for ${charId}:`, error);
        }).then(() => this.performCharacterMove(charId));
        this.characterTransitionQueues.set(charId, current);
        return current.finally(() => {
            if (this.characterTransitionQueues.get(charId) === current) {
                this.characterTransitionQueues.delete(charId);
            }
        });
    },

    async performCharacterMove(charId) {
        const state = this.api.engine.state;
        const char = state.getRuntimeSnapshot('characters.[id]', { id: charId });
        if (!char) return;
        if (charId === this.getCurrentIdentity()) {
            this.invalidateCharacterVisit(charId);
            return;
        }
        if (!this.validateMoveState(charId)) {
            this.taskManager.kill(`move_char_${charId}`);
            return;
        }

        const moveList = char.moveList;
        const oldIndex = char.place?.currentIndex ?? 0;
        const currentScene = char.place?.scene_id ?? '';
        const token = this.getCharacterVisitToken(charId) ?? this.createCharacterVisitToken(charId);
        if (currentScene && this.isLocationBlocked(currentScene)) {
            if (this.isCharacterVisitValid(charId, token, currentScene, oldIndex)) this.scheduleCharacterMove(charId);
            return;
        }

        const strategy = MoveAlgorithms[char.set.move] || MoveAlgorithms.list;
        const result = strategy({
            nextIndex: oldIndex,
            count: moveList.length,
            moveList,
            direction: char._moveDir || 1,
            currentScene,
            moveHistory: char.moveHistory || [],
            playerMoveHistory: state.getRuntimeSnapshot('playerMoveHistory') || [],
            playerCurrentScene: state.get('sceneId'),
            engine: this
        });

        if (!result || !Number.isInteger(result.idx) || result.idx < 0 ||
            result.idx >= moveList.length || moveList[result.idx]?.skip || result.idx === oldIndex) {
            if (this.isCharacterVisitValid(charId, token, currentScene, oldIndex)) this.scheduleCharacterMove(charId);
            return;
        }

        const nextItem = moveList[result.idx];
        const nextSceneId = nextItem?.scene_id;
        if (!nextSceneId || !state.getRuntimeSnapshot('scenes.[id]', { id: nextSceneId }) ||
            this.isLocationBlocked(nextSceneId)) {
            if (this.isCharacterVisitValid(charId, token, currentScene, oldIndex)) this.scheduleCharacterMove(charId);
            return;
        }

        const playerSceneId = state.get('sceneId');
        const currentIdentity = this.getCurrentIdentity();
        const isLeavingPlayerScene = currentScene === playerSceneId && nextSceneId !== playerSceneId;
        const isEnteringPlayerScene = nextSceneId === playerSceneId;
        const oldLoopLeave = moveList[oldIndex]?.loop?.leave;

        try {
            if (Array.isArray(oldLoopLeave) && oldLoopLeave.length) {
                const leaveResult = await this.processRunnables(oldLoopLeave, {
                    sceneId: currentScene, charId, hook: 'leave', moveIndex: oldIndex,
                    visitToken: token,
                    shouldContinue: () => this.isCharacterVisitValid(charId, token, currentScene, oldIndex)
                }, true);
                if (leaveResult?.error) throw leaveResult.error;
            }
            if (isLeavingPlayerScene && Array.isArray(char.effect?.leave?.[currentIdentity])) {
                const leaveResult = await this.processRunnables(char.effect.leave[currentIdentity], {
                    sceneId: playerSceneId, charId, hook: `leave:${currentIdentity}`, moveIndex: oldIndex,
                    visitToken: token,
                    shouldContinue: () => this.isCharacterVisitValid(charId, token, currentScene, oldIndex)
                }, true);
                if (leaveResult?.error) throw leaveResult.error;
            }
        } catch (error) {
            console.error(`[Entity] Character Leave Effect failed for ${charId}; transition cancelled:`, error);
            if (this.isCharacterVisitValid(charId, token, currentScene, oldIndex)) this.scheduleCharacterMove(charId);
            return;
        }

        // Leave effects may mutate the source, destination, identity, or blocked state.
        if (!this.isCharacterVisitValid(charId, token, currentScene, oldIndex) ||
            !state.getRuntimeSnapshot('scenes.[id]', { id: nextSceneId }) ||
            this.isLocationBlocked(nextSceneId)) {
            if (this.isCharacterVisitValid(charId, token, currentScene, oldIndex)) this.scheduleCharacterMove(charId);
            return;
        }

        // Commit the visit atomically only after the destination has been revalidated.
        this.invalidateCharacterVisit(charId);
        state.update('characters.[id]', current => {
            current.place ||= {};
            current.place.currentIndex = result.idx;
            current.place.scene_id = nextSceneId;
            current._moveDir = result.dir;
            const entry = current.moveList?.[result.idx];
            if (!entry) throw new Error(`Character ${charId} destination move entry disappeared before commit.`);
            if (!Number.isSafeInteger(entry.countVisited) || entry.countVisited < 0) entry.countVisited = 0;
            entry.countVisited += 1;
            if (result.consumeCount === true && entry.count > 0) entry.count -= 1;
            return current;
        }, { id: charId });

        const nextToken = this.createCharacterVisitToken(charId);
        const nextVisitIsValid = () => this.isCharacterVisitValid(charId, nextToken, nextSceneId, result.idx);

        if (isLeavingPlayerScene) this.api.presentation?.components?.updateCharacterList?.();

        try {
            const enterEffects = nextItem.loop?.enter;
            if (Array.isArray(enterEffects) && enterEffects.length) {
                const enterResult = await this.processRunnables(enterEffects, {
                    sceneId: nextSceneId, charId, hook: 'enter', moveIndex: result.idx,
                    visitToken: nextToken, shouldContinue: nextVisitIsValid
                }, true);
                if (enterResult?.error) throw enterResult.error;
            }
        } catch (error) {
            // Enter is post-commit: retain the new location and counter; do not retry it.
            console.error(`[Entity] Character Enter Effect failed for ${charId}:`, error);
        }

        if (isEnteringPlayerScene && charId !== currentIdentity && nextVisitIsValid()) {
            this.updateMetState(charId, currentIdentity);
            if (Array.isArray(char.effect?.meeting?.[currentIdentity])) {
                try {
                    const meetingResult = await this.processRunnables(char.effect.meeting[currentIdentity], {
                        sceneId: playerSceneId, charId, hook: `meeting:${currentIdentity}`, moveIndex: result.idx,
                        visitToken: nextToken, shouldContinue: nextVisitIsValid
                    }, true);
                    if (meetingResult?.error) throw meetingResult.error;
                } catch (error) {
                    console.error(`[Entity] Character meeting Effect failed for ${charId}:`, error);
                }
            }
            this.api.presentation?.components?.updateCharacterList?.();
        }

        if (nextVisitIsValid()) {
            this.scheduleCharacterStill(charId, nextToken);
            this.scheduleCharacterMove(charId);
        }
    },

    updateMetState(charId, currentIdentity) {
        const state = this.api.engine.state;
        if (!state.getRuntimeSnapshot('characters.[id]', { id: charId })) return;
        state.update('characters.[id].met', current => {
            const met = Array.isArray(current) ? current : [];
            const index = met.findIndex(entry => String(entry).split(':')[0] === currentIdentity);
            if (index >= 0) {
                const parts = String(met[index]).split(':');
                const count = parseInt(parts[1] || '0', 10) + 1;
                met[index] = `${currentIdentity}:${count}`;
            } else {
                met.push(`${currentIdentity}:1`);
            }
            return met;
        }, { id: charId });
    }
};
