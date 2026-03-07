// htdocs/engine/modules/Entity.js
import { MoveAlgorithms } from './entity/Movement.js';
import { FakerSystem } from './entity/Faker.js';
import { resolveValue } from '../../engine/modules/Resolver.js';
import { API } from '../../api/index.js';

export const EntitySystem = {
    ...FakerSystem,

    initCharactersMoving() {
        Object.keys(this.state.characters).forEach(charId => taskManager.kill(`move_char_${charId}`));
        const currentIdentity = this.state.faker.active ? this.state.faker.targetId : (this.state.meta?.entryCharacter || 'player');

        Object.keys(this.state.characters).forEach(charId => {
            if (charId !== currentIdentity) this.scheduleCharacterMove(charId);
        });
    },

    validateMoveState(charId) {
        const char = this.state.characters[charId];
        // [REFACTOR] 'skip' check on moveList items
        return !!(char && char.set.moving && char.set.move && char.moveList.some(item => !item.skip));
    },

    scheduleCharacterMove(charId) {
        const currentIdentity = this.state.faker.active ? this.state.faker.targetId : (this.state.meta?.entryCharacter || 'player');
        if (charId === currentIdentity) return;

        if (!this.validateMoveState(charId)) return;

        const char = this.state.characters[charId];
        // [REFACTOR] Use 'char.place.currentIndex'
        const currentItem = char.moveList[char.place.currentIndex || 0];

        const minTime = this.getConfig ? this.getConfig('minCharacterMoving') : 30;
        let rawStep = (currentItem && currentItem.nextStep) ? resolveValue(currentItem.nextStep, this) : minTime;
        const waitTime = Math.max(minTime, Number(rawStep) || minTime);

        taskManager.kill(`move_char_${charId}`);
        taskManager.addNew(`move_char_${charId}`, {
            time: waitTime * 1000,
            mode: 'timeout',
            count: 1,
            exe: () => this.executeCharacterMove(charId)
        });
        taskManager.operator(`move_char_${charId}`, 'enabled');
    },

    resumeNPCMovement() {
        const currentIdentity = this.state.faker.active ? this.state.faker.targetId : (this.state.meta?.entryCharacter || 'player');

        Object.keys(this.state.characters).forEach(charId => {
            if (charId !== currentIdentity) {
                if (this.validateMoveState(charId)) this.scheduleCharacterMove(charId);
            }
        });
    },

    isLocationBlocked(sceneId) {
        // [FIXED] Use API to check blocked status (Standardized with Logic.checkHardLock)

        // 1. Check Scene Blocked
        const sceneBlocked = API.engine.state.get('scene.blocked', { id: sceneId });
        if (sceneBlocked) return true;

        // 2. Check Active Router Blocked
        // Get active router ID via API or fallback to state
        const activeRouterId = API.engine.state.get('scene.activeRouterId', { id: sceneId });

        if (activeRouterId) {
            const routerBlocked = API.engine.state.get('router.blocked', { sceneId: sceneId, routerId: activeRouterId });
            return !!routerBlocked;
        }

        // Fallback checks (in case API returns undefined for missing keys)
        const s = this.state.scenes[sceneId];
        if (!s) return true; // Scene not found = Blocked
        if (s.blocked) return true;

        return false;
    },

    async executeCharacterMove(charId) {
        const currentIdentity = this.state.faker.active ? this.state.faker.targetId : (this.state.meta?.entryCharacter || 'player');
        if (charId === currentIdentity) return;

        if (!this.validateMoveState(charId)) {
            taskManager.kill(`move_char_${charId}`);
            return;
        }

        const char = this.state.characters[charId];
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
            playerMoveHistory: this.state.playerMoveHistory,
            playerCurrentScene: this.state.sceneId,
            engine: this
        });

        // [REFACTOR] Check 'skip'
        if (result.idx === undefined || result.idx < 0 || moveList[result.idx].skip) {
            this.scheduleCharacterMove(charId);
            return;
        }

        // [REFACTOR] Removed 'req' check because 'moveList' items do not support 'req' in Schema V9.2

        const nextSceneId = moveList[result.idx].scene_id;

        // [REFACTOR] Update 'char.place'
        char.place.currentIndex = result.idx;
        // [FIX] Update runtime direction
        char._moveDir = result.dir;

        if (!nextSceneId || !this.state.scenes[nextSceneId] || this.isLocationBlocked(nextSceneId)) {
            this.scheduleCharacterMove(charId);
            return;
        }

        const isLeaving = (currentScene === this.state.sceneId && nextSceneId !== this.state.sceneId);

        if (isLeaving) {
            // [FIX] Logic Leave: Access Object by currentIdentity Key (Schema Compliance)
            if (char.effect?.leave) {
                const leaveEffects = char.effect.leave[currentIdentity];
                if (Array.isArray(leaveEffects)) {
                    await this.processRunnables(leaveEffects, {
                        sceneId: this.state.sceneId,
                        charId,
                        hook: `leave:${currentIdentity}`
                    }, true);
                }
            }
        }

        // [REFACTOR] Update 'char.place.scene_id'
        char.place.scene_id = nextSceneId;

        // [FIX] Trigger UI Update AFTER state change if character left the current scene
        if (isLeaving) {
            console.log(`[Entity] Char ${charId} LEAVING scene ${currentScene} -> ${nextSceneId}`);
            if (API.render?.components?.updateCharacterList) {
                API.render.components.updateCharacterList();
            }
        }

        if (nextSceneId === this.state.sceneId) {
            console.log(`[Entity] Char ${charId} ENTERING current scene ${nextSceneId}`);
            if (charId !== currentIdentity) {
                // [FIX] Update Met State when entering current scene
                this.updateMetState(charId, currentIdentity);

                // [FIX V9.2] Meeting Logic: Access Object by currentIdentity Key
                if (char.effect?.meeting) {
                    const meetingEffects = char.effect.meeting[currentIdentity];

                    if (Array.isArray(meetingEffects)) {
                        await this.processRunnables(meetingEffects, {
                            sceneId: this.state.sceneId,
                            charId,
                            hook: `meeting:${currentIdentity}` // Pass specific hook for Management
                        }, true);
                    }
                }

                if (API.render?.components?.updateCharacterList) {
                    console.log(`[Entity] Calling API.render.components.updateCharacterList() for ${charId}`);
                    API.render.components.updateCharacterList();
                } else {
                    console.error("[Entity] API.render.components.updateCharacterList MISSING");
                }
            }
        }

        this.scheduleCharacterMove(charId);
    },

    updateMetState(charId, currentIdentity) {
        const char = this.state.characters[charId];
        if (!char) return;

        if (!char.met) char.met = [];

        let found = false;
        let metCount = 0;

        for (let i = 0; i < char.met.length; i++) {
            const parts = char.met[i].split(':');
            if (parts[0] === currentIdentity) {
                metCount = parseInt(parts[1] || '0') + 1;
                char.met[i] = `${currentIdentity}:${metCount}`;
                found = true;
                break;
            }
        }

        if (!found) {
            metCount = 1;
            char.met.push(`${currentIdentity}:1`);
        }
    }
};