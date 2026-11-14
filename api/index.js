import { createStateAccess } from './state.js';
import { fb } from '../plugin/basefunction.js';

function createPresentation(engine) {
    const publish = (path, args) => {
        if (!engine?.protocol) return null;
        try { return engine.protocol.publish(`presentation.${path}`, { args }); }
        catch (error) {
            engine.protocol.publish('presentation.payloadRejected', { operation: path, reason: error?.message || String(error) });
            return null;
        }
    };
    const node = (path = '') => new Proxy((...args) => publish(path, args), {
        get(_target, property) {
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
                getRuntime: (path, context) => state.getRuntime(path, context),
                getSession: (path, context) => state.getSession(path, context),
                has: (key, context, options) => state.has(key, context, options),
                resolve: (path, context, namespace) => state.resolve(path, context, namespace),
                set: (path, value, context, options) => state.set(path, value, context, options),
                update: (path, updater, context, options) => state.update(path, updater, context, options),
                delete: (path, context, options) => state.delete(path, context, options),
                transaction: callback => state.transaction(callback),
                getCharacters: () => engine.state?.characters,
                getItem: id => engine.state?.itemInfo?.[id],
                get meta() { return engine.state?.meta; },
                get sceneId() { return engine.state?.sceneId; },
                get scenes() { return engine.state?.scenes; },
                getFakerState: () => engine.state?.faker,
                getActionState: id => engine.state?.actions?.[id],
                getChatHistory: id => engine.state?.chatHistory?.[id],
                getChatData: id => engine.state?.chats?.[id],
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
        plugins: { fb }
    };
}
export const API = Object.freeze({ createEngineAPI });
export default API;
