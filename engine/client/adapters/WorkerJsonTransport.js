/**
 * JSON transport backed by a dedicated browser Worker.
 * The UI thread never imports or retains a GameEngine reference.
 */
export class WorkerJsonTransport {
  constructor({ worker, requestTimeoutMs = 30000 } = {}) {
    this.worker = worker || new Worker(
      new URL('../../../hosts/worker/worker-entry.js', import.meta.url),
      { type: 'module', name: 'vsr-engine' }
    );
    this.listeners = new Set();
    this.pending = new Map();
    this.sequence = 0;
    this.requestTimeoutMs = Number.isFinite(requestTimeoutMs) && requestTimeoutMs > 0 ? requestTimeoutMs : 30000;
    this.closed = false;

    this.handleMessage = event => {
      const message = event.data;
      if (!message || typeof message !== 'object') return;
      if (message.type === 'event') {
        const json = JSON.stringify(message.message);
        for (const listener of this.listeners) listener(json);
        return;
      }
      if (message.type === 'response') {
        const pending = this.pending.get(message.requestId);
        if (!pending) return;
        this.pending.delete(message.requestId);
        clearTimeout(pending.timeout);
        if (message.ok) pending.resolve(message.body);
        else pending.reject(new Error(message.error || 'Engine Worker request failed.'));
      }
    };
    this.handleError = event => {
      const error = event.error || new Error(event.message || 'Engine Worker failed.');
      error.code = error.code || 'WORKER_FAILED';
      error.outcome = 'unknown';
      for (const pending of this.pending.values()) {
        clearTimeout(pending.timeout);
        pending.reject(error);
      }
      this.pending.clear();
      for (const listener of this.listeners) {
        listener(JSON.stringify({ type: 'transport.error', message: error.message, code: error.code, outcome: error.outcome }));
      }
    };

    this.worker.addEventListener('message', this.handleMessage);
    this.worker.addEventListener('error', this.handleError);
    this.worker.addEventListener('messageerror', this.handleError);
  }

  subscribe(listener) {
    if (typeof listener !== 'function') throw new TypeError('Listener must be a function.');
    if (this.closed) throw new Error('JSON transport is closed.');
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  acknowledge(requestId, response = {}) {
    if (this.closed || typeof requestId !== 'string' || !requestId.trim()) return false;
    this.worker.postMessage({ type: 'acknowledgment', requestId, response });
    return true;
  }

  request(commandJson) {
    if (this.closed) {
      const error = new Error('JSON transport is closed.');
      error.code = 'TRANSPORT_CLOSED';
      error.outcome = 'unknown';
      return Promise.reject(error);
    }
    const requestId = `vsr_req_${Date.now().toString(36)}_${(++this.sequence).toString(36)}`;
    const command = typeof commandJson === 'string' ? JSON.parse(commandJson) : commandJson;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const pending = this.pending.get(requestId);
        if (!pending) return;
        this.pending.delete(requestId);
        const error = new Error(`Engine Worker request timed out after ${this.requestTimeoutMs} ms.`);
        error.code = 'TRANSPORT_TIMEOUT';
        error.outcome = 'unknown';
        pending.reject(error);
      }, this.requestTimeoutMs);
      this.pending.set(requestId, { resolve, reject, timeout });
      try {
        this.worker.postMessage({ type: 'request', requestId, command });
      } catch (error) {
        this.pending.delete(requestId);
        clearTimeout(timeout);
        error.code = error.code || 'POST_MESSAGE_FAILED';
        error.outcome = 'not-sent';
        reject(error);
      }
    });
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    try { this.worker.postMessage({ type: 'close' }); } catch {}
    this.worker.removeEventListener('message', this.handleMessage);
    this.worker.removeEventListener('error', this.handleError);
    this.worker.removeEventListener('messageerror', this.handleError);
    this.worker.terminate();
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      const error = new Error('JSON transport closed.');
      error.code = 'TRANSPORT_CLOSED';
      error.outcome = 'unknown';
      pending.reject(error);
    }
    this.pending.clear();
    this.listeners.clear();
  }
}
