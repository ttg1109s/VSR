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
  app.innerHTML = `<main class="home-shell"><header class="topbar"><a class="brand" href="/" data-home><span class="brand-mark">V</span><span>VSR<span class="brand-muted"> / PLAY</span></span></a><nav class="home-nav"><a href="#library">LIBRARY</a><a href="#about">ABOUT</a></nav><span class="engine-status"><i class="${state.health === 'ready' ? 'is-online' : ''}"></i> ${state.health === 'ready' ? 'LOCAL ENGINE READY' : 'ENGINE UNAVAILABLE'}</span></header>
  <section class="hero"><div class="eyebrow"><span class="eyebrow-line"></span> VISUAL STORY RUNTIME</div><h1>Stories begin<br><em>somewhere.</em></h1><p class="hero-copy">Một không gian để bước vào những thế giới được tạo nên từ kịch bản tương tác.</p></section>
  <section class="launch-panel" id="library"><div class="panel-heading"><span>SCENARIO LIBRARY</span><span class="panel-index">01 / FEATURED</span></div>
  <button class="demo-card" id="demo-play"><span class="demo-art" aria-hidden="true"><span class="moon"></span><span class="ridge ridge-back"></span><span class="ridge ridge-front"></span><span class="mist"></span></span><span class="demo-info"><span class="card-kicker">FEATURED DEMO</span><strong>THE SILENT VILLAGE</strong><span>Ngôi Làng Không Tiếng Động</span></span><span class="round-arrow">↗</span></button>
  <div class="or-divider"><span></span> IMPORT A SCENARIO <span></span></div><button class="load-card" id="load-json"><span class="upload-icon">↑</span><span><strong>Load JSON</strong><small>Nạp kịch bản VSR từ thiết bị</small></span><span class="load-chevron">＋</span></button><p class="file-hint">Hỗ trợ tệp kịch bản định dạng .json</p></section>
  <footer class="home-footer" id="about"><span>VSR ENGINE</span><span>BROWSER-NATIVE ENGINE · WORKER</span></footer></main>`;
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
  app.innerHTML = `<main class="detail-shell"><header class="topbar"><button class="back-button" id="back-home" aria-label="Quay lại">←</button><a class="brand" href="#home" data-home><span class="brand-mark">V</span><span>VSR<span class="brand-muted"> / PLAY</span></span></a><button class="text-nav" id="detail-library">LIBRARY</button></header>
  <section class="metadata-hero"><div class="metadata-art"><div class="art-orb"></div><div class="art-horizon"></div><span>SCENARIO PREVIEW</span></div><div class="metadata-body"><div class="eyebrow"><span class="eyebrow-line"></span> READY TO EXPLORE</div><h1>${escapeHtml(titleOf(meta))}</h1>${meta.subtitle?`<p class="subtitle">${escapeHtml(meta.subtitle)}</p>`:''}<p class="description">${escapeHtml(descriptionOf(meta))}</p>
  <div class="tag-row">${tags.map(tag=>`<span class="tag">${escapeHtml(String(tag).replaceAll('-',' '))}</span>`).join('')}</div>
  <div class="metadata-stats"><div><strong>${scenes}</strong><span>SCENES</span></div><div><strong>${characters}</strong><span>CHARACTERS</span></div><div><strong>${items}</strong><span>ITEMS</span></div></div>
  <div class="metadata-facts">${[['STUDIO',meta.studio],['WRITER',meta.writer],['VERSION',meta.version],['LANGUAGE',meta.language],['DIFFICULTY',meta.difficulty],['AGE RATING',meta.ageRating]].map(([label,value])=>`<div><span>${label}</span><strong>${escapeHtml(value||'Chưa cung cấp')}</strong></div>`).join('')}</div>
  <div class="entry-note"><span class="entry-dot"></span><span>ENTRY SCENE</span><strong>${escapeHtml(meta.entryScene||'Not defined')}</strong></div><button class="primary-button" id="start-game"><span>PLAY SCENARIO</span><span>→</span></button><p class="source-note">SOURCE · ${escapeHtml(sourceName)}</p></div></section></main>`;
  $('.brand[data-home]')?.addEventListener('click', e => { e.preventDefault(); navigate('home'); renderHome(); });
  $('#back-home').addEventListener('click', () => { navigate('home'); renderHome(); });
  $('#detail-library').addEventListener('click', () => { navigate('home'); renderHome(); });
  $('#start-game').addEventListener('click', startGame);
}
function renderLoading(message='Đang khởi tạo phiên chơi…') {
  state.screen='loading';
  app.innerHTML = `<main class="loading-screen"><div class="loading-mark">V</div><div class="loading-orbit"><span></span></div><p class="eyebrow">VSR ENGINE / JSON TRANSPORT</p><h1>Preparing<br><em>your world.</em></h1><p class="loading-message" id="loading-message">${escapeHtml(message)}</p><div class="loading-track"><span></span></div><p class="loading-foot">PLEASE WAIT · DO NOT CLOSE THIS WINDOW</p></main>`;
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
