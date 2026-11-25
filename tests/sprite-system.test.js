import { importModules } from './imports/index.js';
const modules = await importModules(['Scenario','GameEngine','EffectStrategies','LogicSystem','JsonProtocol','JsonClient']);
const { validateScenario } = modules.Scenario;
const { GameEngine } = modules.GameEngine;
const { SetStrategies } = modules.EffectStrategies;
const { LogicSystem } = modules.LogicSystem;
const { JsonClient, evaluateSpriteEasing, sampleSpriteMotion } = modules.JsonClient;
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Ajv from '../engine/schema/valid.js';

const fixture = () => JSON.parse(readFileSync(new URL('./fixtures/engine/minimal-scenario.json', import.meta.url), 'utf8'));
function spriteScenario() {
  const s = fixture();
  delete s.scenes.start.routers.main.actions;
  s.sprite = {
    door: { action: 'test_action', layer: 2, state: { closed: 'door_closed.png', open: 'door_open.png' }, position: [100, 200, 0], transform: { scale: 1, rotate: 0 }, motion: { enable: true, duration: 1000, type: 'sin_native', easing: 'ease_in_out', step: [{ x: 150, y: null, z: null }, { x: null, y: 300, z: null }] } }
  };
  s.scenes.start.routers.main.meta.sprite = true;
  s.scenes.start.routers.main.sprites = ['door'];
  s.config.allDescRead = true;
  s.actions.test_action.meta.desc = 'Door interaction';
  s.actions.test_action.set.readDesc = true;
  s.actions.test_action.effect = { normal: [{ type: 'set', subtype: 'sprite', target: 'door', property: 'state', value: 'open' }] };
  return s;
}

test('schema: Sprite router requires sprites and forbids even empty actions array', () => {
  const s = spriteScenario();
  assert.deepEqual(validateScenario(s), []);
  s.scenes.start.routers.main.actions = [];
  assert.ok(validateScenario(s).length > 0);
});

test('schema: action references and sprite IDs are validated', () => {
  const s = spriteScenario();
  s.sprite.door.action = 'missing_action';
  assert.ok(validateScenario(s).some(e => e.includes("references missing global Action 'missing_action'")));
  const t = spriteScenario();
  t.scenes.start.routers.main.sprites = ['missing_sprite'];
  assert.ok(validateScenario(t).some(e => e.includes("references missing Sprite 'missing_sprite'")));
});

test('Sprite position uses null for partial axis updates; negative values remain coordinates', async () => {
  const engine = new GameEngine();
  try {
    await engine.init(spriteScenario(), { enterScene: true });
    SetStrategies.sprite(engine, { target: 'door', property: 'position', value: [null, 3, null] });
    assert.deepEqual(engine.api.engine.state.getRuntimeSnapshot('sprites.[id]', { id: 'door' }).position, [100, 3, 0]);
    SetStrategies.sprite(engine, { target: 'door', property: 'position', value: [8] });
    assert.deepEqual(engine.api.engine.state.getRuntimeSnapshot('sprites.[id]', { id: 'door' }).position, [8, 3, 0]);
    SetStrategies.sprite(engine, { target: 'door', property: 'position', value: [-1] });
    assert.deepEqual(engine.api.engine.state.getRuntimeSnapshot('sprites.[id]', { id: 'door' }).position, [-1, 3, 0]);
    assert.throws(() => SetStrategies.sprite(engine, { target: 'door', property: 'position', value: [] }), /1 to 3/);
    assert.throws(() => SetStrategies.sprite(engine, { target: 'door', property: 'position', value: [1, 2, 3, 4] }), /1 to 3/);
  } finally { engine.dispose(); }
});

