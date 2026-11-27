import { importModules } from './imports/index.js';
const __testModules = await importModules(["JsonProtocol","JsonClient"]);
const { JsonProtocol } = __testModules.JsonProtocol;
const { JsonClient } = __testModules.JsonClient;

import test from 'node:test';
import assert from 'node:assert/strict';


function command(protocol, name, commandId, expectedStateRevision) {
  return protocol.createCommand(name, {}, { commandId, expectedStateRevision });
}

test('protocol idempotency is scoped to the authenticated principal', async () => {
  const protocol = new JsonProtocol();
  let calls = 0;
  protocol.registerCommand('counter.increment', async () => ({ call: ++calls }));
  const request = command(protocol, 'counter.increment', 'stable-command');

  const first = await protocol.dispatch(request, { principalId: 'alice' });
  const replay = await protocol.dispatch(request, { principalId: 'alice' });
  const otherPrincipal = await protocol.dispatch(request, { principalId: 'bob' });

  assert.equal(first.ok, true);
  assert.deepEqual(replay, first);
  assert.equal(otherPrincipal.ok, true);
  assert.equal(calls, 2);
});

test('authorization is checked before an idempotency replay can be returned', async () => {
  const protocol = new JsonProtocol({
    authorizeCommand: ({ context }) => context?.principalId === 'trusted'
  });
  protocol.registerCommand('profile.read', async () => ({ private: false }));
  const request = command(protocol, 'profile.read', 'reusable-command');

  const accepted = await protocol.dispatch(request, { principalId: 'trusted' });
  const rejected = await protocol.dispatch(request, { principalId: 'blocked' });

  assert.equal(accepted.ok, true);
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error.code, 'FORBIDDEN');
});

test('event sequence reports a gap after the bounded event log drops older events', () => {
  const protocol = new JsonProtocol({ maxEvents: 2 });
  protocol.publish('one', { value: 1 });
  protocol.publish('two', { value: 2 });

  const contiguous = protocol.getEventsAfter(0);
  assert.equal(contiguous.gap, false);
  assert.deepEqual(contiguous.events.map(event => event.sequence), [1, 2]);

  protocol.publish('three', { value: 3 });
  const missed = protocol.getEventsAfter(0);
  assert.equal(missed.gap, true);
  assert.deepEqual(missed.events, []);

  const recovered = protocol.getEventsAfter(1);
  assert.equal(recovered.gap, false);
  assert.deepEqual(recovered.events.map(event => event.sequence), [2, 3]);
});

test('dispatch queue serializes revision-checked writes', async () => {
  const protocol = new JsonProtocol();
  protocol.registerCommand('state.write', async () => {
    protocol.stateRevision += 1;
    protocol.revision = protocol.stateRevision;
    return { revision: protocol.stateRevision };
  });

  const first = command(protocol, 'state.write', 'write-one', 0);
  const second = command(protocol, 'state.write', 'write-two', 0);
  const [accepted, conflict] = await Promise.all([
    protocol.dispatch(first),
    protocol.dispatch(second)
  ]);

  assert.equal(accepted.ok, true);
  assert.equal(accepted.stateRevision, 1);
  assert.equal(conflict.ok, false);
  assert.equal(conflict.error.code, 'REVISION_CONFLICT');
  assert.equal(conflict.error.actual, 1);
});

test('JsonClient can preserve a command identity when retrying a timed-out request', async () => {
  const requests = [];
  const transport = {
    subscribe() { return () => {}; },
    async request(raw) {
      requests.push(JSON.parse(raw));
      return JSON.stringify({ ok: true, result: null });
    }
  };
  const client = new JsonClient(transport);
  try {
    await client.dispatch('action.trigger', { actionId: 'open' }, { commandId: 'retry-stable-id' });
    await client.dispatch('action.trigger', { actionId: 'open' }, { commandId: 'retry-stable-id' });
    assert.equal(requests.length, 2);
    assert.equal(requests[0].commandId, 'retry-stable-id');
    assert.equal(requests[1].commandId, 'retry-stable-id');
  } finally {
    client.dispose();
  }
});

