import { ConfigSystem } from './modules/Config.js';
import { LogicSystem } from './modules/Logic.js';
import { EffectSystem } from './modules/Effect.js?v=1.2.2';
import { ActionSystem } from './modules/Action.js?v=2.3.0';
import { SceneSystem } from './modules/Scene.js?v=1.4.0';
import { EntitySystem } from './modules/Entity.js?v=2.0.1';
import { ItemSystem } from './modules/Item.js?v=2.1.0';
import { ChatSystem } from './modules/Chat.js?v=3.1.6';
import { AutomationSystem } from './modules/Automation.js';
import { LoaderSystem } from './modules/Loader.js';
import { API } from '../api/index.js'; // [Refactor] Import API
import { JsonProtocol } from '../core/protocol/JsonProtocol.js';
import { verifyPassword } from '../password/verify.js';

export class GameEngine {
    constructor() {
        this.reset();
        this.protocol = new JsonProtocol();
        this.registerProtocolCommands();
    }

    registerProtocolCommands() {
        this.protocol.registerCommand('engine.init', payload => {
            if (!payload.script || typeof payload.script !== 'object') {
                throw new TypeError('engine.init requires payload.script JSON object.');
            }
            this.init(payload.script);
            return { initialized: !!this.src };
        });
        this.protocol.registerCommand('action.trigger', payload => {
            if (typeof payload.actionId !== 'string' || !payload.actionId) {
                throw new TypeError('action.trigger requires actionId.');
            }
            return this.handleAction(payload.actionId, payload.uniqueId || payload.actionId);
        });
        this.protocol.registerCommand('chat.next', () => this.nextChat());
        this.protocol.registerCommand('chat.selectChoice', payload => {
            if (!Number.isInteger(payload.index)) throw new TypeError('chat.selectChoice requires integer index.');
            return this.selectChatChoice(payload.index);
        });
        this.protocol.registerCommand('inventory.toggleHand', payload => {
            if (typeof payload.itemId !== 'string' || !payload.itemId) {
                throw new TypeError('inventory.toggleHand requires itemId.');
            }
            return this.toggleHand(payload.itemId);
        });
        this.protocol.registerCommand('scene.enter', payload => {
            if (typeof payload.sceneId !== 'string' || !payload.sceneId) {
                throw new TypeError('scene.enter requires sceneId.');
            }
            return this.enterScene(payload.sceneId, payload.skipTransition === true);
        });
        this.protocol.registerCommand('password.submit', payload => {
            if (!payload.actionDef || typeof payload.actionKey !== 'string' ||
                typeof payload.uniqueId !== 'string') {
                throw new TypeError('password.submit requires actionDef, actionKey and uniqueId.');
            }
            if (payload.result === 'cancel') {
                return this.finishPasswordAction(
                    payload.actionDef, payload.actionKey, payload.uniqueId, 'cancel'
                );
            }
            if (typeof payload.passwordType !== 'string' ||
                !payload.passwordConfig || typeof payload.passwordConfig !== 'object' ||
                !Object.prototype.hasOwnProperty.call(payload, 'input')) {
                throw new TypeError('password.submit requires passwordType, passwordConfig and raw input.');
            }
            const success = verifyPassword(payload.passwordType, payload.passwordConfig, payload.input);
            return this.finishPasswordAction(
                payload.actionDef, payload.actionKey, payload.uniqueId, success
            );
        });
    }

    publishProtocolSnapshot(reason = 'state.changed') {
        if (!this.protocol || !this.state) return null;
        return this.protocol.publishSnapshot(this, reason);
    }

    dispatchProtocolCommand(command, context = {}) {
        if (!this.protocol) throw new Error('VSR protocol is not initialized.');
        return this.protocol.dispatch(command, context);
    }

    reset() {
        this.state = {
            // [CLEANUP] Removed: inventory, hand (global), bans, injections
            sceneId: "", scenes: {}, routers: {}, actions: {}, global: {},
            characters: {}, itemInfo: {}, chats: {}, chatHistory: {}, executed: [],
            effect_overrides: {}, // Thay thế cho bans/injections logic cũ
            effectQueue: { sync: [], async: [] }, // [NEW] Effect Queue
            isSyncQueueRunning: false, // [NEW] Sync Queue Task Runner Status
            isAsyncQueueRunning: false, // [NEW] Async Queue Task Runner Status
            pausedBackgroundTasks: { automations: {}, characters: {} }, // [NEW] Pause states
            prevRouter: null,
            map: { choices: {}, blocks: {} },
            automations: {},
            faker: { active: false, targetId: null, backupPlayer: null },
            playerMoveHistory: [],
            sceneTree: {},
            config: {} // [NEW] Init config
        };
        this.src = null;
        this.chatState = { active: false, blocking: false, id: null, blockId: null, index: 0, triggerActionId: null, actionModified: false };

        this.currentStillTask = null;
        this.activeTimerTasks = [];
        this.isActionProcessing = false;

        this.isTransitioning = false;
    }

