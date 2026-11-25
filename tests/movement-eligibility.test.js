import { importModules } from './imports/index.js';
const __testModules = await importModules(["MoveAlgorithms"]);
const { MoveAlgorithms, getValidIndices } = __testModules.MoveAlgorithms;

import test from 'node:test';
import assert from 'node:assert/strict';

const engine = {
    checkReq(req) {
        return { pass: req.pass === true };
    }
};

test('list and reverse list never select requirement-failed destinations', () => {
    const moveList = [
        { scene_id: 'a' },
        { scene_id: 'b', req: { pass: false } },
        { scene_id: 'c' },
        { scene_id: 'd', skip: true },
        { scene_id: 'e', req: { pass: true } }
    ];
    assert.deepEqual(getValidIndices(moveList, engine), [0, 2, 4]);
    assert.equal(MoveAlgorithms.list({ nextIndex: 0, count: moveList.length, moveList, engine }).idx, 2);
    assert.equal(MoveAlgorithms.list_reverse({ nextIndex: 4, count: moveList.length, moveList, engine }).idx, 2);
});

test('bounce algorithms return -1 when all entries are skipped or requirements fail', () => {
    const moveList = [
        { skip: true },
        { req: { pass: false } },
        { skip: true }
    ];
    for (const name of ['edge_bounce_first', 'edge_bounce_last', 'list_loop_reverse']) {
        const result = MoveAlgorithms[name]({ nextIndex: 1, count: moveList.length, moveList, direction: 1, engine });
        assert.equal(result.idx, -1, name);
    }
});

test('random weighted movement ignores invalid, zero, negative, and non-finite weights', () => {
    const moveList = [
        { scene_id: 'a', weight: 0 },
        { scene_id: 'b', weight: -1 },
        { scene_id: 'c', weight: Number.NaN },
        { scene_id: 'd', weight: 2 },
        { scene_id: 'e', weight: 1, req: { pass: false } }
    ];
    const result = MoveAlgorithms.random_weight({ moveList, currentScene: 'here', engine });
    assert.equal(result.idx, 3);
});
