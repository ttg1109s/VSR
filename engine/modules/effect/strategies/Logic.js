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

        if (stateType === 'number') {
            if (typeof current !== 'number' || !Number.isFinite(current) ||
                typeof value !== 'number' || !Number.isFinite(value)) {
                throw new TypeError(`Global state '${String(target)}' requires a finite numeric delta.`);
            }
            state.set('globalState.value', current + value, { id: target });
            return;
        }

        if (stateType === 'boolean' || stateType === 'string') {
            if (typeof value !== stateType) {
                throw new TypeError(`Global state '${String(target)}' requires a ${stateType} value.`);
            }
            state.set('globalState.value', value, { id: target });
            return;
        }

        throw new TypeError(`Unsupported global state type: ${String(stateType)}`);
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
        const sceneId = state.sceneId;
        const routerId = resolveValue(eff.target, engine) || state.get('scene.activeRouterId', { id: sceneId });
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
        try { return await engine.enterRouter(resolveValue(eff.target, engine)); }
        finally { engine.resumeBackgroundTasks?.(); }
    },
    chat: async (engine, eff) => {
        engine.pauseBackgroundTasks?.();
        try { return await engine.startChat(resolveValue(eff.target, engine)); }
        finally { engine.resumeBackgroundTasks?.(); }
    },
    end: async (engine, eff) => {
        if (engine.pauseBackgroundTasks) engine.pauseBackgroundTasks();
        if (engine.clearEffectQueue) engine.clearEffectQueue('all');
        // [FIX] Trước đây chỉ pause/clear queue rồi dừng — không nơi nào gọi
        // API.presentation.components.ending() (bí danh presentation event), nên
        // {"type":"goto","subtype":"end","target":"<endingId>"} — cơ chế DUY
        // NHẤT trong toàn engine để hiện #ending-screen — luôn no-op im lặng.
        // Bất kỳ kịch bản nào dùng goto/end để thắng/thua game đều không bao
        // giờ thực sự hiện màn kết thúc.
        if (engine.api.presentation && engine.api.presentation.components) engine.api.presentation.components.ending(eff.target);
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