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

export class GameEngine {
    constructor() { this.reset(); }

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
            } else {
                API.render.notification.alert("Init Error", "Không tìm thấy Scene hợp lệ để bắt đầu.", "danger");
            }
        } else {
            this.enterScene(entry);
            this.state.playerMoveHistory.push(entry);
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