test('sprite mode snapshot projects sprites instead of actions and bypasses readDesc only', async () => {
  const engine = new GameEngine();
  try {
    await engine.init(spriteScenario(), { enterScene: true });
    const snapshot = engine.protocol.createSnapshot(engine);
    assert.deepEqual(snapshot.presentation.actions, []);
    assert.equal(snapshot.presentation.sprites.length, 1);
    assert.equal(snapshot.presentation.sprites[0].id, 'door');
    assert.equal(snapshot.presentation.sprites[0].action.presentation.readRequired, false);
    assert.equal(snapshot.presentation.sprites[0].action.availability.reason, 'available');
    const renderEvent = engine.protocol.eventLog.filter(event => event.event === 'presentation.scene.render').at(-1);
    assert.ok(renderEvent);
    assert.deepEqual(renderEvent.payload.args[2], []);
    assert.equal(renderEvent.payload.args[3][0].id, 'door');
    const ack = await engine.protocol.dispatch(engine.protocol.createCommand('sprite.trigger', { spriteId: 'door' }));
    assert.equal(ack.ok, true);
    assert.equal(ack.result.success, true);
    assert.equal(engine.api.engine.state.getRuntimeSnapshot('sprites.[id]', { id: 'door' }).state, 'open');
  } finally { engine.dispose(); }
});

test('sprite requirement checks state, layer, and individual position coordinates', async () => {
  const engine = new GameEngine();
  try {
    await engine.init(spriteScenario(), { enterScene: true });
    const req = (check) => ({ logic: null, check: [check] });
    assert.equal(engine.checkReq(req({ type: 'sprite', subtype: 'sprite', target: 'door', property: 'state', op: '==', value: 'closed' })).pass, true);
    assert.equal(engine.checkReq(req({ type: 'sprite', subtype: 'sprite', target: 'door', property: 'layer', op: '>=', value: 2 })).pass, true);
    assert.equal(engine.checkReq(req({ type: 'sprite', subtype: 'sprite', target: 'door', property: 'position', field: 'y', op: '==', value: 200 })).pass, true);
    assert.equal(engine.checkReq(req({ type: 'sprite', subtype: 'sprite', target: 'missing', property: 'state', op: '==', value: 'closed' })).type, 'invalid_requirement');
  } finally { engine.dispose(); }
});

test('JsonClient exposes sprite interaction through the sprite.trigger command and preserves payload', async () => {
  const sent = [];
  const transport = { subscribe() { return () => {}; }, async request(raw) { sent.push(JSON.parse(raw)); return JSON.stringify({ ok: true, result: { success: true } }); } };
  const client = new JsonClient(transport);
  try {
    await client.triggerSprite('door', 'sprite-unique');
    assert.equal(sent[0].command, 'sprite.trigger');
    assert.deepEqual(sent[0].payload, { spriteId: 'door', uniqueId: 'sprite-unique' });
  } finally { client.dispose?.(); }
});

test('schema: sprite requirement and set/sprite position contracts are strict', () => {
  const s = spriteScenario();
  s.actions.test_action.requirement = { logic: null, check: [{ type: 'sprite', subtype: 'sprite', target: 'door', property: 'position', field: 'y', op: '==', value: 200 }] };
  s.actions.test_action.effect.normal = [{ type: 'set', subtype: 'sprite', target: 'door', property: 'position', value: [null, 3, null] }];
  assert.deepEqual(validateScenario(s), []);
  s.actions.test_action.requirement.check[0].field = 'w';
  assert.ok(validateScenario(s).length > 0);
  const bad = spriteScenario();
  bad.actions.test_action.effect.normal[0].value = [];
  assert.ok(validateScenario(bad).length > 0);
});

