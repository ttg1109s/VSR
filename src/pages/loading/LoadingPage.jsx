import React from 'react';
import { Button, ProgressBar } from '../../design-system/index.js';

function StatusIcon({ status }) {
  if (status === 'complete') {
    return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7" /></svg>;
  }
  if (status === 'error') {
    return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3.5 2.8 20h18.4L12 3.5Z" /><path d="M12 9v5" /><path d="M12 17.5h.01" /></svg>;
  }
  return <span className="vsr-spinner vsr-spinner--large" role="img" aria-label="Loading" />;
}

function CloseIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>;
}

export default function LoadingPage({ status = 'loading', error = '', onClose, onRetry }) {
  const complete = status === 'complete';
  const failed = status === 'error';

  return (
    <main className="vsr-page-shell vsr-loader-page">
      <header className="vsr-loader-header">
        <Button
          variant="tertiary"
          size="md"
          leadingIcon={<CloseIcon />}
          aria-label="Cancel loading and return to scenario details"
          onClick={onClose}
        />
      </header>
      <div className="vsr-content-width vsr-content-width--narrow">
        <section className="vsr-loader-panel" aria-live="polite">
          <div className="vsr-loader-status">
            <span className={'vsr-loader-mark' + (complete ? ' vsr-loader-mark--complete' : failed ? ' vsr-loader-mark--error' : '')}>
              <StatusIcon status={status} />
            </span>
            <div className="vsr-stack vsr-stack--gap-1">
              <h2 className="vsr-loader-status-title">
                {complete ? 'Scenario ready' : failed ? 'Unable to load scenario' : 'Preparing your scenario'}
              </h2>
              <p className="vsr-loader-copy">
                {complete
                  ? 'The game engine is initialized and the first scene is open. Your scenario is ready to play.'
                  : failed
                    ? 'Initialization stopped before the game engine became ready. Review the error below, then retry.'
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
            <div className="vsr-stack vsr-stack--gap-3 vsr-loader-error" role="alert">
              <p className="vsr-text-error">{error || 'The scenario could not be initialized. No additional error details were provided by the runtime.'}</p>
              <Button variant="primary" onClick={onRetry}>Retry</Button>
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
