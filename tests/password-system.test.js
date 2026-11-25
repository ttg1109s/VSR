import test from 'node:test';
import assert from 'node:assert/strict';
import { PasswordSystem } from '../engine/modules/password/PasswordSystem.js';

function createSystem() {
  let now = 1_000;
  let sequence = 0;
  const system = new PasswordSystem({
    clock: () => now,
    createId: () => `challenge_${++sequence}`
  });
  return { system, advance: ms => { now += ms; }, now: () => now };
}

function openChallenge(system, config = {}) {
  return system.open({
    actionId: 'unlock',
    uniqueId: 'scene_router_unlock',
    sceneId: 'scene',
    routerId: 'router',
    type: 'number',
    passwordId: 'pin',
    config: { retryMax: 3, timer: 10, ...config }
  });
}

test('a dismissed challenge retains the same attempt counter and absolute deadline when resumed', () => {
  const { system, advance, now } = createSystem();
  const original = openChallenge(system);
  const firstFailure = system.recordFailure(original);

  assert.equal(firstFailure.accepted, true);
  assert.equal(original.countTest, 1);
  assert.equal(original.deadlineAt, 11_000);

  // Hiding the challenge does not mutate it. Reopening is a projection of the
  // same object, not another PasswordSystem.open() call.
  const resumed = original;
  advance(2_000);
  assert.equal(resumed.challengeId, original.challengeId);
  assert.equal(resumed.countTest, 1);
  assert.equal(resumed.deadlineAt, 11_000);
  assert.equal(system.inspect(resumed).remainingAttempts, 2);
  assert.equal(now(), 3_000);
});

test('ordinary failed submissions increment attempts and exhaust at retryMax', () => {
  const { system } = createSystem();
  const challenge = openChallenge(system, { timer: 0 });

  assert.equal(system.recordFailure(challenge).remainingAttempts, 2);
  assert.equal(system.recordFailure(challenge).remainingAttempts, 1);
  const last = system.recordFailure(challenge);
  assert.equal(last.exhausted, true);
  assert.equal(challenge.countTest, 3);
  assert.equal(challenge.status, 'exhausted');
  assert.equal(system.recordFailure(challenge).accepted, false);
});

test('an expired timer is one failed attempt and terminates the challenge even with retries remaining', () => {
  const { system, advance } = createSystem();
  const challenge = openChallenge(system, { retryMax: 3, timer: 5 });
  advance(5_000);

  assert.deepEqual(system.inspect(challenge), { accepted: false, reason: 'expired' });
  const expiry = system.recordFailure(challenge, { allowExpired: true });

  assert.equal(expiry.accepted, true);
  assert.equal(expiry.exhausted, false);
  assert.equal(challenge.countTest, 1);
  assert.equal(challenge.status, 'expired');
  assert.equal(expiry.remainingAttempts, 2);
  assert.equal(system.recordFailure(challenge, { allowExpired: true }).accepted, false);
});

test('a timer expiry on the final available attempt is an exhausted password failure', () => {
  const { system, advance } = createSystem();
  const challenge = openChallenge(system, { retryMax: 2, timer: 5 });
  system.recordFailure(challenge);
  advance(5_000);

  const expiry = system.recordFailure(challenge, { allowExpired: true });

  assert.equal(expiry.accepted, true);
  assert.equal(expiry.exhausted, true);
  assert.equal(challenge.countTest, 2);
  assert.equal(challenge.status, 'exhausted');
  assert.equal(expiry.remainingAttempts, 0);
});

test('a new action challenge starts with a fresh counter and a new deadline', () => {
  const { system, advance } = createSystem();
  const oldChallenge = openChallenge(system);
  system.recordFailure(oldChallenge);
  advance(2_000);

  const nextChallenge = openChallenge(system);

  assert.notEqual(nextChallenge.challengeId, oldChallenge.challengeId);
  assert.equal(nextChallenge.countTest, 0);
  assert.equal(nextChallenge.startedAt, 3_000);
  assert.equal(nextChallenge.deadlineAt, 13_000);
});
