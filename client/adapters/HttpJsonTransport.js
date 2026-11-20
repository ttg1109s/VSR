/**
 * Browser HTTP + Server-Sent Events transport. The Client sees JSON only.
 * The Engine process is never imported or bundled into the browser.
 *
 * Browser EventSource cannot set Authorization headers. Cookie-based session
 * authentication is therefore the supported SSE mode; bearer credentials are
 * sent only on fetch requests and are never placed in URLs.
 */
export class HttpJsonTransport {
  constructor({ baseUrl = '/api', token = null, credentials = 'same-origin', eventSourceFactory = null } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = typeof token === 'string' && token.trim() ? token : null;
    this.credentials = credentials;
    this.eventSourceFactory = eventSourceFactory;
    this.listeners = new Set();
    this.eventSource = null;
    this.readyPromise = null;
    this.closed = false;
  }

  requestHeaders(extra = {}) {
    return {
      ...extra,
      ...(this.token ? { authorization: `Bearer ${this.token}` } : {})
    };
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
    const factory = this.eventSourceFactory || ((url, options) => new EventSource(url, options));
    if (!this.eventSourceFactory && typeof EventSource === 'undefined') {
      throw new Error('Server-Sent Events are not supported in this browser.');
    }
    this.readyPromise = new Promise((resolve, reject) => {
      // EventSource uses ambient cookies for authentication. Never append a
      // bearer token or other secret to this URL.
      const source = factory(`${this.baseUrl}/events`, { withCredentials: this.credentials === 'include' });
      this.eventSource = source;
      source.onopen = () => resolve();
      source.onmessage = event => {
        try {
          const message = JSON.parse(event.data);
          for (const subscriber of this.listeners) subscriber(JSON.stringify(message));
        } catch (error) {
          for (const subscriber of this.listeners) subscriber(JSON.stringify({ type: 'transport.error', message: error.message }));
        }
      };
      source.onerror = () => {
        if (source.readyState === (globalThis.EventSource?.CLOSED ?? 2)) {
          reject(new Error('Engine event stream is unavailable.'));
        }
      };
    });
  }

  async request(commandJson) {
    if (this.closed) throw new Error('JSON transport is closed.');
    const health = await fetch(`${this.baseUrl}/health`, {
      headers: this.requestHeaders(),
      credentials: this.credentials
    });
    if (!health.ok) throw new Error(`Engine service unavailable (${health.status}).`);
    this.connect();
    await this.readyPromise;
    const response = await fetch(`${this.baseUrl}/command`, {
      method: 'POST',
      headers: this.requestHeaders({ 'content-type': 'application/json' }),
      credentials: this.credentials,
      body: typeof commandJson === 'string' ? commandJson : JSON.stringify(commandJson)
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`Engine transport failed (${response.status}): ${body}`);
    return body;
  }

  async getSnapshot() {
    const response = await fetch(`${this.baseUrl}/snapshot`, {
      headers: this.requestHeaders(),
      credentials: this.credentials
    });
    if (!response.ok) throw new Error(`Cannot load engine snapshot (${response.status}).`);
    return response.json();
  }

  async getDemoScenario() {
    const response = await fetch(`${this.baseUrl}/demo-scenario`, {
      headers: this.requestHeaders(),
      credentials: this.credentials
    });
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
