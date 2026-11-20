import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalEngineHost } from '../engine/LocalEngineHost.js';
import { JsonClient } from '../client/adapters/JsonClient.js';
import { JsonProtocol } from '../protocol/JsonProtocol.js';
async function waitForClientSnapshot(client, predicate, timeoutMs = 2000) {
  if (predicate(client.getSnapshot())) return;
  await new Promise((resolve, reject) => {
    let unsubscribe = () => {};
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error('Timed out waiting for the expected client snapshot.'));
    }, timeoutMs);
    unsubscribe = client.subscribe(message => {
      if (message.type !== 'state' || !predicate(client.getSnapshot())) return;
      clearTimeout(timeout);
      unsubscribe();
      resolve();
    });
    if (predicate(client.getSnapshot())) {
      clearTimeout(timeout);
      unsubscribe();
      resolve();
    }
  });
}


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
    assert.equal(snapshot.game.sceneId, 'scene_village');
    assert.equal(snapshot.game.routerId, 'router_village_night');
    assert.deepEqual(snapshot.presentation.actions.map(action => action.id), [
      'action_village_square', 'action_travel_inn', 'action_travel_chapel',
      'action_travel_school', 'action_travel_forest'
    ]);
    assert.equal(Object.hasOwn(snapshot, 'source'), false);
    assert.equal(Object.hasOwn(snapshot.state.session || {}, 'passwordChallenge'), false);

    const events = [];
    client.subscribe(message => events.push(message));
    await client.markActionRead('scene_village_router_village_night_action_village_square');
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
    await client.markNotificationRead(notification.notification.id);
    const secondNotification = host.engine.notifications.add('Second', 'Unread', 'info', { dedupe: false });
    const readAll = await client.markAllNotificationsRead();
    assert.equal(readAll.result.updated, 1);
    assert.equal(client.getSnapshot().session.notifications.unreadCount, 0);
    await client.dismissNotification(notification.notification.id);
    await client.dismissNotification(secondNotification.notification.id);
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
    assert.equal(refreshed.presentation.actions[0].key, 'scene_village_router_village_night_action_village_square');
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
    await client.initialize(JSON.parse(host.getDemoScenario()));
    // Contact visibility and meeting counts are scoped to the current Player Entry.
    host.engine.state.characters.player.met = ['mai:1'];
    host.engine.state.characters.mai.met = ['player:1'];
    host.engine.commitState('test.contact.seeded');
    const snapshot = client.getSnapshot();
    const player = snapshot.presentation.player;
    const mai = snapshot.presentation.contacts.find(contact => contact.id === 'mai');

    assert.ok(player);
    assert.equal(player.id, snapshot.state.faker?.active
      ? snapshot.state.faker.targetId
      : snapshot.state.entryCharacter);
    assert.ok(mai);
    assert.equal(mai.name, 'Mai');
    assert.equal(mai.presence, 'away');
    assert.ok(mai.stats.trust);
    assert.deepEqual(mai.relationshipWithPlayer, {
      hasRelationship: false,
      tag: null
    });
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



