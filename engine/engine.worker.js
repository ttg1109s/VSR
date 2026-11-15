import { GameEngine } from './GameEngine.js';

const engine = new GameEngine();
let closed = false;

engine.protocol.subscribe(message => {
  if (!closed) self.postMessage({ type: 'event', message });
});

self.addEventListener('message', async event => {
  const message = event.data;
  if (!message || typeof message !== 'object' || closed) return;

  if (message.type === 'close') {
    closed = true;
    engine.dispose();
    self.close();
    return;
  }

  if (message.type !== 'request' || typeof message.requestId !== 'string') return;
  try {
    const acknowledgement = await engine.dispatchProtocolCommand(message.command, {});
    self.postMessage({
      type: 'response',
      requestId: message.requestId,
      ok: true,
      body: JSON.stringify(acknowledgement)
    });
  } catch (error) {
    self.postMessage({
      type: 'response',
      requestId: message.requestId,
      ok: false,
      error: error?.message || String(error)
    });
  }
});
