import { importModules } from './imports/index.js';
const modules = await importModules(['Scenario','ScenarioSchema','LogicSystem','Resolver','StateAccess','ActionSystem','ManagementStrategies','EffectStrategies','GameEngine','SaveState','LoaderSystem','PasswordVerification']);
const { validateScenario, normalizeScenario } = modules.Scenario;
const scenarioSchema = modules.ScenarioSchema.default;
const { LogicSystem } = modules.LogicSystem;
const { resolveValue } = modules.Resolver;
const { createStateAccess } = modules.StateAccess;
const { ActionSystem } = modules.ActionSystem;
const { StaticListResolvers } = modules.ManagementStrategies;
const { SetStrategies, GotoStrategies, EffectHandlers } = modules.EffectStrategies;
const { GameEngine } = modules.GameEngine;
const { LoaderSystem } = modules.LoaderSystem;
const { verifyPassword } = modules.PasswordVerification;
const { validateCharacterVisitCounters } = modules.SaveState;
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const fixture = () => JSON.parse(readFileSync(new URL('./fixtures/engine/minimal-scenario.json', import.meta.url), 'utf8'));

test('NOT propagates malformed and missing requirement references as invalid, never pass', () => {
  const engine = Object.assign({ src: { templates: { requirements: {} }, globalStates: { flag: { type: 'boolean' } } }, api: { engine: { state: { getRuntime: () => undefined, get: () => false } } } }, LogicSystem);
  const missing = LogicSystem.checkReq.call(engine, { logic: 'NOT', check: [{ ref: 'missing' }] });
  const malformed = LogicSystem.checkReq.call(engine, { logic: 'NOT', check: [{ type: 'unknown', op: '==', value: 1 }] });
  const missingSubtype = LogicSystem.checkReq.call(engine, { logic: 'NOT', check: [{ type: 'item', op: 'has', value: 'key' }] });
  assert.deepEqual(missing, { pass: false, type: 'invalid_requirement' });
  assert.deepEqual(malformed, { pass: false, type: 'invalid_requirement' });
  assert.deepEqual(missingSubtype, { pass: false, type: 'invalid_requirement' });
  const validFalse = LogicSystem.checkReq.call(engine, { logic: 'NOT', check: [{ type: 'state', property: 'flag', op: '==', value: true }] });
  assert.equal(validFalse.pass, true);
});

test('requirement semantic validator detects cycles and nested missing template references', () => {
  const cycle = fixture();
  cycle.templates.requirements = {
    A: { logic: 'AND', check: [{ ref: 'B' }] },
    B: { logic: 'OR', check: [{ ref: 'A' }] }
  };
  assert.ok(validateScenario(cycle).some(error => error.includes('requirement template cycle detected')));
  const missing = fixture();
  missing.templates.requirements = { A: { logic: 'AND', check: [{ logic: 'NOT', check: [{ ref: 'missing' }] }] } };
  assert.ok(validateScenario(missing).some(error => error.includes("references missing requirement template 'missing'")));
});

test('set/action_count schema accepts direct assignment zero and rejects mode', () => {
  const direct = fixture();
  direct.actions.test_action.effect = { normal: [{ type: 'set', subtype: 'action_count', target: 'test_action', phase: 'normal', value: 0 }] };
  assert.deepEqual(validateScenario(direct), []);
  const withMode = fixture();
  withMode.actions.test_action.effect = { normal: [{ type: 'set', subtype: 'action_count', target: 'test_action', phase: 'normal', mode: 'add', value: 1 }] };
  assert.ok(validateScenario(withMode).some(error => error.includes('must NOT have required property')) || validateScenario(withMode).length > 0);
});


test('requirement-check set/action_count subtype is not exposed (counter checks use dedicated type)', () => {
  const scenario = fixture();
  scenario.actions.test_action.requirement = { logic: null, check: [{ type: 'set', subtype: 'action_count', target: 'test_action', property: 'count', phase: 'normal', op: '==', value: 0 }] };
  assert.ok(validateScenario(scenario).length > 0);
});

test('CMS Router action membership mutates runtime list and only accepts known global Actions', async () => {
  const scenario = fixture();
  scenario.actions.new_action = { meta: { title: 'New' }, set: { display: 'show' } };
  const engine = new GameEngine();
  try {
    await engine.init(scenario, { enterScene: true });
    await EffectHandlers.cms.call(engine, { table: 'routers', id: 'main', column: 'actions', method: 'set', value: ['new_action'] });
    assert.deepEqual(engine.api.engine.state.getRuntime('routers.[routerKey].actions', { routerKey: 'start_main' }), ['new_action']);
    assert.deepEqual(engine.getEffectiveActions('start', 'main').map(action => action.id), ['new_action']);
    await assert.rejects(EffectHandlers.cms.call(engine, { table: 'routers', id: 'main', column: 'actions', method: 'set', value: ['missing'] }), /known global Action IDs/);
  } finally { engine.dispose(); }
});

