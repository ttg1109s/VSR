import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../engine/GameEngine.js';
import { createSaveEnvelope } from '../engine/persistence/SaveState.js';

test('effect orchestration queues are isolated from gameplay state', () => {
  const engine = new GameEngine();
  assert.deepEqual(engine.runtime.effectQueue, { sync: [], async: [] });
  assert.equal(Object.hasOwn(engine.state, 'effectQueue'), false);
  assert.equal(Object.hasOwn(engine.state, 'isSyncQueueRunning'), false);
  let cancelled = false;
  engine.runtime.effectQueue.sync.push({ resolve: result => { cancelled = result.cancelled; } });
  engine.clearEffectQueue('sync');
  assert.equal(cancelled, true);
  assert.equal(engine.runtime.effectQueue.sync.length, 0);
});

test('save creation rejects active runtime queues', () => {
  const engine = new GameEngine();
  engine.src = {};
  engine.scenario = {};
  engine.runtime.effectQueue.sync.push({ resolve() {} });
  assert.throws(() => createSaveEnvelope(engine), /effect queue is active/);
});
