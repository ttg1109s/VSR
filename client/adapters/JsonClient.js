/**
 * JSON-only client transport. It has no Engine import or Engine reference.
 * A host may be local, worker-backed, HTTP, or WebSocket as long as it
 * implements request(JSON) and subscribe(listener).
 */
import { JsonStateStore } from '../state/JsonStateStore.js';

export class JsonClient {
  constructor(transport) {
    if (!transport || typeof transport.request !== 'function' || typeof transport.subscribe !== 'function') {
      throw new TypeError('JsonClient requires a JSON transport.');
    }
    this.transport = transport;
    this.listeners = new Set();
    this.store = new JsonStateStore();
    this.snapshot = null;
    this.commandSequence = 0;
    this.unsubscribeTransport = transport.subscribe(raw => this.receive(raw));
  }

  receive(raw) {
    let message;
    try { message = typeof raw === 'string' ? JSON.parse(raw) : structuredClone(raw); }
    catch (error) { this.emit({ type: 'transport.error', error }); return; }
    if (message?.type === 'event') {
      if (message.event === 'state.snapshot' && message.payload?.snapshot) {
        this.setSnapshot(message.payload.snapshot, message.payload.reason || 'state.changed');
      }
      this.emit({ type: 'event', event: message });
    } else if (message?.type === 'snapshot') {
      this.setSnapshot(message, 'snapshot');
    } else if (message?.type === 'transport.error') {
      this.emit({ type: 'transport.error', error: new Error(message.message || 'JSON transport failed.') });
    }
  }

  emit(message) {
    for (const listener of this.listeners) listener(message);
  }

  subscribe(listener) {
    if (typeof listener !== 'function') throw new TypeError('Listener must be a function.');
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setSnapshot(snapshot, reason) {
    const previous = this.snapshot;
    this.snapshot = structuredClone(snapshot);
    this.store.update(snapshot, reason);
    const changedKeys = [...new Set([...Object.keys(previous || {}), ...Object.keys(snapshot || {})])]
      .filter(key => JSON.stringify(previous?.[key]) !== JSON.stringify(snapshot?.[key]));
    this.emit({ type: 'state', reason, snapshot: this.getSnapshot(), changedKeys });
  }

  getSnapshot() { return this.store.getSnapshot(); }

  inspectScenario(scenario) {
    return this.dispatch('scenario.inspect', { scenario });
  }

  async initialize(scenario) {
    const acknowledgement = await this.dispatch('engine.init', { script: scenario });
    const snapshot = this.getSnapshot();
    if (!snapshot?.game?.initialized) {
      throw new Error(acknowledgement.result?.message || 'Engine did not publish an initialized JSON snapshot.');
    }
    return snapshot;
  }

  async dispatch(name, payload = {}) {
    const command = {
      protocol: 'vsr',
      protocolVersion: this.snapshot?.protocolVersion || 2,
      type: 'command',
      commandId: `client_${Date.now().toString(36)}_${(++this.commandSequence).toString(36)}`,
      command: name,
      payload: structuredClone(payload)
    };
    if (Number.isInteger(this.snapshot?.stateRevision)) command.expectedStateRevision = this.snapshot.stateRevision;
    const ack = JSON.parse(await this.transport.request(JSON.stringify(command)));
    if (!ack.ok) throw Object.assign(new Error(ack.error?.message || ack.error?.code || 'Command failed.'), { code: ack.error?.code, acknowledgement: ack });
    return ack;
  }

  triggerAction(actionId, uniqueId) { return this.dispatch('action.trigger', { actionId, uniqueId }); }
  markActionRead(uniqueId) { return this.dispatch('action.markAsRead', { uniqueId }); }
  nextChat() { return this.dispatch('chat.next'); }
  selectChatChoice(index) { return this.dispatch('chat.selectChoice', { index }); }
  toggleHand(itemId) { return this.dispatch('inventory.toggleHand', { itemId }); }
  useItem(itemId) { return this.dispatch('item.use', { itemId }); }
  enterScene(sceneId, skipTransition = false) { return this.dispatch('scene.enter', { sceneId, skipTransition }); }
  submitPassword(challengeId, input, cancel = false) { return this.dispatch('password.submit', { challengeId, input, cancel }); }
  pause() { return this.dispatch('engine.pause'); }
  resume() { return this.dispatch('engine.resume'); }
  exportSave() { return this.dispatch('save.export'); }
  restoreSave(save) { return this.dispatch('save.restore', { save }); }

  dispose() {
    this.unsubscribeTransport?.();
    this.listeners.clear();
  }
}