test('Router mutation and goto resolve globally unique cross-Scene Router IDs', async () => {
  const scenario = fixture();
  scenario.scenes.other = { meta: { title: 'Other' }, set: { activeRouterId: 'otherR' }, routers: { otherR: { meta: { subTitleStatus: 'Other Router' }, set: {}, actions: [] } } };
  const engine = new GameEngine();
  try {
    await engine.init(scenario, { enterScene: true });
    SetStrategies.router(engine, { target: 'otherR', property: 'blocked', value: true });
    assert.equal(engine.api.engine.state.getRuntime('routers.[routerKey].blocked', { routerKey: 'other_otherR' }), true);
    engine.api.engine.state.set('routers.[routerKey].blocked', false, { routerKey: 'other_otherR' });
    const result = await GotoStrategies.router(engine, { target: 'otherR' });
    assert.equal(result?.success, true);
    assert.equal(engine.api.engine.state.get('sceneId'), 'other');
    assert.equal(engine.api.engine.state.get('scene.activeRouterId', { id: 'other' }), 'otherR');
  } finally { engine.dispose(); }
});


test('cross-Scene manage_effect Router scope resolves owner Scene and source hook', () => {
  const src = { path: { routers: { otherR: 'other' } }, scenes: { other: { routers: { otherR: { loop: { enter: [{ type: 'notify', message: 'owned' }] } } } } } };
  const resolved = modules.ManagementStrategies.EffectScopeResolvers.router({ target: 'otherR', in: 'enter' }, { sceneId: 'start' }, { src, api: { engine: { state: { sceneId: 'start' } } } });
  assert.deepEqual(resolved, { scope: 'router', params: { sId: 'other', rId: 'otherR', hook: 'enter' } });
  assert.equal(StaticListResolvers.router(src, resolved.params).length, 1);
});

test('terminal password failure increments pwFailed even without authored hook', async () => {
  let counter = 0;
  const engine = Object.assign({
    api: { engine: { state: { get: () => 'start', getRuntimeSnapshot: () => ({}), update: (_path, updater) => { const next = updater({ count: { pwFailed: counter } }); counter = next.count.pwFailed; } } } },
    incrementActionCount: (_id, phase) => { if (phase === 'pwFailed') counter++; },
    processRunnables: async () => { throw new Error('should not execute without hook'); },
    commitState() {}, isTransitioning: false, isActionProcessing: false
  }, ActionSystem);
  const result = await ActionSystem.finishPasswordAction.call(engine, { effect: {} }, 'action', 'action', 'exhausted', { sceneId: 'start', routerId: 'main' });
  assert.equal(result.reason, 'exhausted');
  assert.equal(counter, 1);
});

test('minTransition default and authored Scene duration are clamped consistently', () => {
  const scenario = fixture();
  scenario.config.minTransition = 5;
  scenario.scenes.start.set.transitionDuration = 1;
  const normalized = LoaderSystem.loadScript(scenario, {}).state;
  assert.equal(normalized.config.minTransition, 5);
  assert.equal(normalized.scenes.start.transitionDuration, 5);
  const defaulted = LoaderSystem.loadScript(fixture(), {}).state;
  assert.equal(defaulted.config.minTransition, 2);
  assert.equal(defaulted.scenes.start.transitionDuration, 2);
});


test('caseSensitive password option is schema-exposed and respected by verification', () => {
  const scenario = fixture();
  scenario.passwords.string = { code: { desc: 'Code', value: 'Secret', caseSensitive: true } };
  assert.deepEqual(validateScenario(scenario), []);
  assert.equal(verifyPassword('string', scenario.passwords.string.code, 'Secret'), true);
  assert.equal(verifyPassword('string', scenario.passwords.string.code, 'secret'), false);
  scenario.passwords.string.code.caseSensitive = false;
  assert.equal(verifyPassword('string', scenario.passwords.string.code, 'secret'), true);
});

test('source getter returns detached clones', () => {
  const engine = { src: { meta: { title: 'Original' } }, state: {}, chatState: null, pendingPasswordAction: null, commitState() {} };
  const state = createStateAccess(engine);
  const source = state.getSource('meta');
  source.title = 'Changed';
  assert.equal(engine.src.meta.title, 'Original');
});

test('Resolver parses quoted literals consistently and exponent precedence is mathematical', () => {
  const engine = { api: { engine: { state: { get: path => path === 'title' ? 'Scenario' : undefined } } } };
  assert.equal(resolveValue("$get('title')", engine), 'Scenario');
  assert.equal(resolveValue("$color('Hello','#ff0000')", engine), '<span style="color:#ff0000">Hello</span>');
  assert.equal(resolveValue("$is_a('hello')", engine), 'hello');
  assert.deepEqual(resolveValue("$a('text',2,true)", engine), ['text', 2, true]);
  assert.equal(resolveValue('$calc(-2**2)', engine), -4);
  assert.equal(resolveValue('$calc(2**-2)', engine), 0.25);
  assert.equal(resolveValue("$round('2.5')", engine), 3);
  assert.equal(resolveValue("$if(true,'yes','no')", engine), 'yes');
});

