import { importModules } from './imports/index.js';
const __testModules = await importModules(["HttpJsonTransport"]);
const { HttpJsonTransport } = __testModules.HttpJsonTransport;

import test from 'node:test';
import assert from 'node:assert/strict';

test('HTTP transport attaches bearer credentials to fetches without putting them in SSE URLs', async () => {
  const fetchCalls = [];
  const eventSources = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    fetchCalls.push({ url, options });
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
      json: async () => ({ scenario: true })
    };
  };
  try {
    const transport = new HttpJsonTransport({
      baseUrl: '/api',
      token: 'secret-token',
      credentials: 'include',
      eventSourceFactory: (url, options) => {
        const source = { url, options, readyState: 1, close() {} };
        eventSources.push(source);
        queueMicrotask(() => source.onopen?.());
        return source;
      }
    });
    const unsubscribe = transport.subscribe(() => {});
    await transport.request({ command: 'engine.pause' });
    await transport.getSnapshot();

    assert.equal(fetchCalls.length, 4);
    assert.equal(fetchCalls[1].url, '/api/session');
    assert.equal(fetchCalls[1].options.credentials, 'include');
    for (const call of fetchCalls) {
      assert.equal(call.options.headers.authorization, 'Bearer secret-token');
      assert.equal(call.options.credentials, 'include');
      assert.equal(call.url.includes('secret-token'), false);
    }
    assert.equal(eventSources.length, 1);
    assert.equal(eventSources[0].url, '/api/events');
    assert.deepEqual(eventSources[0].options, { withCredentials: true });

    unsubscribe();
    transport.close();
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('HTTP transport does not add bearer credentials when no token is configured', async () => {
  const fetchCalls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    fetchCalls.push({ url, options });
    return { ok: true, status: 200, text: async () => '{"ok":true}' };
  };
  try {
    const transport = new HttpJsonTransport({
      eventSourceFactory: () => ({ readyState: 1, close() {}, set onopen(callback) { queueMicrotask(callback); } })
    });
    transport.subscribe(() => {});
    await transport.request({ command: 'engine.pause' });
    assert.equal(Object.hasOwn(fetchCalls[0].options.headers, 'authorization'), false);
    transport.close();
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('HTTP transport posts generic acknowledgment with JSON and returns accepted flag', async () => {
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    return { ok: true, status: 200, json: async () => ({ ok: true, accepted: true }) };
  };
  try {
    const transport = new HttpJsonTransport({ baseUrl: '/api', token: 'ack-token' });
    const accepted = await transport.acknowledge('pres-123', { status: 'committed', result: { revision: 4 } });
    assert.equal(accepted, true);
    const ackCall = calls.find(call => call.url === '/api/acknowledgment');
    assert.ok(ackCall);
    assert.equal(ackCall.options.method, 'POST');
    assert.equal(ackCall.options.headers.authorization, 'Bearer ack-token');
    assert.deepEqual(JSON.parse(ackCall.options.body), { requestId: 'pres-123', response: { status: 'committed', result: { revision: 4 } } });
    transport.close();
  } finally { globalThis.fetch = originalFetch; }
});
