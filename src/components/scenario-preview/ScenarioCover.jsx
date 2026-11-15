import React from 'react';
import './ScenarioCover.css';

export default function ScenarioCover({ url, title }) {
  if (!url) return null;
  return (
    <figure className="vsr-scenario-cover">
      <img
        className="vsr-scenario-cover__image"
        src={url}
        alt={title ? `Ảnh bìa kịch bản ${title}` : 'Ảnh bìa kịch bản'}
        loading="lazy"
        decoding="async"
      />
    </figure>
  );
}
