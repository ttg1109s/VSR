// engine/modules/Loader.js
// Chịu trách nhiệm nạp kịch bản và khởi tạo state mặc định.
import { normalizeScenario } from '../scenario/Scenario.js';

export const LoaderSystem = {
    loadScript(input, api) {
        const script = normalizeScenario(input);
        const scenario = JSON.parse(JSON.stringify(script));
        const src = script;
        src.path = { routers: {}, chats: {}, characters: {} };

        if (script.scenes) {
            for (const sId in script.scenes) {
                const scene = script.scenes[sId];
                if (!scene) continue;
                if (!scene.set) scene.set = {};
                if (!scene.meta) scene.meta = {};

                if (scene.routers) {
                    for (const rId in scene.routers) {
                        src.path.routers[rId] = sId;
                    }
                }
            }
        }

        if (script.chat) {
            for (const chatId in script.chat) {
                src.path.chats[chatId] = script.chat[chatId];
            }
        }

        if (script.characters) {
            for (const charId in script.characters) {
                src.path.characters[charId] = script.characters[charId];
            }
        }

        const state = {
            // [CLEANUP] Removed legacy globals: inventory, hand, bans, injections
            sceneId: "", scenes: {}, routers: {}, actions: {}, global: {},
            characters: {}, itemInfo: {}, chats: {}, chatHistory: {}, executed: [],
            effect_overrides: {},
            effectQueue: { sync: [], async: [] },
            isSyncQueueRunning: false,
            isAsyncQueueRunning: false,
            pausedBackgroundTasks: { automations: {}, characters: {} },
            prevRouter: null,
            map: { choices: {}, blocks: {} },
            automations: {},
            faker: { active: false, targetId: null, backupPlayer: null },
            originalEntryCharacter: 'player',
            entryCharacter: 'player',
            playerMoveHistory: [],
            sceneTree: {}
        };

        state.meta = JSON.parse(JSON.stringify(script.meta || {}));
        state.global = JSON.parse(JSON.stringify(script.globalStates || {}));
        for (const [globalStateId, globalState] of Object.entries(state.global)) {
            if (typeof globalState.title !== 'string' || !globalState.title.trim()) globalState.title = globalStateId;
        }
        state.characters = JSON.parse(JSON.stringify(script.characters || {}));
        state.config = JSON.parse(JSON.stringify(script.config || {}));

        // Default Player Definition - [FIX V9.2] Strict Schema
        const defPlayer = {
            meta: { name: "Player", desc: "The main protagonist." }, // Identity here
            set: { moving: false, alert: null, move: null, actions: [], linkEffect: false }, // Behavior here
            relationship: [],
            place: { scene_id: "", currentIndex: 0 },
            stats: {},
            // Leave effects remain scenario-configurable; scene entry is handled by moveList.
            effect: { leave: {} },
            moveList: [],
            met: [],
            inventory: [],
            hand: []
        };

        if (!state.characters.player) {
            state.characters.player = defPlayer;
        }

        const originalEntryCharacter = state.meta.entryCharacter ?? 'player';
        if (typeof originalEntryCharacter !== 'string' || !originalEntryCharacter.trim()) {
            throw new TypeError('Scenario meta.entryCharacter must be a non-empty character ID or null.');
        }
        if (!Object.prototype.hasOwnProperty.call(state.characters, originalEntryCharacter)) {
            throw new Error(`Entry character '${originalEntryCharacter}' does not exist in scenario characters.`);
        }
        state.originalEntryCharacter = originalEntryCharacter;
        state.entryCharacter = originalEntryCharacter;

        Object.keys(state.characters).forEach(charId => {
            const char = state.characters[charId];

            if (!char.meta) char.meta = { name: charId, desc: "" }; // Fallback meta

            if (!char.set) char.set = {};
            if (char.set.moving === undefined) char.set.moving = true;
            if (char.set.linkEffect === undefined) char.set.linkEffect = false;
            if (!char.set.actions) char.set.actions = [];

            if (!char.relationship) char.relationship = [];

            if (!char.place) char.place = { scene_id: "", currentIndex: 0 };
            if (char.place.scene_id === undefined) char.place.scene_id = "";
            if (char.place.currentIndex === undefined) char.place.currentIndex = 0;

            if (!char.stats) char.stats = {};
            if (!char.effect) char.effect = { leave: {} };
            if (char.moveList === undefined || char.moveList === null) char.moveList = [];
            if (!Array.isArray(char.moveList)) {
                throw new TypeError(`Character '${charId}' moveList must be an array.`);
            }
            char.moveList.forEach((entry, index) => {
                if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
                    throw new TypeError(`Character '${charId}' moveList[${index}] must be an object.`);
                }
                if (entry.countVisited === undefined) entry.countVisited = 0;
                if (!Number.isSafeInteger(entry.countVisited) || entry.countVisited < 0) {
                    throw new TypeError(`Character '${charId}' moveList[${index}].countVisited must be a non-negative safe integer.`);
                }
            });

            if (!char.met || !Array.isArray(char.met)) char.met = [];

            // [CRITICAL] Ensure inventory exists on character
            if (!char.inventory) char.inventory = [];
            if (!char.hand) char.hand = [];

            char.moveHistory = [];
        });

        state.itemInfo = JSON.parse(JSON.stringify(script.itemInfo || {}));
        Object.values(state.itemInfo).forEach(item => {
            if (item?.usage && typeof item.usage === 'object' && !Array.isArray(item.usage)
                && !Object.prototype.hasOwnProperty.call(item.usage, 'status')) {
                item.usage.status = [[0, 'Normal'], [100, 'Broken']];
            }
        });
        state.chats = JSON.parse(JSON.stringify(script.chat || {}));

        Object.keys(state.chats).forEach(chatId => {
            const chat = state.chats[chatId];
            if (!chat.set) chat.set = { read: false, bookmark: [], step: 0, lastInteraction: 0 };
            // [FIX] Khoá thực tế là 'block' (số ít) theo scenario.schema.json và cách
            // engine/modules/Chat.js truy xuất (`chat.block[blockId]`), KHÔNG phải 'blocks'.
            // Với tên sai trước đây, vòng lặp này luôn bị bỏ qua với mọi kịch bản hợp lệ.
            const blocks = chat.block;
            if (blocks) {
                Object.keys(blocks).forEach(blockId => {
                    const block = blocks[blockId];
                    if (block.id) state.map.blocks[block.id] = { chatId, blockId };
                    Object.values(block).forEach(variant => {
                        // [FIX] typeof null === 'object' trong JS — nếu thiếu check null,
                        // gặp giá trị "choice_id": null (rất phổ biến, xem demo_script.js)
                        // sẽ crash "null is not an object (evaluating 'variant.choices')".
                        if (variant && typeof variant === 'object' && variant.choices) {
                            variant.choices.forEach((choice, idx) => {
                                if (!choice.set) choice.set = { choiced: false };
                                if (choice.id) state.map.choices[choice.id] = { chatId, blockId, idx };
                            });
                        }
                    });
                });
            }
        });

        if (script.templates && script.templates.automation) {
            Object.keys(script.templates.automation).forEach(autoId => {
                const auto = script.templates.automation[autoId];
                state.automations[autoId] = JSON.parse(JSON.stringify(auto.set));
                state.automations[autoId].active = false;
                state.automations[autoId].stepIndex = -1;
            });
        }

        // Action runtime is global: one mutable record per Action ID, independent of Router references.
        const defActionSet = {
            count: { normal: 0, pass: 0, fail: 0, pwFailed: 0 },
            display: "show", cooldown: 0,
            requirement: false, password: null, readDesc: false
        };
        for (const [actionId, action] of Object.entries(script.actions || {})) {
            // Scenario set.readDesc is a requirement ("must read"), not the
            // runtime state ("has read"). Keep the runtime flag false on load.
            const { readDesc: _readDescRequirement, ...runtimeActionSet } = action?.set || {};
            state.actions[actionId] = JSON.parse(JSON.stringify({
                ...defActionSet,
                ...runtimeActionSet,
                readDesc: false,
                count: { ...defActionSet.count, ...(action?.count || {}) }
            }));
        }

        for (let sId in script.scenes) {
            const s = script.scenes[sId];
            if (!s) continue;
            const minTrans = (state.config && state.config.minTransition) !== undefined ? state.config.minTransition : 2;

            const defSceneSet = { activeRouterId: "", blocked: false, transitionDuration: minTrans, transition: "fade" };
            state.scenes[sId] = JSON.parse(JSON.stringify({ ...defSceneSet, ...(s.set || {}) }));

            for (let rId in s.routers) {
                if (!s.routers[rId]) continue;
                const rKey = `${sId}_${rId}`;
                const defR = {
                    blocked: false, visited: false, countVisited: 0,
                    timer: false, timerSeconds: 60, transitionDuration: minTrans, transition: "fade"
                };
                state.routers[rKey] = JSON.parse(JSON.stringify({ ...defR, ...s.routers[rId].set }));

                const routerActions = s.routers[rId].actions;
                if (!Array.isArray(routerActions)) {
                    throw new TypeError(`Router '${sId}.${rId}' actions must be an array of global Action IDs.`);
                }
                const seenActionIds = new Set();
                routerActions.forEach((actionId, index) => {
                    if (typeof actionId !== 'string' || !actionId.trim()) {
                        throw new TypeError(`Router '${sId}.${rId}' actions[${index}] must be a non-empty global Action ID; inline Action definitions are not supported.`);
                    }
                    if (!Object.prototype.hasOwnProperty.call(script.actions || {}, actionId)) {
                        throw new Error(`Router '${sId}.${rId}' references unknown Action ID '${actionId}'.`);
                    }
                    if (seenActionIds.has(actionId)) {
                        throw new Error(`Router '${sId}.${rId}' contains duplicate Action ID '${actionId}'.`);
                    }
                    seenActionIds.add(actionId);
                });
            }
        }

        state.sceneTree = this.buildSceneTree(script.scenes);
        return { src, state, scenario };
    },

    buildSceneTree(scenes) {
        // Step 1: Create Parent Map { sceneId: parentId | null }
        const parentMap = {};
        Object.keys(scenes).forEach(sId => {
            const s = scenes[sId];
            // [REFACTOR] Logic: Parent defined in meta.parentScene only.
            // Removed 'meta.inside' check as requested.
            if (s.meta && s.meta.parentScene) {
                parentMap[sId] = s.meta.parentScene;
            } else {
                parentMap[sId] = null;
            }
        });

        // Step 2: Build Tree Paths from Map
        const tree = {};
        const sceneExists = (id) => scenes && scenes[id];

        Object.keys(scenes).forEach(sceneId => {
            const path = [];
            let currentId = sceneId;
            const visited = new Set();

            while (currentId && sceneExists(currentId)) {
                if (visited.has(currentId)) break; // Loop detected
                visited.add(currentId);

                const sceneTitle = scenes[currentId].meta?.title || scenes[currentId].title || currentId;
                path.unshift({ id: currentId, title: sceneTitle });

                // Move up using the pre-calculated map
                currentId = parentMap[currentId];
            }
            tree[sceneId] = path;
        });

        return tree;
    }
};