test('JsonClient detects event sequence gaps and reconciles with a fresh snapshot', async () => {
  const listeners = new Set();
  const requests = [];
  const recoveredSnapshot = {
    engineId: 'engine-a', protocolVersion: 2, stateRevision: 2, revision: 2,
    eventSequence: 4, type: 'snapshot', game: { initialized: true }, state: {}
  };
  const transport = {
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    async request(raw) {
      requests.push(JSON.parse(raw));
      return JSON.stringify({ ok: true, result: recoveredSnapshot });
    }
  };
  const client = new JsonClient(transport);
  const messages = [];
  client.subscribe(message => messages.push(message));
  client.setSnapshot({ engineId: 'engine-a', protocolVersion: 2, stateRevision: 1, revision: 1, eventSequence: 1, game: { initialized: true }, state: {} }, 'test');
  for (const listener of listeners) listener(JSON.stringify({ type: 'event', engineId: 'engine-a', eventId: 'e2', sequence: 2, event: 'test.event', payload: {} }));
  for (const listener of listeners) listener(JSON.stringify({ type: 'event', engineId: 'engine-a', eventId: 'e4', sequence: 4, event: 'test.event', payload: {} }));
  await client.resynchronize('test-gap');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].command, 'snapshot.get');
  assert.equal(client.getSnapshot().stateRevision, 2);
  assert.ok(messages.some(message => message.type === 'synchronization.gap'));
  assert.ok(messages.some(message => message.type === 'synchronization.recovered'));
  assert.equal(messages.some(message => message.type === 'event' && message.event?.eventId === 'e4'), false, 'non-contiguous event must not be applied before reconciliation');
  client.dispose();
});

test('JsonClient ignores duplicate events and stale snapshots for the same Engine', () => {
  const listeners = new Set();
  const transport = { subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }, request: async () => '{"ok":true}' };
  const client = new JsonClient(transport);
  const messages = [];
  client.subscribe(message => messages.push(message));
  client.setSnapshot({ engineId: 'engine-a', stateRevision: 5, eventSequence: 10, state: {} }, 'initial');
  for (const listener of listeners) listener(JSON.stringify({ type: 'event', eventId: 'e10', sequence: 10, event: 'duplicate', payload: {} }));
  client.setSnapshot({ engineId: 'engine-a', stateRevision: 4, eventSequence: 8, state: {} }, 'stale');
  assert.equal(client.getSnapshot().stateRevision, 5);
  assert.ok(messages.some(message => message.type === 'event.duplicate'));
  assert.ok(messages.some(message => message.type === 'snapshot.stale'));
  client.dispose();
  client.dispose();
});

test('JsonClient resets revision and event cursor when a new Engine ID appears', () => {
  const transport = { subscribe() { return () => {}; }, request: async () => '{"ok":true}' };
  const client = new JsonClient(transport);
  const messages = [];
  client.subscribe(message => messages.push(message));
  client.setSnapshot({ engineId: 'engine-a', stateRevision: 8, eventSequence: 50, state: {} }, 'initial');
  assert.equal(client.setSnapshot({ engineId: 'engine-b', stateRevision: 0, eventSequence: 1, state: {} }, 'new-runtime'), true);
  assert.equal(client.getSnapshot().engineId, 'engine-b');
  assert.equal(client.getSnapshot().stateRevision, 0);
  assert.ok(messages.some(message => message.type === 'synchronization.engineChanged'));
  client.dispose();
});


test('JsonClient marks transport failures as unknown outcomes and preserves command identity', async () => {
  const transport = {
    subscribe() { return () => {}; },
    async request() {
      const error = new Error('connection dropped after send');
      error.code = 'TRANSPORT_TIMEOUT';
      error.outcome = 'unknown';
      throw error;
    }
  };
  const client = new JsonClient(transport);
  try {
    await assert.rejects(
      client.dispatch('action.trigger', { actionId: 'open' }, { commandId: 'unknown-outcome-id' }),
      error => {
        assert.equal(error.commandId, 'unknown-outcome-id');
        assert.equal(error.command, 'action.trigger');
        assert.equal(error.outcome, 'unknown');
        assert.match(error.message, /outcome is unknown/i);
        assert.match(error.message, /Do not retry with a new command ID/i);
        return true;
      }
    );
  } finally {
    client.dispose();
  }
});