test('Contact projects only the selected character relationship with entryCharacter and its meeting count', async () => {
  const host = new LocalEngineHost();
  const client = new JsonClient(host);
  try {
    const initial = await client.initialize(JSON.parse(host.getDemoScenario()));
    const entryCharacterId = initial.state.entryCharacter;
    // Contact Profile counts meetings recorded by entryCharacter about Mai,
    // while visibility is established by Mai's record of meeting entryCharacter.
    host.engine.api.engine.state.update('characters.[id]', current => ({
      ...current,
      met: ['mai:3', 'keeper:7']
    }), { id: entryCharacterId });
    host.engine.api.engine.state.update('characters.[id]', current => ({
      ...current,
      relationship: [
        ['Người quen', 'keeper'],
        ['Đồng minh', entryCharacterId]
      ],
      met: [`${entryCharacterId}:99`, 'keeper:7']
    }), { id: 'mai' });
    host.engine.commitState('contact.relationship.updated');
    await client.refreshSnapshot();

    const projectedMai = client.getSnapshot().presentation.contacts.find(contact => contact.id === 'mai');
    assert.deepEqual(projectedMai.relationshipWithPlayer, {
      hasRelationship: true,
      tag: 'Đồng minh'
    });
    assert.equal(projectedMai.metCount, 3);
    assert.equal(Object.hasOwn(projectedMai, 'relationship'), false);

    host.engine.api.engine.state.update('characters.[id]', current => ({
      ...current,
      met: ['keeper:7']
    }), { id: entryCharacterId });
    host.engine.api.engine.state.update('characters.[id]', current => ({
      ...current,
      relationship: [['Người quen', 'keeper']],
      met: [`${entryCharacterId}:99`, 'keeper:7']
    }), { id: 'mai' });
    host.engine.commitState('contact.relationship.cleared');
    await client.refreshSnapshot();

    const withoutPlayerRelationship = client.getSnapshot().presentation.contacts.find(contact => contact.id === 'mai');
    assert.deepEqual(withoutPlayerRelationship.relationshipWithPlayer, {
      hasRelationship: false,
      tag: null
    });
    assert.equal(withoutPlayerRelationship.metCount, 0);
  } finally {
    client.dispose();
    host.close();
  }
});

test('an Action goto chat effect projects the active contact and thread for React navigation', async () => {
  const host = new LocalEngineHost();
  const client = new JsonClient(host);
  try {
    const scenario = JSON.parse(host.getDemoScenario());
    scenario.meta.entryScene = 'scene_village_square';
    const initial = await client.initialize(scenario);
    const action = initial.presentation.actions.find(item => item.id === 'action_talk_mai');
    assert.ok(action, 'the demo exposes the Mai conversation action');

    await client.markActionRead(action.key);
    await client.triggerAction(action.id, action.key);

    const snapshot = client.getSnapshot();
    assert.equal(snapshot.session.chat.active, true);
    assert.equal(snapshot.session.chat.id, 'chat_mai');
    assert.equal(snapshot.session.chat.contactId, 'mai');
    assert.ok(snapshot.session.chat.history.chat_mai.length > 0);
    const mai = snapshot.presentation.contacts.find(contact => contact.id === 'mai');
    assert.ok(mai.threads.some(thread => thread.id === 'chat_mai'));
  } finally {
    client.dispose();
    host.close();
  }
});


