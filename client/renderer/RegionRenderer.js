const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const text = value => escapeHtml(value);

export class RegionRenderer {
  constructor(root, client, onExit) {
    this.root = root;
    this.client = client;
    this.onExit = onExit;
    this.regions = {};
    this.overlayState = { messages: [], choices: [], inputVisible: false, chatOpen: false, password: null, notifications: [], timer: '' };
    this.unsubscribe = client.subscribe(message => this.handle(message));
  }

  mount(snapshot) {
    this.root.innerHTML = `<main class="game-shell">
      <header class="game-topbar" data-region="topbar"><button class="game-exit" type="button" data-exit aria-label="Thoát gameplay">←</button><div class="game-brand"><span class="brand-mark">V</span><span>VSR <small>PLAYING</small></span></div><span class="live-indicator"><i></i> LIVE</span></header>
      <section data-region="scene"></section><section data-region="router"></section><section data-region="actions"></section>
      <footer class="game-footer" data-region="footer"></footer><div data-region="overlays"></div></main>`;
    this.root.querySelector('[data-exit]').addEventListener('click', () => this.onExit?.());
    this.regions = Object.fromEntries(['scene','router','actions','footer','overlays'].map(key => [key, this.root.querySelector(`[data-region="${key}"]`)]));
    const challenge = snapshot.session?.passwordChallenge;
    if (challenge) {
      const action = (snapshot.presentation?.actions || []).find(item => item.id === challenge.actionId);
      this.overlayState.password = { action, actionId: challenge.actionId, uniqueId: challenge.uniqueId,
        config: { challengeId: challenge.challengeId, type: challenge.type, countTest: challenge.countTest,
          retryMax: challenge.retryMax, deadlineAt: challenge.deadlineAt } };
    }
    this.overlayState.notifications = (snapshot.session?.notifications?.pending || []).slice(0, 5);
    this.overlayState.timer = snapshot.session?.timer?.displayText || '';
    this.renderAll(snapshot);
  }

  handle(message) {
    if (message.type === 'state') this.renderChanged(message.snapshot);
    if (message.type === 'event') this.handleEvent(message.event);
  }

  renderChanged(snapshot) {
    if (!snapshot) return;
    const previous = this.snapshot;
    this.snapshot = snapshot;
    const sceneIdChanged = previous?.game?.sceneId !== snapshot.game?.sceneId;
    const routerChanged = previous?.game?.routerId !== snapshot.game?.routerId;
    if (sceneIdChanged || !previous || !sameJson(previous.presentation?.scene, snapshot.presentation?.scene)) this.renderScene(snapshot);
    if (sceneIdChanged || routerChanged || !previous || !sameJson(previous.presentation?.router, snapshot.presentation?.router)) this.renderRouter(snapshot);
    if (sceneIdChanged || routerChanged || !previous || !sameJson(previous.presentation?.actions, snapshot.presentation?.actions) || !sameJson(previous.state?.actions, snapshot.state?.actions)) this.renderActions(snapshot);
    if (!previous || previous.stateRevision !== snapshot.stateRevision) this.renderFooter(snapshot);
    if (!previous || !sameJson(previous.session, snapshot.session)) {
      const challenge = snapshot.session?.passwordChallenge;
      if (!challenge) this.overlayState.password = null;
      else if (this.overlayState.password?.config?.challengeId !== challenge.challengeId) {
        const action = (snapshot.presentation?.actions || []).find(item => item.id === challenge.actionId);
        this.overlayState.password = { action, actionId: challenge.actionId, uniqueId: challenge.uniqueId,
          config: { challengeId: challenge.challengeId, type: challenge.type, countTest: challenge.countTest,
            retryMax: challenge.retryMax, deadlineAt: challenge.deadlineAt } };
      }
      this.overlayState.notifications = (snapshot.session?.notifications?.pending || []).slice(0, 5);
      this.overlayState.timer = snapshot.session?.timer?.displayText || '';
      this.renderOverlays();
    }
  }

  renderAll(snapshot) {
    this.snapshot = snapshot;
    this.renderScene(snapshot); this.renderRouter(snapshot); this.renderActions(snapshot); this.renderFooter(snapshot); this.renderOverlays();
  }

  renderScene(snapshot) {
    const scene = snapshot.presentation?.scene;
    if (!scene) { this.regions.scene.innerHTML = '<p class="scene-unavailable">Không tìm thấy Scene hiện tại.</p>'; return; }
    const meta = scene.meta || {};
    this.regions.scene.innerHTML = `<section class="game-scene" aria-label="Scene hiện tại"><div class="scene-art scene-art-runtime"><div class="scene-sun"></div><div class="scene-mountains"></div><div class="scene-fog"></div><span class="scene-coordinate">SCENE / ${text(scene.id)}</span></div><div class="scene-copy"><p class="eyebrow">CURRENT SCENE</p><h1>${text(meta.title || scene.title || scene.id)}</h1>${(meta.desc || meta.description) ? `<p>${text(meta.desc || meta.description)}</p>` : ''}</div></section>`;
  }

