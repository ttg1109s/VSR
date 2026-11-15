import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkerJsonTransport } from '../client/adapters/WorkerJsonTransport.js';

class FakeWorker {
  constructor() { this.listeners = new Map(); this.messages = []; this.terminated = false; }
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
  }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  postMessage(message) {
    this.messages.push(message);
    if (message.type === 'request') {
      queueMicrotask(() => this.emit('message', {
        data: { type: 'response', requestId: message.requestId, ok: true, body: JSON.stringify({
          protocol: 'vsr', protocolVersion: 2, type: 'ack',
          commandId: message.command.commandId, ok: true
        }) }
      }));
    }
  }
  emit(type, event) { for (const listener of this.listeners.get(type) || []) listener(event); }
  terminate() { this.terminated = true; }
}

test('WorkerJsonTransport sends JSON commands and resolves JSON acknowledgements', async () => {
  const worker = new FakeWorker();
  const transport = new WorkerJsonTransport({ worker });
  const command = { protocol: 'vsr', protocolVersion: 2, type: 'command', commandId: 'test-1', command: 'engine.pause', payload: {} };
  const ack = JSON.parse(await transport.request(JSON.stringify(command)));
  assert.equal(ack.ok, true);
  assert.deepEqual(worker.messages[0].command, command);
  transport.close();
  assert.equal(worker.terminated, true);
});

test('WorkerJsonTransport forwards protocol events to JSON subscribers', () => {
  const worker = new FakeWorker();
  const transport = new WorkerJsonTransport({ worker });
  const received = [];
  transport.subscribe(message => received.push(JSON.parse(message)));
  const event = { protocol: 'vsr', protocolVersion: 2, type: 'event', event: 'engine.ready', payload: {} };
  worker.emit('message', { data: { type: 'event', message: event } });
  assert.deepEqual(received, [event]);
  transport.close();
});

test('WorkerJsonTransport rejects pending requests when closed', async () => {
  const worker = new FakeWorker();
  const transport = new WorkerJsonTransport({ worker });
  const request = transport.request({ protocol: 'vsr', protocolVersion: 2, type: 'command', commandId: 'test-2', command: 'engine.pause', payload: {} });
  transport.close();
  await assert.rejects(request, /closed/i);
});
