import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalEngineHost } from '../engine/LocalEngineHost.js';
import { JsonClient } from '../client/adapters/JsonClient.js';
import { validateScenario } from '../engine/scenario/Scenario.js';

function prepareThread(host, sender, lineSpeaker = sender) {
  const chatId = 'chat_mai';
  const source = structuredClone(host.engine.src.chat[chatId]);
  source.meta.sender = sender;
  source.block.start.line[0].char_id = lineSpeaker;
  host.engine.src.chat[chatId] = source;

  const runtime = structuredClone(host.engine.state.chats[chatId]);
  runtime.meta.sender = sender;
  runtime.block.start.line[0].char_id = lineSpeaker;
  runtime.set = {
    ...(runtime.set || {}),
    activationTime: Date.now() - 1000,
    lastInteraction: Date.now() - 500,
    read: true,
    bookmark: [],
    step: 0
  };
  host.engine.state.chats[chatId] = runtime;
  host.engine.state.chatHistory[chatId] = [];
  host.engine.commitState('test.system-chat-sender');
  return chatId;
}

test('scenario accepts the built-in Communication sender and undeclared senders as unknown', () => {
  const host = new LocalEngineHost();
  try {
    const scenario = JSON.parse(host.getDemoScenario());
    scenario.chat.chat_mai.meta.sender = '$communication';
    assert.deepEqual(validateScenario(scenario), []);

    scenario.chat.chat_mai.meta.sender = 'anonymous_publisher';
    scenario.chat.chat_mai.block.start.line[0].char_id = 'anonymous_publisher';
    assert.deepEqual(validateScenario(scenario), []);

    scenario.chat.chat_mai.meta.sender = null;
    scenario.chat.chat_mai.block.start.line[0].char_id = null;
    assert.deepEqual(validateScenario(scenario), []);
  } finally {
    host.close();
  }
});

test('Communication is projected separately from characters and can open its own thread', async () => {
  const host = new LocalEngineHost();
  const client = new JsonClient(host);
  try {
    await client.initialize(JSON.parse(host.getDemoScenario()));
    const chatId = prepareThread(host, '$communication', '$communication');
    const snapshot = await client.refreshSnapshot();

    assert.equal(snapshot.presentation.contacts.some(contact => contact.id === '$communication'), false);
    const communication = snapshot.presentation.systemContacts.find(contact => contact.id === '$communication');
    assert.ok(communication);
    assert.equal(communication.name, 'Communication');
    assert.ok(communication.threads.some(thread => thread.id === chatId));

    await client.openChatThread('$communication', chatId);
    assert.equal(client.getSnapshot().session.chat.contactId, '$communication');
    assert.equal(client.getSnapshot().session.chat.id, chatId);
  } finally {
    client.dispose();
    host.close();
  }
});

test('null and undeclared senders are grouped under Unknown / Spam, not as characters', async () => {
  const host = new LocalEngineHost();
  const client = new JsonClient(host);
  try {
    await client.initialize(JSON.parse(host.getDemoScenario()));
    const chatId = prepareThread(host, 'unregistered_source', 'unregistered_source');
    const snapshot = await client.refreshSnapshot();

    assert.equal(snapshot.presentation.contacts.some(contact => contact.id === 'unregistered_source'), false);
    const unknown = snapshot.presentation.systemContacts.find(contact => contact.id === 'spam');
    assert.ok(unknown);
    assert.equal(unknown.name, 'Unknown / Spam');
    assert.ok(unknown.threads.some(thread => thread.id === chatId));

    await client.openChatThread('spam', chatId);
    assert.equal(client.getSnapshot().session.chat.contactId, 'spam');
    assert.equal(client.getSnapshot().session.chat.id, chatId);
  } finally {
    client.dispose();
    host.close();
  }
});
