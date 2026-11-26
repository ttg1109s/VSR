import { importModules } from './imports/index.js';
const __testModules = await importModules(['JsonProtocol']);
const { JsonProtocol } = __testModules.JsonProtocol;
import test from 'node:test';
import assert from 'node:assert/strict';

test('presentation acknowledgment stress: 10000 concurrent requests, shuffled ACKs, duplicates, stale IDs', async () => {
  const protocol = new JsonProtocol({ maxEvents: 20000 });
  const requests = 10000;
  const promises = new Array(requests);
  const ids = new Array(requests);
  protocol.subscribe(event => {
    if (event.event !== 'presentation.request') return;
    const index = Number(event.payload.operation.slice('stress.'.length));
    ids[index] = event.payload.requestId;
  });
  for (let i = 0; i < requests; i++) {
    promises[i] = protocol.requestPresentation(`stress.${i}`, { index: i }, { timeoutMs: 15000 });
  }
  assert.equal(protocol.presentationRequests.size, requests);
  const order = Array.from({ length: requests }, (_, i) => i).reverse();
  for (const index of order) {
    assert.ok(ids[index], `request ID exists for ${index}`);
    const accepted = protocol.acknowledge(ids[index], { status: 'completed', result: { index } });
    assert.equal(accepted, true);
    assert.equal(protocol.acknowledge(ids[index], { status: 'completed' }), false, `duplicate ${index} rejected`);
  }
  for (let i = 0; i < requests; i++) {
    assert.equal(protocol.acknowledge(`stale-${i}`, { status: 'completed' }), false);
  }
  const results = await Promise.all(promises);
  assert.equal(results.length, requests);
  assert.equal(results.filter(r => r.status === 'completed').length, requests);
  assert.equal(protocol.presentationRequests.size, 0);
  assert.equal(new Set(results.map(r => r.requestId)).size, requests);
  protocol.cancelPresentationRequests();
});

test('presentation acknowledgment stress: timeout and cancel race settles each request once', async () => {
  const protocol = new JsonProtocol();
  const count = 1500;
  const events = [];
  protocol.subscribe(event => { if (event.event === 'presentation.request') events.push(event.payload.requestId); });
  const pending = Array.from({ length: count }, (_, i) => protocol.requestPresentation(`race.${i}`, { i }, { timeoutMs: 10 }));
  for (let i = 0; i < events.length; i += 2) protocol.acknowledge(events[i], { status: 'committed' });
  protocol.cancelPresentationRequests('cancelled');
  const results = await Promise.all(pending);
  assert.equal(results.length, count);
  assert.ok(results.every(r => ['committed', 'cancelled'].includes(r.status)));
  assert.equal(protocol.presentationRequests.size, 0);
  for (const id of events) assert.equal(protocol.acknowledge(id, { status: 'completed' }), false);
});