test('Sprite runtime position persists through save and restore', async () => {
  const engine = new GameEngine();
  const restored = new GameEngine();
  try {
    await engine.init(spriteScenario(), { enterScene: true });
    SetStrategies.sprite(engine, { target: 'door', property: 'position', value: [null, 9] });
    const saveAck = await engine.protocol.dispatch(engine.protocol.createCommand('save.export', {}));
    assert.equal(saveAck.ok, true);
    const restoreAck = await restored.protocol.dispatch(restored.protocol.createCommand('save.restore', { save: saveAck.result.save }));
    assert.equal(restoreAck.ok, true);
    assert.deepEqual(restored.api.engine.state.getRuntimeSnapshot('sprites.[id]', { id: 'door' }).position, [100, 9, 0]);
    const legacySave = structuredClone(saveAck.result.save);
    delete legacySave.state.sprites;
    await restored.protocol.dispatch(restored.protocol.createCommand('save.restore', { save: legacySave }));
    assert.deepEqual(restored.api.engine.state.getRuntimeSnapshot('sprites.[id]', { id: 'door' }).position, [100, 200, 0]);
  } finally { engine.dispose(); restored.dispose(); }
});


test('Sprite transform partial set and motion descriptor use independent geometry/easing', async () => {
  const engine = new GameEngine();
  try {
    const scenario = spriteScenario();
    scenario.sprite.door.motion.step = [{ x: 150, y: null, z: null }, { x: null, y: 300, z: null }, { x: 200, y: null, z: null }];
    await engine.init(scenario, { enterScene: true });
    SetStrategies.sprite(engine, { target: 'door', property: 'transform', value: { rotate: 90 } });
    const runtime = engine.api.engine.state.getRuntimeSnapshot('sprites.[id]', { id: 'door' });
    assert.deepEqual(runtime.transform, { scale: 1, rotate: 90 });
    SetStrategies.sprite(engine, { target: 'door', property: 'position', value: [null, 400, null] });
    const motionEvent = engine.protocol.eventLog.filter(event => event.event === 'presentation.sprite.motion').at(-1);
    assert.ok(motionEvent);
    assert.equal(motionEvent.payload.type, 'sin_native');
    assert.equal(motionEvent.payload.easing, 'ease_in_out');
    assert.equal(motionEvent.payload.duration, 1000);
    assert.deepEqual(motionEvent.payload.from, [100, 200, 0]);
    assert.deepEqual(motionEvent.payload.to, [100, 400, 0]);
    assert.deepEqual(motionEvent.payload.waypoints, [[150, 200, 0], [150, 300, 0], [200, 300, 0]]);
    assert.equal(motionEvent.payload.path.length, 5);
    assert.deepEqual(motionEvent.payload.path[0], [100, 200, 0]);
    assert.deepEqual(motionEvent.payload.path[4], [100, 400, 0]);
    assert.deepEqual(engine.api.engine.state.getRuntimeSnapshot('sprites.[id]', { id: 'door' }).position, [100, 400, 0]);
  } finally { engine.dispose(); }
});

test('Sprite motion disabled teleports without emitting and transform survives save/restore', async () => {
  const engine = new GameEngine(); const restored = new GameEngine();
  try {
    const scenario = spriteScenario(); scenario.sprite.door.motion.enable = false;
    await engine.init(scenario, { enterScene: true });
    SetStrategies.sprite(engine, { target: 'door', property: 'transform', value: { scale: 2, rotate: -45 } });
    SetStrategies.sprite(engine, { target: 'door', property: 'position', value: [5, null, null] });
    assert.equal(engine.protocol.eventLog.some(event => event.event === 'presentation.sprite.motion'), false);
    const saveAck = await engine.protocol.dispatch(engine.protocol.createCommand('save.export', {}));
    const restoreAck = await restored.protocol.dispatch(restored.protocol.createCommand('save.restore', { save: saveAck.result.save }));
    assert.equal(restoreAck.ok, true);
    assert.deepEqual(restored.api.engine.state.getRuntimeSnapshot('sprites.[id]', { id: 'door' }).transform, { scale: 2, rotate: -45 });
    assert.deepEqual(restored.api.engine.state.getRuntimeSnapshot('sprites.[id]', { id: 'door' }).position, [5, 200, 0]);
  } finally { engine.dispose(); restored.dispose(); }
});

