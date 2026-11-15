import { GameEngine, DEMO_SCRIPT, normalizeScenario } from '../engine/index.js';
import './styles.css';

const $ = (selector) => document.querySelector(selector);
const app = $('#app');
const fileInput = $('#scenario-file');

const state = {
  screen: 'home',
  scenario: null,
  scenarioName: '',
  engine: null,
  snapshot: null,
  loading: false
};

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

const titleOf = (meta = {}) => meta.title || 'Untitled scenario';
const descriptionOf = (meta = {}) => meta.desc || meta.description || meta.subtitle || 'Chưa có mô tả cho kịch bản này.';

function renderHome() {
  state.screen = 'home';
  app.innerHTML = `
    <main class="home-shell">
      <header class="topbar">
        <a class="brand" href="#" aria-label="VSR Home"><span class="brand-mark">V</span><span>VSR<span class="brand-muted"> / PLAY</span></span></a>
        <span class="engine-status"><i></i> ENGINE CLIENT</span>
      </header>
      <section class="hero">
        <div class="eyebrow"><span class="eyebrow-line"></span> VISUAL STORY RUNTIME</div>
        <h1>Stories begin<br><em>somewhere.</em></h1>
        <p class="hero-copy">Một không gian để bước vào những thế giới được tạo nên từ kịch bản tương tác.</p>
      </section>
      <section class="launch-panel" aria-label="Bắt đầu trải nghiệm">
        <div class="panel-heading"><span>START PLAYING</span><span class="panel-index">01 / 02</span></div>
        <button class="demo-card" id="demo-play">
          <span class="demo-art" aria-hidden="true"><span class="moon"></span><span class="ridge ridge-back"></span><span class="ridge ridge-front"></span><span class="mist"></span></span>
          <span class="demo-info"><span class="card-kicker">FEATURED DEMO · 55 MIN</span><strong>THE SILENT VILLAGE</strong><span>Ngôi Làng Không Tiếng Động</span></span>
          <span class="round-arrow" aria-hidden="true">↗</span>
        </button>
        <div class="or-divider"><span></span> OR LOAD YOUR OWN STORY <span></span></div>
        <button class="load-card" id="load-json"><span class="upload-icon">↑</span><span><strong>Load JSON</strong><small>Nạp kịch bản VSR từ thiết bị</small></span><span class="load-chevron">＋</span></button>
        <p class="file-hint">Hỗ trợ tệp kịch bản định dạng .json</p>
      </section>
      <footer class="home-footer"><span>VSR ENGINE</span><span>BUILT FOR INTERACTIVE STORIES</span></footer>
    </main>`;
  $('#demo-play').addEventListener('click', () => openMetadata(DEMO_SCRIPT, 'Demo · THE SILENT VILLAGE'));
  $('#load-json').addEventListener('click', () => fileInput.click());
}