    init(script) {
        this.reset();

        const loadedData = LoaderSystem.loadScript(script);
        if (!loadedData) return;

        this.src = loadedData.src;
        this.state = loadedData.state;

        this.initCharactersMoving();

        const entry = script.meta && script.meta.entryScene ? script.meta.entryScene : Object.keys(script.scenes)[0];
        if (!this.state.scenes[entry]) {
            console.error(`SAFEGUARD: Entry Scene '${entry}' not found! Trying fallback.`);
            const firstScene = Object.keys(this.state.scenes)[0];
            if (firstScene) {
                this.enterScene(firstScene);
                this.state.playerMoveHistory.push(firstScene);
                this.publishProtocolSnapshot('engine.initialized');
            } else {
                API.render.notification.alert("Init Error", "Không tìm thấy Scene hợp lệ để bắt đầu.", "danger");
            }
        } else {
            this.enterScene(entry);
            this.state.playerMoveHistory.push(entry);
            this.publishProtocolSnapshot('engine.initialized');
        }
    }

    forceUnlock() {
        this.isTransitioning = false;
        this.isActionProcessing = false;
        this.state.isSyncQueueRunning = false;
        this.state.isAsyncQueueRunning = false;
        this.clearEffectQueue('all');
        API.render.navigation.setBlocking(false);
        console.warn("Engine: Force Unlocked");
    }

    // --- EFFECT QUEUE & BACKGROUND TASKS SYSTEM ---
    pushToEffectQueue(effectiveList, context, isAsync = false) {
        return new Promise((resolve) => {
            const queueItem = { effectiveList, context, isAsync, resolve };
            if (isAsync) {
                this.state.effectQueue.async.push(queueItem);
                if (!this.state.isAsyncQueueRunning) this.runAsyncQueue();
            } else {
                this.state.effectQueue.sync.push(queueItem);
                if (!this.state.isSyncQueueRunning) this.runSyncQueue();
            }
        });
    }

    async runSyncQueue() {
        this.state.isSyncQueueRunning = true;

        while (this.state.effectQueue.sync.length > 0) {
            const item = this.state.effectQueue.sync.shift();

            this.isActionProcessing = true;
            if (API.render && API.render.navigation) API.render.navigation.setBlocking(true);

            try {
                await this.processRunnables(item.effectiveList, item.context, false, true);
            } catch (err) {
                console.error("EffectQueue Sync error:", err);
            }

            if (item.resolve) item.resolve();
        }

        this.state.isSyncQueueRunning = false;
        this.isActionProcessing = false;
        if (API.render && API.render.navigation) API.render.navigation.setBlocking(false);
    }

    async runAsyncQueue() {
        this.state.isAsyncQueueRunning = true;

        while (this.state.effectQueue.async.length > 0) {
            const item = this.state.effectQueue.async.shift();

            try {
                await this.processRunnables(item.effectiveList, item.context, true, true);
            } catch (err) {
                console.error("EffectQueue Async error:", err);
            }

            if (item.resolve) item.resolve();
        }

        this.state.isAsyncQueueRunning = false;
    }

    clearEffectQueue(queueType = 'all') {
        if (queueType === 'all' || queueType === 'sync') this.state.effectQueue.sync = [];
        if (queueType === 'all' || queueType === 'async') this.state.effectQueue.async = [];
    }

    pauseBackgroundTasks() {
        if (!this.state.automations) return;
        Object.keys(this.state.automations).forEach(autoId => {
            if (this.state.automations[autoId] && this.state.automations[autoId].active) {
                if (window.taskManager) window.taskManager.pause(`auto_${autoId}`);
            }
        });
        if (this.state.characters) {
            Object.keys(this.state.characters).forEach(charId => {
                if (window.taskManager) window.taskManager.pause(`move_char_${charId}`);
            });
        }
    }

    resumeBackgroundTasks() {
        if (!this.state.automations) return;
        Object.keys(this.state.automations).forEach(autoId => {
            if (this.state.automations[autoId] && this.state.automations[autoId].active) {
                if (window.taskManager) window.taskManager.resume(`auto_${autoId}`);
            }
        });
        if (this.state.characters) {
            Object.keys(this.state.characters).forEach(charId => {
                if (window.taskManager) window.taskManager.resume(`move_char_${charId}`);
            });
        }
    }
}

Object.assign(GameEngine.prototype,
    ConfigSystem,
    LogicSystem,
    EffectSystem,
    ActionSystem,
    SceneSystem,
    EntitySystem,
    ItemSystem,
    ChatSystem,
    AutomationSystem
);
