import React from 'react';
import { Button } from '../../design-system/index.js';
import './HomeActionCard.css';

export default function HomeActionCard({
  icon,
  title,
  description,
  variant = 'primary',
  onClick,
  disabled = false,
  loading = false
}) {
  return (
    <Button
      className="home-action-card"
      variant={variant}
      size="lg"
      leadingIcon={<span className="vsr-icon" aria-hidden="true">{icon}</span>}
      onClick={onClick}
      disabled={disabled}
      loading={loading}
    >
      <span className="home-action-card__content">
        <span className="home-action-card__title">{title}</span>
        {description ? <span className="home-action-card__description">{description}</span> : null}
      </span>
    </Button>
  );
}