function openMetadata(scenario, sourceName) {
  state.scenario = scenario;
  state.scenarioName = sourceName;
  state.screen = 'metadata';
  const meta = scenario.meta || {};
  const scenes = Object.keys(scenario.scenes || {}).length;
  const characters = Object.keys(scenario.characters || {}).length;
  const items = Object.keys(scenario.itemInfo || {}).length;
  const tags = Array.isArray(meta.tags) ? meta.tags : [];
  app.innerHTML = `
    <main class="detail-shell">
      <header class="topbar">
        <button class="back-button" id="back-home" aria-label="Quay lại">←</button>
        <a class="brand" href="#"><span class="brand-mark">V</span><span>VSR<span class="brand-muted"> / PLAY</span></span></a>
        <span class="detail-label">SCENARIO</span>
      </header>
      <section class="metadata-hero">
        <div class="metadata-art"><div class="art-orb"></div><div class="art-horizon"></div><span>SCENARIO PREVIEW</span></div>
        <div class="metadata-body">
          <div class="eyebrow"><span class="eyebrow-line"></span> READY TO EXPLORE</div>
          <h1>${escapeHtml(titleOf(meta))}</h1>
          ${meta.subtitle ? `<p class="subtitle">${escapeHtml(meta.subtitle)}</p>` : ''}
          <p class="description">${escapeHtml(descriptionOf(meta))}</p>
          <div class="tag-row">${tags.map(tag => `<span class="tag">${escapeHtml(tag.replaceAll('-', ' '))}</span>`).join('')}</div>
          <div class="metadata-stats">
            <div><strong>${scenes}</strong><span>SCENES</span></div>
            <div><strong>${characters}</strong><span>CHARACTERS</span></div>
            <div><strong>${items}</strong><span>ITEMS</span></div>
          </div>
          <div class="metadata-facts">
            <div><span>STUDIO</span><strong>${escapeHtml(meta.studio || '—')}</strong></div>
            <div><span>WRITER</span><strong>${escapeHtml(meta.writer || '—')}</strong></div>
            <div><span>VERSION</span><strong>${escapeHtml(meta.version || '—')}</strong></div>
            <div><span>LANGUAGE</span><strong>${escapeHtml(meta.language || '—').toUpperCase()}</strong></div>
            <div><span>DIFFICULTY</span><strong>${escapeHtml(meta.difficulty || '—')}</strong></div>
            <div><span>AGE RATING</span><strong>${escapeHtml(meta.ageRating || '—')}</strong></div>
          </div>
          <div class="entry-note"><span class="entry-dot"></span><span>ENTRY SCENE</span><strong>${escapeHtml(meta.entryScene || 'Not defined')}</strong></div>
          <button class="primary-button" id="start-game"><span>PLAY SCENARIO</span><span>→</span></button>
          <p class="source-note">SOURCE · ${escapeHtml(state.scenarioName)}</p>
        </div>
      </section>
    </main>`;
  $('#back-home').addEventListener('click', renderHome);
  $('#start-game').addEventListener('click', startGame);
}

function renderLoading(message = 'Đang khởi tạo phiên chơi…') {
  state.screen = 'loading';
  app.innerHTML = `
    <main class="loading-screen">
      <div class="loading-mark">V</div>
      <div class="loading-orbit"><span></span></div>
      <p class="eyebrow">VSR ENGINE / LOADER</p>
      <h1>Preparing<br><em>your world.</em></h1>
      <p class="loading-message" id="loading-message">${escapeHtml(message)}</p>
      <div class="loading-track"><span></span></div>
      <p class="loading-foot">PLEASE WAIT · DO NOT CLOSE THIS WINDOW</p>
    </main>`;
}

async function startGame() {
  if (state.loading || !state.scenario) return;
  state.loading = true;
  renderLoading('Đang kiểm tra và nạp kịch bản…');
  let engine;
  try {
    // Normalize before constructing the runtime so invalid JSON never reaches gameplay.
    const normalized = normalizeScenario(state.scenario);
    $('#loading-message').textContent = 'Kịch bản hợp lệ. Đang khởi tạo Engine và entry scene…';
    engine = new GameEngine();
    await engine.init(normalized);
    const snapshot = engine.protocol.createSnapshot(engine);
    if (!snapshot.game?.initialized || !snapshot.game?.sceneId || !snapshot.game?.routerId) {
      throw new Error('Engine chưa tạo được trạng thái Scene/Router khởi đầu hợp lệ.');
    }
    state.engine = engine;
    state.snapshot = snapshot;
    state.scenario = normalized;
    state.loading = false;
    renderGameplay();
  } catch (error) {
    engine?.dispose?.();
    engine?.taskManager?.killAll?.();
    state.loading = false;
    renderMetadataError(error);
  }
}

function renderMetadataError(error) {
  openMetadata(state.scenario, state.scenarioName);
  const note = document.createElement('div');
  note.className = 'error-note';
  note.textContent = `Không thể khởi chạy: ${error?.message || String(error)}`;
  $('.metadata-body').insertBefore(note, $('#start-game'));
}

