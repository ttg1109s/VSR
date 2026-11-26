import test from 'node:test';
import assert from 'node:assert/strict';
import { importModules } from './imports/index.js';

const { GameEngine } = (await importModules(['GameEngine'])).GameEngine;

function makeEngine() {
  const engine = new GameEngine();
  engine.api.presentation.navigation.setBlocking = () => {};
  engine.processRunnables = async (list, context, isAsync, fromQueue) => {
    assert.equal(fromQueue, true);
    assert.equal(context.shouldContinue(), true);
    for (const entry of list) {
      if (entry.delayMs) await new Promise(resolve => setTimeout(resolve, entry.delayMs));
      if (entry.throw) throw new Error(entry.throw);
      entry.run?.(isAsync);
    }
  };
  return engine;
}

test('EffectQueue stress: sync queue preserves FIFO and exactly-once for 5000 items', async () => {
  const engine = makeEngine();
  const order = [];
  const promises = Array.from({ length: 5000 }, (_, i) => engine.pushToEffectQueue([{ run: () => order.push(i) }], {}, false));
  const results = await Promise.all(promises);
  assert.equal(order.length, 5000);
  assert.deepEqual(order, Array.from({ length: 5000 }, (_, i) => i));
  assert.ok(results.every(result => result?.cancelled === false && !result.error));
  assert.equal(engine.runtime.isSyncQueueRunning, false);
  engine.dispose();
});

test('EffectQueue stress: async queue preserves FIFO and exactly-once for 5000 items', async () => {
  const engine = makeEngine();
  const order = [];
  const promises = Array.from({ length: 5000 }, (_, i) => engine.pushToEffectQueue([{ run: () => order.push(i) }], {}, true));
  const results = await Promise.all(promises);
  assert.equal(order.length, 5000);
  assert.deepEqual(order, Array.from({ length: 5000 }, (_, i) => i));
  assert.ok(results.every(result => result?.cancelled === false && !result.error));
  assert.equal(engine.runtime.isAsyncQueueRunning, false);
  engine.dispose();
});

test('EffectQueue mixed queues execute concurrently while preserving FIFO within each queue', async () => {
  const engine = makeEngine();
  const syncOrder = [], asyncOrder = [];
  let active = 0, maxActive = 0;
  engine.processRunnables = async (list, context, isAsync) => {
    active++; maxActive = Math.max(maxActive, active);
    await new Promise(resolve => setTimeout(resolve, 1));
    (isAsync ? asyncOrder : syncOrder).push(list[0].id);
    active--;
  };
  const sync = Array.from({ length: 120 }, (_, i) => engine.pushToEffectQueue([{ id: i }], {}, false));
  const asyncQ = Array.from({ length: 120 }, (_, i) => engine.pushToEffectQueue([{ id: i }], {}, true));
  const results = await Promise.all([...sync, ...asyncQ]);
  assert.deepEqual(syncOrder, Array.from({ length: 120 }, (_, i) => i));
  assert.deepEqual(asyncOrder, Array.from({ length: 120 }, (_, i) => i));
  assert.ok(maxActive >= 2, `expected cross-queue overlap, observed maxActive=${maxActive}`);
  assert.ok(results.every(result => result?.cancelled === false));
  engine.dispose();
});

test('EffectQueue continues after a failed item and resolves the failing caller with error', async () => {
  const engine = makeEngine();
  const order = [];
  const p1 = engine.pushToEffectQueue([{ run: () => order.push('first') }], {}, false);
  const p2 = engine.pushToEffectQueue([{ throw: 'expected stress failure' }], {}, false);
  const p3 = engine.pushToEffectQueue([{ run: () => order.push('last') }], {}, false);
  const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
  assert.equal(r1.cancelled, false);
  assert.match(r2.error?.message || '', /expected stress failure/);
  assert.equal(r3.cancelled, false);
  assert.deepEqual(order, ['first', 'last']);
  engine.dispose();
});

test('EffectQueue clear resolves queued items as cancelled but leaves active item to finish', async () => {
  const engine = makeEngine();
  let releaseActive;
  engine.processRunnables = async (list) => {
    if (list[0].active) await new Promise(resolve => { releaseActive = resolve; });
  };
  const active = engine.pushToEffectQueue([{ active: true }], {}, false);
  const queued = Array.from({ length: 25 }, () => engine.pushToEffectQueue([{ queued: true }], {}, false));
  await new Promise(resolve => setImmediate(resolve));
  engine.clearEffectQueue('sync');
  const cancelled = await Promise.all(queued);
  assert.ok(cancelled.every(result => result.cancelled === true));
  releaseActive();
  assert.equal((await active).cancelled, false);
  engine.dispose();
});

test('EffectQueue reset cancels old lifecycle and prevents old runner from draining new runtime queue', async () => {
  const engine = makeEngine();
  let releaseOld;
  engine.processRunnables = async list => {
    if (list[0].old) await new Promise(resolve => { releaseOld = resolve; });
    list[0].run?.();
  };
  const old = engine.pushToEffectQueue([{ old: true }], {}, false);
  await new Promise(resolve => setImmediate(resolve));
  engine.reset();
  const freshOrder = [];
  const fresh = engine.pushToEffectQueue([{ run: () => freshOrder.push('fresh') }], {}, false);
  releaseOld();
  const [oldResult, freshResult] = await Promise.all([old, fresh]);
  assert.equal(oldResult.cancelled, true);
  assert.equal(freshResult.cancelled, false);
  assert.deepEqual(freshOrder, ['fresh']);
  engine.dispose();
});

test('EffectQueue forceUnlock releases UI locks but preserves same-queue runner serialization', async () => {
  const engine = makeEngine();
  let releaseFirst;
  let active = 0, peak = 0;
  const order = [];
  engine.processRunnables = async list => {
    active++; peak = Math.max(peak, active);
    order.push(list[0].name);
    if (list[0].slow) await new Promise(resolve => { releaseFirst = resolve; });
    active--;
  };
  const first = engine.pushToEffectQueue([{ slow: true, name: 'first' }], {}, false);
  await new Promise(resolve => setImmediate(resolve));
  engine.forceUnlock();
  assert.equal(engine.runtime.isSyncQueueRunning, true, 'active runner must retain ownership');
  const second = engine.pushToEffectQueue([{ fast: true, name: 'second' }], {}, false);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(peak, 1, 'second item must not start while first item is in-flight');
  releaseFirst();
  const [firstResult, secondResult] = await Promise.all([first, second]);
  assert.equal(firstResult.cancelled, false);
  assert.equal(secondResult.cancelled, false);
  assert.equal(peak, 1, 'same queue must never have overlapping runners');
  assert.deepEqual(order, ['first', 'second']);
  engine.dispose();
});