test('presentation request waits for a matching generic acknowledgement and ignores stale responses', async () => {
  const protocol = new JsonProtocol();
  const events = [];
  protocol.subscribe(event => events.push(event));
  const requestPromise = protocol.requestPresentation('scene.render.ready', { sceneId: 's1', routerId: 'r1' }, { timeoutMs: 1000 });
  const requestEvent = events.find(event => event.event === 'presentation.request');
  assert.ok(requestEvent);
  const requestId = requestEvent.payload.requestId;
  assert.equal(protocol.acknowledge('stale-request', { status: 'committed' }), false);
  assert.equal(protocol.acknowledge(requestId, { status: 'committed', revision: 7 }), true);
  assert.equal(protocol.acknowledge(requestId, { status: 'committed' }), false, 'duplicate ACK must be ignored');
  const result = await requestPromise;
  assert.equal(result.status, 'committed');
  assert.equal(result.result.revision, 7);
});

test('presentation request timeout is bounded and resolves headless-safe status', async () => {
  const protocol = new JsonProtocol();
  const result = await protocol.requestPresentation('scene.render.ready', { sceneId: 's2' }, { timeoutMs: 5 });
  assert.equal(result.status, 'timeout');
  assert.equal(protocol.presentationRequests.size, 0);
});


test('JsonClient records a flat chronological Timeline from snapshots and ending protocol events', () => {
  const listeners = new Set();
  const transport = {
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    async request() { return JSON.stringify({ ok: true, result: null }); }
  };
  const client = new JsonClient(transport);
  const snapshot = (sceneId, routerId, ending = null, createdAt = '2025-01-01T00:00:00.000Z') => ({
    type: 'snapshot', protocol: 'vsr', protocolVersion: 2, engineId: 'engine-a', stateRevision: 1,
    createdAt, game: { initialized: true, sceneId, routerId },
    presentation: { actions: [], inventory: { items: [] }, contacts: [], ending },
    session: { chat: { active: false, id: null, contactId: null, blockId: null, waitingChoice: false, history: {} } },
    state: { characters: {}, scenes: {}, faker: {}, sceneId, chatHistory: {} }
  });
  client.receive(snapshot('scene-a', 'router-a'));
  client.receive(snapshot('scene-b', 'router-b', null, '2025-01-01T00:00:02.000Z'));
  const ending = { id: 'ending-good', title: 'Good Ending', activatedAt: '2025-01-01T00:00:03.000Z' };
  client.receive({ type: 'event', protocol: 'vsr', engineId: 'engine-a', sequence: 1, timestamp: ending.activatedAt, event: 'scenario.ended', payload: { ending } });
  client.receive(snapshot('scene-b', 'router-b', ending, '2025-01-01T00:00:03.000Z'));
  const events = client.getTimeline().map(([, event]) => event.type);
  assert.deepEqual(events, ['scene_changed', 'router_changed', 'scene_changed', 'router_changed', 'ending_activated']);
  assert.ok(client.getTimeline().every(entry => Array.isArray(entry) && entry.length === 2 && Number.isFinite(entry[0])));
  assert.equal(client.getTimeline().filter(([, event]) => event.type === 'ending_activated').length, 1, 'ending event should be deduplicated between protocol and snapshot');
  client.dispose();
});

test('JsonClient records Action Attempted and permission-denied outcome', async () => {
  const transport = {
    subscribe() { return () => {}; },
    async request(raw) {
      const command = JSON.parse(raw);
      return JSON.stringify({ ok: true, commandId: command.commandId, result: { success: false, reason: 'permission_denied' } });
    }
  };
  const client = new JsonClient(transport);
  await client.triggerAction('door');
  assert.deepEqual(client.getTimeline().map(([, event]) => event.type), ['action_attempted', 'action_permission_denied']);
  client.dispose();
});

