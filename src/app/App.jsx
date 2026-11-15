import React, { useEffect, useMemo, useState } from 'react';
import { WorkerJsonTransport } from '../../client/adapters/WorkerJsonTransport.js';
import { JsonClient } from '../../client/adapters/JsonClient.js';
import HomePage from '../pages/HomePage.jsx';

const DEMO_URL = `${import.meta.env.BASE_URL}scenarios/the-silent-village.json`;
const titleOf = meta => meta?.title || 'Untitled scenario';
const descOf = meta => meta?.desc || meta?.description || meta?.subtitle || 'Chưa có mô tả cho kịch bản này.';
const pretty = value => String(value ?? '').replaceAll('-', ' ').replaceAll('_', ' ');
const safeText = value => typeof value === 'string' || typeof value === 'number' ? String(value) : '';

function Brand({ compact = false }) {
  return <div className={`brand ${compact ? 'brand-compact' : ''}`}><span className="brand-mark">V</span><span className="brand-word">VSR<span className="brand-muted"> / STUDIO</span></span></div>;
}
function Icon({ children, className = '' }) { return <span aria-hidden="true" className={`icon ${className}`}>{children}</span>; }
function Button({ children, variant = 'secondary', ...props }) { return <button className={`button button-${variant}`} {...props}>{children}</button>; }
function Status({ children = 'ENGINE READY' }) { return <span className="status"><i />{children}</span>; }

