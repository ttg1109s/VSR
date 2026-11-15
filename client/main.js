import { WorkerJsonTransport } from './adapters/WorkerJsonTransport.js';
import { JsonClient } from './adapters/JsonClient.js';
import { RegionRenderer } from './renderer/RegionRenderer.js';
import { DebugConsole } from './debug/DebugConsole.js';

const $ = selector => document.querySelector(selector);
const app = $('#app');
const fileInput = $('#scenario-file');
const state = { screen:'home', scenario:null, scenarioName:'', transport:null, client:null, renderer:null, loading:false, health:'ready' };
window.__VSR_APP_STATE__ = state;
const debug = new DebugConsole($('#debug-root'));
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const titleOf = meta => meta?.title || 'Untitled scenario';
const descriptionOf = meta => meta?.desc || meta?.description || meta?.subtitle || 'Chưa có mô tả cho kịch bản này.';

function navigate(screen, { replace = false } = {}) {
  state.screen = screen;
  const route = { home:'#home', metadata:'#scenario', loading:'#loading', gameplay:'#play' }[screen] || '#home';
  const method = replace ? 'replaceState' : 'pushState';
  history[method]({ vsrScreen:screen }, '', route);
  window.__VSR_APP_STATE__ = state;
}
function renderHome() {
  state.screen='home';
  app.innerHTML = `<main class="home-shell native-shell">
    <header class="native-topbar">
      <a class="brand native-brand" href="#home" data-home><span class="brand-mark">V</span><span>VSR <span class="brand-muted">PLAY</span></span></a>
      <div class="engine-status native-engine"><i class="${state.health === 'ready' ? 'is-online' : ''}"></i><span>${state.health === 'ready' ? 'Engine sẵn sàng' : 'Engine không khả dụng'}</span></div>
    </header>
    <section class="home-welcome">
      <div class="home-welcome-copy"><span class="section-overline">VISUAL STORY RUNTIME</span><h1>Thư viện<br><span>kịch bản</span></h1><p>Khám phá những câu chuyện tương tác và tiếp tục từ nơi bạn muốn.</p></div>
      <div class="welcome-mark" aria-hidden="true"><span class="material-symbols-rounded">auto_stories</span></div>
    </section>
    <section class="library-section" id="library">
      <div class="section-heading"><div><span class="section-overline">BẮT ĐẦU KHÁM PHÁ</span><h2>Kịch bản nổi bật</h2></div><span class="section-count">01</span></div>
      <button class="featured-scenario" id="demo-play" type="button">
        <span class="featured-art" aria-hidden="true"><span class="featured-art-icon material-symbols-rounded">landscape</span><span class="featured-art-caption">VSR SAMPLE SCENARIO</span></span>
        <span class="featured-content"><span class="featured-label"><span class="status-dot"></span> KỊCH BẢN MẪU</span><strong>The Silent Village</strong><span class="featured-subtitle">Ngôi Làng Không Tiếng Động</span><span class="featured-description">Một bí ẩn dân gian về ký ức, sự mất tích và cái giá của việc nhớ lại.</span><span class="featured-meta"><span class="material-symbols-rounded">schedule</span> 55 phút <span class="meta-separator">·</span> <span class="material-symbols-rounded">sell</span> Mystery</span></span>
        <span class="featured-open material-symbols-rounded" aria-hidden="true">arrow_outward</span>
      </button>
    </section>
    <section class="import-section">
      <div class="section-heading"><div><span class="section-overline">NỘI DUNG CỦA BẠN</span><h2>Thêm kịch bản</h2></div></div>
      <button class="import-card" id="load-json" type="button"><span class="import-icon material-symbols-rounded">file_upload</span><span class="import-copy"><strong>Nhập tệp JSON</strong><small>Mở kịch bản VSR từ thiết bị của bạn</small></span><span class="material-symbols-rounded import-chevron">chevron_right</span></button>
      <p class="import-hint">Hỗ trợ tệp .json theo cấu trúc Scenario của VSR.</p>
    </section>
    <footer class="native-footer"><span>VSR <span class="footer-muted">· VISUAL STORY RUNTIME</span></span><span class="footer-version">LOCAL · WORKER ENGINE</span></footer>
  </main>`;
  $('#demo-play').addEventListener('click', async () => {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}scenarios/the-silent-village.json`);
      if (!response.ok) throw new Error(`Không thể tải demo scenario (${response.status}).`);
      openMetadata(await response.json(), 'Demo · THE SILENT VILLAGE');
    } catch(error) { debug.record('error', error.message, error.stack); showToast(error); }
  });
  $('#load-json').addEventListener('click', () => fileInput.click());
  $('[data-home]')?.addEventListener('click', e => { e.preventDefault(); navigate('home'); renderHome(); });
}
function openMetadata(scenario, sourceName, { updateHistory = true } = {}) {
  if (!scenario || typeof scenario !== 'object' || !scenario.scenes || typeof scenario.scenes !== 'object') {
    throw new Error('JSON không có cấu trúc scenario hợp lệ hoặc thiếu scenes.');
  }
  state.scenario=scenario; state.scenarioName=sourceName; if (updateHistory) navigate('metadata'); else state.screen='metadata';
  const meta=scenario.meta||{}, scenes=Object.keys(scenario.scenes||{}).length, characters=Object.keys(scenario.characters||{}).length, items=Object.keys(scenario.itemInfo||{}).length;
  const tags=Array.isArray(meta.tags)?meta.tags:[];
  const coverValue=meta.cover?.url || (typeof meta.cover === 'string' ? meta.cover : '');
  const coverUrl=typeof coverValue==='string' && coverValue.trim() ? coverValue.trim() : '';
  const cover=coverUrl
    ? `<div class="metadata-cover has-cover" style="--cover-ratio:${escapeHtml(String(meta.cover?.ratio || '16:9').replace(':',' / '))}"><img src="${escapeHtml(coverUrl)}" alt=""><span class="cover-scrim"></span><span class="cover-caption"><span class="material-symbols-rounded">image</span> SCENARIO COVER</span></div>`
    : `<div class="metadata-cover cover-placeholder"><span class="material-symbols-rounded">auto_stories</span><span>SCENARIO</span></div>`;
  const facts=[['person', 'Tác giả',meta.writer],['apartment', 'Studio',meta.studio],['translate','Ngôn ngữ',meta.language],['signal_cellular_alt','Độ khó',meta.difficulty],['verified_user','Độ tuổi',meta.ageRating],['sell','Phiên bản',meta.version]].filter(([, ,value])=>value);
  app.innerHTML = `<main class="detail-shell native-shell">
    <header class="native-topbar detail-topbar"><button class="icon-button" id="back-home" type="button" aria-label="Quay lại"><span class="material-symbols-rounded">arrow_back</span></button><a class="brand native-brand" href="#home" data-home><span class="brand-mark">V</span><span>VSR <span class="brand-muted">PLAY</span></span></a><button class="text-nav" id="detail-library" type="button"><span class="material-symbols-rounded">library_books</span><span>Thư viện</span></button></header>
    <section class="metadata-layout">
      ${cover}
      <div class="metadata-body">
        <div class="metadata-overline"><span class="status-dot"></span> KỊCH BẢN SẴN SÀNG</div>
        <h1>${escapeHtml(titleOf(meta))}</h1>
        ${meta.subtitle? `<p class="subtitle">${escapeHtml(meta.subtitle)}</p>`:''}
        <p class="description">${escapeHtml(descriptionOf(meta))}</p>
        ${tags.length?`<div class="tag-row">${tags.map(tag=>`<span class="tag">${escapeHtml(String(tag).replaceAll('-',' '))}</span>`).join('')}</div>`:''}
        <div class="metadata-stats">
          <div><span class="material-symbols-rounded">layers</span><strong>${scenes}</strong><small>Scene</small></div>
          <div><span class="material-symbols-rounded">groups</span><strong>${characters}</strong><small>Nhân vật</small></div>
          <div><span class="material-symbols-rounded">inventory_2</span><strong>${items}</strong><small>Vật phẩm</small></div>
          ${meta.estimatedPlayTime?`<div><span class="material-symbols-rounded">schedule</span><strong>${escapeHtml(meta.estimatedPlayTime)}</strong><small>Phút</small></div>`:''}
        </div>
        ${facts.length?`<section class="metadata-facts"><h2>Thông tin kịch bản</h2><div class="facts-grid">${facts.map(([icon,label,value])=>`<div class="fact-row"><span class="material-symbols-rounded">${icon}</span><span><small>${label}</small><strong>${escapeHtml(value)}</strong></span></div>`).join('')}</div></section>`:''}
        <div class="entry-note"><span class="material-symbols-rounded">door_front</span><span><small>Điểm bắt đầu</small><strong>${escapeHtml(meta.entryScene||'Chưa xác định')}</strong></span></div>
        <button class="primary-button" id="start-game" type="button"><span>Bắt đầu kịch bản</span><span class="material-symbols-rounded">arrow_forward</span></button>
        <p class="source-note"><span class="material-symbols-rounded">description</span> ${escapeHtml(sourceName)}</p>
      </div>
    </section>
  </main>`;
  $('.metadata-cover img')?.addEventListener('error', () => { const el=$('.metadata-cover'); if(el){ el.classList.remove('has-cover'); el.classList.add('cover-placeholder'); el.innerHTML='<span class="material-symbols-rounded">broken_image</span><span>KHÔNG CÓ ẢNH BÌA</span>'; } });
  $('.brand[data-home]')?.addEventListener('click', e => { e.preventDefault(); navigate('home'); renderHome(); });
  $('#back-home').addEventListener('click', () => { navigate('home'); renderHome(); });
  $('#detail-library').addEventListener('click', () => { navigate('home'); renderHome(); });
  $('#start-game').addEventListener('click', startGame);
}
function renderLoading(message='Đang khởi tạo phiên chơi…') {
  state.screen='loading';
  app.innerHTML = `<main class="loading-screen native-loading">
    <div class="loading-brand"><span class="brand-mark">V</span><span>VSR <small>VISUAL STORY RUNTIME</small></span></div>
    <section class="loading-card" role="status" aria-live="polite">
      <div class="loading-icon"><span class="material-symbols-rounded">auto_stories</span><span class="loading-spinner"></span></div>
      <p class="section-overline">ĐANG CHUẨN BỊ PHIÊN CHƠI</p>
      <h1>Đang tải kịch bản</h1>
      <p class="loading-message" id="loading-message">${escapeHtml(message)}</p>
      <div class="loading-track"><span></span></div>
      <div class="loading-foot"><span class="material-symbols-rounded">memory</span> Engine chạy cục bộ trong trình duyệt</div>
    </section>
    <p class="loading-bottom">VSR <span>·</span> INTERACTIVE STORY RUNTIME</p>
  </main>`;
}
async function startGame({ fromHistory = false } = {}) {
  if(state.loading||!state.scenario)return;
  state.loading=true; navigate('loading',{replace:fromHistory}); renderLoading('Đang kiểm tra và nạp kịch bản…');
  try {
    await new Promise(resolve=>requestAnimationFrame(resolve));
    const transport=new WorkerJsonTransport(); const client=new JsonClient(transport);
    client.subscribe(message => {
      if (message.type === 'transport.error') debug.record('error', message.error?.message || 'Engine Worker failed.');
    });
    state.transport=transport; state.client=client;
    $('#loading-message').textContent='Kịch bản đang được Engine kiểm tra. Đang khởi tạo phiên chơi…';
    await client.initialize(state.scenario);
    const snapshot=client.getSnapshot();
    if(!snapshot?.game?.sceneId||!snapshot?.game?.routerId||!snapshot.presentation?.scene||!snapshot.presentation?.router) throw new Error('Engine không trả về snapshot Scene/Router hợp lệ.');
    state.loading=false; navigate('gameplay',{replace:true}); renderGameplay();
  } catch(error) {
    debug.record('error', error.message, error.stack);
    state.client?.dispose?.(); state.transport?.close?.(); state.client=null; state.transport=null; state.loading=false;
    navigate('metadata',{replace:true}); renderMetadataError(error);
  }
}
function renderMetadataError(error) {
  openMetadata(state.scenario,state.scenarioName,{updateHistory:false});
  const note=document.createElement('div'); note.className='error-note'; note.textContent='Không thể khởi chạy: '+(error?.message||String(error));
  $('.metadata-body').insertBefore(note,$('#start-game'));
}
function renderGameplay() {
  state.screen='gameplay';
  state.renderer?.dispose?.();
  state.renderer=new RegionRenderer(app,state.client,exitGame);
  state.renderer.mount(state.client.getSnapshot());
}
function disposeSession() {
  state.renderer?.dispose?.(); state.client?.dispose?.(); state.transport?.close?.();
  state.renderer=null; state.client=null; state.transport=null;
}
function exitGame() { disposeSession(); navigate('home'); renderHome(); }
function showToast(error) {
  const notice=document.createElement('div'); notice.className='toast-error'; notice.textContent=error?.message||String(error); app.appendChild(notice);
}
fileInput.addEventListener('change',async event=>{
  const file=event.target.files?.[0]; if(!file)return;
  try { openMetadata(JSON.parse(await file.text()),file.name); }
  catch(error) { debug.record('error', error.message, error.stack); navigate('home',{replace:true}); renderHome(); showToast(error instanceof SyntaxError?new Error('Tệp không phải JSON hợp lệ.'):error); }
  finally { fileInput.value=''; }
});
window.addEventListener('popstate', event => {
  const screen = event.state?.vsrScreen || 'home';
  if (screen === 'home') { disposeSession(); renderHome(); }
  else if (screen === 'metadata' && state.scenario) { disposeSession(); openMetadata(state.scenario,state.scenarioName,{updateHistory:false}); }
  else if (screen === 'gameplay' && state.client) renderGameplay();
  else if (screen === 'gameplay' && state.scenario) startGame({fromHistory:true});
  else { navigate('home',{replace:true}); renderHome(); }
});
renderHome();
