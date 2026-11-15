import { GameEngine } from './GameEngine.js';
import { DEMO_SCRIPT } from '../demo_script.js';
import { normalizeScenario } from './scenario/Scenario.js';

/**
 * In-process host for clients that communicate with a local GameEngine instance.
 * Worker and HTTP transports provide process-isolated alternatives.
 */
export class LocalEngineHost {
  constructor(options = {}) {
    this.engine = new GameEngine(options);
    this.listeners = new Set();
    this.unsubscribe = this.engine.protocol.subscribe(event => this.emit(event));
    this.closed = false;
  }

  subscribe(listener) {
    if (typeof listener !== 'function') throw new TypeError('Listener must be a function.');
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(message) {
    const json = JSON.stringify(message);
    for (const listener of this.listeners) listener(json);
  }

  async request(commandJson) {
    if (this.closed) throw new Error('Engine host is closed.');
    const command = typeof commandJson === 'string' ? JSON.parse(commandJson) : commandJson;
    const acknowledgement = await this.engine.dispatchProtocolCommand(command);
    return JSON.stringify(acknowledgement);
  }

  static getDemoScenario() { return JSON.stringify(DEMO_SCRIPT); }
  getDemoScenario() { return LocalEngineHost.getDemoScenario(); }

  async initialize(scenario) {
    scenario = normalizeScenario(scenario);
    const command = this.engine.protocol.createCommand('engine.init', { script: scenario });
    const ack = JSON.parse(await this.request(JSON.stringify(command)));
    if (!ack.ok) throw new Error(ack.error?.message || ack.error?.code || 'Engine initialization failed.');
    return JSON.stringify(this.engine.protocol.createSnapshot(this.engine));
  }

  snapshot() {
    return JSON.stringify(this.engine.protocol.createSnapshot(this.engine));
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.unsubscribe?.();
    this.listeners.clear();
    this.engine.dispose();
  }
}
