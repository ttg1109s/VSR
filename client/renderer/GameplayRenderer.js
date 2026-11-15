import { SceneRenderer } from './SceneRenderer.js';
import { ActiveRouterRenderer } from './ActiveRouterRenderer.js';
import { ActionRenderer } from './ActionRenderer.js';
import { OverlayRenderer } from './OverlayRenderer.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

export class GameplayRenderer {
  constructor({ root, adapter, onExit }) {
    this.root = root;
    this.adapter = adapter;
    this.onExit = onExit;
    this.sceneRenderer = new SceneRenderer();
    this.routerRenderer = new ActiveRouterRenderer();
    this.actionRenderer = new ActionRenderer();
    this.overlayRenderer = new OverlayRenderer(root, adapter);
    this.unsubscribe = adapter.subscribe(message => this.handleAdapterMessage(message));
  }

  handleAdapterMessage(message) {
    if (message.type === 'state') this.render(message.viewModel);
    if (message.type === 'presentation') this.overlayRenderer.handle(message.name, message.payload);
  }

  mount() {
    this.render(this.adapter.getViewModel());
  }

  render(viewModel) {
    if (!viewModel?.scene || !viewModel?.router) {
      this.root.innerHTML = '<main class="game-shell"><p class="scene-unavailable">Engine chưa cung cấp Scene và Router hợp lệ.</p></main>';
      return;
    }
    const scenarioTitle = this.adapter.engine.src?.meta?.title || 'VSR';
    this.root.innerHTML = `
      <main class="game-shell">
        <header class="game-topbar">
          <button class="game-exit" type="button" id="exit-game" aria-label="Thoát gameplay">←</button>
          <div class="game-brand"><span class="brand-mark">V</span><span>VSR <small>PLAYING</small></span></div>
          <span class="live-indicator"><i></i> LIVE</span>
        </header>
        ${this.sceneRenderer.render(viewModel.scene, viewModel.sceneId)}
        ${this.routerRenderer.render(viewModel.router, viewModel.routerId)}
        ${this.actionRenderer.render(viewModel.actions)}
        <footer class="game-footer"><span>${escapeHtml(scenarioTitle)}</span><span>REV ${viewModel.stateRevision}</span></footer>
      </main>`;
    this.root.querySelector('#exit-game')?.addEventListener('click', () => this.onExit?.());
    this.root.querySelectorAll('[data-action-id]').forEach(button => button.addEventListener('click', async () => {
      const actionId = button.dataset.actionId;
      button.disabled = true;
      button.classList.add('is-running');
      try {
        const acknowledgement = await this.adapter.triggerAction(actionId);
        if (!acknowledgement.ok) throw new Error(acknowledgement.error?.message || acknowledgement.error?.code || 'Action failed.');
        if (acknowledgement.result?.success === false) throw new Error(acknowledgement.result.reason || 'Action không khả dụng.');
      } catch (error) {
        this.overlayRenderer.showError(error);
      }
    }));
    this.overlayRenderer.render();
  }

  dispose() {
    this.unsubscribe?.();
    this.overlayRenderer.reset();
  }
}
