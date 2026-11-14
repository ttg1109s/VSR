import test from 'node:test';
import assert from 'node:assert/strict';
import { StateAccess, StatePathError } from './StateAccess.js';

function engine() {
  return {
    src: { meta: { title: 'Immutable source' } },
    state: { score: 1, nested: { count: 2 } },
    chatState: { active: false },
    pendingPasswordAction: null,
    commits: [],
    commitState(reason) { this.commits.push(reason); }
  };
}

test('supports set, update and delete against runtime state', () => {
  const e = engine(), state = new StateAccess(e);
  state.set('score', 4);
  assert.equal(state.update('nested.count', n => n + 3), 5);
  assert.equal(state.delete('nested.count'), true);
  assert.equal(state.get('score'), 4);
  assert.equal(state.get('nested.count'), undefined);
});

test('source namespace cannot be mutated', () => {
  const state = new StateAccess(engine());
  assert.throws(() => state.set('meta.title', 'tampered', {}, { namespace: 'source' }), StatePathError);
});

test('transaction commits atomically and preserves root object identity', async () => {
  const e = engine(), original = e.state, state = new StateAccess(e);
  await state.transaction(async tx => {
    tx.set('score', 10);
    tx.set('nested.count', 20);
    await Promise.resolve();
  });
  assert.equal(e.state, original);
  assert.deepEqual(e.state, { score: 10, nested: { count: 20 } });
  assert.deepEqual(e.commits, ['state.transaction']);
});

test('transaction rolls back on callback failure', async () => {
  const e = engine(), state = new StateAccess(e);
  await assert.rejects(state.transaction(tx => {
    tx.set('score', 99);
    throw new Error('abort');
  }), /abort/);
  assert.equal(e.state.score, 1);
  assert.deepEqual(e.commits, []);
});

test('transactions are serialized per Engine instance', async () => {
  const e = engine(), state = new StateAccess(e), order = [];
  const first = state.transaction(async tx => {
    order.push('first:start');
    await new Promise(resolve => setTimeout(resolve, 10));
    tx.set('score', 2);
    order.push('first:end');
  });
  const second = state.transaction(tx => {
    order.push('second');
    tx.set('nested.count', 8);
  });
  await Promise.all([first, second]);
  assert.deepEqual(order, ['first:start', 'first:end', 'second']);
  assert.equal(e.state.score, 2);
  assert.equal(e.state.nested.count, 8);
});

test('rejects prototype-polluting paths', () => {
  const state = new StateAccess(engine());
  assert.throws(() => state.set('__proto__.polluted', true), StatePathError);
  assert.equal({}.polluted, undefined);
});

test('preserves nested object references after transaction commit', async () => {
  const e = engine(), nested = e.state.nested, state = new StateAccess(e);
  await state.transaction(tx => tx.set('nested.count', 12));
  assert.equal(e.state.nested, nested);
  assert.equal(nested.count, 12);
});

test('detects direct writes that conflict with an open transaction', async () => {
  const e = engine(), state = new StateAccess(e);
  await assert.rejects(state.transaction(async tx => {
    tx.set('score', 50);
    e.state.nested.count = 77;
  }), error => error.code === 'TRANSACTION_CONFLICT');
  assert.equal(e.state.score, 1);
  assert.equal(e.state.nested.count, 77);
});

test('writes session roots back to the Engine instance', () => {
  const e = engine(), state = new StateAccess(e);
  state.set('session.chat', { active: true, id: 'new-chat' });
  state.set('session.passwordChallenge', { actionId: 'new-door' });
  assert.equal(e.chatState.id, 'new-chat');
  assert.equal(e.pendingPasswordAction.actionId, 'new-door');
  state.delete('session.passwordChallenge');
  assert.equal(e.pendingPasswordAction, undefined);
});

test('transactions can read source but cannot write it', async () => {
  const e = engine(), state = new StateAccess(e);
  await state.transaction(tx => {
    assert.equal(tx.get('meta.title', {}, { namespace: 'source' }), 'Immutable source');
    assert.throws(() => tx.set('meta.title', 'changed', {}, { namespace: 'source' }), StatePathError);
  });
  assert.equal(e.src.meta.title, 'Immutable source');
});


test('read snapshots are detached from mutable Engine state', () => {
  const e = engine(), state = new StateAccess(e);
  const snapshot = state.getRuntimeSnapshot('nested');
  snapshot.count = 99;
  assert.equal(e.state.nested.count, 2);
});

test('snapshot reads preserve undefined and clone nested arrays', () => {
  const e = engine(), state = new StateAccess(e);
  e.state.items = [{ id: 'a' }];
  const snapshot = state.getSnapshot('items');
  snapshot[0].id = 'changed';
  assert.equal(e.state.items[0].id, 'a');
  assert.equal(state.getSnapshot('missing'), undefined);
});


test('StateAccess.set detaches caller-owned values', () => {
  const e = engine(), state = new StateAccess(e);
  const payload = { nested: { value: 1 } };
  state.set('payload', payload);
  payload.nested.value = 9;
  assert.equal(e.state.payload.nested.value, 1);
});

test('transaction reads and writes are detached, including source namespace', async () => {
  const e = engine(), state = new StateAccess(e);
  let sourceRead, runtimeRead;
  await state.transaction(tx => {
    sourceRead = tx.get('meta', {}, { namespace: 'source' });
    runtimeRead = tx.get('nested');
    sourceRead.title = 'mutated';
    runtimeRead.count = 88;
    const payload = { value: 1 };
    tx.set('payload', payload);
    payload.value = 2;
  });
  assert.equal(e.src.meta.title, 'Immutable source');
  assert.equal(e.state.nested.count, 2);
  assert.equal(e.state.payload.value, 1);
});

test('source and session snapshots cannot mutate engine-owned objects', () => {
  const e = engine(), state = new StateAccess(e);
  const source = state.getSourceSnapshot('meta');
  const session = state.getSessionSnapshot('chatState');
  source.title = 'changed';
  session.active = true;
  assert.equal(e.src.meta.title, 'Immutable source');
  assert.equal(e.chatState.active, false);
});
