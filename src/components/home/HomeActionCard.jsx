import React from 'react';
import { Button } from '../../design-system/index.js';

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
      layout="card"
      variant={variant}
      size="lg"
      leadingIcon={<span className="vsr-icon" aria-hidden="true">{icon}</span>}
      onClick={onClick}
      disabled={disabled}
      loading={loading}
    >
      <span className="vsr-button-card__content">
        <span className="vsr-button-card__title">{title}</span>
        {description ? <span className="vsr-button-card__description">{description}</span> : null}
      </span>
    </Button>
  );
}
