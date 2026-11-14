import test from 'node:test';
import assert from 'node:assert/strict';
import { createSaveEnvelope, normalizeSaveEnvelope, SAVE_VERSION } from './SaveState.js';

function makeEngine() {
  return {
    src: {},
    scenario: { meta: {}, scenes: {} },
    state: {
      sceneId: 'hall',
      scenes: { hall: {} },
      effectQueue: { sync: [], async: [] },
      isSyncQueueRunning: false,
      isAsyncQueueRunning: false,
      pausedBackgroundTasks: {},
      score: 7
    },
    chatState: { active: true, id: 'chat' },
    pendingPasswordAction: { actionId: 'door' },
    taskManager: {
      snapshotRemaining: () => ({ auto_patrol: 1250, move_char_npc: 800 }),
      snapshotPaused: () => ['auto_patrol'],
      hasBusyTasks: () => false
    }
  };
}

test('creates v2 save envelopes without ephemeral execution queues', () => {
  const save = createSaveEnvelope(makeEngine());
  assert.equal(save.saveVersion, SAVE_VERSION);
  assert.equal(save.state.score, 7);
  assert.equal('effectQueue' in save.state, false);
  assert.deepEqual(save.taskRemainingMs, { auto_patrol: 1250, move_char_npc: 800 });
  assert.deepEqual(save.pendingPasswordAction, { actionId: 'door' });
  assert.deepEqual(save.pausedTasks, ['auto_patrol']);
});

test('migrates v1 saves to v2 defaults', () => {
  const old = {
    protocol: 'vsr-save',
    saveVersion: 1,
    scenario: { scenes: {} },
    state: { sceneId: 'hall' },
    chatState: { active: false },
    savedAt: new Date().toISOString()
  };
  const migrated = normalizeSaveEnvelope(old);
  assert.equal(migrated.saveVersion, 2);
  assert.deepEqual(migrated.taskRemainingMs, {});
  assert.equal(migrated.pendingPasswordAction, null);
});

test('rejects malformed timer metadata and timestamps', () => {
  const base = {
    protocol: 'vsr-save',
    saveVersion: 2,
    scenario: {},
    state: {},
    savedAt: new Date().toISOString()
  };
  assert.throws(() => normalizeSaveEnvelope({ ...base, taskRemainingMs: { auto_bad: -1 } }), /Invalid remaining timer/);
  assert.throws(() => normalizeSaveEnvelope({ ...base, savedAt: 'not-a-date' }), /timestamp/);
});

test('refuses saves while effect processing or background work is active', () => {
  const engine = makeEngine();
  engine.state.isSyncQueueRunning = true;
  assert.throws(() => createSaveEnvelope(engine), /Cannot save while/);
  engine.state.isSyncQueueRunning = false;
  engine.taskManager.hasBusyTasks = () => true;
  assert.throws(() => createSaveEnvelope(engine), /background task/);
});

test('migrates legacy saves that predate the protocol field', () => {
  const migrated = normalizeSaveEnvelope({
    saveVersion: 1,
    scenario: {},
    state: {},
    savedAt: new Date().toISOString()
  });
  assert.equal(migrated.protocol, 'vsr-save');
  assert.deepEqual(migrated.pausedTasks, []);
});
