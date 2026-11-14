import test from 'node:test';
import assert from 'node:assert/strict';
import { createStateAccess, StatePathError } from './StateAccess.js';

function makeEngine() {
  return {
    src: {
      meta: { tags: ['one', 'two'], title: 'Source title' },
      scenes: { hall: { meta: { title: 'Hall' }, routers: { north: { actions: ['open'] } } } },
      chat: { note: { meta: { sender: 'npc', title: 'Message' } } },
      actions: { open: { meta: { title: 'Open' }, set: { type: 'scene' } } },
      passwords: { number: { door: { value: 1234 } } },
      endings: { good: { title: 'Good ending' } }
    },
    state: {
      meta: { title: 'Runtime title' },
      config: { minTransition: 3 },
      global: { score: { type: 'number', value: 42 } },
      scenes: { hall: { activeRouterId: 'north', blocked: true, transition: 'fade' } },
      routers: { 'hall_north': { blocked: false, visited: true, countVisited: 2, timer: true } },
      actions: { 'hall_north_open': { countClicks: 5, display: 'show' } },
      chats: { note: { set: { bookmark: ['intro'] } } },
      chatHistory: { note: [{ text: 'hello' }] },
      characters: { player: { meta: { name: 'Player' }, stats: { hp: { current: 7, max: 10 } }, place: { scene_id: 'hall', currentIndex: 1 } } },
      itemInfo: { key: { usage: { current: 1, max: 3 } } },
      automations: { patrol: { active: true, stepIndex: 2 } }
    },
    chatState: { active: true, id: 'note' },
    pendingPasswordAction: { actionId: 'open' }
  };
}

test('resolves source, runtime and session namespaces independently', () => {
  const engine = makeEngine(), state = createStateAccess(engine);
  assert.equal(state.get('scene.title', { id: 'hall' }), 'Hall');
  assert.equal(state.get('scene.blocked', { id: 'hall' }), true);
  assert.equal(state.get('session.chat').id, 'note');
  assert.equal(state.get('session.passwordChallenge').actionId, 'open');
});

test('maps legacy global and scene keys to the normalized runtime shape', () => {
  const state = createStateAccess(makeEngine());
  assert.equal(state.get('globalState.value', { id: 'score' }), 42);
  assert.equal(state.get('globalState.type', { id: 'score' }), 'number');
  assert.equal(state.get('scene.activeRouterId', { id: 'hall' }), 'north');
  assert.equal(state.get('scene.blocked', { id: 'hall' }), true);
});

test('resolves flattened router and action runtime keys', () => {
  const state = createStateAccess(makeEngine());
  assert.equal(state.get('router.blocked', { sceneId: 'hall', routerId: 'north' }), false);
  assert.equal(state.get('router.visited', { sceneId: 'hall', routerId: 'north' }), true);
  assert.equal(state.get('action.countClicks', { id: 'open', sceneId: 'hall', routerId: 'north' }), 5);
});

test('keeps scenario definitions separate from runtime progress', () => {
  const state = createStateAccess(makeEngine());
  assert.equal(state.get('chat.sender', { id: 'note' }), 'npc');
  assert.equal(state.get('chat.data', { id: 'note' }).set.bookmark[0], 'intro');
  assert.equal(state.get('chat.history', { id: 'note' })[0].text, 'hello');
  assert.equal(state.get('pass.number.value', { id: 'door' }), 1234);
  assert.equal(state.get('ending.title', { id: 'good' }), 'Good ending');
});

test('supports explicit namespace access and arbitrary runtime paths', () => {
  const state = createStateAccess(makeEngine());
  assert.equal(state.get('title'), 'Runtime title');
  assert.equal(state.get('meta.title', {}, { namespace: 'source' }), 'Source title');
  assert.equal(state.getFrom('runtime', 'characters.[id].stats.[statId].current', { id: 'player', statId: 'hp' }), 7);
  assert.equal(state.getSource('meta.tags.[idx]', { idx: 1 }), 'two');
  assert.equal(state.getRuntime('itemInfo.key.usage.max'), 3);
  assert.equal(state.has('missing.path'), false);
});

test('reports missing placeholder context and invalid namespaces', () => {
  const state = createStateAccess(makeEngine());
  assert.throws(() => state.getFrom('runtime', 'characters.[id].meta.name'), StatePathError);
  assert.throws(() => state.getFrom('unknown', 'anything'), StatePathError);
});

test('keeps access isolated per engine instance', () => {
  const first = makeEngine(), second = makeEngine();
  second.state.global.score.value = 99;
  assert.equal(createStateAccess(first).get('globalState.value', { id: 'score' }), 42);
  assert.equal(createStateAccess(second).get('globalState.value', { id: 'score' }), 99);
});
