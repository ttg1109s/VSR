export function getNotificationGroup(notification) {
  const source = String(notification?.source || '').trim().toLowerCase();
  const category = String(notification?.category || '').trim().toLowerCase();
  const storySource = source === 'scenario' || source === 'story'
    || source.startsWith('scenario.') || source.startsWith('story.');
  const storyCategory = category.startsWith('scenario.') || category.startsWith('story.');
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
