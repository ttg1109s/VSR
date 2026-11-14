import test from 'node:test';
import assert from 'node:assert/strict';
import { PasswordSystem } from '../engine/modules/password/PasswordSystem.js';
import { verifyPassword } from '../engine/modules/password/verify.js';

test('retryMax zero is unlimited and failures stay active', () => {
  let now = 1000;
  const passwords = new PasswordSystem({ clock: () => now, createId: () => 'challenge-a' });
  const challenge = passwords.open({ actionId:'door', uniqueId:'door-1', sceneId:'s', routerId:'r', type:'number', passwordId:'lock', config:{ retryMax:0 } });
  for (let i=0;i<8;i++) assert.equal(passwords.recordFailure(challenge).exhausted, false);
  assert.equal(challenge.countTest, 8);
  assert.equal(challenge.status, 'active');
});

test('retryMax N exhausts on the Nth failed attempt', () => {
  const passwords = new PasswordSystem({ clock: () => 10, createId: () => 'challenge-b' });
  const challenge = passwords.open({ actionId:'door', uniqueId:'door-1', sceneId:'s', routerId:'r', type:'number', passwordId:'lock', config:{ retryMax:3 } });
  assert.equal(passwords.recordFailure(challenge).remainingAttempts, 2);
  assert.equal(passwords.recordFailure(challenge).remainingAttempts, 1);
  assert.equal(passwords.recordFailure(challenge).exhausted, true);
  assert.equal(challenge.status, 'exhausted');
  assert.equal(passwords.recordFailure(challenge).accepted, false);
});

test('deadline is enforced by domain clock', () => {
  let now = 1000;
  const passwords = new PasswordSystem({ clock: () => now });
  const challenge = passwords.open({ actionId:'door', uniqueId:'door-1', sceneId:'s', routerId:'r', type:'number', passwordId:'lock', config:{ timer:2 } });
  assert.equal(passwords.inspect(challenge).accepted, true);
  now = 3000;
  assert.deepEqual(passwords.inspect(challenge), { accepted:false, reason:'expired' });
});

test('terminal state can only be set once', () => {
  const passwords = new PasswordSystem({ clock: () => 1 });
  const challenge = passwords.open({ actionId:'door', uniqueId:'door-1', sceneId:'s', routerId:'r', type:'string', passwordId:'secret' });
  assert.equal(passwords.finish(challenge,'cancelled'), true);
  assert.equal(passwords.finish(challenge,'succeeded'), false);
});

test('number zero and leading-zero strings are verified without truthiness coercion', () => {
  assert.equal(verifyPassword('number',{value:0},0),true);
  assert.equal(verifyPassword('number',{value:'0123'},'0123'),true);
  assert.equal(verifyPassword('number',{value:'0123'},123),false);
});

test('string comparison defaults to case-insensitive and can be case-sensitive', () => {
  assert.equal(verifyPassword('string',{value:'OpenSesame'},'opensesame'),true);
  assert.equal(verifyPassword('string',{value:'OpenSesame',caseSensitive:true},'opensesame'),false);
});

test('find-way rejects out-of-grid and non-adjacent paths', () => {
  const config={area:[3,3],start:[0,0],target:[1,1],street:[[0,0],[1,0],[1,1]]};
  assert.equal(verifyPassword('find_way',config,[[0,0],[1,0],[1,1]]),true);
  assert.equal(verifyPassword('find_way',config,[[0,0],[2,2],[1,1]]),false);
  assert.equal(verifyPassword('find_way',config,[[0,0],[3,0],[1,1]]),false);
});
