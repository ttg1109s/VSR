import { importModules } from './imports/index.js';
const __testModules = await importModules(["NotificationSystem","StatsHelpers","ItemStrategies"]);
const { NotificationSystem } = __testModules.NotificationSystem;
const { StatsHelpers } = __testModules.StatsHelpers;
const { ItemStrategies } = __testModules.ItemStrategies;

import test from 'node:test';
import assert from 'node:assert/strict';



const makeProtocol = () => {
  const events = [];
  return { events, publish(event, payload) { const record = { event, payload }; events.push(record); return record; } };
};

test('hand limit zero means unlimited instead of falling back to ten', async () => {
  const updates = [];
  const engine = {
    getConfig: key => key === 'maxHandOn' ? 0 : undefined,
    getOwnerId: () => 'player',
    api: {
      engine: { state: {
        getRuntimeSnapshot: path => path === 'characters.[id]' ? { inventory: ['i1','i2','i3','i4','i5','i6','i7','i8','i9','i10','i11'], hand: [] } : undefined,
        update: (path, updater) => updates.push(updater([]))
      }},
      presentation: { components: { explorer() {} } },
      notifications: { notify() {}, add() {} }
    }
  };
  await ItemStrategies.hand_on(engine, { target: 'i11', notify: false }, {});
  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0], ['i11']);
});

test('max reduction notification reports both max and clamped current changes', () => {
  const calls = [];
  const engine = {
    api: {
      notifications: { notify: payload => calls.push(payload) },
      engine: { state: { getRuntime: () => 'player' } },
      presentation: { components: { updatePlayerCard() {} }, updateContactDetails() {} }
    }
  };
  const target = { name: 'Player', stats: { hp: { current: 90, max: 100, label: 'HP' } } };
  const ok = StatsHelpers.edit_value(target, { property: 'hp', field: 'max', mode: 'set', value: 50, notify: true }, true, 'player', engine);
  assert.equal(ok, true);
  assert.deepEqual({ current: target.stats.hp.current, max: target.stats.hp.max }, { current: 50, max: 50 });
  assert.equal(calls[0].level, 'danger');
  assert.equal(calls[0].metadata.maxDelta, -50);
  assert.equal(calls[0].metadata.currentDelta, -40);
  assert.equal(calls[0].metadata.clamped, true);
  assert.match(calls[0].message, /Max 100 → 50/);
  assert.match(calls[0].message, /Current 90 → 50/);
});

test('danger and special notifications bypass category rate limit', () => {
  const protocol = makeProtocol();
  const notifications = new NotificationSystem({ protocol, clock: () => 100, maxPerWindow: 1 });
  notifications.add({ title: 'First', message: 'Accepted', source: 'engine', category: 'critical', level: 'info', dedupe: false });
  const critical = notifications.add({ title: 'Critical', message: 'Must deliver', source: 'engine', category: 'critical', level: 'danger', dedupe: false });
  assert.equal(critical.rateLimited, undefined);
  assert.equal(critical.notification.level, 'danger');
  assert.equal(notifications.getPending().length, 2);
});

test('notification object overload merges notification fields and explicit options', () => {
  const notifications = new NotificationSystem({ protocol: makeProtocol(), clock: () => 100 });
  const result = notifications.add({
    title: 'HP', message: 'Changed', level: 'success',
    category: 'stats.changed', metadata: { statId: 'hp' }, sound: false,
    dedupeKey: 'hp-change'
  }, { source: 'engine', priority: 9 });
  assert.equal(result.notification.category, 'stats.changed');
  assert.equal(result.notification.metadata.statId, 'hp');
  assert.equal(result.notification.sound, false);
  assert.equal(result.notification.priority, 9);
});

test('dedupe keys are isolated by source and category', () => {
  const notifications = new NotificationSystem({ protocol: makeProtocol(), clock: () => 100 });
  const first = notifications.add({ title: 'HP', message: 'x', category: 'stats.changed', dedupeKey: 'same', source: 'engine' });
  const otherCategory = notifications.add({ title: 'HP', message: 'x', category: 'inventory.changed', dedupeKey: 'same', source: 'engine' });
  assert.equal(first.deduplicated, false);
  assert.equal(otherCategory.deduplicated, false);
});

test('stat edit notifications report target, stat, old/new values and delta', () => {
  const calls = [];
  const engine = {
    api: {
      notifications: { notify: payload => calls.push(payload) },
      engine: { state: { getRuntime: () => 'player' } },
      presentation: { components: { updatePlayerCard() {} }, updateContactDetails() {} }
    }
  };
  const target = { name: 'Player', stats: { hp: { current: 40, max: 100, label: 'HP' } } };
  const ok = StatsHelpers.edit_value(target, { property: 'hp', value: -10, mode: 'adjust', field: 'current', notify: true }, true, 'player', engine);
  assert.equal(ok, true);
  assert.equal(target.stats.hp.current, 30);
  assert.equal(calls[0].category, 'stats.changed');
  assert.deepEqual(calls[0].metadata, {
    operation: 'adjust', targetId: 'player', statId: 'hp', statLabel: 'HP',
    field: 'current', oldValue: 40, newValue: 30, delta: -10,
    oldCurrent: 40, newCurrent: 30, oldMax: 100, newMax: 100,
    currentDelta: -10, maxDelta: 0, clamped: false
  });
  assert.equal(calls[0].level, 'danger');
});

test('add stat notification reflects clamped value and structured context', () => {
  const calls = [];
  const engine = {
    api: {
      notifications: { notify: payload => calls.push(payload) },
      engine: { state: { getRuntime: () => 'player' } },
      presentation: { components: { updatePlayerCard() {} }, updateContactDetails() {} }
    }
  };
  const target = { name: 'Player', stats: {} };
  StatsHelpers.add_stats(target, { property: 'hp', value: '-5:100:HP', notify: true }, true, 'player', engine);
  assert.equal(target.stats.hp.current, 0);
  assert.equal(calls[0].level, 'success');
  assert.equal(calls[0].metadata.newValue, 0);
  assert.equal(calls[0].metadata.targetId, 'player');
});

test('rate-limit protocol event retains attempted notification context', () => {
  const protocol = makeProtocol();
  const notifications = new NotificationSystem({ protocol, clock: () => 100, maxPerWindow: 1 });
  notifications.add({ title: 'First', message: 'Accepted', source: 'engine', category: 'stats.changed', dedupe: false });
  const blocked = notifications.add({ title: 'Second', message: 'Blocked', source: 'engine', category: 'stats.changed', metadata: { statId: 'hp' }, dedupe: false });
  assert.equal(blocked.rateLimited, true);
  const event = protocol.events.at(-1);
  assert.equal(event.event, 'presentation.notification.rateLimited');
  assert.equal(event.payload.title, 'Second');
  assert.equal(event.payload.metadata.statId, 'hp');
});
