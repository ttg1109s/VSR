/**
 * Presentation boundary between VSR Engine and the browser client.
 * Engine state remains authoritative; this adapter only projects it for rendering.
 */
export class EngineAdapter {
  constructor(engine) {
    if (!engine?.protocol) throw new TypeError('EngineAdapter requires an initialized GameEngine instance.');
    this.engine = engine;
    this.listeners = new Set();
    this.snapshot = engine.protocol.createSnapshot(engine);
    this.lastScenePresentation = null;
    this.disposed = false;
    this.unsubscribeProtocol = engine.protocol.subscribe(event => this.handleProtocolEvent(event));
  }

  subscribe(listener) {
    if (typeof listener !== 'function') throw new TypeError('Adapter listener must be a function.');
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(message) {
    for (const listener of this.listeners) {
      try { listener(message); }
      catch (error) { console.error('[VSR Client] Adapter listener failed:', error); }
    }
  }

  handleProtocolEvent(event) {
    if (this.disposed || !event) return;
    if (event.event === 'state.snapshot' && event.payload?.snapshot) {
      this.snapshot = event.payload.snapshot;
      this.emit({ type: 'state', reason: event.payload.reason || 'state.changed', viewModel: this.getViewModel(), event });
      return;
    }

    if (event.event === 'presentation.scene.render') {
      this.lastScenePresentation = Array.isArray(event.payload?.args) ? event.payload.args : [];
      this.refresh('presentation.scene.render');
    }

    if (typeof event.event === 'string' && event.event.startsWith('presentation.')) {
      this.emit({ type: 'presentation', name: event.event.slice('presentation.'.length), payload: event.payload || {}, event });
    } else {
      this.emit({ type: 'protocol', event });
    }
  }

  refresh(reason = 'manual') {
    if (this.disposed) return null;
    this.snapshot = this.engine.protocol.createSnapshot(this.engine);
    const viewModel = this.getViewModel();
    this.emit({ type: 'state', reason, viewModel });
    return viewModel;
  }

  getViewModel() {
    const snapshot = this.snapshot || this.engine.protocol.createSnapshot(this.engine);
    const sceneId = snapshot.game?.sceneId || null;
    const routerId = snapshot.game?.routerId || null;
    const scene = sceneId ? this.engine.src?.scenes?.[sceneId] || null : null;
    const router = scene && routerId ? scene.routers?.[routerId] || null : null;

    // The active router is the only authority for the action list.
    // Never enumerate sibling routers or global actions for rendering.
    const actions = scene && router
      ? this.engine.getEffectiveActions(sceneId, routerId)
      : [];

    return {
      engineId: snapshot.engineId,
      stateRevision: snapshot.stateRevision,
      eventSequence: snapshot.eventSequence,
      sceneId,
      routerId,
      scene,
      router,
      actions,
      state: snapshot.state || {},
      game: snapshot.game || {},
      scenePresentation: this.lastScenePresentation
    };
  }

  async initialize(scenario) {
    await this.engine.init(scenario);
    return this.refresh('engine.initialized');
  }

  async dispatch(commandName, payload = {}) {
    if (this.disposed) throw new Error('EngineAdapter has been disposed.');
    const command = this.engine.protocol.createCommand(commandName, payload, {
      expectedStateRevision: this.snapshot?.stateRevision ?? this.engine.protocol.stateRevision
    });
    const acknowledgement = await this.engine.dispatchProtocolCommand(command);
    this.refresh(`command:${commandName}`);
    return acknowledgement;
  }

  triggerAction(actionId) {
    return this.dispatch('action.trigger', { actionId });
  }

  nextChat() {
    return this.dispatch('chat.next');
  }

  selectChatChoice(index) {
    return this.dispatch('chat.selectChoice', { index });
  }

  toggleHand(itemId) {
    return this.dispatch('inventory.toggleHand', { itemId });
  }

  submitPassword(challengeId, input) {
    return this.dispatch('password.submit', { challengeId, input });
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.unsubscribeProtocol?.();
    this.listeners.clear();
  }
}
