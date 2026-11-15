import React from 'react';
import './HomeActionCard.css';

export default function HomeActionCard({
  icon,
  title,
  description,
  variant = 'primary',
  onClick,
  type = 'button'
}) {
  return (
    <button
      className={`home-action-card home-action-card--${variant}`}
      type={type}
      onClick={onClick}
    >
      <span className="home-action-card__heading">
        <span className="home-action-card__icon material-symbols-rounded" aria-hidden="true">
          {icon}
        </span>
        <span className="home-action-card__title">{title}</span>
      </span>
      <span className="home-action-card__description">{description}</span>
    </button>
  );
}
