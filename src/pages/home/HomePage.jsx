import React, { useRef } from 'react';
import HomeActionCard from '../../components/home/HomeActionCard.jsx';

export default function HomePage({
  onRunDemo,
  onImportFile,
  busy = false,
  error = ''
}) {
  const fileInputRef = useRef(null);

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (file) onImportFile?.(file);
    event.target.value = '';
  }

  return (
    <main className="vsr-page-shell">
      <section className="vsr-content-width vsr-content-width--medium vsr-stack vsr-stack--center" aria-labelledby="home-title">
        <div className="vsr-content-width vsr-content-width--narrow vsr-page-shell__content vsr-page-shell__content--center vsr-page-shell__content--padded vsr-stack vsr-stack--center vsr-stack--gap-8">
          <header className="vsr-stack vsr-stack--center vsr-stack--gap-2">
            <h1 id="home-title" className="vsr-heading-display">Visual Story Runtime</h1>
            <p className="vsr-text-secondary vsr-text-body">A runtime for interactive stories.</p>
          </header>

          <div className="vsr-grid vsr-grid--columns-2 vsr-grid--gap-3" aria-label="Start an experience">
            <HomeActionCard
              icon="play_circle"
              title="Demo Script"
              variant="primary"
              onClick={onRunDemo}
              disabled={Boolean(busy)}
              loading={busy === 'demo'}
            />
            <HomeActionCard
              icon="data_object"
              title="Import JSON"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={Boolean(busy)}
              loading={busy === 'import'}
            />
            <input
              ref={fileInputRef}
              className="vsr-visually-hidden"
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              aria-label="Choose a scenario JSON file"
              tabIndex={-1}
            />
          </div>
          {error && <p className="vsr-text-error" role="alert">{error}</p>}
        </div>
      </section>
    </main>
  );
}