  renderRouter(snapshot) {
    const router = snapshot.presentation?.router;
    this.regions.router.innerHTML = router ? `<section class="active-router" aria-label="Router đang hoạt động"><div class="router-heading"><span class="eyebrow">ACTIVE ROUTER / ${text(router.id)}</span><span class="router-pulse"></span></div><h2>${text(router.meta?.desc || router.meta?.description || router.id)}</h2>${router.meta?.subTitleStatus ? `<p>${text(router.meta.subTitleStatus)}</p>` : ''}</section>` : '';
  }

  renderActions(snapshot) {
    const actions = snapshot.presentation?.actions || [];
    this.regions.actions.innerHTML = `<section class="action-section" aria-label="Các hành động khả dụng"><div class="action-heading"><div><p class="eyebrow">AVAILABLE INTERACTIONS</p><h2>What will you do?</h2></div><span class="action-count">${String(actions.length).padStart(2,'0')}</span></div><div class="action-list">${actions.length ? actions.map((action,index) => `<button class="action-item ${action.runtimeState?.display === 'locked' ? 'is-locked' : ''}" type="button" data-action-id="${text(action.id)}" ${action.runtimeState?.display === 'locked' ? 'disabled aria-disabled="true"' : ''}><span class="action-number">${String(index+1).padStart(2,'0')}</span><span class="action-copy"><strong>${text(action.meta?.title || action.title || action.name || action.id)}</strong>${(action.meta?.desc || action.meta?.description) ? `<small>${text(action.meta.desc || action.meta.description)}</small>` : ''}</span><span class="action-arrow">↗</span></button>`).join('') : '<p class="empty-actions">Router này chưa có Action khả dụng.</p>'}</div></section>`;
    this.regions.actions.querySelectorAll('[data-action-id]').forEach(button => button.addEventListener('click', async () => {
      const id = button.dataset.actionId; button.disabled = true;
      try { await this.client.triggerAction(id, `${snapshot.game.sceneId}_${snapshot.game.routerId}_${id}`); }
      catch (error) { this.showError(error); button.disabled = false; }
    }));
    this.regions.actions.querySelectorAll('[data-action-read]').forEach(button => button.addEventListener('click', () => this.client.markActionRead(button.dataset.actionRead)));
  }

  renderFooter(snapshot) {
    this.regions.footer.innerHTML = `<span>${text(snapshot.presentation?.scenarioTitle || 'VSR')}</span><span>REV ${snapshot.stateRevision}</span>`;
  }

  handleEvent(event) {
    const rawName = event?.event || '';
    const name = rawName.startsWith('presentation.') ? rawName.slice('presentation.'.length) : rawName;
    const payload = event?.payload || {};
    if (name.startsWith('notification.')) {
      const n = payload.notification;
      if (name.endsWith('.add') || name.endsWith('.alert') || name.endsWith('.updated')) {
        if (n) this.overlayState.notifications = [n, ...this.overlayState.notifications.filter(item => item.id !== n.id)].slice(0,5);
      } else if (n) this.overlayState.notifications = this.overlayState.notifications.filter(item => item.id !== n.id);
      this.renderOverlays();
    }
    if (name === 'components.keyboard') {
      const args = payload.args || [];
      this.overlayState.password = { action: args[0], actionId: args[1], uniqueId: args[2], config: args[3] || {} };
      this.renderOverlays();
    }
    if (name === 'chat.renderBubble') {
      const line = payload.args?.[0];
      if (line) this.overlayState.messages.push(line);
      this.overlayState.chatOpen = true;
      this.renderOverlays();
    }
    if (name === 'chat.renderChoices') {
      this.overlayState.choices = Array.isArray(payload.args?.[0]) ? payload.args[0] : [];
      this.overlayState.chatOpen = true;
      this.overlayState.inputVisible = false;
      this.renderOverlays();
    }
    if (name === 'chat.clearChoices') { this.overlayState.choices = []; this.renderOverlays(); }
    if (name === 'chat.inputVisible') { this.overlayState.inputVisible = true; this.renderOverlays(); }
    if (name === 'chat.inputHidden') { this.overlayState.inputVisible = false; this.renderOverlays(); }
    if (name === 'chat.toggleOverlay') { this.overlayState.chatOpen = !!payload.args?.[0]; this.renderOverlays(); }
    if (name === 'scene.updateTimer') { this.overlayState.timer = String(payload.args?.[0] || ''); this.renderOverlays(); }
    if (name === 'scene.hideTimer') { this.overlayState.timer = ''; this.renderOverlays(); }
    if (name === 'scene.transition') this.root.classList.toggle('is-transitioning', payload.args?.[0] === 'start');
    if (name === 'navigation.setBlocking') this.root.classList.toggle('is-blocking', !!payload.args?.[0]);
    if (name === 'password.retry' && this.overlayState.password) {
      this.overlayState.password.config.countTest = payload.countTest;
      this.overlayState.password.config.remainingAttempts = payload.remainingAttempts;
      this.renderOverlays();
    }
    if (name === 'password.expired' || name === 'password.exhausted') {
      this.overlayState.password = null; this.renderOverlays();
    }
  }

