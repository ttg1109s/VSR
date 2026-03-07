// engine/modules/Loader.js
// Chịu trách nhiệm nạp kịch bản và khởi tạo state mặc định.

export const LoaderSystem = {
    loadScript(script) {
        if (!script || !script.scenes) {
            console.error("SAFEGUARD: Script data is invalid or missing 'scenes'.");
            if (window.API && window.API.render) window.API.render.notification.alert("Data Error", "Dữ liệu kịch bản bị lỗi.", "danger");
            return null;
        }

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
            playerMoveHistory: [],
            sceneTree: {}
        };

        state.meta = JSON.parse(JSON.stringify(script.meta || {}));
        state.global = JSON.parse(JSON.stringify(script.globalStates || {}));
        state.characters = JSON.parse(JSON.stringify(script.characters || {}));
        state.config = JSON.parse(JSON.stringify(script.config || {}));

        // Default Player Definition - [FIX V9.2] Strict Schema
        const defPlayer = {
            meta: { name: "Player", desc: "The main protagonist." }, // Identity here
            set: { moving: false, alert: null, move: null, actions: [], linkEffect: false }, // Behavior here
            relationship: [],
            place: { scene_id: "", currentIndex: 0 },
            stats: {},
            effect: { meeting: [], leave: [] },
            moveList: [],
            met: [],
            inventory: [],
            hand: []
        };

        if (!state.characters.player) {
            state.characters.player = defPlayer;
        }

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

            // Remove legacy root props
            if (char.currentScene !== undefined) delete char.currentScene;
            if (char.currentIndex !== undefined) delete char.currentIndex;

            if (!char.stats) char.stats = {};
            if (!char.effect) char.effect = { meeting: {}, leave: {} };
            if (!char.moveList) char.moveList = [];

            if (!char.met || !Array.isArray(char.met)) char.met = [];

            // [CRITICAL] Ensure inventory exists on character
            if (!char.inventory) char.inventory = [];
            if (!char.hand) char.hand = [];

            char.moveHistory = [];
        });

        state.itemInfo = JSON.parse(JSON.stringify(script.itemInfo || {}));
        state.chats = JSON.parse(JSON.stringify(script.chat || {}));

        Object.keys(state.chats).forEach(chatId => {
            const chat = state.chats[chatId];
            if (!chat.set) chat.set = { read: false, bookmark: null, step: 0, lastInteraction: 0 };
            const blocks = chat.blocks;
            if (blocks) {
                Object.keys(blocks).forEach(blockId => {
                    const block = blocks[blockId];
                    if (block.id) state.map.blocks[block.id] = { chatId, blockId };
                    Object.values(block).forEach(variant => {
                        if (typeof variant === 'object' && variant.choices) {
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

                for (let aId in s.routers[rId].actions) {
                    if (!s.routers[rId].actions[aId]) continue;
                    const actKey = `${sId}_${rId}_${aId}`;
                    const defActionSet = {
                        countClicks: 0, countFails: 0, display: "show", type: "none", target: null, cooldown: 0,
                        requirement: false, password: null
                    };
                    state.actions[actKey] = JSON.parse(JSON.stringify({ ...defActionSet, ...(s.routers[rId].actions[aId].set || {}) }));
                }
            }
        }

        state.sceneTree = this.buildSceneTree(script.scenes);
        return { src, state };
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