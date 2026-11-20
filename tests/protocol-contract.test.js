import test from 'node:test';
import assert from 'node:assert/strict';
import { JsonProtocol } from '../protocol/JsonProtocol.js';
import { JsonClient } from '../client/adapters/JsonClient.js';

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


test('revision conflicts are not cached under the command id', async () => {
  const protocol = new JsonProtocol();
  let calls = 0;
  protocol.registerCommand('state.increment', async () => ({ count: ++calls }));
  protocol.stateRevision = 4;
  const stale = command(protocol, 'state.increment', 'conflict-retry', 3);
  const conflict = await protocol.dispatch(stale);
  assert.equal(conflict.error.code, 'REVISION_CONFLICT');

  const current = command(protocol, 'state.increment', 'conflict-retry', 4);
  const accepted = await protocol.dispatch(current);
  assert.equal(accepted.ok, true);
  assert.equal(calls, 1);
});

test('reusing an idempotency key with a different command or payload is rejected', async () => {
  const protocol = new JsonProtocol();
  let calls = 0;
  protocol.registerCommand('counter.add', async payload => ({ count: calls += payload.amount }));
  const first = protocol.createCommand('counter.add', { amount: 2 }, { commandId: 'same-id' });
  const changed = protocol.createCommand('counter.add', { amount: 9 }, { commandId: 'same-id' });
  assert.equal((await protocol.dispatch(first, { principalId: 'user-a' })).ok, true);
  const rejected = await protocol.dispatch(changed, { principalId: 'user-a' });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error.code, 'IDEMPOTENCY_KEY_REUSED');
  assert.equal(calls, 2);
});
