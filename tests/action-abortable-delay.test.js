import test from 'node:test';
import assert from 'node:assert/strict';
import { delay } from '../src/features/actions/abortableDelay.js';

test('abortable UI delay resolves after its duration', async () => {
  await delay(1);
});

test('abortable UI delay rejects immediately for an already-aborted signal', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(delay(10, { signal: controller.signal }), error => error.name === 'AbortError');
});

test('abortable UI delay clears its timer when aborted while waiting', async () => {
  const controller = new AbortController();
  const pending = delay(1000, { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, error => error.name === 'AbortError');
});