test('JsonClient emits sprite.motion and easing evaluator returns normalized progress', () => {
  const emitted = [];
  const transport = { subscribe(fn) { this.fn = fn; return () => {}; }, request: async raw => raw };
  const client = new JsonClient(transport);
  client.subscribe(event => emitted.push(event));
  transport.fn({ protocol: 'vsr', protocolVersion: 1, type: 'event', sequence: 1, event: 'presentation.sprite.motion', eventId: 'motion-1', payload: { spriteId: 'door', from: [0,0,0], waypoints: [], to: [10,0,0], path: [[0,0,0],[10,0,0]], duration: 500, type: 'linear', easing: 'ease_out' } });
  assert.equal(emitted.some(event => event.type === 'sprite.motion' && event.motion.spriteId === 'door'), true);
  assert.equal(evaluateSpriteEasing('linear', 0.5), 0.5);
  assert.deepEqual(sampleSpriteMotion({ spriteId: 'door', from: [0,0,0], waypoints: [[5,0,0]], to: [10,0,0], path: [[0,0,0],[5,0,0],[10,0,0]], duration: 500, type: 'linear', easing: 'linear' }, 0.5), [5,0,0]);
  assert.equal(evaluateSpriteEasing('ease_in', 0.5), 0.25);
  assert.equal(evaluateSpriteEasing('ease_out', 0.5), 0.75);
  assert.ok(Math.abs(evaluateSpriteEasing('sin_in_out', 0.5) - 0.5) < 1e-12);
  client.dispose?.();
});

test('schema: Sprite motion and transform are strict and null is allowed only for partial position/waypoint axes', () => {
  const s = spriteScenario();
  assert.deepEqual(validateScenario(s), []);
  s.sprite.door.motion.easing = 'unknown';
  assert.ok(validateScenario(s).length > 0);
  const t = spriteScenario();
  t.sprite.door.transform.scale = 0;
  assert.ok(validateScenario(t).length > 0);
  const u = spriteScenario();
  u.actions.test_action.effect.normal = [{ type: 'set', subtype: 'sprite', target: 'door', property: 'position', value: [null, -1, null] }];
  assert.deepEqual(validateScenario(u), []);
  const v = spriteScenario();
  v.actions.test_action.effect.normal = [{ type: 'set', subtype: 'sprite', target: 'door', property: 'transform', value: { scale: 2, rotate: 45 } }];
  assert.deepEqual(validateScenario(v), []);
  v.actions.test_action.effect.normal[0].value.scale = 0;
  assert.ok(validateScenario(v).length > 0);
});


test('Sprite motion with empty step uses implicit middle node (timeline 0 -> 2)', async () => {
  const engine = new GameEngine();
  try {
    const scenario = spriteScenario();
    scenario.sprite.door.motion.step = [];
    await engine.init(scenario, { enterScene: true });
    SetStrategies.sprite(engine, { target: 'door', property: 'position', value: [200, 300, 0] });
    const motionEvent = engine.protocol.eventLog.filter(event => event.event === 'presentation.sprite.motion').at(-1);
    assert.deepEqual(motionEvent.payload.path, [[100,200,0],[150,250,0],[200,300,0]]);
    assert.deepEqual(motionEvent.payload.waypoints, [[150,250,0]]);
  } finally { engine.dispose(); }
});


test('protocol: Sprite motion event payload validates against strict protocol schema', () => {
  const schema = JSON.parse(readFileSync(new URL('../engine/protocol/sprite-motion.schema.json', import.meta.url), 'utf8'));
  const validate = new Ajv({ strict: false }).compile(schema);
  const payload = { spriteId: 'door', from: [0,0,0], waypoints: [[5,5,0]], to: [10,10,0], path: [[0,0,0],[5,5,0],[10,10,0]], duration: 1000, type: 'sin_positive', easing: 'ease_in_out' };
  assert.equal(validate(payload), true);
  assert.equal(validate({ ...payload, easing: 'unknown' }), false);
  assert.equal(validate({ ...payload, extra: true }), false);
});
