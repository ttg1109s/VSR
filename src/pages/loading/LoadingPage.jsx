import React from 'react';
import { Button, ProgressBar } from '../../design-system/index.js';

export default function LoadingPage({ preview, status = 'loading', error = '', onClose, onRetry }) {
  const title = preview?.metadata?.title || 'Untitled scenario';
  const complete = status === 'complete';
  const failed = status === 'error';

  return (
    <main className="vsr-page-shell vsr-page-shell--start">
      <div className="vsr-content-width vsr-content-width--narrow vsr-stack vsr-stack--gap-8">
        <header className="vsr-page-header">
          <div className="vsr-stack vsr-stack--gap-1">
            <span className="vsr-eyebrow">VSR · SCENARIO LOADER</span>
            <h1 className="vsr-heading-display">{title}</h1>
          </div>
          <Button
            variant="tertiary"
            size="md"
            leadingIcon={<span className="vsr-icon" aria-hidden="true">close</span>}
            aria-label="Cancel loading and return to scenario details"
            onClick={onClose}
          />
        </header>

        <section className="vsr-stack vsr-stack--center vsr-stack--gap-4" aria-live="polite">
          <div className="vsr-stack vsr-stack--center vsr-stack--gap-2">
            <h2>
              {complete ? 'Scenario loaded' : failed ? 'Unable to load scenario' : 'Loading scenario'}
            </h2>
            <p className="vsr-text-secondary vsr-text-center">
              {complete
                ? 'The scenario has been loaded into the game engine. The first scene has not been opened.'
                : failed
                  ? 'The engine could not finish loading this scenario.'
                  : 'Preparing scenario data and initializing the game engine…'}
            </p>
          </div>

          {!failed && <ProgressBar status={complete ? 'complete' : 'indeterminate'} label="Scenario loading progress" />}

          {failed && (
            <div className="vsr-stack vsr-stack--center vsr-stack--gap-3" role="alert">
              <p className="vsr-text-error">{error || 'An unexpected loading error occurred.'}</p>
              <Button variant="primary" onClick={onRetry}>Try again</Button>
            </div>
          )}

          {complete && (
            <p className="vsr-text-secondary vsr-text-center">
              Loading is complete. You can close this page to return to the scenario details.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
