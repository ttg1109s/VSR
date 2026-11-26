import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importModules } from './imports/index.js';

const modules = await importModules(['GameEngine', 'JsonProtocol', 'JsonClient', 'StateAccess']);
const { GameEngine } = modules.GameEngine;
const { JsonProtocol } = modules.JsonProtocol;
const { JsonClient } = modules.JsonClient;
const { createStateAccess } = modules.StateAccess;

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
function timeout(promise, ms, label = 'operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms))
  ]);
}
function scenario() {
  return JSON.parse(readFileSync(new URL('./fixtures/engine/minimal-scenario.json', import.meta.url), 'utf8'));
}

test('fault injection contract: caller timeout does not break EffectQueue serialization or recovery', async () => {
  const engine = new GameEngine();
  engine.api.presentation.navigation.setBlocking = () => {};
  const gate = deferred();
  let releaseSeen = false;
  const order = [];
  engine.processRunnables = async list => {
    if (list[0].hold) await gate.promise;
    order.push(list[0].name);
    if (list[0].hold) releaseSeen = true;
  };
  const active = engine.pushToEffectQueue([{ hold: true, name: 'active' }], {}, false);
  const activeTimedOut = await timeout(active, 20, 'queue item').catch(error => error.message);
  assert.match(activeTimedOut, /timed out/);
  const next = engine.pushToEffectQueue([{ name: 'next' }], {}, false);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(order, [], 'same-queue work must remain serialized behind the active item');
  gate.resolve();
  const [activeResult, nextResult] = await Promise.all([active, next]);
  assert.equal(releaseSeen, true);
  assert.equal(activeResult.cancelled, false);
  assert.equal(nextResult.cancelled, false);
  assert.deepEqual(order, ['active', 'next']);
  engine.dispose();
});

test('fault injection contract: failures at effect handler phases are reported and queue continues', async () => {
  const engine = new GameEngine();
  engine.api.presentation.navigation.setBlocking = () => {};
  const phases = ['validate', 'prepare', 'mutate', 'commit', 'postCommit', 'cleanup'];
  const observed = [];
  const originalConsoleError = console.error;
  console.error = () => {};
  engine.processRunnables = async list => {
    const phase = list[0].phase;
    observed.push(phase);
    if (phase !== 'cleanup' && phase !== 'recovery') throw Object.assign(new Error(`fault:${phase}`), { phase });
  };
  const calls = phases.map(phase => engine.pushToEffectQueue([{ phase }], {}, false));
  const after = engine.pushToEffectQueue([{ phase: 'recovery' }], {}, false);
  const results = await Promise.all([...calls, after]);
  for (let i = 0; i < phases.length - 1; i++) assert.match(results[i].error?.message || '', new RegExp(`fault:${phases[i]}`));
  assert.equal(results[phases.length - 1].cancelled, false);
  assert.deepEqual(observed, [...phases, 'recovery']);
  assert.equal(engine.runtime.isSyncQueueRunning, false);
  console.error = originalConsoleError;
  engine.dispose();
});

test('fault injection contract: transport disconnect after commit and before ACK is idempotent on retry', async () => {
  const protocol = new JsonProtocol();
  let committed = 0;
  protocol.registerCommand('counter.commit', async () => ({ value: ++committed }));
  const client = new JsonClient({ subscribe() { return () => {}; }, async request(raw) {
    const request = JSON.parse(raw);
    const ack = await protocol.dispatch(request, { principalId: 'test-principal' });
    if (!this.dropped) {
      this.dropped = true;
      const error = new Error('simulated disconnect after server commit, before ACK delivery');
      error.code = 'TRANSPORT_DISCONNECTED';
      error.outcome = 'unknown';
      throw error;
    }
    return JSON.stringify(ack);
  } });
  try {
    await assert.rejects(client.dispatch('counter.commit', {}, { commandId: 'commit-ack-gap-1' }), error => error.outcome === 'unknown');
    const replay = await client.dispatch('counter.commit', {}, { commandId: 'commit-ack-gap-1' });
    assert.equal(replay.ok, true);
    assert.equal(replay.result.value, 1);
    assert.equal(committed, 1, 'retry must replay acknowledgement without repeating committed mutation');
  } finally { client.dispose(); }
});

