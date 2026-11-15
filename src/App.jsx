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

  const startScenario = useCallback(async (scenario, kind) => {
    if (busy) return;
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
    } catch (cause) {
      nextClient?.dispose();
      nextClient?.transport?.close?.();
      setError(cause?.message || 'Không thể khởi chạy kịch bản.');
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
      await startScenario(scenario, 'import');
    } catch (cause) {
      setError(cause?.message || 'Không thể đọc tệp JSON.');
    }
  }, [startScenario]);

  if (client && snapshot) {
    return <RuntimePage client={client} snapshot={snapshot} onExit={disposeRuntime} />;
  }

  return (
    <HomePage
      onRunDemo={() => startScenario(DEMO_SCRIPT, 'demo')}
      onImportFile={handleImportFile}
      busy={busy ? busyKind || true : false}
      error={error}
    />
  );
}
