import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DEMO_SCRIPT } from '../demo_script.js';
import { JsonClient } from '../client/adapters/JsonClient.js';
import { WorkerJsonTransport } from '../client/adapters/WorkerJsonTransport.js';
import HomePage from './pages/home/HomePage.jsx';
import ScenarioPreviewPage from './pages/scenario-preview/ScenarioPreviewPage.jsx';
import LoadingPage from './pages/loading/LoadingPage.jsx';
import PlayingPage from './pages/playing/PlayingPage.jsx';
import { ToastProvider, useToast } from './design-system/index.js';
import { notificationSoundService } from './features/notifications/NotificationSoundService.js';

function AppContent() {
  const toast = useToast();
  const [preview, setPreview] = useState(null);
  const [page, setPage] = useState('home');
  const [busy, setBusy] = useState(false);
  const [busyKind, setBusyKind] = useState('');
  const [error, setError] = useState('');
  const [loadStatus, setLoadStatus] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [gameSnapshot, setGameSnapshot] = useState(null);
  const [chatViewRequest, setChatViewRequest] = useState(null);
  const [gameError, setGameError] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return typeof window === 'undefined' || window.localStorage.getItem('vsr.notification.sound') !== 'false';
    } catch {
      return true;
    }
  });
  const [modalNotifications, setModalNotifications] = useState([]);
  const soundEnabledRef = useRef(soundEnabled);
  const notificationEventIdsRef = useRef(new Set());
  soundEnabledRef.current = soundEnabled;

  useEffect(() => {
    try { window.localStorage.setItem('vsr.notification.sound', String(soundEnabled)); } catch {}
  }, [soundEnabled]);
  const runtimeRef = useRef(null);
  const loadGenerationRef = useRef(0);

  const closeRuntime = useCallback(() => {
    const runtime = runtimeRef.current;
    runtimeRef.current = null;
    runtime?.unsubscribe?.();
    runtime?.client?.dispose();
    setGameSnapshot(null);
    setChatViewRequest(null);
    setModalNotifications([]);
    runtime?.transport?.close?.();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const unlock = () => notificationSoundService.unlock();
    window.addEventListener('pointerdown', unlock, { once: true, capture: true });
    window.addEventListener('keydown', unlock, { once: true, capture: true });
    return () => {
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    };
  }, []);

  useEffect(() => () => {
    loadGenerationRef.current += 1;
    closeRuntime();
  }, [closeRuntime]);

  const inspectScenario = useCallback(async (scenario, kind) => {
    if (busy) return;
    setBusy(true);
    setBusyKind(kind);
    setError('');
    let inspector;
    try {
      const transport = new WorkerJsonTransport();
      inspector = new JsonClient(transport);
      const acknowledgement = await inspector.inspectScenario(scenario);
      setPreview({ scenario, kind, ...acknowledgement.result });
      setPage('meta');
    } catch (cause) {
      setError(cause?.message || 'Unable to inspect the scenario.');
    } finally {
      inspector?.dispose();
      inspector?.transport?.close?.();
      setBusy(false);
      setBusyKind('');
    }
  }, [busy]);

  const handleImportFile = useCallback(async file => {
    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
      setError('Please select a JSON file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('The JSON file exceeds the 5 MB limit.');
      return;
    }
    try {
      const source = await file.text();
      const scenario = JSON.parse(source);
      if (!scenario || typeof scenario !== 'object' || Array.isArray(scenario)) {
        throw new Error('The JSON content must be a scenario object.');
      }
      await inspectScenario(scenario, 'import');
    } catch (cause) {
      setError(cause?.message || 'Unable to read the JSON file.');
    }
  }, [inspectScenario]);

  const handlePlay = useCallback(async () => {
    if (!preview || runtimeRef.current?.status === 'loading') return;
    const generation = ++loadGenerationRef.current;
    closeRuntime();
    setLoadStatus('loading');
    setLoadError('');
    setGameError('');
    setPage('loading');

    const transport = new WorkerJsonTransport({ requestTimeoutMs: 30000 });
    const client = new JsonClient(transport);
    notificationEventIdsRef.current.clear();
    const unsubscribe = client.subscribe(message => {
      if (generation !== loadGenerationRef.current) return;
      if (message.type === 'state') {
        setGameSnapshot(message.snapshot);
      } else if (message.type === 'event' && message.event?.event === 'presentation.chat.viewRequested') {
        const request = Array.isArray(message.event.payload?.args)
          ? message.event.payload.args[0]
          : null;
        if (request?.requestId && request.contactId && request.chatId) {
          setChatViewRequest(request);
        }
      } else if (message.type === 'event') {
        const eventName = message.event?.event;
        if (eventName !== 'presentation.notification.add' && eventName !== 'presentation.notification.alert') return;
        const notification = message.event?.payload?.notification;
        if (!notification?.id || notificationEventIdsRef.current.has(notification.id)) return;
        notificationEventIdsRef.current.add(notification.id);
        if (notificationEventIdsRef.current.size > 500) {
          notificationEventIdsRef.current.delete(notificationEventIdsRef.current.values().next().value);
        }
        if (eventName === 'presentation.notification.alert') {
          setModalNotifications(current => [...current, notification]);
        } else {
          const content = [notification.title, notification.message].filter(Boolean).join(': ') || 'New notification';
          const tone = notification.level === 'danger' ? 'error' : notification.level === 'warning' ? 'warning' : notification.level === 'success' ? 'success' : 'default';
          toast(content, { tone, duration: notification.duration ?? 5000 });
        }
        if (soundEnabledRef.current && notification.sound !== false) {
          notificationSoundService.play(notification.soundProfile || notification.level || 'default');
        }
      }
    });
    runtimeRef.current = { transport, client, unsubscribe, status: 'loading', generation };

    const isCurrentLoad = () =>
      generation === loadGenerationRef.current &&
      runtimeRef.current?.generation === generation;

    try {
      const snapshot = await client.initialize(preview.scenario, { enterScene: true });
      if (!isCurrentLoad()) return;
      runtimeRef.current.status = 'loaded';
      runtimeRef.current.snapshot = snapshot;
      setGameSnapshot(snapshot);
      setLoadStatus('complete');
      setPage('playing');
    } catch (cause) {
      if (!isCurrentLoad()) return;
      closeRuntime();
      const detail = typeof cause?.message === 'string' ? cause.message.trim() : '';
      setLoadError(detail || 'Initialization failed. The runtime did not provide an error message.');
      setLoadStatus('error');
    }
  }, [preview, closeRuntime, toast]);

  const cancelLoading = useCallback(() => {
    loadGenerationRef.current += 1;
    closeRuntime();
    setLoadStatus('loading');
    setLoadError('');
    setPage('meta');
  }, [closeRuntime]);

  const backToHome = useCallback(() => {
    loadGenerationRef.current += 1;
    closeRuntime();
    setPreview(null);
    setPage('home');
  }, [closeRuntime]);

  if (page === 'meta' && preview) {
    return <ScenarioPreviewPage preview={preview} onBack={backToHome} onPlay={handlePlay} />;
  }
  if (page === 'playing' && gameSnapshot) {
    return (
      <PlayingPage
        snapshot={gameSnapshot}
        chatViewRequest={chatViewRequest}
        client={runtimeRef.current?.client}
        error={gameError}
        soundEnabled={soundEnabled}
        onSoundChange={enabled => {
          setSoundEnabled(enabled);
          if (!enabled) notificationSoundService.clearPending();
        }}
        modalNotification={modalNotifications[0] || null}
        onModalClose={async () => {
          const notificationId = modalNotifications[0]?.id;
          setModalNotifications(current => current.slice(1));
          if (notificationId) {
            try { await runtimeRef.current?.client?.dismissNotification(notificationId); } catch (cause) { setGameError(cause?.message || 'Unable to dismiss the notification.'); }
          }
        }}
        onNavigate={async sceneId => {
          setGameError('');
          try {
            await runtimeRef.current?.client?.enterScene(sceneId, true);
          } catch (cause) {
            setGameError(cause?.message || 'Unable to enter the selected scene.');
          }
        }}
      />
    );
  }
  if (page === 'loading' && preview) {
    return <LoadingPage preview={preview} status={loadStatus} error={loadError} onClose={cancelLoading} onRetry={handlePlay} />;
  }
  return (
    <HomePage
      onRunDemo={() => inspectScenario(DEMO_SCRIPT, 'demo')}
      onImportFile={handleImportFile}
      busy={busy ? busyKind || true : false}
      error={error}
    />
  );
}


export default function App() {
  return <ToastProvider duration={5000} position="top-right"><AppContent /></ToastProvider>;
}
