import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from './GameEngine.js';
import { DEMO_SCRIPT } from '../demo_script.js';
import { SAVE_VERSION } from './persistence/SaveState.js';

test('restores runtime progress without re-entering the scenario entry scene', async () => {
  const source = structuredClone(DEMO_SCRIPT);
  const original = new GameEngine();
  const restored = new GameEngine();
  try {
    await original.init(source);
    original.state.global.__persistence_probe = { type: 'number', value: 41 };
    original.state.itemInfo.__persistence_item = { name: 'Probe', usage: { current: 1, max: 4 } };
    original.state.chatHistory.__persistence_chat = [{ nameID: 'player', text: 'persist me' }];
    original.chatState = { active: true, id: '__persistence_chat', blockId: 'intro', index: 1 };
    const expectedScene = original.state.sceneId;
    const save = original.exportSave();
    assert.equal(save.saveVersion, SAVE_VERSION);

    await restored.restoreSave(save);
    assert.equal(restored.state.sceneId, expectedScene);
    assert.equal(restored.state.global.__persistence_probe.value, 41);
    assert.deepEqual(restored.state.itemInfo.__persistence_item, { name: 'Probe', usage: { current: 1, max: 4 } });
    assert.deepEqual(restored.state.chatHistory.__persistence_chat, [{ nameID: 'player', text: 'persist me' }]);
    assert.deepEqual(restored.chatState, original.chatState);
    assert.deepEqual(restored.pendingPasswordAction, save.pendingPasswordAction);
    assert.equal(restored.src.meta.title, original.src.meta.title);
  } finally {
    original.dispose();
    restored.dispose();
  }
});

test('rejects a save whose runtime scene is not part of its scenario', async () => {
  const engine = new GameEngine();
  try {
    await engine.init(structuredClone(DEMO_SCRIPT));
    const save = engine.exportSave();
    save.state.sceneId = '__missing_scene__';
    await assert.rejects(engine.restoreSave(save), /does not match scenario structure/);
  } finally {
    engine.dispose();
  }
});
