import React, { useMemo, useState } from 'react';
import { Badge, Button, Dialog, Drawer, Input, Switch } from '../../design-system/index.js';
import './notifications.css';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'scenario', label: 'Scenario' },
  { value: 'system', label: 'System' }
];

const levelTone = level => ({
  success: 'success',
  warning: 'warning',
  danger: 'error',
  special: 'info',
  info: 'neutral'
}[level] || 'neutral');

const formatDate = timestamp => {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date);
};

const dateGroup = timestamp => {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return 'Earlier';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  if (day === today) return 'Today';
  if (day === today - 86400000) return 'Yesterday';
  return 'Earlier';
};

export default function NotificationCenter({
  open,
  notifications = [],
  client,
  onClose,
  soundEnabled = true,
  onSoundChange,
  modalNotification = null,
  onModalClose
}) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [busyIds, setBusyIds] = useState([]);
  const history = useMemo(() => [...notifications].sort((a, b) =>
    (b.createdAt || 0) - (a.createdAt || 0)
  ), [notifications]);
  const unreadCount = history.filter(item => !item.read).length;
  const visible = history.filter(item => {
    if (filter === 'unread' && item.read) return false;
    if (filter === 'scenario' && item.source !== 'scenario') return false;
    if (filter === 'system' && item.source === 'scenario') return false;
    const searchText = (item.title || '') + ' ' + (item.message || '') + ' ' + (item.category || '');
    return !query.trim() || searchText.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  });
  const groups = ['Today', 'Yesterday', 'Earlier'].map(label => ({
    label,
    items: visible.filter(item => dateGroup(item.createdAt) === label)
  })).filter(group => group.items.length > 0);

  const markRead = async id => {
    if (!client || busyIds.includes(id)) return;
    setBusyIds(current => [...current, id]);
    try {
      await client.markNotificationRead(id);
    } finally {
      setBusyIds(current => current.filter(value => value !== id));
    }
  };

  const dismiss = async id => {
    if (!client || busyIds.includes(id)) return;
    setBusyIds(current => [...current, id]);
    try {
      await client.dismissNotification(id);
    } finally {
      setBusyIds(current => current.filter(value => value !== id));
    }
  };

  const markAllRead = async () => {
    if (!client) return;
    for (const item of history) {
      if (!item.read) await client.markNotificationRead(item.id);
    }
  };

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title="Notifications"
        description={unreadCount ? unreadCount + ' unread' : 'Your notification history'}
        side="right"
        size="lg"
        className="vsr-notification-drawer"
        headerActions={
          <Button size="sm" variant="tertiary" disabled={!unreadCount} onClick={markAllRead}>
            Mark all as read
          </Button>
        }
      >
        <div className="vsr-notification-center">
          <div className="vsr-notification-center__settings">
            <Switch
              label="Notification sounds"
              description="Play a sound when a new notification arrives."
              checked={soundEnabled}
              onChange={event => onSoundChange?.(event.target.checked)}
            />
          </div>
          <Input
            aria-label="Search notifications"
            placeholder="Search notifications"
            value={query}
            onChange={event => setQuery(event.target.value)}
          />
          <div className="vsr-notification-center__filters" role="group" aria-label="Filter notifications">
            {FILTERS.map(option => (
              <button
                key={option.value}
                type="button"
                className={'vsr-notification-filter' + (filter === option.value ? ' is-active' : '')}
                aria-pressed={filter === option.value}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
                {option.value === 'unread' && unreadCount > 0 && <span>{unreadCount}</span>}
              </button>
            ))}
          </div>
          <div className="vsr-notification-center__history">
            {!visible.length && (
              <div className="vsr-notification-center__empty">
                <span className="vsr-icon" aria-hidden="true">notifications_none</span>
                <strong>{filter === 'unread' ? 'You are all caught up' : 'No notifications yet'}</strong>
                <span>{filter === 'unread' ? 'There are no unread notifications.' : 'New notifications will appear here.'}</span>
              </div>
            )}
            {groups.map(group => (
              <section className="vsr-notification-group" key={group.label} aria-label={group.label}>
                <h3>{group.label}</h3>
                {group.items.map(item => (
                  <article className={'vsr-notification-item' + (item.read ? '' : ' is-unread')} key={item.id}>
                    <div className="vsr-notification-item__marker" aria-hidden="true">
                      <span className="vsr-icon">{item.level === 'success' ? 'check_circle' : item.level === 'warning' || item.level === 'danger' ? 'warning' : item.level === 'special' ? 'auto_awesome' : 'info'}</span>
                    </div>
                    <div className="vsr-notification-item__body">
                      <div className="vsr-notification-item__heading">
                        <strong>{item.title || 'Notification'}</strong>
                        {!item.read && <Badge tone="info" size="sm">New</Badge>}
                      </div>
                      <p>{item.message}</p>
                      <div className="vsr-notification-item__meta">
                        <Badge tone={levelTone(item.level)} size="sm">{item.category || item.source || 'System'}</Badge>
                        <time dateTime={new Date(item.createdAt).toISOString()}>{formatDate(item.createdAt)}</time>
                      </div>
                      <div className="vsr-notification-item__actions">
                        {!item.read && (
                          <Button size="sm" variant="tertiary" disabled={busyIds.includes(item.id)} onClick={() => markRead(item.id)}>
                            Mark as read
                          </Button>
                        )}
                        {item.status === 'pending' && (
                          <Button size="sm" variant="tertiary" disabled={busyIds.includes(item.id)} onClick={() => dismiss(item.id)}>
                            Dismiss
                          </Button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            ))}
          </div>
          <div className="vsr-notification-center__footer">
            {visible.length} of {history.length} notifications
          </div>
        </div>
      </Drawer>
      <Dialog
        open={!!modalNotification}
        onClose={onModalClose}
        title={modalNotification?.title || 'Important notification'}
        description={modalNotification?.message || ''}
        size="sm"
      >
        <div className="vsr-notification-modal__content">
          <Badge tone={levelTone(modalNotification?.level)}>{modalNotification?.level || 'info'}</Badge>
          <div className="vsr-notification-modal__actions">
            <Button onClick={onModalClose}>Got it</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