test('JsonClient infers chat lifecycle, dialogue, and choice selection from snapshot deltas', () => {
  const transport = { subscribe() { return () => {}; }, async request() { return JSON.stringify({ ok: true, result: null }); } };
  const client = new JsonClient(transport);
  const base = {
    type: 'snapshot', protocol: 'vsr', protocolVersion: 2, engineId: 'engine-chat', stateRevision: 1, createdAt: '2025-01-01T00:00:00.000Z',
    game: { initialized: true, sceneId: 's', routerId: 'r' }, presentation: { actions: [], inventory: { items: [] }, ending: null },
    state: { characters: {}, scenes: {}, faker: {}, chatHistory: {} },
    session: { chat: { active: false, id: null, contactId: null, blockId: null, waitingChoice: false, history: {} } }
  };
  client.receive(base);
  const active = structuredClone(base); active.stateRevision = 2; active.createdAt = '2025-01-01T00:00:01.000Z';
  active.session.chat = { active: true, id: 'chat-1', contactId: 'npc', blockId: 'b1', waitingChoice: false, history: { 'chat-1': [] } };
  client.receive(active);
  const dialogue = structuredClone(active); dialogue.stateRevision = 3; dialogue.createdAt = '2025-01-01T00:00:02.000Z';
  dialogue.session.chat.history['chat-1'].push({ nameID: 'npc', text: 'Hello' });
  client.receive(dialogue);
  const waiting = structuredClone(dialogue); waiting.stateRevision = 4; waiting.createdAt = '2025-01-01T00:00:03.000Z'; waiting.session.chat.waitingChoice = true;
  client.receive(waiting);
  const choice = structuredClone(waiting); choice.stateRevision = 5; choice.createdAt = '2025-01-01T00:00:04.000Z'; choice.session.chat.waitingChoice = false;
  choice.session.chat.history['chat-1'].push({ nameID: 'player', text: 'Ask' });
  client.receive(choice);
  const ended = structuredClone(choice); ended.stateRevision = 6; ended.createdAt = '2025-01-01T00:00:05.000Z'; ended.session.chat.active = false;
  client.receive(ended);
  assert.deepEqual(client.getTimeline().map(([, event]) => event.type), ['scene_changed', 'router_changed', 'chat_started', 'chat_dialogue', 'chat_choice_selected', 'chat_ended']);
  client.dispose();
});


test('JsonClient infers item, Character stat, relationship, and movement Timeline changes', () => {
  const transport = { subscribe() { return () => {}; }, async request() { return JSON.stringify({ ok: true, result: null }); } };
  const client = new JsonClient(transport);
  const make = (revision, createdAt, chars, items = []) => ({
    type: 'snapshot', protocol: 'vsr', protocolVersion: 2, engineId: 'engine-diff', stateRevision: revision, createdAt,
    game: { initialized: true, sceneId: 's', routerId: 'r' },
    presentation: { actions: [], inventory: { ownerId: 'player', items }, ending: null },
    session: { chat: { active: false, id: null, contactId: null, blockId: null, waitingChoice: false, history: {} } },
    state: { characters: chars, scenes: {}, routers: {}, faker: {}, chatHistory: {} }
  });
  const base = make(1, '2025-01-01T00:00:00.000Z', {
    player: { stats: { hp: { current: 5, max: 10 }, mp: { current: 3, max: 5 } }, met: [], relationship: [], place: {}, moving: false },
    npc: { stats: { hp: { current: 4, max: 10 } }, met: [], relationship: [], place: {}, moving: false }
  }, [{ id: 'potion', equipped: false, usage: { current: 2, max: 3 }, stats: [{ id: 'durability', current: 1, max: 2 }] }]);
  client.receive(base);
  const next = make(2, '2025-01-01T00:00:01.000Z', {
    player: { stats: { hp: { current: 3, max: 10 }, mp: { current: 5, max: 5 } }, met: ['npc:1'], relationship: [{ tag: 'friend', characterId: 'npc' }], place: { scene_id: 's2' }, moving: true },
    npc: { stats: { hp: { current: 6, max: 10 } }, met: [], relationship: [], place: {}, moving: false }
  }, [{ id: 'potion', equipped: true, usage: { current: 3, max: 3 }, stats: [{ id: 'durability', current: 2, max: 2 }] }]);
  client.receive(next);
  const events = client.getTimeline().map(([, event]) => event.type);
  assert.ok(events.includes('item_equipped'));
  assert.ok(events.includes('item_usage_changed'));
  assert.ok(events.includes('item_stat_refilled'));
  assert.ok(events.includes('character_stat_changed'));
  assert.ok(events.includes('character_stats_swapped'));
  assert.ok(events.includes('character_stat_transferred'));
  assert.ok(events.includes('character_met'));
  assert.ok(events.includes('relationship_added'));
  assert.ok(events.includes('character_movement_state_changed'));
  assert.ok(events.includes('character_movement_started'));
  client.dispose();
});

