import React from 'react';
import { IconButton } from '../../design-system/index.js';
import './action-navigator.css';

export default function ActionNavigator({ activeIndex = 0, actionCount = 0, activeTitle = '', onNavigate }) {
  if (actionCount <= 0) return null;

  const goTo = index => onNavigate?.((index + actionCount) % actionCount);

  return (
    <section className="vsr-action-navigator" aria-label="Action navigation">
      <header className="vsr-action-navigator__header">
        <h2 className="vsr-action-navigator__heading">Action Navigator</h2>
        <div className="vsr-action-navigator__count" aria-label={`${actionCount} actions`}>
          <span className="vsr-action-navigator__count-icon" aria-hidden="true">layers</span>
          <span>{actionCount} {actionCount === 1 ? 'Action' : 'Actions'}</span>
        </div>
      </header>

      <div className="vsr-action-navigator__controls">
        <IconButton
          className="vsr-action-navigator__arrow"
          icon="chevron_left"
          label="Previous action"
          variant="secondary"
          size="lg"
          disabled={actionCount <= 1}
          onClick={() => goTo(activeIndex - 1)}
        />
        <div className="vsr-action-navigator__pagination" role="group" aria-label="Choose an action">
          {Array.from({ length: actionCount }, (_, index) => (
            <button
              key={index}
              type="button"
              className="vsr-action-navigator__page"
              aria-label={`Go to action ${index + 1} of ${actionCount}`}
              aria-current={index === activeIndex ? 'step' : undefined}
              onClick={() => goTo(index)}
            >
              <span className="vsr-action-navigator__dot" />
            </button>
          ))}
        </div>
        <IconButton
          className="vsr-action-navigator__arrow"
          icon="chevron_right"
          label="Next action"
          variant="secondary"
          size="lg"
          disabled={actionCount <= 1}
          onClick={() => goTo(activeIndex + 1)}
        />
      </div>

      <p className="vsr-action-navigator__current" aria-live="polite">
        {activeIndex + 1} / {actionCount}{activeTitle ? ` · ${activeTitle}` : ''}
      </p>
    </section>
  );
}
