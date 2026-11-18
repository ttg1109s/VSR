import React, { useEffect, useMemo, useState } from 'react';
import { IconButton } from '../../design-system/index.js';
import './action-navigator.css';

const getVisibleDotCount = () => {
  if (typeof window === 'undefined') return 5;
  if (window.matchMedia('(min-width: 840px)').matches) return 9;
  if (window.matchMedia('(min-width: 600px)').matches) return 7;
  return 5;
};

export default function ActionNavigator({ activeIndex = 0, actionCount = 0, onNavigate }) {
  const [visibleDotCount, setVisibleDotCount] = useState(getVisibleDotCount);

  useEffect(() => {
    const compact = window.matchMedia('(max-width: 599px)');
    const medium = window.matchMedia('(min-width: 600px) and (max-width: 839px)');
    const expanded = window.matchMedia('(min-width: 840px)');
    const update = () => setVisibleDotCount(getVisibleDotCount());

    compact.addEventListener('change', update);
    medium.addEventListener('change', update);
    expanded.addEventListener('change', update);
    update();

    return () => {
      compact.removeEventListener('change', update);
      medium.removeEventListener('change', update);
      expanded.removeEventListener('change', update);
    };
  }, []);

  const safeActiveIndex = actionCount > 0
    ? Math.min(Math.max(0, activeIndex), actionCount - 1)
    : 0;
  const dotCount = Math.min(actionCount, visibleDotCount);
  const dotStart = Math.max(
    0,
    Math.min(
      safeActiveIndex - Math.floor(dotCount / 2),
      actionCount - dotCount
    )
  );
  const visibleIndexes = useMemo(
    () => Array.from({ length: dotCount }, (_, index) => dotStart + index),
    [dotCount, dotStart]
  );

  if (actionCount <= 0) return null;

  const goTo = index => onNavigate?.((index + actionCount) % actionCount);

  return (
    <section className="vsr-action-navigator" aria-label="Action navigation">
      <div className="vsr-action-navigator__controls">
        <IconButton
          className="vsr-action-navigator__arrow"
          icon="chevron_left"
          label="Previous action"
          variant="secondary"
          size="lg"
          disabled={actionCount <= 1}
          onClick={() => goTo(safeActiveIndex - 1)}
        />
        <div className="vsr-action-navigator__pagination" role="group" aria-label="Choose a nearby action">
          {visibleIndexes.map(index => (
            <button
              key={index}
              type="button"
              className="vsr-action-navigator__page"
              aria-label={`Go to action ${index + 1} of ${actionCount}`}
              aria-current={index === safeActiveIndex ? 'step' : undefined}
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
          onClick={() => goTo(safeActiveIndex + 1)}
        />
      </div>

    </section>
  );
}