export default function App() {
  const [screen, setScreen] = useState('library');
  const [scenario, setScenario] = useState(null);
  const [scenarioName, setScenarioName] = useState('');
  const [client, setClient] = useState(null);
  const [transport, setTransport] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [library, setLibrary] = useState([]);
  const [panel, setPanel] = useState('overview');
  const [dialogue, setDialogue] = useState({ open:false, lines:[], choices:[], input:false });
  const [challenge, setChallenge] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [timer, setTimer] = useState('');
  const [paused, setPaused] = useState(false);
  const [busyAction, setBusyAction] = useState('');
  const [fileMode, setFileMode] = useState('scenario');
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(DEMO_URL).then(r => { if (!r.ok) throw new Error('Không tải được kịch bản mẫu.'); return r.json(); })
      .then(data => { if (active) setLibrary([{ id:'silent-village', data, source:'KỊCH BẢN MẪU', featured:true }]); })
      .catch(() => { if (active) setLibrary([]); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!client) return;
    const unsubscribe = client.subscribe(message => {
      if (message.type === 'state') setSnapshot(message.snapshot);
      if (message.type === 'transport.error') notify(message.error?.message || 'Kết nối Engine gặp lỗi.');
      if (message.type === 'event') handleEngineEvent(message.event);
    });
    setSnapshot(client.getSnapshot());
    return unsubscribe;
  }, [client]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(''), 3600);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    const onPop = () => {
      if (client && window.location.hash !== '#play') exitGame();
      else if (scenario && window.location.hash === '#scenario') setScreen('detail');
      else if (window.location.hash === '#home') setScreen('library');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [client, scenario]);

  function navigate(next, hash) {
    setScreen(next);
    if (hash) history.pushState({ vsr:next }, '', hash);
  }
  function notify(message) { setToast(message?.message || String(message)); }
  function handleEngineEvent(event) {
    const raw = event?.event || '';
    const name = raw.startsWith('presentation.') ? raw.slice(13) : raw;
    const payload = event?.payload || {};
    if (name.startsWith('notification.')) {
      const n = payload.notification;
      if (n && ['.add','.alert','.updated'].some(s => name.endsWith(s))) {
        setNotifications(old => [n, ...old.filter(x => x.id !== n.id)].slice(0, 5));
      } else if (n) setNotifications(old => old.filter(x => x.id !== n.id));
    }
    if (name === 'components.keyboard') {
      const a = payload.args || [];
      setChallenge({ action:a[0], actionId:a[1], uniqueId:a[2], config:a[3] || {} });
    }
    if (name === 'chat.renderBubble') {
      const line = payload.args?.[0];
      if (line) setDialogue(old => ({ ...old, open:true, lines:[...old.lines, line].slice(-30) }));
    }
    if (name === 'chat.renderChoices') setDialogue(old => ({ ...old, open:true, choices:Array.isArray(payload.args?.[0]) ? payload.args[0] : [], input:false }));
    if (name === 'chat.clearChoices') setDialogue(old => ({ ...old, choices:[] }));
    if (name === 'chat.inputVisible') setDialogue(old => ({ ...old, input:true }));
    if (name === 'chat.inputHidden') setDialogue(old => ({ ...old, input:false }));
    if (name === 'chat.toggleOverlay') setDialogue(old => ({ ...old, open:!!payload.args?.[0] }));
    if (name === 'scene.updateTimer') setTimer(String(payload.args?.[0] || ''));
    if (name === 'scene.hideTimer') setTimer('');
    if (name === 'scene.transition') setTransitioning(payload.args?.[0] === 'start');
    if (name === 'navigation.setBlocking') setTransitioning(!!payload.args?.[0]);
    if (name === 'password.retry') setChallenge(old => old ? ({ ...old, config:{ ...old.config, countTest:payload.countTest, remainingAttempts:payload.remainingAttempts } }) : old);
    if (name === 'password.expired' || name === 'password.exhausted') setChallenge(null);
  }

  function openScenario(entry) {
    setScenario(entry.data);
    setScenarioName(entry.source || entry.name || 'Tệp JSON');
    setScreen('detail');
    history.pushState({ vsr:'detail' }, '', '#scenario');
  }
  async function importScenario(file) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== 'object' || !parsed.scenes || typeof parsed.scenes !== 'object') throw new Error('Tệp JSON thiếu cấu trúc scenes của VSR Scenario.');
      const entry = { id:`import-${Date.now()}`, data:parsed, source:file.name, featured:false };
      setLibrary(old => [entry, ...old]);
      openScenario(entry);
    } catch (error) { notify(error instanceof SyntaxError ? 'Tệp không phải JSON hợp lệ.' : error.message); }
  }
  async function startGame(scenarioToStart = scenario) {
    if (!scenarioToStart || loading) return;
    setScenario(scenarioToStart);
    setLoading(true); setScreen('loading'); history.pushState({ vsr:'loading' }, '', '#loading');
    let nextTransport;
    try {
      await new Promise(resolve => requestAnimationFrame(resolve));
      nextTransport = new WorkerJsonTransport();
      const nextClient = new JsonClient(nextTransport);
      await nextClient.initialize(scenarioToStart);
      const nextSnapshot = nextClient.getSnapshot();
      if (!nextSnapshot?.game?.initialized || !nextSnapshot?.presentation?.scene) throw new Error('Engine không trả về snapshot khởi tạo hợp lệ.');
      setTransport(nextTransport); setClient(nextClient); setSnapshot(nextSnapshot);
      setDialogue({ open:false, lines:[], choices:[], input:false });
      setNotifications((nextSnapshot.session?.notifications?.pending || []).slice(0,5));
      setChallenge(null); setTimer(nextSnapshot.session?.timer?.displayText || '');
      setPaused(false); setPanel('overview'); setLoading(false); setScreen('gameplay');
      history.replaceState({ vsr:'gameplay' }, '', '#play');
    } catch (error) {
      nextTransport?.close?.(); setLoading(false); setScreen('detail'); notify(error.message);
      history.replaceState({ vsr:'detail' }, '', '#scenario');
    }
  }
  function exitGame() {
    client?.dispose?.(); transport?.close?.();
    setClient(null); setTransport(null); setSnapshot(null); setChallenge(null); setDialogue({ open:false, lines:[], choices:[], input:false });
    setScreen('library'); history.replaceState({ vsr:'library' }, '', '#home');
  }
  async function command(run) {
    try { return await run(); } catch (error) { notify(error.message || error); return null; }
  }
  async function triggerAction(action, snapshotNow = snapshot) {
    if (!client || !snapshotNow) return;
    const id = action.id;
    setBusyAction(id);
    await command(() => client.triggerAction(id, `${snapshotNow.game.sceneId}_${snapshotNow.game.routerId}_${id}`));
    setBusyAction('');
  }
  async function saveGame() {
    const ack = await command(() => client.exportSave());
    if (!ack) return;
    const payload = ack.result?.save || ack.result;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `vsr-save-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url); notify('Bản lưu đã được xuất.');
  }
  async function restoreGame(file) {
    if (!file || !client) return;
    try { await client.restoreSave(JSON.parse(await file.text())); notify('Đã gửi yêu cầu khôi phục bản lưu.'); }
    catch (error) { notify(error.message || 'Không thể đọc bản lưu.'); }
  }
  async function submitChallenge(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = challenge?.config?.challengeId;
    if (!id) return;
    const ack = await command(() => client.submitPassword(id, form.get('answer')));
    if (ack && !ack.result?.retry) setChallenge(null);
  }
  async function togglePause() {
    const result = await command(() => paused ? client.resume() : client.pause());
    if (result) setPaused(!paused);
  }

  const meta = scenario?.meta || {};
  const scene = snapshot?.presentation?.scene;
  const router = snapshot?.presentation?.router;
  const actions = snapshot?.presentation?.actions || [];
  const stateData = snapshot?.state || {};
  const inventory = useMemo(() => {
    const raw = stateData.inventory || stateData.player?.inventory || stateData.items?.inventory || [];
    if (Array.isArray(raw)) return raw.map(x => typeof x === 'string' ? { id:x } : x).filter(Boolean);
    if (raw && typeof raw === 'object') return Object.entries(raw).filter(([,v]) => v).map(([id,v]) => typeof v === 'object' ? { id, ...v } : { id });
    return [];
  }, [stateData]);
  const characters = Object.entries(scenario?.characters || {});
  const sceneName = scene?.meta?.title || scene?.title || scene?.id || 'Scene';
  const coverValue = meta.cover?.url || (typeof meta.cover === 'string' ? meta.cover : '');
  const cover = typeof coverValue === 'string' ? coverValue : '';

  return <div className="app-frame">
    {screen === 'library' && <header className="topba    {screen === 'library' && <HomePage
      loading={loading}
      demoAvailable={library.length > 0}
      onStartDemo={() => {
        const demo = library.find(entry => entry.featured) || library[0];
        if (!demo) { notify('Chưa tải được kịch bản demo.'); return; }
        setScenarioName('KỊCH BẢN MẪU');
        startGame(demo.data);
      }}
      onUploadJson={() => document.getElementById('scenario-import')?.click()}
    />}
Y ENGINE</div>
      </section>
    </main>}

    {screen === 'detail' && <main className="detail-page">
      <div className="detail-toolbar"><button onClick={() => { setScreen('library'); history.pushState({}, '', '#home'); }}>← <span>Thư viện</span></button><span>SCENARIO / OVERVIEW</span><span className="detail-ready"><i/> READY TO PLAY</span></div>
      <section className="detail-layout">
        <div className="detail-cover" style={cover ? { backgroundImage:`linear-gradient(180deg,rgba(9,15,22,.08),rgba(9,15,22,.62)),url("${cover}")` } : undefined}><div className="cover-top"><span>VSR ORIGINALS</span><span>NO. 001</span></div><div className="cover-bottom"><span>THE WORLD IS<br/>WAITING.</span><b>VSR / 01</b></div></div>
        <div className="detail-copy"><div className="eyebrow">SCENARIO PROFILE <span className="eyebrow-line"/></div><h1>{titleOf(meta)}</h1>{meta.subtitle && <h2>{meta.subtitle}</h2>}<p className="detail-description">{descOf(meta)}</p><div className="tag-list">{(meta.tags || []).map(tag => <span key={tag}>{pretty(tag)}</span>)}</div>
          <div className="detail-stats"><div><b>{Object.keys(scenario?.scenes || {}).length}</b><span>SCENES</span></div><div><b>{Object.keys(scenario?.characters || {}).length}</b><span>CHARACTERS</span></div><div><b>{Object.keys(scenario?.itemInfo || {}).length}</b><span>ITEMS</span></div><div><b>{meta.estimatedPlayTime || '—'}</b><span>MINUTES</span></div></div>
          <div className="detail-facts"><div><span>AUTHOR</span><b>{meta.writer || 'VSR Studio'}</b></div><div><span>LANGUAGE</span><b>{meta.language || '—'}</b></div><div><span>DIFFICULTY</span><b>{pretty(meta.difficulty || '—')}</b></div><div><span>AGE RATING</span><b>{meta.ageRating || '—'}</b></div></div>
          <div className="detail-entry"><span>ENTRY POINT</span><b>{meta.entryScene || 'Default scene'}</b></div>
          <Button variant="primary" onClick={startGame} disabled={loading}>Bắt đầu câu chuyện <Icon>↗</Icon></Button><p className="detail-source">SOURCE · {scenarioName}</p>
        </div>
      </section>
    </main>}

    {screen === 'loading' && <main className="loading-page"><div className="loading-mark"><Brand/></div><div className="loading-orbit"><span>V</span></div><div className="loading-copy"><div className="eyebrow">INITIALIZING STORY ENGINE</div><h1>Preparing your<br/><em>next chapter.</em></h1><p>Đang xác thực dữ liệu kịch bản và khởi tạo phiên chơi trong Web Worker.</p><div className="loading-progress"><i/></div><span>PLEASE WAIT · JSON PROTOCOL V2</span></div></main>}

    {screen === 'gameplay' && snapshot && <main className={`game-page ${transitioning ? 'is-transitioning' : ''}`}>
      <header className="game-header"><div className="game-header-left"><button className="game-back" onClick={exitGame}>←</button><Brand compact/><span className="game-divider"/><span className="game-title">{titleOf(scenario?.meta)}</span></div><div className="game-header-right"><span className="game-live"><i/> {paused ? 'PAUSED' : 'ENGINE LIVE'}</span><button title="Tạm dừng / tiếp tục" onClick={togglePause}>{paused ? '▶' : 'Ⅱ'}</button><button title="Xuất bản lưu" onClick={saveGame}>↓</button><label className="game-restore" title="Khôi phục bản lưu">↑<input type="file" accept=".json,application/json" onChange={e => restoreGame(e.target.files?.[0])}/></label><button title="Thoát phiên chơi" onClick={exitGame}>×</button></div></header>
      <div className="game-layout">
        <section className="game-main">
          <div className="game-breadcrumb"><span>STORY MODE</span><b>/</b><span>{pretty(snapshot.game?.sceneId)}</span><b>/</b><strong>{pretty(snapshot.game?.routerId)}</strong></div>
          <section className="scene-panel">
            <div className="scene-artwork"><div className="scene-glow"/><div className="scene-horizon"/><div className="scene-mist mist-a"/><div className="scene-mist mist-b"/><span className="scene-coordinate">LOCATION / {safeText(snapshot.game?.sceneId).toUpperCase()}</span><span className="scene-watermark">VSR</span></div>
            <div className="scene-text"><div className="eyebrow">CURRENT LOCATION <span className="scene-line"/></div><h1>{sceneName}</h1><p>{scene?.meta?.desc || scene?.meta?.description || 'Khám phá khu vực này và tìm ra manh mối tiếp theo.'}</p></div>
          </section>
          <section className="router-panel"><div className="router-label"><span className="router-pulse"/> ACTIVE ROUTER <b>{pretty(router?.id || snapshot.game?.routerId)}</b></div><h2>{router?.meta?.desc || router?.meta?.description || router?.meta?.title || 'Bạn muốn làm gì tiếp theo?'}</h2>{router?.meta?.subTitleStatus && <p>{router.meta.subTitleStatus}</p>}</section>
          <section className="action-panel"><div className="action-panel-head"><div><div className="eyebrow">AVAILABLE INTERACTIONS</div><h2>Choose your next move</h2></div><span>{String(actions.length).padStart(2,'0')} OPTIONS</span></div>
            <div className="action-grid">{actions.map((action, index) => { const locked = action.runtimeState?.display === 'locked'; return <button key={action.id} className={`action-card ${locked ? 'is-locked' : ''}`} disabled={locked || busyAction === action.id} onClick={() => triggerAction(action)}><span className="action-index">{String(index+1).padStart(2,'0')}</span><span className="action-card-copy"><b>{action.meta?.title || action.title || action.name || action.id}</b><small>{action.meta?.desc || action.meta?.description || (locked ? 'Chưa đủ điều kiện' : 'Thực hiện hành động')}</small></span><span className="action-card-arrow">{busyAction === action.id ? '…' : locked ? '⌑' : '↗'}</span></button>; })}{!actions.length && <div className="empty-actions">Không có hành động khả dụng trong khu vực này.</div>}</div>
          </section>
        </section>
        <aside className="game-sidebar">
          <div className="sidebar-tabs"><button className={panel === 'overview' ? 'selected' : ''} onClick={() => setPanel('overview')}>OVERVIEW</button><button className={panel === 'inventory' ? 'selected' : ''} onClick={() => setPanel('inventory')}>ITEMS <span>{inventory.length}</span></button><button className={panel === 'people' ? 'selected' : ''} onClick={() => setPanel('people')}>PEOPLE</button></div>
          {panel === 'overview' && <><div className="sidebar-section"><div className="sidebar-heading">SESSION STATUS <span>LIVE</span></div><div className="session-stat"><span>SCENE</span><b>{pretty(snapshot.game?.sceneId)}</b></div><div className="session-stat"><span>ROUTER</span><b>{pretty(snapshot.game?.routerId)}</b></div><div className="session-stat"><span>REVISION</span><b>#{snapshot.stateRevision ?? 0}</b></div>{timer && <div className="session-stat"><span>TIMER</span><b>{timer}</b></div>}</div><div className="sidebar-section"><div className="sidebar-heading">STORY PROGRESS <span>DATA</span></div><div className="progress-track"><i style={{width:`${Math.min(100, Math.max(4, Object.keys(stateData).length * 3))}%`}}/></div><p className="sidebar-note">Tiến trình được Engine quản lý và đồng bộ qua snapshot.</p></div><div className="sidebar-section"><div className="sidebar-heading">QUICK ACTIONS</div><button className="sidebar-action" onClick={() => setDialogue(old => ({ ...old, open:!old.open }))}>Open dialogue <b>↗</b></button><button className="sidebar-action" onClick={saveGame}>Export save <b>↓</b></button></div></>}
          {panel === 'inventory' && <div className="sidebar-section"><div className="sidebar-heading">YOUR INVENTORY <span>{inventory.length} ITEMS</span></div>{inventory.length ? inventory.map((item,index) => { const id = item.id || item.itemId || item.name || String(index); const info = scenario?.itemInfo?.[id] || {}; return <div className="inventory-item" key={id}><span className="inventory-icon">◇</span><div><b>{item.meta?.title || item.title || info.meta?.title || info.title || pretty(id)}</b><small>{item.meta?.desc || item.desc || info.meta?.desc || info.desc || 'Collected item'}</small></div><button onClick={() => command(() => client.useItem(id))}>USE</button></div>; }) : <div className="sidebar-empty"><span>◇</span><b>Chưa có vật phẩm</b><small>Những vật phẩm thu thập được sẽ xuất hiện ở đây.</small></div>}</div>}
          {panel === 'people' && <div className="sidebar-section"><div className="sidebar-heading">CHARACTERS <span>{characters.length} KNOWN</span></div>{characters.length ? characters.map(([id,character]) => <div className="person-item" key={id}><span className="person-avatar">{(character.meta?.name || id).slice(0,1).toUpperCase()}</span><div><b>{character.meta?.name || pretty(id)}</b><small>{character.meta?.desc || 'Unknown character'}</small></div><span className="person-state">{character.place?.scene_id === snapshot.game?.sceneId ? 'HERE' : '—'}</span></div>) : <div className="sidebar-empty">Chưa có dữ liệu nhân vật.</div>}</div>}
          <div className="sidebar-bottom"><span>VSR ENGINE</span><b>JSON PROTOCOL V2</b></div>
        </aside>
      </div>
      <footer className="game-footer"><span>VSR / INTERACTIVE STORY RUNTIME</span><span>STATE REVISION {snapshot.stateRevision ?? 0}</span><span>LOCAL WORKER SESSION</span></footer>
      {dialogue.open && <div className="dialogue-dock"><div className="dialogue-head"><div><span className="eyebrow">LIVE DIALOGUE</span><b>Conversation</b></div><button onClick={() => setDialogue(old => ({ ...old, open:false }))}>×</button></div><div className="dialogue-lines">{dialogue.lines.slice(-8).map((line,index) => <article key={index}><span>{line.nameID || line.char_id || 'VOICE'}</span><p>{line.text || ''}</p></article>)}</div>{dialogue.choices.length > 0 && <div className="dialogue-choices">{dialogue.choices.map((choice,index) => <button key={choice.id || index} onClick={() => command(() => client.selectChatChoice(index))}>{choice.text || choice.title || `Lựa chọn ${index+1}`} <b>↗</b></button>)}</div>}{dialogue.input && <Button variant="primary" onClick={() => command(() => client.nextChat())}>Tiếp tục hội thoại →</Button>}</div>}
      {challenge && <div className="modal-scrim"><form className="challenge-modal" onSubmit={submitChallenge}><button type="button" className="modal-close" onClick={async () => { const id = challenge.config?.challengeId; setChallenge(null); if (id) await command(() => client.submitPassword(id, null, true)); }}>×</button><div className="eyebrow">ENGINE CHALLENGE</div><h2>{challenge.action?.meta?.title || 'Xác minh câu trả lời'}</h2><p>{challenge.config?.desc || 'Nhập câu trả lời để tiếp tục.'}</p><input name="answer" autoComplete="off" placeholder="Nhập câu trả lời…" required autoFocus/><div className="challenge-meta">{Number.isFinite(challenge.config?.remainingAttempts) ? `Còn ${challenge.config.remainingAttempts} lần thử` : 'CHALLENGE ACTIVE'}</div><Button variant="primary" type="submit">Xác nhận <Icon>↗</Icon></Button></form></div>}
      {notifications.length > 0 && <div className="notification-stack">{notifications.map((n,index) => <div className="notification" key={n.id || index}><span className="notification-dot"/><div><b>{n.title || 'Thông báo'}</b><p>{n.message || n.text || ''}</p></div><button onClick={() => { setNotifications(old => old.filter(x => x.id !== n.id)); if (n.id) command(() => client.dispatch('notification.dismiss', { notificationId:n.id })); }}>×</button></div>)}</div>}
    </main>}
    <input id="scenario-import" className="visually-hidden" type="file" accept=".json,application/json" onChange={e => { importScenario(e.target.files?.[0]); e.target.value=''; }}/>
    <input id="save-import" className="visually-hidden" type="file" accept=".json,application/json" onChange={e => { restoreGame(e.target.files?.[0]); e.target.value=''; }}/>
    {toast && <div className="toast" role="status"><span>!</span>{toast}<button onClick={() => setToast('')}>×</button></div>}
  </div>;
}
