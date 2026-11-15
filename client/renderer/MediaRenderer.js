const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

export class MediaRenderer {
  resolve(reference, media = {}) {
    if (!reference) return null;
    if (typeof reference === 'object' && typeof reference.url === 'string') {
      return { type: reference.type || 'photo', url: reference.url };
    }
    if (typeof reference !== 'string') return null;
    if (media[reference] && typeof media[reference].url === 'string') {
      return { type: media[reference].type || 'photo', url: media[reference].url };
    }
    if (reference.startsWith('video:')) return { type: 'video', url: reference.slice(6) };
    if (reference.startsWith('photo:')) return { type: 'photo', url: reference.slice(6) };
    return { type: 'photo', url: reference };
  }

  renderSceneCover(scene, router, media = {}) {
    const reference = router?.meta?.cover || scene?.meta?.cover;
    const asset = this.resolve(reference, media);
    if (!asset?.url) return '';
    const url = escapeHtml(asset.url);
    if (asset.type === 'video') {
      return `<video class="scene-media" src="${url}" autoplay muted loop playsinline aria-hidden="true"></video>`;
    }
    return `<img class="scene-media" src="${url}" alt="" loading="eager" />`;
  }
}
