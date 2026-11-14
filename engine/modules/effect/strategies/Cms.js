// htdocs/engine/modules/effect/strategies/Cms.js

import { resolveValue } from './Logic.js';

// --- Character Helper ---
const getCharacter = (engine, id) => {
    const charId = resolveValue(id, engine);
    const current = engine.api.engine.state.getRuntime('characters.[id]', { id: charId });
    return current ? { id: charId, value: structuredClone(current) } : null;
};

const getRouter = (engine, id) => {
    const state = engine.api.engine.state;
    const rawId = resolveValue(id, engine);
    if (state.getRuntime('routers.[routerKey]', { routerKey: rawId })) {
        return { key: rawId, value: structuredClone(state.getRuntime('routers.[routerKey]', { routerKey: rawId })) };
    }
    const key = `${state.sceneId}_${rawId}`;
    const current = state.getRuntime('routers.[routerKey]', { routerKey: key });
    return current ? { key, value: structuredClone(current) } : null;
};;