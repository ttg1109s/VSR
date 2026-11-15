const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

export class SceneRenderer {
  render(scene, sceneId) {
    if (!scene) return '<section class="game-scene"><div class="scene-unavailable">Không tìm thấy Scene hiện tại.</div></section>';
    const meta = scene.meta || {};
    const title = meta.title || scene.title || sceneId;
    const description = meta.desc || meta.description || '';
    return `
      <section class="game-scene" aria-label="Scene hiện tại">
        <div class="scene-art scene-art-runtime">
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
