import React from 'react';

const cx = (...values) => values.filter(Boolean).join(' ');

export function ContactWorkspace({ children, className, ...props }) {
  return <div className={cx('vsr-contact-workspace', className)} {...props}>{children}</div>;
}

export function ContactList({ children, className, ...props }) {
  return <aside className={cx('vsr-contact-list', className)} {...props}>{children}</aside>;
}

export function ContactDetail({ children, className, ...props }) {
  return <main className={cx('vsr-contact-detail', className)} {...props}>{children}</main>;
}

export function ContactListItem({ selected = false, children, className, ...props }) {
  return (
    <button
      type="button"
      className={cx('vsr-contact-list-item', selected && 'is-selected', className)}
      aria-current={selected ? 'true' : undefined}
      {...props}
    >
      {children}
    </button>
  );
}

export function ContactAvatar({ name, avatar, size = 'md', className }) {
  const initials = (name || '?').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?';
  return (
    <span className={cx('vsr-contact-avatar', size === 'lg' && 'vsr-contact-avatar--lg', className)} aria-hidden="true">
      {avatar ? <img src={avatar} alt="" /> : initials}
    </span>
  );
}

export function ContactHeader({ children, className, ...props }) {
  return <header className={cx('vsr-contact-header', className)} {...props}>{children}</header>;
}

export function ContactScrollArea({ children, className, ...props }) {
  return <div className={cx('vsr-contact-scroll-area', className)} {...props}>{children}</div>;
}

export function ContactSection({ children, className, ...props }) {
  return <section className={cx('vsr-contact-section', className)} {...props}>{children}</section>;
}

