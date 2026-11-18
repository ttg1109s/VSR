import test from 'node:test';
import assert from 'node:assert/strict';
import { filterNotifications, getNotificationGroup } from '../src/features/notifications/notificationFilters.js';

test('notification grouping classifies Engine and action sources as System', () => {
  for (const source of ['engine', 'action', 'global', 'system', 'ACTION']) {
    assert.equal(getNotificationGroup({ source }), 'system', source);
  }
});

test('notification grouping classifies scenario and Story categories as Story', () => {
  for (const notification of [
    { source: 'scenario' },
    { source: 'Scenario' },
    { source: 'story' },
    { source: 'scenario', category: 'quest.updated' },
    { source: 'engine', category: 'story.quest' },
    { source: 'engine', category: 'scenario.notify' }
  ]) {
    assert.equal(getNotificationGroup(notification), 'story');
  }
});

test('System and Story filters return disjoint notification groups', () => {
  const notifications = [
    { id: 'engine', source: 'engine', read: false },
    { id: 'action', source: 'action', read: true },
    { id: 'story', source: 'scenario', read: false },
    { id: 'story-category', source: 'engine', category: 'story.quest', read: false }
  ];
  assert.deepEqual(filterNotifications(notifications, 'system').map(item => item.id), ['engine', 'action']);
  assert.deepEqual(filterNotifications(notifications, 'story').map(item => item.id), ['story', 'story-category']);
  assert.deepEqual(filterNotifications(notifications, 'unread').map(item => item.id), ['engine', 'story', 'story-category']);
  assert.equal(filterNotifications(notifications, 'all').length, 4);
});
