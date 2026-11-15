import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DEMO_SCRIPT } from '../demo_script.js';
import { JsonClient } from '../client/adapters/JsonClient.js';
import { WorkerJsonTransport } from '../client/adapters/WorkerJsonTransport.js';
import HomePage from './pages/home/HomePage.jsx';
import RuntimePage from './pages/runtime/RuntimePage.jsx';

export default function App() {
  const clientRef = useRef(null);
  const [client, setClient] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [busyKind, setBusyKind] = useState('');
  const [error, setError] = useState('');

  const disposeRuntime = useCallback(() => {
    clientRef.current?.dispose();
    clientRef.current?.transport?.close?.();
    clientRef.current = null;
    setClient(null);
    setSnapshot(null);
  }, []);

  useEffect(() => () => {
    clientRef.current?.dispose();
    clientRef.current?.transport?.close?.();
  }, []);

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
    } catch (cause) {
      setError(cause?.message || 'Không thể kiểm tra kịch bản.');
    } finally {
      inspector?.dispose();
      inspector?.transport?.close?.();
      setBusy(false);
      setBusyKind('');
    }
  }, [busy]);

  const startScenario = useCallback(async (scenario, kind) => {
    if (busy) return false;
    setBusy(true);
    setBusyKind(kind);
    setError('');
    let nextClient;
    try {
      const transport = new WorkerJsonTransport();
      nextClient = new JsonClient(transport);
      const unsubscribe = nextClient.subscribe(message => {
        if (message.type === 'state') setSnapshot(message.snapshot);
        if (message.type === 'transport.error') setError(message.error?.message || 'Lỗi kết nối runtime.');
      });
      const initialSnapshot = await nextClient.initialize(scenario);
      clientRef.current = nextClient;
      setClient(nextClient);
      setSnapshot(initialSnapshot);
      nextClient.__homeUnsubscribe = unsubscribe;
      return true;
    } catch (cause) {
      nextClient?.dispose();
      nextClient?.transport?.close?.();
      setError(cause?.message || 'Không thể khởi chạy kịch bản.');
      return false;
    } finally {
      setBusy(false);
      setBusyKind('');
    }
  }, [busy]);

  const handleImportFile = useCallback(async file => {
    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
      setError('Vui lòng chọn tệp JSON.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Tệp JSON vượt quá giới hạn 5 MB.');
      return;
    }
    try {
      const source = await file.text();
      const scenario = JSON.parse(source);
      if (!scenario || typeof scenario !== 'object' || Array.isArray(scenario)) {
        throw new Error('Nội dung JSON phải là một object scenario.');
      }
      await inspectScenario(scenario, 'import');
    } catch (cause) {
      setError(cause?.message || 'Không thể đọc tệp JSON.');
    }
  }, [inspectScenario]);

  const confirmPreview = useCallback(async () => {
    if (!preview) return;
    const started = await startScenario(preview.scenario, preview.kind);
    if (started) setPreview(null);
  }, [preview, startScenario]);

  if (client && snapshot) {
    return <RuntimePage client={client} snapshot={snapshot} onExit={disposeRuntime} />;
  }

  return (
    <HomePage
      onRunDemo={() => inspectScenario(DEMO_SCRIPT, 'demo')}
      onImportFile={handleImportFile}
      preview={preview}
      onCancelPreview={() => { if (!busy) setPreview(null); }}
      onConfirmPreview={confirmPreview}
      busy={busy ? busyKind || true : false}
      error={error}
    />
  );
}