function renderGameplay() {
  state.screen = 'gameplay';
  const engine = state.engine;
  const snapshot = engine.protocol.createSnapshot(engine);
  state.snapshot = snapshot;
  const sceneId = snapshot.game.sceneId;
  const routerId = snapshot.game.routerId;
  const scene = engine.src.scenes[sceneId];
  const router = scene?.routers?.[routerId];
  const sceneTitle = scene?.meta?.title || scene?.title || sceneId;
  const routerTitle = router?.meta?.title || router?.title || routerId;
  const actions = engine.getEffectiveActions(sceneId, routerId);
  const sceneDescription = scene?.meta?.desc || scene?.meta?.description || '';
  app.innerHTML = `
    <main class="game-shell">
      <header class="game-topbar">
        <button class="game-exit" id="exit-game" aria-label="Thoát gameplay">←</button>
        <div class="game-brand"><span class="brand-mark">V</span><span>VSR <small>PLAYING</small></span></div>
        <span class="live-indicator"><i></i> LIVE</span>
      </header>
      <section class="game-scene">
        <div class="scene-art"><div class="scene-sun"></div><div class="scene-mountains"></div><div class="scene-fog"></div><span class="scene-coordinate">SCENE / ${escapeHtml(sceneId)}</span></div>
        <div class="scene-copy"><p class="eyebrow">CURRENT SCENE</p><h1>${escapeHtml(sceneTitle)}</h1><p>${escapeHtml(sceneDescription)}</p></div>
      </section>
      <section class="active-router">
        <div class="router-heading"><span class="eyebrow">ACTIVE ROUTER</span><span class="router-pulse"></span></div>
        <h2>${escapeHtml(routerTitle)}</h2>
        <p>${escapeHtml(router?.meta?.desc || router?.meta?.description || '')}</p>
      </section>
      <section class="action-section">
        <div class="action-heading"><div><p class="eyebrow">AVAILABLE INTERACTIONS</p><h2>What will you do?</h2></div><span class="action-count">${actions.length.toString().padStart(2, '0')}</span></div>
        <div class="action-list">${actions.length ? actions.map((action, index) => {
          const label = action.meta?.title || action.title || action.name || action.id;
          const detail = action.meta?.desc || action.meta?.description || '';
          return `<button class="action-item" data-action-id="${escapeHtml(action.id)}"><span class="action-number">${String(index + 1).padStart(2, '0')}</span><span class="action-copy"><strong>${escapeHtml(label)}</strong><small>${escapeHtml(detail)}</small></span><span class="action-arrow">↗</span></button>`;
        }).join('') : '<p class="empty-actions">Router này chưa có Action khả dụng.</p>'}</div>
      </section>
      <footer class="game-footer"><span>${escapeHtml(titleOf(engine.src.meta))}</span><span>REV ${snapshot.stateRevision}</span></footer>
    </main>`;
  $('#exit-game').addEventListener('click', exitGame);
  app.querySelectorAll('[data-action-id]').forEach(button => button.addEventListener('click', () => triggerAction(button.dataset.actionId, button)));
}

async function triggerAction(actionId, button) {
  if (!state.engine || button.disabled) return;
  button.disabled = true;
  button.classList.add('is-running');
  try {
    const command = state.engine.protocol.createCommand('action.trigger', { actionId });
    const ack = await state.engine.dispatchProtocolCommand(command);
    if (!ack.ok) throw new Error(ack.error?.message || ack.error?.code || 'Action failed');
    renderGameplay();
  } catch (error) {
    button.disabled = false;
    button.classList.remove('is-running');
    button.querySelector('.action-copy').insertAdjacentHTML('beforeend', `<small class="inline-error">${escapeHtml(error.message)}</small>`);
  }
}

function exitGame() {
  state.engine?.dispose?.();
  state.engine?.taskManager?.killAll?.();
  state.engine = null;
  state.snapshot = null;
  renderHome();
}

fileInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    openMetadata(parsed, file.name);
  } catch (error) {
    renderHome();
    const notice = document.createElement('div');
    notice.className = 'toast-error';
    notice.textContent = error instanceof SyntaxError ? 'Tệp không phải JSON hợp lệ.' : error.message;
    app.appendChild(notice);
  } finally {
    fileInput.value = '';
  }
});

renderHome();
