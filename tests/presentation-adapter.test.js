import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalEngineHost } from '../host/LocalEngineHost.js';
import { JsonClient } from '../client/adapters/JsonClient.js';

test('browser client consumes JSON snapshots and only the active router projection', async () => {
  const host = new LocalEngineHost();
  const client = new JsonClient(host);
  try {
    const snapshot = await client.initialize(JSON.parse(host.getDemoScenario()));
    assert.equal(snapshot.game.sceneId, 'scene_garden');
    assert.equal(snapshot.game.routerId, 'square_gate');
    assert.deepEqual(snapshot.presentation.actions.map(action => action.id), [
      'act_read_notice', 'act_talk_mai', 'act_enter_well', 'act_travel_inn',
      'act_travel_chapel', 'act_travel_school', 'act_travel_forest'
    ]);
    assert.equal(snapshot.presentation.actions.some(action => action.id === 'act_inspect_well'), false);
    assert.equal(Object.hasOwn(snapshot, 'source'), false);
    assert.equal(Object.hasOwn(snapshot.state.session || {}, 'passwordChallenge'), false);

    const events = [];
    client.subscribe(message => events.push(message));
    await client.markActionRead('scene_garden_square_gate_act_read_notice');
    assert.ok(events.some(message => message.type === 'state' && message.changedKeys.includes('stateRevision')));
  } finally {
    client.dispose();
    host.close();
  }
});

test('all engine-side protocol operations are exposed as JSON commands', async () => {
  const host = new LocalEngineHost();
  const client = new JsonClient(host);
  try {
    await client.initialize(JSON.parse(host.getDemoScenario()));
    await client.markActionRead('scene_garden_square_gate_act_read_notice');
    await client.useItem('item_not_present'); // no-op domain result, but command is registered
    await client.pause();
    await client.resume();

    const exported = await client.exportSave();
    assert.equal(exported.result.save.protocol, 'vsr-save');
    const restored = await client.restoreSave(exported.result.save);
    assert.equal(restored.result.restored, true);

    const notification = host.engine.notifications.add('Test', 'Message', 'info', { dedupe: false });
    assert.ok(notification.notification?.id);
    await client.dispatch('notification.read', { notificationId: notification.notification.id });
    await client.dispatch('notification.dismiss', { notificationId: notification.notification.id });
  } finally {
    client.dispose();
    host.close();
  }
});
