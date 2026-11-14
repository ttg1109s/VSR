import test from 'node:test';
import assert from 'node:assert/strict';
import { createUtils } from './index.js';

test('createUtils returns an isolated utility facade', () => {
    const first = createUtils();
    const second = createUtils();
    assert.notEqual(first, second);
    assert.equal(Object.isFrozen(first), true);
    assert.equal(first.check.type('value', 'string'), true);
    assert.equal(first.check.array([1, 2]), true);
    assert.equal(first.check.inRange(3, 1, 5), true);
    assert.deepEqual(first.check.includes([1, 2, 1], 1, { findIndex: true, count: true }), {
        result: true,
        index: [{ has: [0, 2], exception: [1] }],
        count: [{ has: 2, exception: 1 }]
    });
});

test('array utilities and merge strategies do not depend on a global singleton', () => {
    const utils = createUtils();
    assert.deepEqual(utils.array.findAllIndex([1, 2, 1], 1), [0, 2]);
    assert.deepEqual(utils.array.merge.zigzag([1, 2], ['a']), [1, 'a', 2]);
    assert.deepEqual(utils.array.merge.parallel([1, 2, 3], ['a'], true), [[1, 'a'], [2, null], [3, null]]);
    assert.deepEqual(utils.array.merge.replace([null, 2], [1, 3]), [1, 2]);
});

test('random and number utilities remain available', () => {
    const utils = createUtils();
    const value = utils.random.int(1, 5);
    assert.ok(Number.isInteger(value) && value >= 1 && value <= 5);
    assert.equal(utils.number.prefixZero(7, 3), '007');
    assert.equal(utils.number.round(2.8), 3);
});
