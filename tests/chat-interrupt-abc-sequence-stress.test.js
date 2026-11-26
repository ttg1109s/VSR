import test from 'node:test';
import assert from 'node:assert/strict';
import { importModules } from './imports/index.js';
const __testModules = await importModules(["ChatSystem"]);
const { ChatSystem } = __testModules.ChatSystem;

function makeHarness() {
  const state = {
    session: { active: false, id: null, blockId: null, index: 0, waitingChoice: false, transitionPending: false, transitionToken: 0 },
    dataById: {}, historyById: {},
    getSession() { return structuredClone(this.session); },
    update(path, fn, opts) {
      if (path === 'session.chat') this.session = fn(structuredClone(this.session));
      else if (path === 'chat.data') this.dataById[opts?.id] = fn(structuredClone(this.dataById[opts?.id] || {}));
      else if (path === 'chat.history') this.historyById[opts?.id] = fn(structuredClone(this.historyById[opts?.id] || []));
    },
    getSnapshot(path, opts) {
      if (path === 'chat.data') return structuredClone(this.dataById[opts?.id] || { set: { read: false, bookmark: [], step: 0 }, block: {} });
      if (path === 'chat.history') return structuredClone(this.historyById[opts?.id] || []);
      return undefined;
    },
    getRuntimeSnapshot() { return {}; }, get(path) { return path === 'sceneId' ? 'scene' : undefined; },
    set(path, value) { if (path === 'session.chat') this.session = structuredClone(value); }
  };
  const timers = [], killed = [];
  const h = Object.create(ChatSystem);
  h.taskManager = { kill(id) { killed.push(id); } };
  h.api = { engine: { state }, presentation: {
    chat: { renderBubble() {}, clearChoices() {}, renderContactList() {}, viewRequested() {}, renderChatHistory() {} },
    navigation: { setBlocking() {}, switchScreen() {}, selectContact() {}, openThread() {} },
    refresh() {}, components: { inputBar() {} }
  }};
  h.src = { chat: {} };
  h.getChatOwner = () => 'owner';
  h.resolveBlock = (chatId, blockId) => ({ id: blockId, choices: [{ id: `${chatId}_choice`, text: `choice-${chatId}`, jump: `${chatId}_target` }] });
  h._getCurrentIdentityKey = () => 'player';
  h.scheduleDelay = (ms, cb, id) => { timers.push({ ms, cb, id }); return id; };
  h.processChatBlock = () => { h.processed = (h.processed || 0) + 1; };
  h.toggleChatOverlay = () => {}; h.commitState = () => {};
  h.endChat = () => { h.endedFor = state.session.id; state.session.active = false; };
  Object.defineProperty(h, 'chatState', { configurable: true, get: () => state.session });
  return { h, state, timers, killed };
}

test('stress sequence A B C A B C C B A A B C repeated 1000 times rejects every stale transition callback', async () => {
  const pattern = ['A','B','C','A','B','C','C','B','A','A','B','C'];
  const sequence = Array.from({ length: 1000 }, () => pattern).flat();
  const { h, state, timers } = makeHarness();
  let currentTimerIndex = 0;
  let staleRejected = 0;

  for (let i = 0; i < sequence.length; i++) {
    const id = sequence[i];
    const blockId = `${id}_start_${i}`;
    const token = h.invalidateChatTransition();
    state.session = { active: true, id, blockId, index: 0, waitingChoice: true, transitionPending: false, transitionToken: token };
    state.dataById[id] = { set: { read: false, bookmark: [blockId], step: 0 }, block: { [blockId]: {}, [`${id}_target`]: {} } };

    await h.selectChatChoice(0);
    assert.equal(state.session.id, id, `choice remains on ${id} before interrupt`);
    const timer = timers[currentTimerIndex++];

    if (i < sequence.length - 1) {
      const nextId = sequence[i + 1];
      const nextBlock = `${nextId}_start_${i + 1}`;
      const nextToken = h.invalidateChatTransition();
      state.session = { active: true, id: nextId, blockId: nextBlock, index: 0, waitingChoice: true, transitionPending: false, transitionToken: nextToken };
      const processedBeforeStale = h.processed || 0;
      timer.cb();
      assert.equal(state.session.id, nextId, `stale callback must not switch identity at sequence index ${i}`);
      assert.equal(state.session.blockId, nextBlock, `stale callback must not alter block at sequence index ${i}`);
      assert.equal(h.processed || 0, processedBeforeStale, 'stale callback must not process a block');
      staleRejected++;
    }
  }

  assert.equal(currentTimerIndex, sequence.length);
  assert.equal(staleRejected, sequence.length - 1);
  assert.equal(state.session.id, 'C');
  assert.equal(state.session.blockId, `C_start_${sequence.length - 1}`);
});
