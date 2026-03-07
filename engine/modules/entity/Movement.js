// htdocs/engine/modules/entity/Movement.js
// Module chứa các thuật toán và helper cho việc di chuyển của Entity

export const getRandomIndex = (candidates) => {
    if (!candidates || candidates.length === 0) return -1;
    const rand = Math.floor(Math.random() * candidates.length);
    return candidates[rand];
};

export const getValidIndices = (moveList, engine) => {
    return moveList.map((item, i) => {
        // [REFACTOR] Use 'skip' standard from Schema V9.2
        if (item.skip) return -1;

        if (item.req) {
            const checkRes = engine.checkReq(item.req);
            if (!checkRes.pass) return -1;
        }
        return i;
    }).filter(i => i !== -1);
};

const SAFE_LOOP_LIMIT = 50;

// --- Movement Algorithms ---
export const MoveAlgorithms = {
    list: ({ nextIndex, count, moveList }) => {
        let idx = (nextIndex + 1) % count;
        let loopCount = 0;
        // [REFACTOR] Use 'skip'
        while ((moveList[idx].skip || (moveList[idx].req && idx !== nextIndex)) && loopCount < Math.min(count, SAFE_LOOP_LIMIT)) {
            idx = (idx + 1) % count;
            loopCount++;
        }
        return { idx, dir: 1 };
    },

    list_reverse: ({ nextIndex, count, moveList }) => {
        let idx = nextIndex - 1;
        if (idx < 0) idx = count - 1;
        let loopCount = 0;
        // [REFACTOR] Use 'skip'
        while ((moveList[idx].skip) && loopCount < Math.min(count, SAFE_LOOP_LIMIT)) {
            idx = idx - 1;
            if (idx < 0) idx = count - 1;
            loopCount++;
        }
        return { idx, dir: -1 };
    },

    edge_bounce_logic: ({ nextIndex, count, direction, moveList }) => {
        let idx = nextIndex + direction;
        let dir = direction;

        if (idx >= count) {
            dir = -1;
            idx = Math.max(0, count - 2);
        } else if (idx < 0) {
            dir = 1;
            idx = Math.min(count - 1, 1);
        }

        let attempt = 0;
        // [REFACTOR] Use 'skip'
        while (moveList[idx] && moveList[idx].skip && attempt < Math.min(count * 2, SAFE_LOOP_LIMIT)) {
            idx += dir;
            if (idx >= count) { dir = -1; idx = Math.max(0, count - 2); }
            else if (idx < 0) { dir = 1; idx = Math.min(count - 1, 1); }
            attempt++;
        }
        return { idx, dir };
    },

    list_loop_reverse: (ctx) => MoveAlgorithms.edge_bounce_logic(ctx),
    edge_bounce_first: (ctx) => MoveAlgorithms.edge_bounce_logic(ctx),
    edge_bounce_last: (ctx) => {
        if (ctx.direction === undefined) ctx.direction = -1;
        return MoveAlgorithms.edge_bounce_logic(ctx);
    },

    random: ({ moveList, currentScene, engine }) => {
        const validR = getValidIndices(moveList, engine).filter(i => moveList[i].scene_id !== currentScene);
        return { idx: getRandomIndex(validR), dir: 1 };
    },

    random_weight: ({ moveList, currentScene, engine }) => {
        const validW = getValidIndices(moveList, engine).filter(i => moveList[i].scene_id !== currentScene);
        let idx = -1;
        if (validW.length > 0) {
            const totalWeight = validW.reduce((acc, i) => acc + (moveList[i].weight || 1), 0);
            let random = Math.random() * totalWeight;
            for (const i of validW) {
                random -= (moveList[i].weight || 1);
                if (random <= 0) {
                    idx = i;
                    break;
                }
            }
        }
        return { idx, dir: 1 };
    },

    random_count: ({ moveList, currentScene, engine }) => {
        const validC = getValidIndices(moveList, engine).filter(i => {
            if (moveList[i].scene_id === currentScene) return false;
            return moveList[i].count !== 0;
        });

        let idx = -1;
        if (validC.length > 0) {
            idx = getRandomIndex(validC);
            if (moveList[idx].count > 0) {
                moveList[idx].count--;
            }
        }
        return { idx, dir: 1 };
    },

    follow_player: ({ moveList, currentScene, playerMoveHistory, engine }) => {
        if (!playerMoveHistory || playerMoveHistory.length === 0) {
            return MoveAlgorithms.random({ moveList, currentScene, engine });
        }

        const historySet = new Set(playerMoveHistory);
        const validFollow = getValidIndices(moveList, engine).filter(i => {
            if (moveList[i].scene_id === currentScene) return false;
            return historySet.has(moveList[i].scene_id);
        });

        let idx = -1;
        if (validFollow.length > 0) {
            idx = getRandomIndex(validFollow);
        } else {
            const validBack = getValidIndices(moveList, engine).filter(i => moveList[i].scene_id !== currentScene);
            idx = getRandomIndex(validBack);
        }
        return { idx, dir: 1 };
    },

    avoid_player: ({ moveList, currentScene, playerCurrentScene, engine }) => {
        const validAvoid = getValidIndices(moveList, engine).filter(i => {
            if (moveList[i].scene_id === currentScene) return false;
            if (moveList[i].scene_id === playerCurrentScene) return false;
            return true;
        });

        let idx = -1;
        if (validAvoid.length > 0) {
            idx = getRandomIndex(validAvoid);
        } else {
            const validAny = getValidIndices(moveList, engine).filter(i => moveList[i].scene_id !== currentScene);
            idx = getRandomIndex(validAny);
        }
        return { idx, dir: 1 };
    }
};
