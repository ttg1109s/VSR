import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalEngineHost } from '../engine/LocalEngineHost.js';
import { JsonClient } from '../client/adapters/JsonClient.js';
import { JsonProtocol } from '../protocol/JsonProtocol.js';

test('scenario inspection returns validated metadata without initializing or mutating the Engine', async () => {
  const host = new LocalEngineHost();
  const client = new JsonClient(host);
  try {
    const scenario = JSON.parse(host.getDemoScenario());
    const revisionBefore = host.engine.protocol.stateRevision;
    const acknowledgement = await client.inspectScenario(scenario);

    assert.equal(acknowledgement.ok, true);
    assert.equal(acknowledgement.result.metadata.title, scenario.meta.title);
    assert.equal(acknowledgement.result.metadata.writer, scenario.meta.writer);
    assert.equal(acknowledgement.result.metadata.ageRating, scenario.meta.ageRating);
    assert.equal(acknowledgement.result.summary.sceneCount, Object.keys(scenario.scenes).length);
    assert.equal(host.engine.src, null);
    assert.equal(host.engine.state.sceneId, '');
    assert.equal(host.engine.protocol.stateRevision, revisionBefore);
    assert.equal(client.getSnapshot(), null);

    await assert.rejects(
      client.inspectScenario({ meta: {} }),
      error => error.code === 'INVALID_SCENARIO'
    );
    assert.equal(host.engine.src, null);
    assert.equal(host.engine.protocol.stateRevision, revisionBefore);
  } finally {
    client.dispose();
    host.close();
  }
});

test('browser client consumes JSON snapshots and only the active router projection', async () => {
  const host = new LocalEngineHost();
  const client = new JsonClient(host);
  try {
    const snapshot = await client.initialize(JSON.parse(host.getDemoScenario()));
    assert.equal(snapshot.game.sceneId, 'scene_village_square');
    assert.equal(snapshot.game.routerId, 'router_square_fogbound');
    assert.deepEqual(snapshot.presentation.actions.map(action => action.id), [
      'action_read_notice', 'action_talk_mai', 'action_enter_well', 'action_travel_inn',
      'action_travel_chapel', 'action_travel_school', 'action_travel_forest', 'action_decode_broadcast'
    ]);
    assert.equal(snapshot.presentation.actions.some(action => action.id === 'action_inspect_well'), false);
    assert.equal(Object.hasOwn(snapshot, 'source'), false);
    assert.equal(Object.hasOwn(snapshot.state.session || {}, 'passwordChallenge'), false);

    const events = [];
    client.subscribe(message => events.push(message));
    await client.markActionRead('scene_village_square_router_square_fogbound_action_read_notice');
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
    await client.markActionRead('scene_village_square_router_square_fogbound_action_read_notice');
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


test('snapshot.get refreshes the client projection without changing Engine state revision', async () => {
  const host = new LocalEngineHost();
  const client = new JsonClient(host);
  try {
    await client.initialize(JSON.parse(host.getDemoScenario()));
    const revisionBefore = host.engine.protocol.stateRevision;
    const refreshed = await client.refreshSnapshot();
    assert.equal(refreshed.type, 'snapshot');
    assert.equal(refreshed.stateRevision, revisionBefore);
    assert.equal(host.engine.protocol.stateRevision, revisionBefore);
    assert.equal(refreshed.presentation.actions[0].key, 'scene_village_square_router_square_fogbound_action_read_notice');
  } finally {
    client.dispose();
    host.close();
  }
});


test('password challenge projection exposes safe hints but never password answers or maze solution', () => {
  const engine = {
    state: {
      sceneId: 'scene-a',
      scenes: { 'scene-a': { activeRouterId: 'router-a' } },
      session: { passwordChallenge: { answer: 'must-not-leak' } },
      sceneTree: {}
    },
    src: {
      meta: { title: 'Test' },
      scenes: { 'scene-a': { routers: { 'router-a': {} } } },
      passwords: {
        find_way: {
          maze: {
            desc: 'Find the exit',
            area: [2, 2],
            start: [0, 0],
            target: [1, 1],
            street: [[0, 0], [1, 0], [1, 1]],
            value: 'private-answer'
          }
        }
      }
    },
    pendingPasswordAction: {
      challengeId: 'challenge-a', type: 'find_way', passwordId: 'maze',
      actionId: 'open', uniqueId: 'scene-a_router-a_open',
      sceneId: 'scene-a', routerId: 'router-a', status: 'active',
      countTest: 1, retryMax: 3, deadlineAt: null
    },
    chatState: {},
    getEffectiveActions: () => []
  };
  const snapshot = new JsonProtocol().createSnapshot(engine);
  assert.deepEqual(snapshot.session.passwordChallenge.findWay, {
    area: [2, 2], start: [0, 0], target: [1, 1]
  });
  assert.equal(snapshot.session.passwordChallenge.remainingAttempts, 2);
  assert.equal(snapshot.session.passwordChallenge.description, 'Find the exit');
  const serialized = JSON.stringify(snapshot);
  assert.equal(serialized.includes('must-not-leak'), false);
  assert.equal(serialized.includes('private-answer'), false);
  assert.equal(serialized.includes('street'), false);
});


test('Contact consumes the live, read-only character projection from Engine snapshots', async () => {
  const host = new LocalEngineHost();
  const client = new JsonClient(host);
  try {
    const snapshot = await client.initialize(JSON.parse(host.getDemoScenario()));
    const player = snapshot.presentation.player;
    const mai = snapshot.presentation.contacts.find(contact => contact.id === 'mai');

    assert.ok(player);
    assert.equal(player.id, snapshot.state.faker?.active
      ? snapshot.state.faker.targetId
      : snapshot.state.entryCharacter);
    assert.ok(mai);
    assert.equal(mai.name, 'Mai');
    assert.equal(mai.presence, 'present');
    assert.ok(mai.stats.trust);
    assert.ok(Array.isArray(mai.relationship));
    assert.equal(snapshot.presentation.contacts.some(contact => contact.id === player.id), false);

    const received = [];
    const unsubscribe = client.subscribe(message => {
      if (message.type === 'state') received.push(message.snapshot);
    });
    host.engine.state.characters.mai.stats.trust.current = 4;
    host.engine.commitState('contact.profile.updated');

    const updated = client.getSnapshot().presentation.contacts.find(contact => contact.id === 'mai');
    assert.equal(updated.stats.trust.current, 4);
    assert.equal(received.at(-1).presentation.contacts.find(contact => contact.id === 'mai').stats.trust.current, 4);
    unsubscribe();
  } finally {
    client.dispose();
    host.close();
  }
});
