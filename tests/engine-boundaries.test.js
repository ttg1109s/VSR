import { importModules } from './imports/index.js';
const __testModules = await importModules(["GameEngine","SaveState"]);
const { GameEngine } = __testModules.GameEngine;
const { createSaveEnvelope } = __testModules.SaveState;

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';


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

test('browser client modules depend on JSON transport, never on GameEngine', () => {
  const root = fileURLToPath(new URL('../engine/client', import.meta.url));
  const files = [];
  const walk = directory => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && path.endsWith('.js')) files.push(path);
    }
  };
  walk(root);
  for (const path of files) {
    const source = readFileSync(path, 'utf8');
    assert.doesNotMatch(source, /from\s+['"][^'"]*engine\//, `Client module imports Engine: ${path}`);
    assert.doesNotMatch(source, /\.engineAdapter\.engine|adapter\.engine/, `Client module reaches into Engine: ${path}`);
  }
});