test('manage_effect Action source list resolves from global Action definitions', () => {
  const src = { actions: { actionA: { effect: { normal: [{ type: 'notify', message: 'x' }] } } }, scenes: { start: { routers: { main: { actions: ['actionA'] } } } } };
  assert.equal(StaticListResolvers.action(src, { sId: 'start', rId: 'main', aId: 'actionA', hook: 'normal' }).length, 1);
});

test('effective Action membership uses runtime Router action IDs when CMS mutates them', () => {
  const runtimeRouter = { actions: ['new_action'] };
  const state = {
    getRuntime: path => path === 'routers.[id]' ? runtimeRouter : undefined,
    getRuntimeSnapshot: path => path === 'actions.[id]' ? {} : undefined
  };
  const engine = { src: { scenes: { start: { routers: { main: { actions: ['old_action'] } } } }, actions: { new_action: { meta: { title: 'New' } } } }, api: { engine: { state } } };
  assert.deepEqual(ActionSystem.getEffectiveActions.call(engine, 'start', 'main').map(action => action.id), ['new_action']);
});

test('runtime movement save validation allows list length changes but validates canonical entry fields', () => {
  const saved = { npc: { place: { currentIndex: 1 }, moveList: [
    { scene_id: 'start', entryId: 'original', countVisited: 0 },
    { scene_id: 'start', entryId: 'runtime-added', countVisited: 2 }
  ] } };
  assert.equal(validateCharacterVisitCounters(saved, { npc: { moveList: [{ entryId: 'original', scene_id: 'start' }] } }), saved);
  assert.throws(() => validateCharacterVisitCounters({ npc: { moveList: [{ scene_id: 'start', entryId: 'bad', countVisited: -1 }] } }, { npc: {} }), /countVisited/);
});


test('runtime-added Character movement entry survives Engine export and restore', async () => {
  const scenario = fixture();
  scenario.characters.npc = { meta: { name: 'NPC', desc: '' }, set: { linkEffect: false, alert: null, moving: false, move: 'list' }, stats: {}, inventory: [], hand: [], relationship: [], met: [], place: { scene_id: 'start', currentIndex: 0 }, moveList: [{ entryId: 'original', scene_id: 'start', countVisited: 0 }] };
  const engine = new GameEngine();
  try {
    await engine.init(scenario, { enterScene: true });
    engine.api.engine.state.update('characters.[id].moveList', list => [...list, { entryId: 'runtime-added', scene_id: 'start', countVisited: 0 }], { id: 'npc' });
    const save = engine.exportSave();
    assert.equal(save.state.characters.npc.moveList.length, 2);
    const result = await engine.restoreSave(save);
    assert.equal(result.restored, true);
    assert.equal(engine.api.engine.state.getRuntime('characters.[id].moveList', { id: 'npc' }).length, 2);
  } finally { engine.dispose(); }
});

test('restore rejects missing canonical runtime domains', async () => {
  const engine = new GameEngine();
  try {
    await engine.init(fixture(), { enterScene: false });
    const save = engine.exportSave();
    delete save.state.itemInfo;
    await assert.rejects(engine.restoreSave(save), /Save state does not match scenario structure/);
  } finally { engine.dispose(); }
});

test('engine init rejects blocked entry Scene when enterScene is requested', async () => {
  const scenario = fixture();
  scenario.scenes.start.set.blocked = true;
  const engine = new GameEngine();
  try { await assert.rejects(engine.init(scenario, { enterScene: true }), /could not be entered: target_locked/); }
  finally { engine.dispose(); }
});

test('maxCharacterMoving schedules only the configured number and queues additional Characters', async () => {
  const scenario = fixture();
  scenario.config.maxCharacterMoving = 1;
  const engine = new GameEngine();
  try {
    await engine.init(scenario, { enterScene: false });
    const state = engine.api.engine.state;
    const movementChar = id => ({ set: { moving: true, move: 'list' }, place: { scene_id: 'start', currentIndex: 0 }, moveList: [{ entryId: `${id}.move`, scene_id: 'start', countVisited: 0, nextStep: 100, loop: {} }] });
    for (const id of ['npc1','npc2','npc3']) state.set('characters.[id]', movementChar(id), { id });
    engine.initCharactersMoving();
    assert.equal(engine.characterMoveSlots.size, 1);
    assert.equal(engine.characterMoveQueue.size, 2);
    engine.executeCharacterMove = async () => ({ status: 'test' });
    const firstTask = engine.taskManager.plan.move_char_npc1;
    await firstTask.callback();
    assert.equal(engine.characterMoveSlots.size, 1);
    assert.equal(engine.characterMoveQueue.size, 1);
    assert.ok(engine.taskManager.plan.move_char_npc2);
  } finally { engine.dispose(); }
});
