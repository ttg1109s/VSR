import test from 'node:test';
import assert from 'node:assert/strict';
import { filterNotifications, getNotificationGroup } from '../src/features/notifications/notificationFilters.js';

test('notification grouping classifies Engine and action sources as System', () => {
  for (const source of ['engine', 'action', 'global', 'system', 'ACTION', '', null]) {
    assert.equal(getNotificationGroup({ source }), 'system', String(source));
  }
});

test('notification grouping classifies Story and Scenario source/category namespaces', () => {
  for (const notification of [
    { source: 'scenario' },
    { source: 'Scenario' },
    { source: ' story ' },
    { source: 'scenario.effect' },
    { source: 'story.quest' },
    { source: 'scenario', category: 'quest.updated' },
    { source: 'engine', category: 'story' },
    { source: 'engine', category: 'scenario' },
    { source: 'engine', category: 'story.quest' },
    { source: 'engine', category: 'scenario.notify' },
    { source: 'engine', category: ' STORY.quest.updated ' }
  ]) {
    assert.equal(getNotificationGroup(notification), 'story', JSON.stringify(notification));
  }
});

test('unrelated category namespaces remain System unless the source is Story', () => {
  for (const notification of [
    { source: 'engine', category: 'quest.updated' },
    { source: 'action', category: 'action.not_read' },
    { source: 'engine', category: 'system.warning' },
    { category: 'storyline.updated' }
  ]) {
    assert.equal(getNotificationGroup(notification), 'system', JSON.stringify(notification));
  }
});

test('System and Story filters return disjoint notification groups', () => {
  const notifications = [
    { id: 'engine', source: 'engine', read: false },
    { id: 'action', source: 'action', read: true },
    { id: 'story', source: 'scenario', read: false },
    { id: 'story-category', source: 'engine', category: 'story.quest', read: false },
    { id: 'scenario-category', source: 'engine', category: 'scenario', read: true }
  ];
  assert.deepEqual(filterNotifications(notifications, 'system').map(item => item.id), ['engine', 'action']);
  assert.deepEqual(filterNotifications(notifications, 'story').map(item => item.id), ['story', 'story-category', 'scenario-category']);
  assert.deepEqual(filterNotifications(notifications, 'unread').map(item => item.id), ['engine', 'story', 'story-category']);
  assert.equal(filterNotifications(notifications, 'all').length, 5);
});