test('Contact exposes Engine-owned thread summaries and opens only a thread belonging to the selected contact', async () => {
  const host = new LocalEngineHost();
  const client = new JsonClient(host);
  try {
    const scenario = JSON.parse(host.getDemoScenario());
    scenario.meta.entryScene = 'scene_village_square';
    await client.initialize(scenario);
    const runtimeChat = JSON.parse(JSON.stringify(host.engine.src.chat.chat_mai));
    runtimeChat.set = {
      ...(runtimeChat.set || {}),
      activationTime: Date.now() - 1000,
      lastInteraction: Date.now() - 500,
      read: false,
      bookmark: ['start']
    };
    host.engine.state.chats.chat_mai = runtimeChat;
    host.engine.state.chatHistory.chat_mai = [{ nameID: 'mai', text: 'Tín hiệu ở tháp đã thay đổi.' }];

    const threadOnlyCharacter = JSON.parse(JSON.stringify(host.engine.state.characters.mai));
    threadOnlyCharacter.met = [];
    host.engine.state.characters.threadOnly = threadOnlyCharacter;
    const threadOnlyDefinition = JSON.parse(JSON.stringify(host.engine.src.chat.chat_mai));
    threadOnlyDefinition.meta = { ...(threadOnlyDefinition.meta || {}), sender: 'threadOnly', to: ['player'] };
    host.engine.src.chat.chat_thread_only = threadOnlyDefinition;
    const threadOnlyRuntime = JSON.parse(JSON.stringify(threadOnlyDefinition));
    threadOnlyRuntime.set = { ...(threadOnlyRuntime.set || {}), activationTime: Date.now() - 1000, lastInteraction: Date.now() - 500, read: true, bookmark: ['start'] };
    host.engine.state.chats.chat_thread_only = threadOnlyRuntime;
    host.engine.state.chatHistory.chat_thread_only = [];

    host.engine.commitState('contact.thread.available');

    const contacts = client.getSnapshot().presentation.contacts;
    assert.ok(contacts.some(contact => contact.id === 'threadOnly'), 'a character with an activated thread is listed even without met history');
    assert.ok(contacts.find(contact => contact.id === 'threadOnly').threads.some(thread => thread.id === 'chat_thread_only'));
    const mai = contacts.find(contact => contact.id === 'mai');
    assert.ok(mai);
    assert.ok(mai.threads.some(thread => thread.id === 'chat_mai'));
    assert.equal(typeof mai.threads.find(thread => thread.id === 'chat_mai').preview, 'string');

    await assert.rejects(
      client.openChatThread('hanh', 'chat_mai'),
      error => /not available for this contact/i.test(error.message)
    );

    await client.openChatThread('mai', 'chat_mai');
    assert.equal(client.getSnapshot().session.chat.id, 'chat_mai');
    assert.equal(client.getSnapshot().session.chat.active, true);
    await client.nextChat();
    await client.nextChat();
    assert.equal(client.getSnapshot().session.chat.waitingChoice, true);
    assert.equal(client.getSnapshot().session.chat.choices.length, 3);
    assert.deepEqual(client.getSnapshot().session.chat.choices.map(choice => ({
      index: choice.index,
      locked: choice.locked,
      active: choice.active,
      requirementPass: choice.requirementPass
    })), [
      { index: 0, locked: false, active: true, requirementPass: true },
      { index: 1, locked: false, active: true, requirementPass: true },
      { index: 2, locked: false, active: true, requirementPass: true }
    ]);
    assert.equal(typeof client.getSnapshot().session.chat.prompt, 'string');
    assert.equal(client.getSnapshot().session.chat.choices.some(choice => Object.hasOwn(choice, 'effect')), false);

    host.engine.api.engine.state.set('faker', {
      active: true,
      targetId: 'mai',
      mode: 'mask',
      backupPlayer: { entryCharacter: 'player' }
    });
    await client.selectChatChoice(0);
    const selectedHistory = client.getSnapshot().session.chat.history.chat_mai;
    assert.equal(selectedHistory.at(-1).nameID, 'mai');
    assert.equal(client.getSnapshot().session.chat.transitionPending, true);
    await assert.rejects(
      client.selectChatChoice(1),
      error => error.code === 'CHAT_NOT_WAITING'
    );
  } finally {
    client.dispose();
    host.close();
  }
});


