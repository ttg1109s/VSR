const STORY_GROUP_VALUES = new Set(['story', 'scenario']);

function isStorySource(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return false;
  const namespace = normalized.split('.', 1)[0];
  return STORY_GROUP_VALUES.has(namespace);
}

export function getNotificationGroup(notification) {
  // Source is the trusted emitter identity. Category is descriptive metadata
  // and must never promote an Engine notification into the Story group.
  return isStorySource(notification?.source) ? 'story' : 'system';
}

export function filterNotifications(notifications, filter) {
  return notifications.filter(notification => {
    if (filter === 'unread' && notification.read) return false;
    if (filter === 'story' && getNotificationGroup(notification) !== 'story') return false;
    if (filter === 'system' && getNotificationGroup(notification) !== 'system') return false;
    return true;
  });
}
