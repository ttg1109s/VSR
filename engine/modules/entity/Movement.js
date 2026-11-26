// Movement algorithms with a shared destination eligibility policy.
export const getRandomIndex = (candidates) => {
    if (!candidates || candidates.length === 0) return -1;
    return candidates[Math.floor(Math.random() * candidates.length)];
};

export const isMoveEntryEligible = (item, engine) => {
    if (!item || item.skip === true) return false;
    if (item.req) {
        const checkRes = engine?.checkReq?.(item.req);
        if (!checkRes || checkRes.pass !== true) return false;
    }
    return true;
};

export const getValidIndices = (moveList, engine) =>
    (Array.isArray(moveList) ? moveList : [])
        .map((item, i) => isMoveEntryEligible(item, engine) ? i : -1)
        .filter(i => i >= 0);

const SAFE_LOOP_LIMIT = 50;
const eligible = (moveList, idx, engine) => idx >= 0 && idx < moveList.length && isMoveEntryEligible(moveList[idx], engine);
const scanDirectional = (start, count, direction, moveList, engine) => {
    for (let step = 0; step < count; step++) {
        const idx = ((start + direction * step) % count + count) % count;
        if (eligible(moveList, idx, engine)) return idx;
    }
    return -1;
};

export const MoveAlgorithms = {
    list: ({ nextIndex, count, moveList, engine }) => ({
        idx: scanDirectional(nextIndex + 1, count, 1, moveList, engine),
        dir: 1
    }),

    list_reverse: ({ nextIndex, count, moveList, engine }) => ({
        idx: scanDirectional(nextIndex - 1, count, -1, moveList, engine),
        dir: -1
    }),

    edge_bounce_logic: ({ nextIndex, count, direction = 1, moveList, engine }) => {
        if (!count || count <= 0) return { idx: -1, dir: direction };
        let dir = direction === -1 ? -1 : 1;
        let idx = nextIndex + dir;
        if (idx >= count) { dir = -1; idx = Math.max(0, count - 2); }
        else if (idx < 0) { dir = 1; idx = Math.min(count - 1, 1); }

        for (let attempt = 0; attempt < Math.min(count * 2, SAFE_LOOP_LIMIT); attempt++) {
            if (eligible(moveList, idx, engine)) return { idx, dir };
            idx += dir;
            if (idx >= count) { dir = -1; idx = Math.max(0, count - 2); }
            else if (idx < 0) { dir = 1; idx = Math.min(count - 1, 1); }
        }
        // Deterministic fallback scans all entries; never return a skipped/req-failed entry.
        const fallback = scanDirectional(nextIndex + 1, count, 1, moveList, engine);
        return { idx: fallback, dir };
    },

    list_loop_reverse: (ctx) => MoveAlgorithms.edge_bounce_logic(ctx),
    edge_bounce_first: (ctx) => MoveAlgorithms.edge_bounce_logic(ctx),
    edge_bounce_last: (ctx) => MoveAlgorithms.edge_bounce_logic({ ...ctx, direction: ctx.direction ?? -1 }),

    random: ({ moveList, currentScene, engine }) => {
        const candidates = getValidIndices(moveList, engine).filter(i => moveList[i].scene_id !== currentScene);
        return { idx: getRandomIndex(candidates), dir: 1 };
    },

    random_weight: ({ moveList, currentScene, engine }) => {
        const candidates = getValidIndices(moveList, engine).filter(i => moveList[i].scene_id !== currentScene);
        const weighted = candidates.map(i => ({ i, weight: Number(moveList[i].weight ?? 1) }))
            .filter(x => Number.isFinite(x.weight) && x.weight > 0);
        const total = weighted.reduce((sum, x) => sum + x.weight, 0);
        let idx = -1;
        if (total > 0) {
            let roll = Math.random() * total;
            for (const candidate of weighted) {
                roll -= candidate.weight;
                if (roll < 0) { idx = candidate.i; break; }
            }
            if (idx < 0) idx = weighted.at(-1)?.i ?? -1;
        }
        return { idx, dir: 1 };
    },

    random_count: ({ moveList, currentScene, engine }) => {
        const candidates = getValidIndices(moveList, engine).filter(i =>
            moveList[i].scene_id !== currentScene && moveList[i].count !== 0
        );
        const idx = getRandomIndex(candidates);
        return { idx, dir: 1, consumeCount: idx >= 0 };
    },

    follow_player: ({ moveList, currentScene, playerMoveHistory, engine }) => {
        const valid = getValidIndices(moveList, engine).filter(i => moveList[i].scene_id !== currentScene);
        if (!playerMoveHistory?.length) return { idx: getRandomIndex(valid), dir: 1 };
        const history = new Set(playerMoveHistory);
        const followed = valid.filter(i => history.has(moveList[i].scene_id));
        return { idx: getRandomIndex(followed.length ? followed : valid), dir: 1 };
    },

    avoid_player: ({ moveList, currentScene, playerCurrentScene, engine }) => {
        const valid = getValidIndices(moveList, engine).filter(i => moveList[i].scene_id !== currentScene);
        const avoid = valid.filter(i => moveList[i].scene_id !== playerCurrentScene);
        return { idx: getRandomIndex(avoid.length ? avoid : valid), dir: 1 };
    }
};
