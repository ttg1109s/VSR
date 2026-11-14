import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../engine/GameEngine.js';
import { DEMO_SCRIPT } from '../demo_script.js';
import { API } from '../api/index.js';
import { JsonProtocol } from '../core/protocol/JsonProtocol.js';

const engines = [];
afterEach(() => {
    for (const engine of engines.splice(0)) engine.taskManager.killAll();
});

test('Engine imports and constructs without window or document', () => {
    assert.equal(typeof globalThis.window, 'undefined');
    assert.equal(typeof globalThis.document, 'undefined');
    const engine = new GameEngine();
    engines.push(engine);
    assert.ok(engine.protocol instanceof JsonProtocol);
    assert.equal(API.engineInstance, engine);
    assert.ok(engine.taskManager);
});

test('Full demo scenario loads and enters its initial scene headlessly', async () => {
    const engine = new GameEngine();
    engines.push(engine);
    await engine.init(structuredClone(DEMO_SCRIPT));

    assert.ok(engine.src);
    assert.ok(engine.state.scenes);
    assert.equal(engine.state.sceneId, DEMO_SCRIPT.meta.entryScene);
    assert.ok(engine.state.scenes[engine.state.sceneId].activeRouterId);
    assert.equal(API.engine.state.get('title'), DEMO_SCRIPT.meta.title);
    assert.doesNotThrow(() => JSON.stringify(engine.protocol.createSnapshot(engine)));
});

test('Scene commands mutate engine state and publish JSON events', async () => {
    const engine = new GameEngine();
    engines.push(engine);
    await engine.init(structuredClone(DEMO_SCRIPT));
    const targetScene = Object.keys(engine.state.scenes).find(id => id !== engine.state.sceneId);
    assert.ok(targetScene);

    const before = engine.protocol.revision;
    const command = engine.protocol.createCommand(
        'scene.enter',
        { sceneId: targetScene, skipTransition: true },
        { commandId: 'headless-scene-enter-1' }
    );
    const ack = await engine.dispatchProtocolCommand(command);

    assert.equal(ack.ok, true);
    assert.equal(engine.state.sceneId, targetScene);
    assert.ok(engine.protocol.revision > before);
    assert.ok(engine.protocol.getEventsSince(before).events.some(event => event.event === 'state.snapshot'));
});

test('Invalid commands are rejected without invoking arbitrary methods', async () => {
    const engine = new GameEngine();
    engines.push(engine);
    const ack = await engine.dispatchProtocolCommand(
        engine.protocol.createCommand('constructor', {}, { commandId: 'headless-invalid-1' })
    );
    assert.equal(ack.ok, false);
    assert.equal(ack.error.code, 'UNKNOWN_COMMAND');
});

test('Presentation effects are emitted as JSON events without a renderer', async () => {
    const engine = new GameEngine();
    engines.push(engine);
    await engine.init(structuredClone(DEMO_SCRIPT));
    const events = engine.protocol.getEventsSince(0).events;
    assert.ok(events.some(event => event.event.startsWith('presentation.')));
    for (const event of events) assert.doesNotThrow(() => JSON.stringify(event));
});
