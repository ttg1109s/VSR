import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DEMO_SCRIPT } from '../demo_script.js';
import { JsonClient } from '../client/adapters/JsonClient.js';
import { WorkerJsonTransport } from '../client/adapters/WorkerJsonTransport.js';
import HomePage from './pages/home/HomePage.jsx';
import ScenarioPreviewPage from './pages/scenario-preview/ScenarioPreviewPage.jsx';
import LoadingPage from './pages/loading/LoadingPage.jsx';

export default function App() {
  const [preview, setPreview] = useState(null);
  const [page, setPage] = useState('home');
  const [busy, setBusy] = useState(false);
  const [busyKind, setBusyKind] = useState('');
  const [error, setError] = useState('');
  const [loadStatus, setLoadStatus] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const runtimeRef = useRef(null);
  const loadGenerationRef = useRef(0);

  const closeRuntime = useCallback(() => {
    const runtime = runtimeRef.current;
    runtimeRef.current = null;
    runtime?.client?.dispose();
    runtime?.transport?.close?.();
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
    setPage('loading');

    const transport = new WorkerJsonTransport({ requestTimeoutMs: 30000 });
    const client = new JsonClient(transport);
    runtimeRef.current = { transport, client, status: 'loading', generation };

    try {
      const snapshot = await client.initialize(preview.scenario, { enterScene: false });
      if (generation !== loadGenerationRef.current) return;
      runtimeRef.current.status = 'loaded';
      runtimeRef.current.snapshot = snapshot;
      setLoadStatus('complete');
    } catch (cause) {
      if (generation !== loadGenerationRef.current) return;
      closeRuntime();
      setLoadError(cause?.message || 'Unable to load this scenario.');
      setLoadStatus('error');
    }
  }, [preview, closeRuntime]);

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
