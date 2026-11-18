import test from 'node:test';
import assert from 'node:assert/strict';
import { filterNotifications, getNotificationGroup } from '../src/features/notifications/notificationFilters.js';

test('notification grouping classifies trusted Story and Scenario sources as Story', () => {
  for (const source of ['scenario', 'Scenario', ' story ', 'scenario.effect', 'story.quest']) {
    assert.equal(getNotificationGroup({ source }), 'story', String(source));
  }
});

test('Engine and unknown sources remain System regardless of category', () => {
  for (const notification of [
    { source: 'engine', category: 'story' },
    { source: 'engine', category: 'scenario.notify' },
    { source: 'action', category: 'story.quest' },
    { source: 'global', category: 'scenario' },
    { source: '', category: 'story' },
    { category: 'scenario.notify' },
    { source: 'storyline', category: 'quest.updated' }
  ]) {
    assert.equal(getNotificationGroup(notification), 'system', JSON.stringify(notification));
  }
});

test('unrelated Engine categories remain System', () => {
  for (const notification of [
    { source: 'engine', category: 'quest.updated' },
    { source: 'action', category: 'action.not_read' },
    { source: 'engine', category: 'system.warning' }
  ]) {
    assert.equal(getNotificationGroup(notification), 'system', JSON.stringify(notification));
  }
});

test('System and Story filters are disjoint and category cannot spoof Story origin', () => {
  const notifications = [
    { id: 'engine', source: 'engine', read: false },
    { id: 'action', source: 'action', read: true },
    { id: 'story', source: 'scenario', read: false },
    { id: 'engine-story-category', source: 'engine', category: 'story.quest', read: false },
    { id: 'action-scenario-category', source: 'action', category: 'scenario', read: true }
  ];
  assert.deepEqual(filterNotifications(notifications, 'system').map(item => item.id), ['engine', 'action', 'engine-story-category', 'action-scenario-category']);
  assert.deepEqual(filterNotifications(notifications, 'story').map(item => item.id), ['story']);
  assert.deepEqual(filterNotifications(notifications, 'unread').map(item => item.id), ['engine', 'story', 'engine-story-category']);
  assert.equal(filterNotifications(notifications, 'all').length, 5);
});
