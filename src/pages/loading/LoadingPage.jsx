import React from 'react';
import { Button, ProgressBar } from '../../design-system/index.js';

export default function LoadingPage({ preview, status = 'loading', error = '', onClose, onRetry }) {
  const title = preview?.metadata?.title || 'Untitled scenario';
  const complete = status === 'complete';
  const failed = status === 'error';

  return (
    <main className="vsr-page-shell vsr-loader-page">
      <div className="vsr-content-width vsr-content-width--narrow vsr-stack vsr-stack--gap-8">
        <header className="vsr-loader-header">
          <div className="vsr-stack vsr-stack--gap-2">
            <span className="vsr-loader-eyebrow">VSR <span aria-hidden="true">/</span> SCENARIO LOADER</span>
            <h1 className="vsr-loader-title">{title}</h1>
          </div>
          <Button
            variant="tertiary"
            size="md"
            leadingIcon={<span className="vsr-icon" aria-hidden="true">close</span>}
            aria-label="Cancel loading and return to scenario details"
            onClick={onClose}
          />
        </header>

        <section className="vsr-loader-panel" aria-live="polite">
          <div className="vsr-loader-status">
            <span className={'vsr-loader-mark' + (complete ? ' vsr-loader-mark--complete' : failed ? ' vsr-loader-mark--error' : '')} aria-hidden="true">
              {complete ? 'check' : failed ? 'priority_high' : <span className="vsr-spinner" />}
            </span>
            <div className="vsr-stack vsr-stack--gap-1">
              <h2 className="vsr-loader-status-title">
                {complete ? 'Scenario ready' : failed ? 'Unable to load scenario' : 'Preparing your scenario'}
              </h2>
              <p className="vsr-loader-copy">
                {complete
                  ? 'The game engine is initialized. The first scene has not been opened.'
                  : failed
                    ? 'The game engine could not finish initializing this scenario.'
                    : 'Loading scenario data and initializing the game engine.'}
              </p>
            </div>
          </div>

          {!failed && (
            <div className="vsr-loader-progress">
              <div className="vsr-loader-progress-meta">
                <span>{complete ? 'READY' : 'INITIALIZING'}</span>
                <span>{complete ? '100%' : 'IN PROGRESS'}</span>
              </div>
              <ProgressBar status={complete ? 'complete' : 'indeterminate'} label="Scenario loading progress" />
            </div>
          )}

          {failed && (
            <div className="vsr-stack vsr-stack--gap-3" role="alert">
              <p className="vsr-text-error">{error || 'An unexpected loading error occurred.'}</p>
              <Button variant="primary" onClick={onRetry}>Try again</Button>
            </div>
          )}

          {complete && (
            <p className="vsr-loader-footnote">You can close this page to return to the scenario details.</p>
          )}
        </section>
      </div>
    </main>
  );
}
