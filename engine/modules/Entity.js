// htdocs/engine/modules/Entity.js
import { MoveAlgorithms } from './entity/Movement.js';
import { FakerSystem } from './entity/Faker.js';
import { resolveValue } from '../../engine/modules/Resolver.js';

export const EntitySystem = {
    ...FakerSystem,

    initCharactersMoving() {
        const state = this.api.engine.state;
        const characters = state.getRuntimeSnapshot('characters') || {};
        const faker = state.getRuntimeSnapshot('faker') || {};
        Object.keys(characters).forEach(charId => this.taskManager.kill(`move_char_${charId}`));
        const currentIdentity = faker.active ? faker.targetId : (state.get('entryCharacter') || 'player');

        Object.keys(characters).forEach(charId => {
            if (charId !== currentIdentity) this.scheduleCharacterMove(charId);
        });
    },

    validateMoveState(charId) {
        const char = this.api.engine.state.getRuntimeSnapshot('characters.[id]', { id: charId });
        // [REFACTOR] 'skip' check on moveList items
        return !!(char && char.set.moving && char.set.move && char.moveList.some(item => !item.skip));
    },

    scheduleCharacterMove(charId, delayOverride = null) {
        const state = this.api.engine.state;
        const faker = state.getRuntimeSnapshot('faker') || {};
        const currentIdentity = faker.active ? faker.targetId : (state.get('entryCharacter') || 'player');
        if (charId === currentIdentity) return;

        if (!this.validateMoveState(charId)) return;

        const char = this.api.engine.state.getRuntimeSnapshot('characters.[id]', { id: charId });
        // [REFACTOR] Use 'char.place.currentIndex'
        const currentItem = char.moveList[char.place.currentIndex || 0];

        const minTime = this.getConfig ? this.getConfig('minCharacterMoving') : 30;
        let rawStep = (currentItem && currentItem.nextStep) ? resolveValue(currentItem.nextStep, this) : minTime;
        const waitTime = Math.max(minTime, Number(rawStep) || minTime);
        const delay = Number.isFinite(delayOverride) && delayOverride >= 0 ? delayOverride : waitTime * 1000;

        this.taskManager.kill(`move_char_${charId}`);
        this.taskManager.addNew(`move_char_${charId}`, {
            time: Math.max(1, delay),
            mode: 'timeout',
            count: 1,
            exe: () => this.executeCharacterMove(charId)
        });
        this.taskManager.operator(`move_char_${charId}`, 'enabled');
    },

    resumeNPCMovement() {
        const state = this.api.engine.state;
        const faker = state.getRuntimeSnapshot('faker') || {};
        const characters = state.getRuntimeSnapshot('characters') || {};
        const currentIdentity = faker.active ? faker.targetId : (state.get('entryCharacter') || 'player');

        Object.keys(characters).forEach(charId => {
            if (charId !== currentIdentity) {
                if (this.validateMoveState(charId)) this.scheduleCharacterMove(charId);
            }
        });
    },

    isLocationBlocked(sceneId) {
        const state = this.api.engine.state;
        if (!state.has('scene.blocked', { id: sceneId })) return true;
        if (state.get('scene.blocked', { id: sceneId })) return true;

        const activeRouterId = state.get('scene.activeRouterId', { id: sceneId });
        if (activeRouterId) {
            return !!state.get('router.blocked', { sceneId, routerId: activeRouterId });
        }
        return false;
    },

    async executeCharacterMove(charId) {
        const state = this.api.engine.state;
        const faker = state.getRuntimeSnapshot('faker') || {};
        const currentIdentity = faker.active ? faker.targetId : (state.get('entryCharacter') || 'player');
        if (charId === currentIdentity) return;

        if (!this.validateMoveState(charId)) {
            this.taskManager.kill(`move_char_${charId}`);
            return;
        }

        const char = this.api.engine.state.getRuntimeSnapshot('characters.[id]', { id: charId });
        const moveList = char.moveList;
        // [REFACTOR] Use 'char.place.scene_id'
        const currentScene = char.place.scene_id;

        if (currentScene && this.isLocationBlocked(currentScene)) {
            this.scheduleCharacterMove(charId);
            return;
        }

        const strategy = MoveAlgorithms[char.set.move] || MoveAlgorithms.list;
        const result = strategy({
            // [REFACTOR] Use 'char.place.currentIndex'
            nextIndex: char.place.currentIndex,
            count: moveList.length,
            moveList: moveList,
            // [FIX] moveDirection: Use runtime variable '_moveDir' instead of 'set.moveDirection' (Schema Violation)
            direction: char._moveDir || 1,
            currentScene: currentScene,
            moveHistory: char.moveHistory || [],
            playerMoveHistory: state.getRuntimeSnapshot('playerMoveHistory') || [],
            playerCurrentScene: state.get('sceneId'),
            engine: this
        });

        // [REFACTOR] Check 'skip'
        if (result.idx === undefined || result.idx < 0 || moveList[result.idx].skip) {
            this.scheduleCharacterMove(charId);
            return;
        }

        // [REFACTOR] Removed 'req' check because 'moveList' items do not support 'req' in Schema V9.2

        const nextSceneId = moveList[result.idx].scene_id;

        // Persist movement cursor and direction through StateAccess.
        this.api.engine.state.update('characters.[id]', current => {
            current.place.currentIndex = result.idx;
            current._moveDir = result.dir;
            return current;
        }, { id: charId });

        if (!nextSceneId || !state.getRuntimeSnapshot('scenes.[id]', { id: nextSceneId }) || this.isLocationBlocked(nextSceneId)) {
            this.scheduleCharacterMove(charId);
            return;
        }

        const playerSceneId = state.get('sceneId');
        const isLeaving = (currentScene === playerSceneId && nextSceneId !== playerSceneId);

        if (isLeaving) {
            // [FIX] Logic Leave: Access Object by currentIdentity Key (Schema Compliance)
            if (char.effect?.leave) {
                const leaveEffects = char.effect.leave[currentIdentity];
                if (Array.isArray(leaveEffects)) {
                    await this.processRunnables(leaveEffects, {
                        sceneId: playerSceneId,
                        charId,
                        hook: `leave:${currentIdentity}`
                    }, true);
                }
            }
        }

        // Persist the new location after leave effects have completed.
        this.api.engine.state.update('characters.[id].place.scene_id', () => nextSceneId, { id: charId });

        // [FIX] Trigger UI Update AFTER state change if character left the current scene
        if (isLeaving) {
            console.log(`[Entity] Char ${charId} LEAVING scene ${currentScene} -> ${nextSceneId}`);
            if (this.api.presentation?.components?.updateCharacterList) {
                this.api.presentation.components.updateCharacterList();
            }
        }

        if (nextSceneId === playerSceneId) {
            console.log(`[Entity] Char ${charId} ENTERING current scene ${nextSceneId}`);
            if (charId !== currentIdentity) {
                // [FIX] Update Met State when entering current scene
                this.updateMetState(charId, currentIdentity);

                // [FIX V9.2] Meeting Logic: Access Object by currentIdentity Key
                if (char.effect?.meeting) {
                    const meetingEffects = char.effect.meeting[currentIdentity];

                    if (Array.isArray(meetingEffects)) {
                        await this.processRunnables(meetingEffects, {
                            sceneId: playerSceneId,
                            charId,
                            hook: `meeting:${currentIdentity}` // Pass specific hook for Management
                        }, true);
                    }
                }

                if (this.api.presentation?.components?.updateCharacterList) {
                    console.log(`[Entity] Calling this.api.presentation.components.updateCharacterList() for ${charId}`);
                    this.api.presentation.components.updateCharacterList();
                } else {
                    console.error("[Entity] this.api.presentation.components.updateCharacterList MISSING");
                }
            }
        }

        this.scheduleCharacterMove(charId);
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