test('JsonClient records successful item transfer and suppresses duplicate item removal', async () => {
  let client;
  const transport = {
    subscribe() { return () => {}; },
    async request(raw) {
      const command = JSON.parse(raw);
      if (command.command === 'inventory.transfer') {
        client.receive({
          type: 'snapshot', protocol: 'vsr', protocolVersion: 2, engineId: 'engine-transfer', stateRevision: 2,
          createdAt: '2025-01-01T00:00:02.000Z', game: { initialized: true, sceneId: 's', routerId: 'r' },
          presentation: { actions: [], ending: null, inventory: { ownerId: 'player', items: [] } },
          session: { chat: { active: false, history: {} } }, state: { characters: {}, scenes: {}, routers: {}, faker: {}, chatHistory: {} }
        });
        return JSON.stringify({ ok: true, result: { success: true, itemId: 'gift', targetCharacterId: 'npc' } });
      }
      return JSON.stringify({ ok: true, result: null });
    }
  };
  client = new JsonClient(transport);
  client.receive({
    type: 'snapshot', protocol: 'vsr', protocolVersion: 2, engineId: 'engine-transfer', stateRevision: 1,
    createdAt: '2025-01-01T00:00:01.000Z', game: { initialized: true, sceneId: 's', routerId: 'r' },
    presentation: { actions: [], ending: null, inventory: { ownerId: 'player', items: [{ id: 'gift', equipped: false }] } },
    session: { chat: { active: false, history: {} } }, state: { characters: {}, scenes: {}, routers: {}, faker: {}, chatHistory: {} }
  });
  await client.transferInventoryItem('gift', 'npc');
  const types = client.getTimeline().map(([, event]) => event.type);
  assert.ok(types.includes('item_transferred'));
  assert.ok(!types.includes('item_removed'));
  client.dispose();
});


test('JsonClient records Action Passed and password retry failure outcomes from acknowledgements', async () => {
  let client;
  const transport = {
    subscribe() { return () => {}; },
    async request(raw) {
      const command = JSON.parse(raw);
      if (command.command === 'action.trigger') return JSON.stringify({ ok: true, result: { success: true } });
      if (command.command === 'password.submit') return JSON.stringify({ ok: true, result: { success: false, retry: true, remainingAttempts: 2 } });
      return JSON.stringify({ ok: true, result: null });
    }
  };
  client = new JsonClient(transport);
  client.snapshot = { session: { passwordChallenge: { actionId: 'locked-door' } } };
  await client.triggerAction('open');
  await client.submitPassword('challenge-1', 'bad');
  assert.deepEqual(client.getTimeline().map(([, event]) => event.type), ['action_attempted', 'action_passed', 'action_password_failed']);
  client.dispose();
});


test('persistent idempotency store replays committed command result across protocol instances', async () => {
  const durable = new Map();
  const store = { async get(key) { return durable.get(key); }, async set(key, value) { durable.set(key, structuredClone(value)); } };
  let commits = 0;
  const command = { protocol: 'vsr', protocolVersion: 2, type: 'command', command: 'counter.commit', commandId: 'durable-1', payload: { amount: 1 } };
  const first = new JsonProtocol({ idempotencyStore: store });
  first.registerCommand('counter.commit', async () => ({ value: ++commits }));
  const ack1 = await first.dispatch(command, { principalId: 'durable-principal' });
  const second = new JsonProtocol({ idempotencyStore: store });
  second.registerCommand('counter.commit', async () => ({ value: ++commits }));
  const ack2 = await second.dispatch(command, { principalId: 'durable-principal' });
  assert.equal(ack1.result.value, 1);
  assert.deepEqual(ack2, ack1);
  assert.equal(commits, 1);
});

test('persistent idempotency store read failure prevents command execution', async () => {
  const store = { async get() { throw new Error('store unavailable'); }, async set() {} };
  const protocol = new JsonProtocol({ idempotencyStore: store });
  let invoked = false;
  protocol.registerCommand('dangerous', async () => { invoked = true; });
  const command = { protocol: 'vsr', protocolVersion: 2, type: 'command', command: 'dangerous', commandId: 'store-fail', payload: {} };
  await assert.rejects(protocol.dispatch(command), /store unavailable/);
  assert.equal(invoked, false);
});

