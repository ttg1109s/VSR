import { createStateAccess } from './state.js';
import { createUtils } from '../utils/index.js';

function createPresentation(engine) {
    const publish = (path, args) => {
        if (!engine?.protocol) return null;
        try { return engine.protocol.publish(`presentation.${path}`, { args }); }
        catch (error) {
            engine.protocol.publish('presentation.payloadRejected', { operation: path, reason: error?.message || String(error) });
            return null;
        }
    };
    const notification = {
        add: (title, message, level = 'info', options = {}) => engine?.notifications?.add(title, message, level, options) ?? publish('notification.add', [title, message, level]),
        alert: (title, message, level = 'info', options = {}) => engine?.notifications?.alert(title, message, level, options) ?? publish('notification.alert', [title, message, level]),
        dismiss: (id, reason) => engine?.notifications?.dismiss(id, reason) ?? false,
        expire: id => engine?.notifications?.expire(id) ?? false,
        markRead: id => engine?.notifications?.markRead(id) ?? false,
        clear: options => engine?.notifications?.clear(options) ?? 0,
        getHistory: options => engine?.notifications?.getHistory(options) ?? [],
        getPending: () => engine?.notifications?.getPending() ?? []
    };
    const node = (path = '') => new Proxy((...args) => publish(path, args), {
        get(_target, property) {
            if (path === '' && property === 'notification') return notification;
            if (property === 'then' || property === 'toJSON') return undefined;
            if (property === Symbol.toStringTag) return 'VSRPresentationCommand';
            if (property === 'name') return path;
            return node(path ? `${path}.${String(property)}` : String(property));
        }
    });
    return node();
}

export function createEngineAPI(engine) {
    if (!engine) throw new TypeError('createEngineAPI requires an Engine instance.');
    const state = createStateAccess(engine);
    const utils = createUtils();
    return {
        engine: {
            init: script => engine.init(script),
            getConfig: key => engine.getConfig(key),
            action: { trigger: (id, uniqueId) => engine.handleAction(id, uniqueId), markAsRead: id => engine.markAsRead(id) },
            chat: { next: () => engine.nextChat(), selectChoice: index => engine.selectChatChoice(index) },
            inventory: { toggleHand: id => engine.toggleHand(id) },
            scene: { getPath: id => engine.getPath(id), enterScene: (id, skip) => engine.enterScene(id, skip) },
            updateMetState: (id, identity) => engine.updateMetState(id, identity),
            state: {
                get: (key, context, options) => state.get(key, context, options),
                getFrom: (namespace, path, context) => state.getFrom(namespace, path, context),
                getSource: (path, context) => state.getSource(path, context),
                getSourceSnapshot: (path, context) => state.getSourceSnapshot(path, context),
                getRuntime: (path, context) => state.getRuntime(path, context),
                getRuntimeSnapshot: (path, context) => state.getRuntimeSnapshot(path, context),
                getSnapshot: (path, context, options) => state.getSnapshot(path, context, options),
                getSession: (path, context) => state.getSession(path, context),
                getSessionSnapshot: (path, context) => state.getSessionSnapshot(path, context),
                has: (key, context, options) => state.has(key, context, options),
                resolve: (path, context, namespace) => state.resolve(path, context, namespace),
                set: (path, value, context, options) => state.set(path, value, context, options),
                update: (path, updater, context, options) => state.update(path, updater, context, options),
                delete: (path, context, options) => state.delete(path, context, options),
                transaction: callback => state.transaction(callback),
                getCharacters: () => state.getRuntime('characters'),
                getItem: id => state.getRuntime('itemInfo.[id]', { id }),
                get meta() { return state.getRuntime('meta'); },
                get sceneId() { return state.getRuntime('sceneId'); },
                get scenes() { return state.getRuntime('scenes'); },
                getFakerState: () => state.getRuntime('faker'),
                getActionState: id => state.getRuntime('actions.[id]', { id }),
                getChatHistory: id => state.getRuntime('chatHistory.[id]', { id }),
                getChatData: id => state.getRuntime('chats.[id]', { id }),
                checkReq: req => engine.checkReq(req),
                getInventory: () => engine.getInventory(),
                getHand: () => engine.getHand()
            }
        },
        protocol: {
            snapshot: options => engine.protocol?.createSnapshot(engine, options) ?? null,
            subscribe: listener => engine.protocol?.subscribe(listener) ?? (() => {}),
            command: (name, payload, options) => engine.dispatchProtocolCommand(engine.protocol.createCommand(name, payload, options)),
            dispatch: (command, context) => engine.dispatchProtocolCommand(command, context),
            eventsSince: revision => engine.protocol?.getEventsSince(revision) ?? null,
            eventsAfter: sequence => engine.protocol?.getEventsAfter(sequence) ?? null
        },
        presentation: createPresentation(engine),
        notifications: engine.notifications,
        utils
    };
}
export const API = Object.freeze({ createEngineAPI });
export default API;
