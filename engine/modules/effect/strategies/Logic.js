// htdocs/engine/modules/effect/strategies/Logic.js
import { resolveValue, getNestedValue } from '../../Resolver.js';
import { API } from '../../../../api/index.js';

export { resolveValue, getNestedValue };

export const SetStrategies = {
    state: (engine, eff) => {
        const target = resolveValue(eff.target, engine);
        const val = resolveValue(eff.value, engine);
        if (engine.state.global[target]) {
            if (typeof engine.state.global[target].value === 'number') {
                const numVal = Number(val);
                if (!isNaN(numVal)) {
                    engine.state.global[target].value += numVal;
                    return;
                }
            }
            engine.state.global[target].value = val;
        }
    },
    scene: (engine, eff) => {
        const target = resolveValue(eff.target, engine);
        if (engine.state.scenes[target]) engine.state.scenes[target][eff.property] = resolveValue(eff.value, engine);
    },
    router: (engine, eff) => {
        const sId = engine.state.sceneId;
        const rId = resolveValue(eff.target, engine) || engine.state.scenes[sId].activeRouterId;
        const rKey = `${sId}_${rId}`;
        if (engine.state.routers[rKey]) engine.state.routers[rKey][eff.property] = resolveValue(eff.value, engine);
    },
    automation: (engine, eff) => {
        const target = resolveValue(eff.target, engine);
        if (engine.state.automations[target]) engine.state.automations[target][eff.property] = resolveValue(eff.value, engine);
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
        // API.render.components.ending() (bí danh window.ui.showEnding()), nên
        // {"type":"goto","subtype":"end","target":"<endingId>"} — cơ chế DUY
        // NHẤT trong toàn engine để hiện #ending-screen — luôn no-op im lặng.
        // Bất kỳ kịch bản nào dùng goto/end để thắng/thua game đều không bao
        // giờ thực sự hiện màn kết thúc.
        if (API.render && API.render.components) API.render.components.ending(eff.target);
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
                setTimeout(resolve, ms);
                return;
            }
            if (params.log) console.log("LOGIC LOG:", resolveValue(params.log, engine));
            if (params.exec) { /* Execute custom JS string if needed, security risk though */ }
            resolve();
        });
    }
}