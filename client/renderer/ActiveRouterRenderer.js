const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

export class ActiveRouterRenderer {
  render(router, routerId) {
    if (!router) return '<section class="active-router"><p class="eyebrow">ACTIVE ROUTER</p><p class="scene-unavailable">Router hiện tại không hợp lệ.</p></section>';
    const meta = router.meta || {};
    return `
      <section class="active-router" aria-label="Router đang hoạt động">
        <div class="router-heading"><span class="eyebrow">ACTIVE ROUTER</span><span class="router-pulse"></span></div>
        <h2>${escapeHtml(meta.title || meta.name || router.title || routerId)}</h2>
        ${meta.desc || meta.description ? `<p>${escapeHtml(meta.desc || meta.description)}</p>` : ''}
      </section>`;
  }
}
