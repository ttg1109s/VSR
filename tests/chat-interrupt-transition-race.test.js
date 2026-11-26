import test from 'node:test';
import assert from 'node:assert/strict';
import { importModules } from './imports/index.js';
const __testModules = await importModules(["ChatSystem"]);
const { ChatSystem } = __testModules.ChatSystem;

function makeHarness({ jump = 'A_target' } = {}) {
  const state = {
    session: { active: true, id: 'A', blockId: 'A_choice', index: 0, waitingChoice: true, transitionPending: false, transitionToken: 0 },
    chatData: { set: { read: false, step: 0, bookmark: ['A_choice'] }, block: { A_choice: {}, A_target: {} } },
    history: [],
    getSession() { return structuredClone(this.session); },
    update(path, fn, opts) {
      if (path === 'session.chat') this.session = fn(structuredClone(this.session));
      else if (path === 'chat.data') this.chatData = fn(structuredClone(this.chatData));
      else if (path === 'chat.history') this.history = fn(structuredClone(this.history));
    },
    getSnapshot(path, opts) {
      if (path === 'chat.data' && opts?.id === 'A') return structuredClone(this.chatData);
      if (path === 'chat.data' && opts?.id === 'B') return { set: { read: false, bookmark: [], step: 0 }, block: { B_start: {} } };
      if (path === 'chat.history') return [];
      return undefined;
    },
    getRuntimeSnapshot() { return {}; },
    get(path) { return path === 'sceneId' ? 'scene' : undefined; },
    set(path, value) { if (path === 'session.chat') this.session = structuredClone(value); }
  };
  const timers = [];
  const killed = [];
  const h = Object.create(ChatSystem);
  h.taskManager = { kill(id) { killed.push(id); } };
  h.api = {
    engine: { state },
    presentation: {
      chat: { renderBubble() {}, clearChoices() {}, renderContactList() {}, viewRequested() {}, renderChatHistory() {} },
      navigation: { setBlocking() {}, switchScreen() {}, selectContact() {}, openThread() {} },
      refresh() {}, components: { inputBar() {} }
    }
  };
  h.src = { chat: { A: { block: { A_choice: {}, A_target: {} } }, B: { meta: { entry: 'B_start' }, block: { B_start: {} } } } };
  h.getChatOwner = () => 'owner';
  h.resolveBlock = (chatId, blockId) => ({ id: blockId, choices: [{ id: 'choice1', text: 'Pick', jump }] });
  h._getCurrentIdentityKey = () => 'player';
  h.scheduleDelay = (ms, cb, id) => { timers.push({ ms, cb, id }); return id; };
  h.processChatBlock = () => { h.processed = true; };
  h.toggleChatOverlay = () => {};
  h.commitState = () => {};
  h.endChat = () => { h.ended = true; state.session.active = false; state.chatData.set.read = true; };
  h.chatState = state.session;
  // ChatSystem accesses chatState as a live getter in the real engine; mock it likewise.
  Object.defineProperty(h, 'chatState', { configurable: true, get: () => state.session });
  return { h, state, timers, killed };
}

test('stale jump transition from A cannot mutate active chat B', async () => {
  const { h, state, timers } = makeHarness({ jump: 'A_target' });
  await h.selectChatChoice(0);
  assert.equal(timers.length, 1);
  assert.equal(state.session.id, 'A');
  // Interrupt: starting B invalidates A's token and transition timer.
  const tokenB = h.invalidateChatTransition();
  state.session = { active: true, id: 'B', blockId: 'B_start', index: 0, waitingChoice: false, transitionPending: false, transitionToken: tokenB };
  timers[0].cb();
  assert.equal(state.session.id, 'B');
  assert.equal(state.session.blockId, 'B_start');
  assert.equal(h.processed, undefined);
});

test('stale end transition from A cannot end or mark B read', async () => {
  const { h, state, timers } = makeHarness({ jump: null });
  await h.selectChatChoice(0);
  assert.equal(timers.length, 1);
  const tokenB = h.invalidateChatTransition();
  state.session = { active: true, id: 'B', blockId: 'B_start', index: 0, waitingChoice: false, transitionPending: false, transitionToken: tokenB };
  timers[0].cb();
  assert.equal(h.ended, undefined);
  assert.equal(state.session.active, true);
  assert.equal(state.session.id, 'B');
  assert.equal(state.chatData.set.read, false);
});

test('new chat invalidation kills chat_transition and advances token', () => {
  const { h, killed } = makeHarness();
  const before = h._chatTransitionToken;
  const after = h.invalidateChatTransition();
  assert.ok(after > before);
  assert.deepEqual(killed, ['chat_transition']);
});


test('stress: 1000 stale jump and 1000 stale end callbacks are rejected', async () => {
  for (let i = 0; i < 1000; i++) {
    const { h, state, timers } = makeHarness({ jump: 'A_target' });
    await h.selectChatChoice(0);
    const tokenB = h.invalidateChatTransition();
    state.session = { active: true, id: 'B', blockId: `B_start_${i}`, index: 0, waitingChoice: false, transitionPending: false, transitionToken: tokenB };
    timers[0].cb();
    assert.equal(state.session.id, 'B');
    assert.equal(state.session.blockId, `B_start_${i}`);
    assert.equal(h.processed, undefined);
  }
  for (let i = 0; i < 1000; i++) {
    const { h, state, timers } = makeHarness({ jump: null });
    await h.selectChatChoice(0);
    const tokenB = h.invalidateChatTransition();
    state.session = { active: true, id: 'B', blockId: `B_start_${i}`, index: 0, waitingChoice: false, transitionPending: false, transitionToken: tokenB };
    timers[0].cb();
    assert.equal(h.ended, undefined);
    assert.equal(state.session.id, 'B');
    assert.equal(state.chatData.set.read, false);
  }
});


test('opening B through startChat invalidates and kills A transition timer', () => {
  const { h, state, killed } = makeHarness();
  const oldToken = h._chatTransitionToken;
  h.startChat('B');
  assert.ok(h._chatTransitionToken > oldToken);
  assert.equal(state.session.id, 'B');
  assert.deepEqual(killed, ['chat_transition']);
});