test('chat action starts the umbrella follow-up without duplicating completed thread history', async () => {
  const host = new LocalEngineHost();
  const client = new JsonClient(host);
  try {
    const scenario = JSON.parse(host.getDemoScenario());
    scenario.meta.entryScene = 'scene_village_square';
    const initial = await client.initialize(scenario);
    const action = initial.presentation.actions.find(item => item.id === 'action_talk_mai');
    assert.ok(action, 'the demo exposes the Mai conversation action');

    await client.markActionRead(action.key);
    await client.triggerAction(action.id, action.key);
    assert.equal(client.getSnapshot().session.chat.mode, 'active');

    // Advance through the opening dialogue and wait for the choice transition.
    await client.nextChat();
    await client.nextChat();
    assert.equal(client.getSnapshot().session.chat.waitingChoice, true);
    await client.selectChatChoice(0);
    await waitForClientSnapshot(client, snapshot => snapshot.session.chat.active && !snapshot.session.chat.waitingChoice && !snapshot.session.chat.transitionPending);

    assert.equal(client.getSnapshot().session.chat.active, true);
    assert.equal(client.getSnapshot().session.chat.waitingChoice, false);

    // The selected route continues through the person block and its follow-up choice.
    await client.nextChat();
    assert.equal(client.getSnapshot().session.chat.waitingChoice, true);
    assert.equal(client.getSnapshot().session.chat.choices.length, 2);
    await client.selectChatChoice(0);
    await waitForClientSnapshot(client, snapshot => snapshot.session.chat.active && !snapshot.session.chat.waitingChoice && !snapshot.session.chat.transitionPending);

    assert.equal(client.getSnapshot().session.chat.active, true);
    assert.equal(client.getSnapshot().session.chat.waitingChoice, false);
    await client.nextChat();
    assert.equal(client.getSnapshot().session.chat.active, false);

    const completedHistory = structuredClone(client.getSnapshot().session.chat.history.chat_mai);
    assert.equal(completedHistory.length, 6);
    assert.deepEqual(completedHistory.map(line => line.text), [
      'Nếu loa gọi đúng tên cậu, đừng trả lời. Dù giọng nói ấy nghe quen đến đâu.',
      'Đêm sơ tán, mười hai người biến mất. Nhưng sáng hôm sau, cả làng chỉ nhớ đến mười một người. Tôi không biết ai đã bị bỏ lại trong ký ức.',
      'Cô nói mười hai người biến mất. Người thứ mười hai là ai?',
      'Tôi đã thấy người thứ mười hai đi xuống giếng. Tôi cứ nghĩ mình nhìn thấy người ấy… cho đến khi nhận ra trong ký ức, người bước xuống là tôi.',
      'Khi nói “đó là tôi”, cô muốn nói mình đã đi xuống giếng?',
      'Tôi nhớ mình đứng ở miệng giếng. Nhưng tôi không biết đó là ký ức của tôi, hay ký ức của người đã bị xóa.'
    ]);
    assert.equal(host.engine.state.chats.chat_mai.set.read, true);

    // The current demo grants the red umbrella from the first chat choice.
    // The follow-up branch is unlocked by using it, not merely receiving it.
    await client.useItem('red_umbrella');

    // After the gameplay item-use step, the reusable action opens the umbrella follow-up.
    const viewEvents = [];
    const unsubscribe = client.subscribe(message => {
      if (message.type === 'event' && message.event?.event === 'presentation.chat.viewRequested') {
        viewEvents.push(message.event.payload?.args?.[0]);
      }
    });
    await client.triggerAction(action.id, action.key);
    const reopened = client.getSnapshot();
    const reviewRequest = viewEvents.at(-1);
    assert.equal(reviewRequest?.contactId, 'mai');
    assert.equal(reviewRequest?.chatId, 'chat_mai_umbrella');
    assert.equal(reviewRequest?.mode, 'active');
    assert.ok(reviewRequest?.requestId);
    unsubscribe();
    // The follow-up is active independently; the completed earlier thread remains unchanged.
    assert.equal(reopened.session.chat.active, true);
    assert.equal(reopened.session.chat.mode, 'active');
    assert.equal(reopened.session.chat.isReview, false);
    assert.equal(reopened.session.chat.waitingChoice, false);
    assert.deepEqual(reopened.session.chat.history.chat_mai, completedHistory);
  } finally {
    client.dispose();
    host.close();
  }
});

test('reopening an unread thread resumes from saved step without replaying persisted lines', async () => {
  const host = new LocalEngineHost();
  const client = new JsonClient(host);
  try {
    const scenario = JSON.parse(host.getDemoScenario());
    scenario.meta.entryScene = 'scene_village_square';
    await client.initialize(scenario);
    const chat = JSON.parse(JSON.stringify(host.engine.src.chat.chat_mai));
    chat.set = {
      ...(chat.set || {}),
      activationTime: Date.now() - 1000,
      lastInteraction: Date.now() - 500,
      read: false,
      bookmark: ['start'],
      step: 1
    };
    host.engine.state.chats.chat_mai = chat;
    host.engine.state.chatHistory.chat_mai = [{ nameID: 'mai', text: chat.block.start.line[0].text }];
    host.engine.commitState('chat.resume.fixture');

    await client.openChatThread('mai', 'chat_mai');
    const history = client.getSnapshot().session.chat.history.chat_mai;
    assert.equal(history.length, 1);
    assert.equal(history[0].text, chat.block.start.line[0].text);
    assert.equal(client.getSnapshot().session.chat.index, 2);
    assert.equal(host.engine.state.chats.chat_mai.set.step, 2);
  } finally {
    client.dispose();
    host.close();
  }
});
