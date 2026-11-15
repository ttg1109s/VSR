import { MediaRenderer } from './MediaRenderer.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

export class SceneRenderer {
  constructor() {
    this.mediaRenderer = new MediaRenderer();
  }

  render(scene, router, sceneId, scenario) {
    if (!scene) return '<section class="game-scene"><div class="scene-unavailable">Không tìm thấy Scene hiện tại.</div></section>';
    const meta = scene.meta || {};
    const title = meta.title || scene.title || sceneId;
    const description = meta.desc || meta.description || '';
    const media = scenario?.media || {};
    const cover = this.mediaRenderer.renderSceneCover(scene, router, media);
    return `
      <section class="game-scene" aria-label="Scene hiện tại">
        <div class="scene-art scene-art-runtime">
          ${cover}
          <div class="scene-sun"></div><div class="scene-mountains"></div><div class="scene-fog"></div>
          <span class="scene-coordinate">SCENE / ${escapeHtml(sceneId)}</span>
        </div>
        <div class="scene-copy">
          <p class="eyebrow">CURRENT SCENE</p>
          <h1>${escapeHtml(title)}</h1>
          ${description ? `<p>${escapeHtml(description)}</p>` : ''}
        </div>
      </section>`;
  }
}
