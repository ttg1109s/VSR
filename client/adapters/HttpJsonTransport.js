/**
 * Browser HTTP + Server-Sent Events transport. The Client sees JSON only.
 * The Engine process is never imported or bundled into the browser.
 */
export class HttpJsonTransport {
  constructor({ baseUrl = '/api' } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.listeners = new Set();
    this.eventSource = null;
    this.readyPromise = null;
    this.closed = false;
  }

  subscribe(listener) {
    if (typeof listener !== 'function') throw new TypeError('Listener must be a function.');
    this.listeners.add(listener);
    this.connect();
    return () => {
      this.listeners.delete(listener);
      if (!this.listeners.size) {
        this.eventSource?.close();
        this.eventSource = null;
        this.readyPromise = null;
      }
    };
  }

  connect() {
    if (this.eventSource || this.closed) return;
    if (typeof EventSource === 'undefined') throw new Error('Server-Sent Events are not supported in this browser.');
    this.readyPromise = new Promise((resolve, reject) => {
      const source = new EventSource(`${this.baseUrl}/events`);
      this.eventSource = source;
      source.onopen = () => resolve();
      source.onmessage = event => {
        try {
          const message = JSON.parse(event.data);
          for (const listener of this.listeners) listener(JSON.stringify(message));
        } catch (error) {
          for (const listener of this.listeners) listener(JSON.stringify({ type: 'transport.error', message: error.message }));
        }
      };
      source.onerror = () => {
        // EventSource reconnects automatically. Only reject initial connection.
        if (source.readyState === EventSource.CLOSED) reject(new Error('Engine event stream is unavailable.'));
      };
    });
  }

  async request(commandJson) {
    if (this.closed) throw new Error('JSON transport is closed.');
    this.connect();
    await this.readyPromise;
    const response = await fetch(`${this.baseUrl}/command`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: typeof commandJson === 'string' ? commandJson : JSON.stringify(commandJson)
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`Engine transport failed (${response.status}): ${body}`);
    return body;
  }

  async getDemoScenario() {
    const response = await fetch(`${this.baseUrl}/demo-scenario`);
    if (!response.ok) throw new Error(`Cannot load demo scenario (${response.status}).`);
    return response.json();
  }

  close() {
    this.closed = true;
    this.eventSource?.close();
    this.eventSource = null;
    this.listeners.clear();
  }
}
