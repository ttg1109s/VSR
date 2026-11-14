// htdocs/engine/modules/effect/strategies/Logic.js
import { resolveValue, getNestedValue } from '../../Resolver.js';

export { resolveValue, getNestedValue };

export const SetStrategies = {
    state: (engine, eff) => {
        const target = resolveValue(eff.target, engine);
        const val = resolveValue(eff.value, engine);
        const state = engine.api.engine.state;
        const current = state.get('globalState.value', { id: target });
        if (current === undefined) return;
        if (typeof current === 'number') {
            const increment = Number(val);
            if (Number.isFinite(increment)) {
                state.set('globalState.value', current + increment, { id: target });
                return;
            }
        }
        state.set('globalState.value', val, { id: target });
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
        if (engine.pauseBackgroundTasks) engine.pauseBackgroundTasks();
        if (engine.clearEffectQueue) engine.clearEffectQueue('async');
        await engine.enterScene(resolveValue(eff.target, engine));
        if (engine.resumeBackgroundTasks) engine.resumeBackgroundTasks();
    },
    router: async (engine, eff) => {
        if (engine.pauseBackgroundTasks) engine.pauseBackgroundTasks();
        if (engine.clearEffectQueue) engine.clearEffectQueue('async');
        await engine.enterRouter(resolveValue(eff.target, engine));
        if (engine.resumeBackgroundTasks) engine.resumeBackgroundTasks();
    },
    chat: async (engine, eff) => {
        if (engine.pauseBackgroundTasks) engine.pauseBackgroundTasks();
        await engine.startChat(resolveValue(eff.target, engine));
        if (engine.resumeBackgroundTasks) engine.resumeBackgroundTasks();
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
        if (engine.pauseBackgroundTasks) engine.pauseBackgroundTasks();
        await engine.enterFaker(resolveValue(eff.target, engine));
        if (engine.resumeBackgroundTasks) engine.resumeBackgroundTasks();
    },
    out_faker: async (engine, eff) => {
        if (engine.pauseBackgroundTasks) engine.pauseBackgroundTasks();
        await engine.exitFaker();
        if (engine.resumeBackgroundTasks) engine.resumeBackgroundTasks();
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