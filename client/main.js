import { GameEngine, DEMO_SCRIPT, normalizeScenario } from '../engine/index.js';
import './styles.css';
import { EngineAdapter } from './adapters/EngineAdapter.js';
import { PresentationAdapter } from './adapters/PresentationAdapter.js';
import { GameplayRenderer } from './renderer/GameplayRenderer.js';

const $ = (selector) => document.querySelector(selector);
const app = $('#app');
const fileInput = $('#scenario-file');

const state = {
  screen: 'home',
  scenario: null,
  scenarioName: '',
  engine: null,
  engineAdapter: null,
  adapter: null,
  gameplayRenderer: null,
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
  let adapter;
  let engineAdapter;
  try {
    // Paint the loading screen before validation and engine initialization.
    await new Promise(resolve => requestAnimationFrame(resolve));
    const normalized = normalizeScenario(state.scenario);
    $('#loading-message').textContent = 'Kịch bản hợp lệ. Đang khởi tạo Engine và entry scene…';
    await new Promise(resolve => requestAnimationFrame(resolve));
    engine = new GameEngine();
    engineAdapter = new EngineAdapter(engine);
    adapter = new PresentationAdapter(engineAdapter);
    await engineAdapter.initialize(normalized);
    const viewModel = adapter.getViewModel();
    if (!viewModel.sceneId || !viewModel.routerId || !viewModel.scene || !viewModel.router) {
      throw new Error('Engine chưa tạo được trạng thái Scene/Router khởi đầu hợp lệ.');
    }
    state.engine = engine;
    state.engineAdapter = engineAdapter;
    state.adapter = adapter;
    state.scenario = normalized;
    state.snapshot = engine.protocol.createSnapshot(engine);
    state.loading = false;
    renderGameplay();
  } catch (error) {
    adapter?.dispose?.();
    engineAdapter?.dispose?.();
    engine?.dispose?.();
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
  state.gameplayRenderer?.dispose?.();
  state.gameplayRenderer = new GameplayRenderer({
    root: app,
    adapter: state.adapter,
    onExit: exitGame
  });
  state.gameplayRenderer.mount();
}

function exitGame() {
  state.gameplayRenderer?.dispose?.();
  state.adapter?.dispose?.();
  state.engineAdapter?.dispose?.();
  state.engine?.dispose?.();
  state.gameplayRenderer = null;
  state.adapter = null;
  state.engineAdapter = null;
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
