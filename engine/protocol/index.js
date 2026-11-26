import { createStateAccess } from '../state/StateAccess.js';
import { createUtils } from '../utils.js';
import { SpriteSimulationCoordinator3D } from '../modules/sprite/SpriteSimulationCoordinator3D.js';
export { JsonProtocol, cloneJsonValue } from './JsonProtocol.js';
export { SPRITE_PROTOCOL, normalizeSpriteProtocol, validateSpriteProtocol, serializeSpriteSimulation, adaptSpriteTrajectory } from './JsonProtocol.js';
export { normalizePhysicsWorldConfig, normalizeSpritePhysicsConfig, normalizeScenarioSpritePhysics } from '../modules/sprite/SpritePhysicsConfig.js';

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
            if (path === '' && property === 'notification') throw new Error('Notifications are exposed through engine.api.notifications.');
            if (path === 'scene' && property === 'renderReady') return (payload, options) => engine?.protocol?.requestPresentation('scene.render.ready', payload, options) ?? Promise.resolve({status:'headless'}); if (path === 'scene' && property === 'transition') return (phase, type, duration) => engine?.protocol?.requestPresentation('scene.transition.phase', { args: [phase, type, duration] }, { timeoutMs: Math.max(1000, (Number(duration) || 0) * 1000 + 700) }) ?? Promise.resolve({status:'headless'}); if (path === 'scene' && property === 'releaseTransitionBlock') return () => engine?.protocol?.requestPresentation('scene.transition.release', {}, { timeoutMs: 2500 }) ?? Promise.resolve({status:'headless'});
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
            state: {
                get: (key, context, options) => state.get(key, context, options),
                getFrom: (namespace, path, context) => state.getFrom(namespace, path, context),
                getSource: (path, context) => state.getSource(path, context),
                getSourceSnapshot: (path, context) => state.getSourceSnapshot(path, context),
                getRuntime: (path, context) => state.getRuntime(path, context),
                getRuntimeSnapshot: (path, context) => state.getRuntimeSnapshot(path, context),
                getRuntimeRoot: () => state.getRuntimeRoot(),
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
        spritePhysics: {
            runScenario: (spriteDefinitions, options = {}) => {
                const result = SpriteSimulationCoordinator3D.fromScenario(spriteDefinitions, options);
                engine.protocol?.publish?.('presentation.sprite.simulation', result.payload);
                return result;
            }
        },
        presentation: createPresentation(engine),
        notifications: engine.notifications,
        utils
    };
}
export const API = Object.freeze({ createEngineAPI });
export default API;
