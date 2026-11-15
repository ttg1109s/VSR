import React, { useState } from 'react';
import './ScenarioCover.css';

const RATIOS = {
  '1:1': 'vsr-scenario-cover--square',
  '16:9': 'vsr-scenario-cover--landscape',
  '4:5': 'vsr-scenario-cover--portrait'
};

export default function ScenarioCover({ url, ratio, title }) {
  const [hasImageError, setHasImageError] = useState(false);
  const imageAvailable = Boolean(url) && !hasImageError;
  const ratioClass = RATIOS[ratio] || RATIOS['4:5'];

  return (
    <figure className={`vsr-scenario-cover ${ratioClass}`}>
      {imageAvailable ? (
        <img
          className="vsr-scenario-cover__image"
          src={url}
          alt={title ? `Ảnh bìa kịch bản ${title}` : 'Ảnh bìa kịch bản'}
          loading="lazy"
          decoding="async"
          onError={() => setHasImageError(true)}
        />
      ) : (
        <div
          className="vsr-scenario-cover__placeholder"
          role="img"
          aria-label="Chưa có ảnh bìa kịch bản"
        >
          <span className="vsr-icon" aria-hidden="true">image</span>
          <span>Chưa có ảnh bìa</span>
        </div>
      )}
    </figure>
  );
}