test('JsonClient receives and validates the unified Sprite protocol', () => {
  const listeners = new Set();
  const transport = { subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }, async request() { return JSON.stringify({ok:true,result:null}); } };
  const client = new JsonClient(transport);
  const received=[]; client.subscribe(event=>received.push(event));
  const valid={protocol:'vsr.sprite',protocolVersion:2,kind:'simulation',simulationId:'sim-1',physicsVersion:'3d-native-constrained-v2',dimension:'3D',time:{tStart:0,tEnd:1,fixedDt:1/120,ticks:120},completion:{status:'completed',reason:'test'},bodies:[{id:'ball',type:'dynamic',position:[0,1,0],orientation:[1,0,0,0],velocity:[0,0,0],angularVelocity:[0,0,0],awake:false}],events:[],trajectories:[],diagnostics:{}};
  try {
    for(const listener of listeners)listener({type:'event',event:'presentation.sprite.simulation',payload:valid,sequence:1,eventId:'evt-1'});
    for(const listener of listeners)listener({type:'event',event:'presentation.sprite.simulation.v3',payload:{...valid,protocolVersion:3},sequence:2,eventId:'evt-2'});
    assert.equal(received.some(x=>x.type==='sprite.protocol'&&x.sprite.simulationId==='sim-1'),true);
    assert.equal(received.some(x=>x.type==='sprite.protocol.invalid'),true);
  } finally { client.dispose(); }
});

test('Phase 7 protocol transaction rolls back before persisting failure ACK', async () => {
  let value=0,commits=0,rollbacks=0;
  const protocol=new JsonProtocol({transactionProvider:async()=>({
    commit:async()=>{commits++;},
    rollback:async()=>{rollbacks++;value=0;}
  })});
  protocol.registerCommand('mutate.fail',async()=>{value=9;throw Object.assign(new Error('injected failure'),{code:'INJECTED'});});
  const command={protocol:'vsr',protocolVersion:2,type:'command',command:'mutate.fail',commandId:'phase7-fail',payload:{}};
  const first=await protocol.dispatch(command),retry=await protocol.dispatch(command);
  assert.equal(first.ok,false);assert.equal(first.error.code,'INJECTED');assert.equal(value,0);
  assert.equal(commits,0);assert.equal(rollbacks,1);assert.deepEqual(retry,first);
});
test('Phase 7 protocol commits transaction before emitting successful acknowledgement', async () => {
  let committed=false;
  const protocol=new JsonProtocol({transactionProvider:async()=>({commit:async()=>{committed=true;},rollback:async()=>{committed=false;}})});
  protocol.registerCommand('mutate.ok',async()=>({changed:true}));
  const ack=await protocol.dispatch({protocol:'vsr',protocolVersion:2,type:'command',command:'mutate.ok',commandId:'phase7-ok',payload:{}});
  assert.equal(ack.ok,true);assert.equal(committed,true);
});


test('protocol checkpoint restores event sequence, state revision and idempotent command results with a new epoch',async()=>{
 const source=new JsonProtocol({engineId:'checkpoint-engine'});
 source.publish('before.checkpoint',{value:1});
 source.registerCommand('checkpoint.command',async()=>({value:2}));
 const command={protocol:'vsr',protocolVersion:2,type:'command',command:'checkpoint.command',commandId:'checkpoint-command',payload:{}};
 const ack=await source.dispatch(command);
 const checkpoint=source.checkpoint();
 const restored=new JsonProtocol({engineId:'temporary-engine'});
 const restoredCheckpoint=await restored.restoreCheckpoint(checkpoint);
 assert.equal(restored.engineId,'checkpoint-engine');
 assert.equal(restored.eventSequence,checkpoint.eventSequence);
 assert.equal(restored.stateRevision,checkpoint.stateRevision);
 assert.equal(restored.epoch,checkpoint.epoch+1);
 assert.deepEqual(await restored.dispatch(command),ack);
 const event=restored.publish('after.restore',{value:3});
 assert.equal(event.sequence,checkpoint.eventSequence+1);
 assert.equal(event.protocolEpoch,checkpoint.epoch+1);
 assert.equal(restored.getEventsAfter(checkpoint.eventSequence).gap,false);
 assert.equal(restoredCheckpoint.eventSequence,checkpoint.eventSequence);
});

test('protocol checkpoint validation is atomic and rejects event sequence corruption',async()=>{
 const protocol=new JsonProtocol({engineId:'atomic-protocol-checkpoint'});
 const event=protocol.publish('safe.event',{ok:true});
 const before=protocol.checkpoint();
 const corrupt=structuredClone(before);corrupt.eventLog[0].sequence=99;
 await assert.rejects(protocol.restoreCheckpoint(corrupt),/event continuity/);
 assert.deepEqual(protocol.checkpoint(),before);
 assert.equal(event.sequence,1);
});
