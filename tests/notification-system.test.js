import test from 'node:test';
import assert from 'node:assert/strict';
import { NotificationSystem } from '../engine/modules/Notification.js';
import { ActionSystem } from '../engine/modules/Action.js';

function makeProtocol() {
  const events = [];
  return {
    events,
    publish(event, payload) {
      const result = { event, payload };
      events.push(result);
      return result;
    }
  };
}

test('notification manager normalizes severity and preserves legacy presentation event payload', () => {
  const protocol = makeProtocol();
  let now = 1000;
  const notifications = new NotificationSystem({
    protocol, engineId: 'test-engine', clock: () => now
  });
  const result = notifications.add('Cảnh báo', 'Nội dung', 'warn', {
    source: 'action', category: 'action.blocked', duration: 1500
  });
  const event = protocol.events.at(-1);
  assert.equal(event.event, 'presentation.notification.add');
  assert.deepEqual(event.payload.args, ['Cảnh báo', 'Nội dung', 'warn']);
  assert.equal(result.notification.severity, 'warning');
  assert.equal(result.notification.source, 'action');
  assert.equal(result.notification.expiresAt, 2500);
  assert.equal(notifications.getPending().length, 1);
});

test('notification manager deduplicates, tracks read state, and expires notifications', () => {
  const protocol = makeProtocol();
  let now = 10;
  const notifications = new NotificationSystem({ protocol, clock: () => now });
  const first = notifications.add('Chưa đọc', 'Đọc mô tả', 'warn', {
    source: 'action', dedupeKey: 'action.not_read:a', duration: 100
  });
  now = 20;
  const second = notifications.add('Chưa đọc', 'Đọc mô tả', 'warn', {
    source: 'action', dedupeKey: 'action.not_read:a', duration: 100
  });
  assert.equal(second.deduplicated, true);
  assert.equal(second.notification.id, first.notification.id);
  assert.equal(notifications.getHistory().length, 1);
  assert.equal(notifications.markRead(first.notification.id), true);
  assert.equal(notifications.getHistory({ unreadOnly: true }).length, 0);
  now = 121;
  assert.equal(notifications.expire(first.notification.id), true);
  assert.equal(notifications.getPending().length, 0);
  assert.equal(notifications.getHistory()[0].status, 'expired');
});

test('notification manager prioritizes pending entries and bounds its queue', () => {
  const protocol = makeProtocol();
  const notifications = new NotificationSystem({
    protocol, maxQueue: 1, clock: () => 50
  });
  const low = notifications.add('Thông tin', 'low', 'info').notification;
  const high = notifications.add('Lỗi', 'high', 'danger').notification;
  assert.deepEqual(notifications.getPending().map(item => item.id), [high.id]);
  assert.equal(notifications.getHistory().find(item => item.id === low.id).status, 'dropped');
  assert.deepEqual(notifications.getHistory({ limit: 0 }), []);
});

test('action blocked by unread description emits a deduplicated not_read notification', async () => {
  const calls = [];
  const state = {
    get(key) {
      if (key === 'sceneId') return 'scene';
      if (key === 'scene.activeRouterId') return 'router';
      if (key === 'entryCharacter') return 'player';
      return undefined;
    },
    getRuntimeSnapshot(path) {
      if (path === 'faker') return { active: false };
      if (path === 'actions.[id]') return { readDesc: false };
      return {};
    }
  };
  const engine = {
    isActionProcessing: false,
    isTransitioning: false,
    src: { scenes: { scene: { routers: { router: {} } } } },
    api: {
      engine: { state },
      presentation: { notification: { add: (...args) => calls.push(args) } }
    },
    getEffectiveActions: () => [{
      id: 'inspect', meta: { desc: 'Description' }, set: {}
    }],
    getConfig: key => key === 'allDescRead',
    checkHardLock: () => false
  };
  const result = await ActionSystem.handleAction.call(engine, 'inspect');
  assert.deepEqual(result, { success: false, reason: 'not_read' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'Chưa đọc mô tả');
  assert.equal(calls[0][2], 'warn');
  assert.equal(calls[0][3].category, 'action.not_read');
  assert.equal(calls[0][3].dedupeKey, 'action.not_read:scene_router_inspect');
});
