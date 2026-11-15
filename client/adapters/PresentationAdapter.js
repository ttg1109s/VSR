/**
 * Normalizes VSR protocol messages into renderer-facing state and presentation events.
 * This layer does not own game state and never mutates the Engine.
 */
export class PresentationAdapter {
  constructor(engineAdapter) {
    if (!engineAdapter?.subscribe || !engineAdapter?.getViewModel) {
      throw new TypeError('PresentationAdapter requires an EngineAdapter.');
    }
    this.engineAdapter = engineAdapter;
    this.listeners = new Set();
    this.disposed = false;
    this.unsubscribeEngine = engineAdapter.subscribe(message => this.handleEngineMessage(message));
  }

  subscribe(listener) {
    if (typeof listener !== 'function') throw new TypeError('Presentation listener must be a function.');
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(message) {
    for (const listener of this.listeners) {
      try { listener(message); }
      catch (error) { console.error('[VSR Presentation] Listener failed:', error); }
    }
  }

  handleEngineMessage(message) {
    if (this.disposed || !message) return;
    if (message.type === 'state') {
      this.emit(message);
      return;
    }
    if (message.type !== 'protocol' || !message.event) return;
    const event = message.event;
    if (typeof event.event === 'string' && event.event.startsWith('presentation.')) {
      const name = event.event.slice('presentation.'.length);
      if (name === 'scene.render') {
        const viewModel = this.engineAdapter.getViewModel();
        this.emit({
          type: 'presentation',
          name,
          payload: {
            sceneId: viewModel.sceneId,
            routerId: viewModel.routerId,
            actionIds: viewModel.actions.map(action => action.id)
          }
        });
        return;
      }
      this.emit({
        type: 'presentation',
        name,
        payload: event.payload || {}
      });
    } else {
      this.emit({ type: 'protocol', event });
    }
  }

  getViewModel() { return this.engineAdapter.getViewModel(); }
  initialize(scenario) { return this.engineAdapter.initialize(scenario); }
  dispatch(name, payload) { return this.engineAdapter.dispatch(name, payload); }
  triggerAction(actionId) { return this.engineAdapter.triggerAction(actionId); }
  nextChat() { return this.engineAdapter.nextChat(); }
  selectChatChoice(index) { return this.engineAdapter.selectChatChoice(index); }
  toggleHand(itemId) { return this.engineAdapter.toggleHand(itemId); }
  submitPassword(challengeId, input) { return this.engineAdapter.submitPassword(challengeId, input); }
  get engine() { return this.engineAdapter.engine; }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.unsubscribeEngine?.();
    this.listeners.clear();
  }
}
