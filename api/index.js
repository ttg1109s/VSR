import State from './state.js';
import { fb } from '../plugin/basefunction.js';

let engineInstance = null;

function publishPresentation(path, args) {
    if (!engineInstance?.protocol) return null;
    try {
        return engineInstance.protocol.publish(`presentation.${path}`, { args });
    } catch (error) {
        engineInstance.protocol.publish('presentation.payloadRejected', {
            operation: path,
            reason: error?.message || String(error)
        });
        return null;
    }
}

function createPresentationNode(path = '') {
    const callable = (...args) => publishPresentation(path, args);
    return new Proxy(callable, {
        get(_target, property) {
            if (property === 'then') return undefined;
            if (property === 'toJSON') return undefined;
            if (property === Symbol.toStringTag) return 'VSRPresentationCommand';
            if (property === 'name') return path;
            return createPresentationNode(path ? `${path}.${String(property)}` : String(property));
        }
    });
}

const presentation = createPresentationNode();

export const API = {
    bindEngine(engine) {
        engineInstance = engine;
        State.bindEngine(engine);
        return this;
    },

    get engineInstance() {
        return engineInstance;
    },

    protocol: {
        snapshot: (options) => engineInstance?.protocol?.createSnapshot(engineInstance, options) ?? null,
        subscribe: (listener) => engineInstance?.protocol?.subscribe(listener) ?? (() => {}),
        command: (name, payload, options) => {
            if (!engineInstance?.protocol) return Promise.reject(new Error('VSR protocol is unavailable.'));
            return engineInstance.protocol.dispatch(engineInstance.protocol.createCommand(name, payload, options));
        },
        dispatch: (command, context) => {
            if (!engineInstance?.protocol) return Promise.reject(new Error('VSR protocol is unavailable.'));
            return engineInstance.protocol.dispatch(command, context);
        },
        eventsSince: (revision) => engineInstance?.protocol?.getEventsSince(revision) ?? null
    },

    engine: {
        init: (script) => engineInstance?.init(script),
        getConfig: (key) => engineInstance?.getConfig(key),
        action: {
            trigger: (id, uniqueId) => engineInstance?.handleAction(id, uniqueId),
            finishPassword: (def, key, id, success) => engineInstance?.finishPasswordAction(def, key, id, success),
            markAsRead: (id) => engineInstance?.markAsRead(id)
        },
        chat: {
            next: () => engineInstance?.nextChat(),
            selectChoice: (index) => engineInstance?.selectChatChoice(index)
        },
        inventory: {
            toggleHand: (id) => engineInstance?.toggleHand(id)
        },
        scene: {
            getPath: (id) => engineInstance?.getPath(id),
            enterScene: (id, skip) => engineInstance?.enterScene(id, skip)
        },
        updateMetState: (id, identity) => engineInstance?.updateMetState(id, identity),
        state: {
            get: (key, context) => State.get(key, context),
            getCharacters: () => engineInstance?.state?.characters,
            getItem: (id) => engineInstance?.state?.itemInfo?.[id],
            get meta() { return engineInstance?.state?.meta; },
            get sceneId() { return engineInstance?.state?.sceneId; },
            get scenes() { return engineInstance?.state?.scenes; },
            getFakerState: () => engineInstance?.state?.faker,
            getActionState: (id) => engineInstance?.state?.actions?.[id],
            getChatHistory: (id) => engineInstance?.state?.chatHistory?.[id],
            getChatData: (id) => engineInstance?.state?.chats?.[id],
            checkReq: (req) => engineInstance?.checkReq(req),
            getInventory: () => engineInstance?.getInventory(),
            getHand: () => engineInstance?.getHand()
        }
    },

    presentation,
    plugins: { fb }
};

export default API;