test('fault injection contract: malformed restore input is rejected without replacing live runtime', async () => {
  const engine = new GameEngine();
  await engine.init(scenario());
  const before = JSON.stringify(engine.api.engine.state.getRuntimeSnapshot());
  const badSave = engine.exportSave();
  badSave.state.sceneId = 'nonexistent-scene';
  await assert.rejects(engine.restoreSave(badSave), /Save state does not match scenario structure/);
  assert.equal(JSON.stringify(engine.api.engine.state.getRuntimeSnapshot()), before);
  assert.equal(engine.api.engine.state.getFrom('source', 'meta.title'), 'Test');
  engine.dispose();
});

test('fault injection contract: concurrent subsystem-style mutations preserve aggregate state', async () => {
  const live = { src: { meta: { title: 'Concurrent state' } }, state: { global: { counter: 0 } }, chatState: null, pendingPasswordAction: null, commitState() {} };
  const access = createStateAccess(live);
  const workers = Array.from({ length: 8 }, (_, worker) => Promise.resolve().then(() => {
    for (let i = 0; i < 250; i++) access.update('global.counter', value => (value || 0) + 1);
    return worker;
  }));
  await Promise.all(workers);
  assert.equal(access.get('global.counter'), 2000);
});

test('fault injection contract: restore failure after runtime replacement rolls back the previous runtime', async () => {
  const engine = new GameEngine();
  await engine.init(scenario());
  const previousScenario = engine.scenario;
  const previousState = JSON.stringify(engine.api.engine.state.getRuntimeSnapshot());
  const originalRehydrate = engine.rehydrateBackgroundTasks.bind(engine);
  let injected = false;
  engine.rehydrateBackgroundTasks = function () {
    if (!injected) {
      injected = true;
      throw new Error('injected restore rehydration fault');
    }
    return originalRehydrate();
  };
  const save = engine.exportSave();
  await assert.rejects(engine.restoreSave(save), /injected restore rehydration fault/);
  assert.equal(engine.scenario, previousScenario, 'old scenario reference should be restored');
  assert.equal(JSON.stringify(engine.api.engine.state.getRuntimeSnapshot()), previousState, 'old runtime state should be restored');
  assert.equal(engine.disposed, false, 'successful rollback must not fail-close engine');
  engine.rehydrateBackgroundTasks = originalRehydrate;
  engine.dispose();
});

test('fault injection contract: restore runtime-generation boundary invalidates old callbacks', async () => {
  const engine = new GameEngine();
  await engine.init(scenario());
  const oldGeneration = engine._lifecycleGeneration;
  const save = engine.exportSave();
  await engine.restoreSave(save);
  assert.ok(engine._lifecycleGeneration > oldGeneration, 'restore must create a new lifecycle generation');
  engine.dispose();
});

test('fault injection contract: hook ledger is at-most-once for persisted started wrapper indexes', async () => {
  const engine = new GameEngine();
  const effects=[{type:'effect',inline:{type:'set',subtype:'global',target:'counter',value:1}}];
  const started=[],completed=[];
  const original=engine.processRunnable.bind(engine);let injected=true;
  engine.processRunnable=async(...args)=>{if(injected){injected=false;throw new Error('crash after hook start marker');}return original(...args);};
  await assert.rejects(engine.processRunnables(effects,{hookLedgerRoot:true,onRunnableStart:index=>started.push(index),onRunnableComplete:index=>completed.push(index)},true,true),/crash after hook start marker/);
  assert.deepEqual(started,[0]);assert.deepEqual(completed,[]);
  engine.processRunnable=original;
  await engine.processRunnables(effects,{hookLedgerRoot:true,skipRunnableIndexes:new Set(started),onRunnableStart:index=>started.push(index),onRunnableComplete:index=>completed.push(index)},true,true);
  assert.deepEqual(started,[0]);assert.deepEqual(completed,[],'started but incomplete wrapper is intentionally not replayed');
  engine.dispose();
});
