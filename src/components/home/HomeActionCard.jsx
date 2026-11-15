import React from 'react';
import { Button } from '../../design-system/index.js';

export default function HomeActionCard({
  icon,
  title,
  description,
  variant = 'primary',
  onClick
}) {
  return (
    <Button
      className="home-action-card"
      variant={variant}
      size="lg"
      leadingIcon={<span className="vsr-icon" aria-hidden="true">{icon}</span>}
      onClick={onClick}
    >
      <span className="home-action-card__content">
        <span className="home-action-card__title">{title}</span>
        <span className="home-action-card__description">{description}</span>
      </span>
    </Button>
  );
}
