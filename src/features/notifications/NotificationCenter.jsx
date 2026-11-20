import React, { useMemo, useRef, useState } from 'react';
import { Badge, Button, Dialog, Drawer, IconButton, Input, Popover, SegmentedControl, Switch } from '../../design-system/index.js';
import './notifications.css';
import { filterNotifications } from './notificationFilters.js';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'system', label: 'System' },
  { value: 'story', label: 'Story' }
];

const levelLabel = level => ({
  danger: 'Critical',
  warning: 'Warning',
  special: 'Special',
  success: 'Success',
  info: 'Info'
}[level] || 'Info');

const levelTone = level => ({
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  special: 'info',
  info: 'neutral'
}[level] || 'neutral');

const dateGroup = timestamp => {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return 'Earlier';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return day === today ? 'Today' : 'Earlier';
};

const formatRelativeTime = timestamp => {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return '';
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (Math.abs(seconds) < 60) return seconds >= 0 ? 'Just now' : formatter.format(seconds, 'second');
  if (Math.abs(seconds) < 3600) return formatter.format(Math.round(seconds / 60), 'minute');
  if (Math.abs(seconds) < 86400) return formatter.format(Math.round(seconds / 3600), 'hour');
  return formatter.format(Math.round(seconds / 86400), 'day');
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [busyIds, setBusyIds] = useState([]);
  const [actionError, setActionError] = useState('');
  const [markAllBusy, setMarkAllBusy] = useState(false);
  const swipeStart = useRef(null);
  const swipedItem = useRef(null);
  const history = useMemo(() => [...notifications].sort((a, b) =>
    (b.createdAt || 0) - (a.createdAt || 0)
  ).slice(0, 200), [notifications]);
  const unreadCount = history.filter(item => !item.read).length;
  const visible = filterNotifications(history, filter).filter(item => {
    const searchText = (item.title || '') + ' ' + (item.message || '') + ' ' + (item.category || '');
    return !query.trim() || searchText.toLowerCase().includes(query.trim().toLowerCase());
  });
  const groups = ['Today', 'Earlier'].map(label => ({
    label,
    items: visible.filter(item => dateGroup(item.createdAt) === label)
  })).filter(group => group.items.length > 0);

  const markRead = async id => {
    if (!client || busyIds.includes(id)) return;
    setBusyIds(current => [...current, id]);
    try {
      setActionError('');
      await client.markNotificationRead(id);
    } catch (error) {
      setActionError('Unable to update the notification. Please try again.');
    } finally {
      setBusyIds(current => current.filter(value => value !== id));
    }
  };

  const dismiss = async id => {
    if (!client || busyIds.includes(id)) return;
    setBusyIds(current => [...current, id]);
    try {
      setActionError('');
      await client.dismissNotification(id);
    } catch (error) {
      setActionError('Unable to dismiss the notification. Please try again.');
    } finally {
      setBusyIds(current => current.filter(value => value !== id));
    }
  };

  const markAllRead = async () => {
    if (!client || !unreadCount || markAllBusy) return;
    setMarkAllBusy(true);
    try {
      setActionError('');
      await client.markAllNotificationsRead();
    } catch (error) {
      setActionError('Unable to mark notifications as read. Please try again.');
    } finally {
      setMarkAllBusy(false);
    }
  };

  const settings = (
    <Switch
      label="Notification sounds"
      description="Play a sound when a new notification arrives."
      checked={soundEnabled}
      onChange={event => onSoundChange?.(event.target.checked)}
    />
  );

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        side="right"
        size="lg"
        width="560px"
        lockScroll
        contentClassName="vsr-notification-drawer__content"
        ariaLabel="Notifications"
        headerClassName="vsr-notification-center__header"
        headerContentClassName="vsr-notification-center__header-content"
        headerContent={
          <>
            <div className="vsr-notification-center__header-copy">
              <h2>Notifications</h2>
            </div>
            <div className="vsr-notification-center__header-actions">
              <Badge tone="info" size="lg" aria-label={unreadCount + ' unread notifications'}>{unreadCount} unread</Badge>
              <Popover
                align="end"
                label="Notification settings"
                trigger={<IconButton icon="tune" label="Notification settings" />}
              >
                <div className="vsr-notification-center__settings">{settings}</div>
              </Popover>
            </div>
          </>
        }
      >
        <div className="vsr-notification-center">
          <div className="vsr-notification-center__filters">
            <SegmentedControl
              label="Filter notifications"
              value={filter}
              onChange={setFilter}
              options={FILTERS.map(option => ({...option,count:option.value==='unread'?unreadCount:0}))}
            />
            <IconButton icon={searchOpen ? 'close' : 'search'} label={searchOpen ? 'Close notification search' : 'Search notifications'} aria-expanded={searchOpen} onClick={() => { setSearchOpen(value => !value); setQuery(''); }} />
          </div>
          {searchOpen && <Input aria-label="Search notifications" placeholder="Search notifications" value={query} onChange={event => setQuery(event.target.value)} />}
          {actionError && <p className="vsr-notification-center__error" role="alert">{actionError}</p>}
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
                {group.items.map(item => {
                  const tone = levelTone(item.level);
                  const timestamp = new Date(item.createdAt);
                  const validTimestamp = Number.isFinite(timestamp.getTime());
                  const canDismiss = !['dismissed', 'expired', 'cleared'].includes(item.status);
                  const handlePointerDown = event => {
                    if (!event.isPrimary || event.pointerType === 'mouse' || event.target.closest('button, a, input, [role="menu"]')) return;
                    swipeStart.current = {
                      id: item.id,
                      pointerId: event.pointerId,
                      x: event.clientX,
                      y: event.clientY
                    };
                    try {
                      event.currentTarget.setPointerCapture(event.pointerId);
                    } catch {
                      swipeStart.current = null;
                    }
                  };
                  const handlePointerUp = event => {
                    const start = swipeStart.current;
                    if (!start || start.id !== item.id || start.pointerId !== event.pointerId) return;
                    swipeStart.current = null;
                    if (!canDismiss || busyIds.includes(item.id)) return;
                    const dx = event.clientX - start.x;
                    const dy = event.clientY - start.y;
                    if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.15) {
                      swipedItem.current = item.id;
                      dismiss(item.id);
                    }
                  };
                  const handlePointerCancel = event => {
                    if (swipeStart.current?.pointerId === event.pointerId) swipeStart.current = null;
                  };

                  return (
                    <article
                      className={'vsr-notification-item' + (item.read ? '' : ' is-unread')}
                      key={item.id}
                      onPointerDown={handlePointerDown}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerCancel}
                      onLostPointerCapture={handlePointerCancel}
                      role={item.read ? undefined : 'button'}
                      tabIndex={item.read ? undefined : 0}
                      aria-label={item.read ? undefined : 'Mark ' + (item.title || 'notification') + ' as read'}
                      onClick={() => {
                        if (swipedItem.current === item.id) { swipedItem.current = null; return; }
                        if (!item.read) markRead(item.id);
                      }}
                      onKeyDown={event => {
                        if (!item.read && (event.key === 'Enter' || event.key === ' ')) {
                          event.preventDefault();
                          markRead(item.id);
                        }
                      }}
                    >
                      <div className="vsr-notification-item__body">
                        <div className="vsr-notification-item__heading">
                          <strong>{item.title || 'Notification'}</strong>
                          <Badge tone={tone} size="sm" aria-label={'Priority ' + (item.priority ?? levelLabel(item.level))}>
                            {typeof item.priority === 'number' ? 'P' + item.priority : levelLabel(item.level)}
                          </Badge>
                          {!item.read && <Badge tone={tone} size="lg">New</Badge>}
                        </div>
                        <p>{item.message}</p>
                        {validTimestamp && <time className="vsr-notification-item__timestamp" dateTime={timestamp.toISOString()}>{formatRelativeTime(timestamp)}</time>}
                      </div>
                    </article>
                  );
                })}
              </section>
            ))}
          </div>
          <div className="vsr-notification-center__footer">
            <span>Showing recent notifications</span>
            <Button variant="tertiary" loading={markAllBusy} disabled={!unreadCount || markAllBusy} onClick={markAllRead}>Mark all as read</Button>
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
