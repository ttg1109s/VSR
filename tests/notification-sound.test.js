import test from 'node:test';
import assert from 'node:assert/strict';
import { NotificationSoundService } from '../src/features/notifications/NotificationSoundService.js';

class FakeParam {
  setValueAtTime() {}
  exponentialRampToValueAtTime() {}
}

class FakeNode {
  constructor() {
    this.frequency = new FakeParam();
    this.gain = new FakeParam();
    this.onended = null;
  }
  connect() {}
  disconnect() {}
  start() {}
  stop() {}
}

class FakeAudioContext {
  constructor() {
    this.state = 'running';
    this.currentTime = 1;
    this.destination = {};
    this.nodes = [];
  }
  createOscillator() {
    const node = new FakeNode();
    this.nodes.push(node);
    return node;
  }
  createGain() {
    return new FakeNode();
  }
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
}

test('notification sound service queues before user gesture and synthesizes tones after unlock', () => {
  const previousWindow = globalThis.window;
  globalThis.window = { AudioContext: FakeAudioContext };
  try {
    const service = new NotificationSoundService();
    assert.equal(service.play('success'), false);
    assert.equal(service.pending.length, 1);
    assert.equal(service.unlock(), true);
    assert.equal(service.pending.length, 0);
    assert.equal(service.context.nodes.length, 3);
    assert.equal(service.play('warning'), true);
    assert.equal(service.context.nodes.length, 5);
    service.clearPending();
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