  syncChatFromSnapshot() {
    const chat = this.snapshot?.session?.chat;
    if (!chat) return;
    this.overlayState.chatOpen = !!chat.active;
    this.renderOverlays();
  }

  renderOverlays() {
    const s = this.overlayState;
    const chat = s.chatOpen ? `<section class="chat-panel" aria-label="Hội thoại"><div class="chat-panel-head"><span class="eyebrow">DIALOGUE</span><button type="button" class="overlay-close" data-chat-close>×</button></div><div class="chat-message-list">${s.messages.slice(-8).map(line => `<article class="chat-line"><span>${text(line.nameID || line.char_id || '—')}</span><p>${text(line.text || '')}</p></article>`).join('')}</div>${s.choices.length ? `<div class="chat-choices">${s.choices.map((choice,index) => `<button type="button" data-chat-choice="${index}">${text(choice.text || choice.title || `Lựa chọn ${index+1}`)}</button>`).join('')}</div>` : ''}${s.inputVisible ? '<button type="button" class="chat-continue" data-chat-next>Tiếp tục →</button>' : ''}</section>` : '';
    const password = s.password ? `<div class="modal-backdrop"><section class="password-modal" role="dialog" aria-modal="true"><button type="button" class="overlay-close" data-password-cancel>×</button><p class="eyebrow">CHALLENGE</p><h2>${text(s.password.action?.meta?.title || 'Nhập câu trả lời')}</h2>${s.password.config.desc ? `<p>${text(s.password.config.desc)}</p>` : ''}<form data-password-form><input name="password-input" autocomplete="off" placeholder="Nhập câu trả lời" required><button class="primary-button" type="submit">XÁC NHẬN →</button></form></section></div>` : '';
    const notices = s.notifications.map(n => `<div class="game-toast" role="status"><strong>${text(n.title)}</strong><span>${text(n.message)}</span></div>`).join('');
    const timer = s.timer ? `<div class="game-timer">${text(s.timer)}</div>` : '';
    this.regions.overlays.innerHTML = (chat || password || notices || timer) ? `<div class="game-overlay-layer">${timer}${chat}${password}${notices}</div>` : '';
    this.regions.overlays.querySelector('[data-chat-close]')?.addEventListener('click', () => { s.chatOpen = false; this.renderOverlays(); });
    this.regions.overlays.querySelector('[data-chat-next]')?.addEventListener('click', () => this.client.nextChat().catch(error => this.showError(error)));
    this.regions.overlays.querySelectorAll('[data-chat-choice]').forEach(button => button.addEventListener('click', () => this.client.selectChatChoice(Number(button.dataset.chatChoice)).catch(error => this.showError(error))));
    this.regions.overlays.querySelector('[data-password-cancel]')?.addEventListener('click', async () => { const id=s.password?.config?.challengeId; s.password=null; this.renderOverlays(); if(id) try { await this.client.submitPassword(id,null,true); } catch(error) { this.showError(error); } });
    this.regions.overlays.querySelector('[data-password-form]')?.addEventListener('submit', async event => { event.preventDefault(); const input=new FormData(event.currentTarget).get('password-input'); const id=s.password?.config?.challengeId; if(!id)return; try { const ack=await this.client.submitPassword(id,input); if(ack.result?.retry) return; s.password=null; this.renderOverlays(); } catch(error) { this.showError(error); } });
  }

  showError(error) {
    this.overlayState.notifications = [{id:'client-error',title:'Không thể thực hiện',message:error?.message || String(error)}, ...this.overlayState.notifications].slice(0,5);
    this.renderOverlays();
  }

  dispose() { this.unsubscribe?.(); this.root.innerHTML = ''; }
}
function sameJson(a,b) { return JSON.stringify(a) === JSON.stringify(b); }
