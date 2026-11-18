const STORY_GROUP_VALUES = new Set(['story', 'scenario']);

function isStoryNamespace(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return false;
  const namespace = normalized.split('.', 1)[0];
  return STORY_GROUP_VALUES.has(namespace);
}

export function getNotificationGroup(notification) {
  const source = String(notification?.source ?? '').trim().toLowerCase();
  const category = String(notification?.category ?? '').trim().toLowerCase();

  // Source identifies the emitter; category identifies the notification domain.
  // Either may classify a notification as Story. All other notifications are System.
  const storySource = isStoryNamespace(source);
  const storyCategory = isStoryNamespace(category);
  return storySource || storyCategory ? 'story' : 'system';
}

export function filterNotifications(notifications, filter) {
  return notifications.filter(notification => {
    if (filter === 'unread' && notification.read) return false;
    if (filter === 'story' && getNotificationGroup(notification) !== 'story') return false;
    if (filter === 'system' && getNotificationGroup(notification) !== 'system') return false;
    return true;
  });
}
