const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

export class ActionRenderer {
  render(actions = []) {
    return `
      <section class="action-section" aria-label="Các hành động khả dụng">
        <div class="action-heading">
          <div><p class="eyebrow">AVAILABLE INTERACTIONS</p><h2>What will you do?</h2></div>
          <span class="action-count">${String(actions.length).padStart(2, '0')}</span>
        </div>
        <div class="action-list">
          ${actions.length ? actions.map((action, index) => {
            const meta = action.meta || {};
            const title = meta.title || action.title || action.name || action.id;
            const description = meta.desc || meta.description || '';
            return `
              <button class="action-item ${action.runtimeState?.display === 'locked' ? 'is-locked' : ''}" type="button" data-action-id="${escapeHtml(action.id)}" ${action.runtimeState?.display === 'locked' ? 'disabled aria-disabled="true"' : ''}>
                <span class="action-number">${String(index + 1).padStart(2, '0')}</span>
                <span class="action-copy"><strong>${escapeHtml(title)}</strong>${description ? `<small>${escapeHtml(description)}</small>` : ''}</span>
                <span class="action-arrow" aria-hidden="true">${action.runtimeState?.display === 'locked' ? '•' : '↗'}</span>
              </button>`;
          }).join('') : '<p class="empty-actions">Router này chưa có Action khả dụng.</p>'}
        </div>
      </section>`;
  }
}
