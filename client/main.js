import { HttpJsonTransport } from './adapters/HttpJsonTransport.js';
import { JsonClient } from './adapters/JsonClient.js';
import { RegionRenderer } from './renderer/RegionRenderer.js';

const $ = selector => document.querySelector(selector);
const app = $('#app');
const fileInput = $('#scenario-file');
const state = { screen:'home', scenario:null, scenarioName:'', transport:null, client:null, renderer:null, loading:false };

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const titleOf = meta => meta?.title || 'Untitled scenario';
const descriptionOf = meta => meta?.desc || meta?.description || meta?.subtitle || 'Chưa có mô tả cho kịch bản này.';

function renderHome() {
  state.screen='home';
  app.innerHTML=`<main class="home-shell"><header class="topbar"><a class="brand" href="#" aria-label="VSR Home"><span class="brand-mark">V</span><span>VSR<span class="brand-muted"> / PLAY</span></span></a><span class="engine-status"><i></i> JSON CLIENT</span></header>
  <section class="hero"><div class="eyebrow"><span class="eyebrow-line"></span> VISUAL STORY RUNTIME</div><h1>Stories begin<br><em>somewhere.</em></h1><p class="hero-copy">Một không gian để bước vào những thế giới được tạo nên từ kịch bản tương tác.</p></section>
  <section class="launch-panel"><div class="panel-heading"><span>START PLAYING</span><span class="panel-index">01 / 02</span></div>
  <button class="demo-card" id="demo-play"><span class="demo-art" aria-hidden="true"><span class="moon"></span><span class="ridge ridge-back"></span><span class="ridge ridge-front"></span><span class="mist"></span></span><span class="demo-info"><span class="card-kicker">FEATURED DEMO</span><strong>THE SILENT VILLAGE</strong><span>Ngôi Làng Không Tiếng Động</span></span><span class="round-arrow">↗</span></button>
  <div class="or-divider"><span></span> OR LOAD YOUR OWN STORY <span></span></div><button class="load-card" id="load-json"><span class="upload-icon">↑</span><span><strong>Load JSON</strong><small>Nạp kịch bản VSR từ thiết bị</small></span><span class="load-chevron">＋</span></button><p class="file-hint">Hỗ trợ tệp kịch bản định dạng .json</p></section><footer class="home-footer"><span>VSR ENGINE</span><span>JSON-DRIVEN CLIENT</span></footer></main>`;
  $('#demo-play').addEventListener('click', async () => {
    const transport = new HttpJsonTransport();
    try { openMetadata(await transport.getDemoScenario(), 'Demo · THE SILENT VILLAGE'); }
    catch(error) { showToast(error); }
    finally { transport.close(); }
  });
  $('#load-json').addEventListener('click', () => fileInput.click());
}

function openMetadata(scenario, sourceName) {
  state.scenario=scenario; state.scenarioName=sourceName; state.screen='metadata';
  const meta=scenario.meta||{}, scenes=Object.keys(scenario.scenes||{}).length, characters=Object.keys(scenario.characters||{}).length, items=Object.keys(scenario.itemInfo||{}).length;
  const tags=Array.isArray(meta.tags)?meta.tags:[];
  app.innerHTML=`<main class="detail-shell"><header class="topbar"><button class="back-button" id="back-home" aria-label="Quay lại">←</button><a class="brand" href="#"><span class="brand-mark">V</span><span>VSR<span class="brand-muted"> / PLAY</span></span></a><span class="detail-label">SCENARIO</span></header>
  <section class="metadata-hero"><div class="metadata-art"><div class="art-orb"></div><div class="art-horizon"></div><span>SCENARIO PREVIEW</span></div><div class="metadata-body"><div class="eyebrow"><span class="eyebrow-line"></span> READY TO EXPLORE</div><h1>${escapeHtml(titleOf(meta))}</h1>${meta.subtitle?`<p class="subtitle">${escapeHtml(meta.subtitle)}</p>`:''}<p class="description">${escapeHtml(descriptionOf(meta))}</p>
  <div class="tag-row">${tags.map(tag=>`<span class="tag">${escapeHtml(String(tag).replaceAll('-',' '))}</span>`).join('')}</div>
  <div class="metadata-stats"><div><strong>${scenes}</strong><span>SCENES</span></div><div><strong>${characters}</strong><span>CHARACTERS</span></div><div><strong>${items}</strong><span>ITEMS</span></div></div>
  <div class="metadata-facts">${[['STUDIO',meta.studio],['WRITER',meta.writer],['VERSION',meta.version],['LANGUAGE',meta.language],['DIFFICULTY',meta.difficulty],['AGE RATING',meta.ageRating]].map(([label,value])=>`<div><span>${label}</span><strong>${escapeHtml(value||'—')}</strong></div>`).join('')}</div>
  <div class="entry-note"><span class="entry-dot"></span><span>ENTRY SCENE</span><strong>${escapeHtml(meta.entryScene||'Not defined')}</strong></div><button class="primary-button" id="start-game"><span>PLAY SCENARIO</span><span>→</span></button><p class="source-note">SOURCE · ${escapeHtml(sourceName)}</p></div></section></main>`;
  $('#back-home').addEventListener('click',renderHome); $('#start-game').addEventListener('click',startGame);
}

