// Set-effect execution module. Resolves effect inputs and delegates mutations to domain handlers.
import { AutomationPropertyHandlers } from './Automation.js';
import { ScenePropertyHandlers, RouterPropertyHandlers } from './Scene.js';
import { ActionPropertyHandlers } from './Action.js';
import { CharacterPropertyHandlers } from './Character.js';
import { SetStrategies as BaseSetStrategies, resolveValue } from './effect/strategies/Logic.js';

// Action definitions and runtime state share one global ID namespace.
function resolveActionRuntime(engine, actionId) {
    if (!actionId || !Object.prototype.hasOwnProperty.call(engine.src?.actions || {}, actionId)) return null;
    return engine.api.engine.state.getRuntime('actions.[id]', { id: actionId });
}

// [REFACTOR] Wired SetStrategies with Handlers
export const WiredSetStrategies = {
    ...BaseSetStrategies,

    scene: (engine, eff) => {
        const target = resolveValue(eff.target, engine);
        const val = resolveValue(eff.value, engine);
        const prop = resolveValue(eff.property, engine);
        const state = engine.api.engine.state;
        const sId = state.sceneId;
        const scene = state.getFrom('runtime', 'scenes.[id]', { id: target });

        if (scene) {
            const handler = ScenePropertyHandlers[prop] || ScenePropertyHandlers.__default__;
            handler(engine, scene, val, target, prop);
        }
    },

    router: (engine, eff) => {
        const state = engine.api.engine.state;
        const currentSceneId = state.sceneId;
        const rId = resolveValue(eff.target, engine) || state.get('scene.activeRouterId', { id: currentSceneId });
        const sId = engine.src?.path?.routers?.[rId] || currentSceneId;
        const rKey = `${sId}_${rId}`;
        const router = state.getRuntime('routers.[routerKey]', { routerKey: rKey });
        const val = resolveValue(eff.value, engine);
        const prop = resolveValue(eff.property, engine);

        if (router) {
            const handler = RouterPropertyHandlers[prop] || RouterPropertyHandlers.__default__;
            handler(engine, router, val, rId, prop);
        }
    },

    action: (engine, eff) => {
        const state = engine.api.engine.state;
        const actionId = String(resolveValue(eff.target, engine) ?? '');
        const val = resolveValue(eff.value, engine);
        const prop = resolveValue(eff.property, engine);
        const action = resolveActionRuntime(engine, actionId);
        if (!action) throw new Error(`Unknown Action ID: ${actionId}`);
        const handler = ActionPropertyHandlers[prop] || ActionPropertyHandlers.__default__;
        handler(engine, action, val, actionId, prop);
    },

    sprite: (engine, eff) => {
        const spriteId = String(resolveValue(eff.target, engine) ?? '');
        const prop = resolveValue(eff.property, engine);
        const value = resolveValue(eff.value, engine);
        return engine.setSpriteProperty(spriteId, prop, value);
    },

    action_count: (engine, eff) => {
        const state = engine.api.engine.state;
        const actionId = String(resolveValue(eff.target, engine) ?? '');
        const phase = resolveValue(eff.phase, engine);
        const value = resolveValue(eff.value, engine);
        if (!['normal', 'pass', 'fail', 'pwFailed'].includes(phase)) {
            throw new TypeError(`Unsupported action counter phase: ${String(phase)}`);
        }
        if (eff.mode !== undefined) throw new TypeError('set/action_count does not support mode.');
        if (!Number.isSafeInteger(value) || value < 0) {
            throw new TypeError('set/action_count requires a non-negative safe integer value.');
        }

        if (!resolveActionRuntime(engine, actionId)) throw new Error(`Unknown Action ID: ${actionId}`);
        state.update('actions.[id]', current => {
            const count = { normal: 0, pass: 0, fail: 0, pwFailed: 0, ...(current?.count || {}) };
            return { ...(current || {}), count: { ...count, [phase]: value } };
        }, { id: actionId });
    },

    character: (engine, eff) => {
        const rawTarget = resolveValue(eff.target, engine);
        const charId = engine.redirectTarget ? engine.redirectTarget(rawTarget) : rawTarget;
        const char = engine.api.engine.state.getRuntime('characters.[id]', { id: charId });
        const val = resolveValue(eff.value, engine);
        const prop = resolveValue(eff.property, engine);

        if (char) {
            const handler = CharacterPropertyHandlers[prop] || CharacterPropertyHandlers.__default__;
            handler(engine, char, val, charId, prop);
        }
    },

    automation: (engine, eff) => {
        const target = resolveValue(eff.target, engine);
        const val = resolveValue(eff.value, engine);
        const prop = resolveValue(eff.property, engine);

        const handler = AutomationPropertyHandlers[prop] || AutomationPropertyHandlers.__default__;
        handler(engine, target, val, prop);
    }
};


export const SetEffectSystem = {
    executeSetEffect(eff) {
        const handler = WiredSetStrategies[eff.subtype];
        if (typeof handler !== 'function') throw new TypeError(`Unsupported set subtype: ${String(eff.subtype)}`);
        return handler(this, eff);
    }
};
