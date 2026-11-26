// htdocs/engine/modules/effect/strategies/Logic.js
import { resolveValue, getNestedValue } from '../../Resolver.js';

export { resolveValue, getNestedValue };

export const SetStrategies = {
    state: (engine, eff) => {
        const target = resolveValue(eff.target, engine);
        const value = resolveValue(eff.value, engine);
        const state = engine.api.engine.state;
        const stateType = state.get('globalState.type', { id: target });
        const current = state.get('globalState.value', { id: target });

        if (stateType === undefined || current === undefined) {
            throw new Error(`Unknown global state: ${String(target)}`);
        }

        // Explicit typed contract only. Legacy effects without dataType are rejected.
        const expectedType = { int: 'number', bool: 'boolean', str: 'string' }[eff.dataType];
        if (!expectedType) throw new TypeError(`set/state requires an explicit supported dataType (int/bool/str), got: ${String(eff.dataType)}`);
        if (stateType !== expectedType) {
            throw new TypeError(`Global state '${String(target)}' is ${stateType}, but effect declares ${eff.dataType}.`);
        }

        if (eff.dataType === 'int') {
            if (!Number.isInteger(current) || !Number.isFinite(current) ||
                !Number.isInteger(value) || !Number.isFinite(value)) {
                throw new TypeError(`Global state '${String(target)}' requires integer current/value.`);
            }
            const operation = eff.operation;
            if (operation === undefined) throw new TypeError(`Global state '${String(target)}' requires an explicit int operation (adjust/replace).`);
            let next;
            switch (operation) {
                case 'adjust': next = current + value; break;
                
                case 'replace': next = value; break;
                default: throw new TypeError(`Unsupported int operation: ${String(operation)}`);
            }
            state.set('globalState.value', next, { id: target });
            return;
        }

        if (Object.prototype.hasOwnProperty.call(eff, 'operation')) {
            throw new TypeError(`Global state '${String(target)}' with dataType ${eff.dataType} must not declare operation.`);
        }
        if (typeof value !== expectedType) {
            throw new TypeError(`Global state '${String(target)}' requires a ${eff.dataType} value.`);
        }
        state.set('globalState.value', value, { id: target });
        return;
    },
    scene: (engine, eff) => {
        const target = resolveValue(eff.target, engine);
        const state = engine.api.engine.state;
        if (!state.has('scene.blocked', { id: target })) return;
        state.set('scenes.[id].[property]', resolveValue(eff.value, engine), {
            id: target,
            property: resolveValue(eff.property, engine)
        });
    },
    router: (engine, eff) => {
        const state = engine.api.engine.state;
        const currentSceneId = state.sceneId;
        const routerId = resolveValue(eff.target, engine) || state.get('scene.activeRouterId', { id: currentSceneId });
        const sceneId = engine.src?.path?.routers?.[routerId] || currentSceneId;
        const routerKey = `${sceneId}_${routerId}`;
        if (!state.has('router.blocked', { sceneId, routerId })) return;
        state.set('routers.[routerKey].[property]', resolveValue(eff.value, engine), {
            routerKey,
            property: resolveValue(eff.property, engine)
        });
    },
    automation: (engine, eff) => {
        const target = resolveValue(eff.target, engine);
        const state = engine.api.engine.state;
        if (!state.getRuntime('automations.[id]', { id: target })) return;
        state.set('automations.[id].[property]', resolveValue(eff.value, engine), {
            id: target,
            property: resolveValue(eff.property, engine)
        });
    }
};

export const GotoStrategies = {
    scene: async (engine, eff) => {
        engine.pauseBackgroundTasks?.();
        engine.clearEffectQueue?.('async');
        try { return await engine.enterScene(resolveValue(eff.target, engine)); }
        finally { engine.resumeBackgroundTasks?.(); }
    },
    router: async (engine, eff) => {
        engine.pauseBackgroundTasks?.();
        engine.clearEffectQueue?.('async');
        try {
            const routerId = resolveValue(eff.target, engine);
            const currentSceneId = engine.api.engine.state.sceneId;
            const ownerSceneId = engine.src?.path?.routers?.[routerId] ||
                (engine.src?.scenes?.[currentSceneId]?.routers?.[routerId] ? currentSceneId :
                    (!engine.src?.scenes ? currentSceneId : null));
            if (!ownerSceneId) {
                if (!engine.src?.scenes) return await engine.enterRouter(routerId);
                return { success: false, reason: 'router_not_found' };
            }
            if (ownerSceneId !== currentSceneId) {
                const sceneResult = await engine.enterScene(ownerSceneId);
                if (sceneResult?.success === false) return sceneResult;
            }
            return await engine.enterRouter(routerId);
        }
        finally { engine.resumeBackgroundTasks?.(); }
    },
    chat: async (engine, eff) => {
        engine.pauseBackgroundTasks?.();
        try { return await engine.startChat(resolveValue(eff.target, engine)); }
        finally { engine.resumeBackgroundTasks?.(); }
    },
    end: async (engine, eff) => {
        const endingId = resolveValue(eff.target, engine);
        return engine.activateEnding(endingId);
    },
    in_faker: async (engine, eff) => {
        engine.pauseBackgroundTasks?.();
        try { return await engine.enterFaker(resolveValue(eff.target, engine)); }
        finally { engine.resumeBackgroundTasks?.(); }
    },
    out_faker: async (engine, eff) => {
        engine.pauseBackgroundTasks?.();
        try { return await engine.exitFaker(); }
        finally { engine.resumeBackgroundTasks?.(); }
    }
};

export default class LogicStrategy {
    constructor() { this.type = 'logic'; }
    execute(params, engine) {
        return new Promise(async (resolve) => {
            if (params.wait) {
                const ms = resolveValue(params.wait, engine);
                await engine.delay(ms);
                resolve();
                return;
            }
            if (params.log) console.log("LOGIC LOG:", resolveValue(params.log, engine));
            if (params.exec) { /* Execute custom JS string if needed, security risk though */ }
            resolve();
        });
    }
}