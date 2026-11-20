import test from 'node:test';
import assert from 'node:assert/strict';
import { HttpJsonTransport } from '../client/adapters/HttpJsonTransport.js';

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
    await transport.getDemoScenario();

    assert.equal(fetchCalls.length, 4);
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