function renderLoading(message='Đang khởi tạo phiên chơi…') {
  state.screen='loading';
  app.innerHTML=`<main class="loading-screen"><div class="loading-mark">V</div><div class="loading-orbit"><span></span></div><p class="eyebrow">VSR ENGINE / JSON TRANSPORT</p><h1>Preparing<br><em>your world.</em></h1><p class="loading-message" id="loading-message">${escapeHtml(message)}</p><div class="loading-track"><span></span></div><p class="loading-foot">PLEASE WAIT · DO NOT CLOSE THIS WINDOW</p></main>`;
}

async function startGame() {
  if(state.loading||!state.scenario)return;
  state.loading=true; renderLoading('Đang kiểm tra và nạp kịch bản…');
  try {
    await new Promise(resolve=>requestAnimationFrame(resolve));
    const transport=new HttpJsonTransport();
    const client=new JsonClient(transport);
    state.transport=transport; state.client=client;
    $('#loading-message').textContent='Kịch bản đang được Engine kiểm tra. Đang khởi tạo phiên chơi…';
    await client.initialize(state.scenario);
    const snapshot=client.getSnapshot();
    if(!snapshot?.game?.sceneId||!snapshot?.game?.routerId||!snapshot.presentation?.scene||!snapshot.presentation?.router) throw new Error('Engine không trả về snapshot Scene/Router hợp lệ.');
    state.loading=false; renderGameplay();
  } catch(error) {
    state.client?.dispose?.(); state.transport?.close?.(); state.client=null; state.transport=null; state.loading=false;
    renderMetadataError(error);
  }
}

function renderMetadataError(error) {
  openMetadata(state.scenario,state.scenarioName);
  const note=document.createElement('div'); note.className='error-note'; note.textContent=`Không thể khởi chạy: ${error?.message||String(error)}`;
  $('.metadata-body').insertBefore(note,$('#start-game'));
}

function renderGameplay() {
  state.screen='gameplay';
  state.renderer?.dispose?.();
  state.renderer=new RegionRenderer(app,state.client,exitGame);
  state.renderer.mount(state.client.getSnapshot());
}

function exitGame() {
  state.renderer?.dispose?.(); state.client?.dispose?.(); state.transport?.close?.();
  state.renderer=null; state.client=null; state.transport=null; renderHome();
}

function showToast(error) {
  const notice=document.createElement('div'); notice.className='toast-error'; notice.textContent=error?.message||String(error); app.appendChild(notice);
}

fileInput.addEventListener('change',async event=>{
  const file=event.target.files?.[0]; if(!file)return;
  try { openMetadata(JSON.parse(await file.text()),file.name); }
  catch(error) { renderHome(); showToast(error instanceof SyntaxError?new Error('Tệp không phải JSON hợp lệ.'):error); }
  finally { fileInput.value=''; }
});
renderHome();
