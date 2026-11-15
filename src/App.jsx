import React, { useCallback, useState } from 'react';
import { DEMO_SCRIPT } from '../demo_script.js';
import { JsonClient } from '../client/adapters/JsonClient.js';
import { WorkerJsonTransport } from '../client/adapters/WorkerJsonTransport.js';
import HomePage from './pages/home/HomePage.jsx';
import ScenarioPreviewPage from './pages/scenario-preview/ScenarioPreviewPage.jsx';

export default function App() {
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [busyKind, setBusyKind] = useState('');
  const [error, setError] = useState('');

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

  if (preview) {
    return <ScenarioPreviewPage preview={preview} onBack={() => setPreview(null)} />;
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
