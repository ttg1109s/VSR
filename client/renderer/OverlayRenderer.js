const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

export class OverlayRenderer {
  constructor(root, adapter) {
    this.root = root;
    this.adapter = adapter;
    this.messages = [];
    this.choices = [];
    this.inputVisible = false;
    this.notification = null;
    this.password = null;
    this.timer = '';
    this.blocking = false;
  }

  handle(name, payload = {}) {
    const args = Array.isArray(payload.args) ? payload.args : [];
    if (name === 'chat.renderBubble') {
      const line = args[0];
      if (line) this.messages.push(line);
      this.render();
    } else if (name === 'chat.renderChoices') {
      this.choices = Array.isArray(args[0]) ? args[0] : [];
      this.inputVisible = false;
      this.render();
    } else if (name === 'chat.clearChoices') {
      this.choices = [];
      this.render();
    } else if (name === 'chat.inputVisible') {
      this.inputVisible = true;
      this.render();
    } else if (name === 'chat.inputHidden') {
      this.inputVisible = false;
      this.render();
    } else if (name === 'chat.toggleOverlay') {
      this.root.classList.toggle('has-chat-overlay', !!args[0]);
    } else if (name === 'components.keyboard') {
      this.password = { action: args[0], actionId: args[1], uniqueId: args[2], config: args[3] || {} };
      this.render();
    } else if (name === 'scene.updateTimer') {
      this.timer = String(args[0] || '');
      this.render();
    } else if (name === 'scene.hideTimer') {
      this.timer = '';
      this.render();
    } else if (name === 'scene.transition') {
      this.root.classList.toggle('is-transitioning', args[0] === 'start');
    } else if (name === 'navigation.setBlocking') {
      this.blocking = !!args[0];
      this.root.classList.toggle('is-blocking', this.blocking);
    } else if (name.startsWith('notification.')) {
      if (name === 'notification.add' || name === 'notification.alert' || name === 'notification.updated') {
        this.notification = payload.notification || null;
        this.render();
      } else if (name === 'notification.dismiss' || name === 'notification.expired' || name === 'notification.cleared') {
        if (this.notification?.id === payload.notification?.id) this.notification = null;
        this.render();
      }
    }
  }

  render() {
    const previous = this.root.querySelector('.game-overlay-layer');
    if (previous) previous.remove();
    const hasChat = this.messages.length > 0 || this.choices.length > 0;
    const chat = hasChat ? `
      <section class="chat-panel" aria-label="Hội thoại">
        <div class="chat-panel-head"><span class="eyebrow">DIALOGUE</span><button type="button" class="overlay-close" data-overlay-close>×</button></div>
        <div class="chat-message-list">${this.messages.slice(-8).map(line => `
          <article class="chat-line"><span>${escapeHtml(line.nameID || line.char_id || '—')}</span><p>${escapeHtml(line.text || '')}</p></article>
        `).join('')}</div>
        ${this.choices.length ? `<div class="chat-choices">${this.choices.map((choice, index) => `<button type="button" data-chat-choice="${index}">${escapeHtml(choice.text || choice.title || `Lựa chọn ${index + 1}`)}</button>`).join('')}</div>` : ''}
        ${this.inputVisible ? '<button type="button" class="chat-continue" data-chat-next>Tiếp tục <span>→</span></button>' : ''}
      </section>` : '';
    const password = this.password ? `
      <div class="modal-backdrop"><section class="password-modal" role="dialog" aria-modal="true">
        <button type="button" class="overlay-close" data-password-cancel>×</button>
        <p class="eyebrow">CHALLENGE</p><h2>${escapeHtml(this.password.action?.meta?.title || 'Nhập câu trả lời')}</h2>
        ${this.password.config.desc ? `<p>${escapeHtml(this.password.config.desc)}</p>` : ''}
        <form data-password-form><input name="password-input" autocomplete="off" placeholder="Nhập câu trả lời" required /><button class="primary-button" type="submit">XÁC NHẬN <span>→</span></button></form>
      </section></div>` : '';
    const toast = this.notification ? `<div class="game-toast" role="status"><strong>${escapeHtml(this.notification.title)}</strong><span>${escapeHtml(this.notification.message)}</span></div>` : '';
    const timer = this.timer ? `<div class="game-timer">${escapeHtml(this.timer)}</div>` : '';
    if (!chat && !password && !toast && !timer) return;
    this.root.insertAdjacentHTML('beforeend', `<div class="game-overlay-layer">${timer}${chat}${password}${toast}</div>`);
    this.root.querySelector('[data-overlay-close]')?.addEventListener('click', () => {
      this.messages = []; this.choices = []; this.inputVisible = false; this.render();
    });
    this.root.querySelector('[data-chat-next]')?.addEventListener('click', async event => {
      event.currentTarget.disabled = true;
      try { await this.adapter.nextChat(); } catch (error) { this.showError(error); }
    });
    this.root.querySelectorAll('[data-chat-choice]').forEach(button => button.addEventListener('click', async () => {
      this.root.querySelectorAll('[data-chat-choice]').forEach(item => item.disabled = true);
      try { await this.adapter.selectChatChoice(Number(button.dataset.chatChoice)); }
      catch (error) { this.showError(error); }
    }));
    this.root.querySelector('[data-password-cancel]')?.addEventListener('click', async () => {
      const challengeId = this.password?.config?.challengeId;
      this.password = null; this.render();
      if (challengeId) {
        try { await this.adapter.dispatch('password.submit', { challengeId, cancel: true }); }
        catch (error) { this.showError(error); }
      }
    });
    this.root.querySelector('[data-password-form]')?.addEventListener('submit', async event => {
      event.preventDefault();
      const input = new FormData(event.currentTarget).get('password-input');
      const challengeId = this.password?.config?.challengeId;
      if (!challengeId) return;
      const submit = event.currentTarget.querySelector('button');
      submit.disabled = true;
      try {
        const ack = await this.adapter.submitPassword(challengeId, input);
        if (!ack.ok) throw new Error(ack.error?.message || ack.error?.code || 'Không thể xác nhận.');
        if (ack.result?.success !== false || !ack.result?.retry) this.password = null;
        this.render();
      } catch (error) { submit.disabled = false; this.showError(error); }
    });
  }

  showError(error) {
    this.notification = { id: 'client-error', title: 'Không thể thực hiện', message: error?.message || String(error) };
    this.render();
  }

  reset() {
    this.messages = []; this.choices = []; this.inputVisible = false;
    this.notification = null; this.password = null; this.timer = '';
    this.render();
  }
}
