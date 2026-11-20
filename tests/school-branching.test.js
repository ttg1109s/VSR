import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_SCRIPT } from '../demo_script.js';

const actions = DEMO_SCRIPT.actions;
const states = DEMO_SCRIPT.globalStates;
const reqs = DEMO_SCRIPT.templates.requirements;

function requirementChecks(actionId) {
  const req = actions[actionId]?.requirement;
  assert.ok(req, `Missing requirement for ${actionId}`);
  assert.ok(Array.isArray(req.check));
  assert.ok(req.check.every(c => c && typeof c.type === 'string' && !('logic' in c)), `Requirement ${actionId} must use supported flat checks`);
  return req.check;
}

test('school branch state starts undecided and does not overwrite ending choice', () => {
  assert.equal(states.school_choice?.type, 'string');
  assert.equal(states.school_choice?.value, 'undecided');
  assert.equal(states.final_choice?.value, 'undecided');
});

test('school commitment Actions require undecided and clue conflict', () => {
  for (const id of ['action_talk_linh', 'action_recover_class_register']) {
    const checks = requirementChecks(id);
    assert.ok(checks.some(c => c.type === 'state' && c.property === 'school_choice' && c.op === '==' && c.value === 'undecided'));
    assert.ok(checks.some(c => c.type === 'state' && c.property === 'clue_photo' && c.value === true));
  }
});

test('Memory commitment sets branch before chat and locks Evidence Action', () => {
  const pass = actions.action_talk_linh.effect.pass;
  assert.equal(pass[0].target, 'school_choice');
  assert.equal(pass[0].value, 'memory');
  assert.ok(pass.some(e => e.type === 'set' && e.subtype === 'action' && e.target === 'action_recover_class_register' && e.value === 'hide'));
  const hideMemory = pass.findIndex(e => e.type === 'set' && e.subtype === 'action' && e.target === 'action_talk_linh' && e.value === 'hide');
  const hideEvidence = pass.findIndex(e => e.type === 'set' && e.subtype === 'action' && e.target === 'action_recover_class_register' && e.value === 'hide');
  const gotoChat = pass.findIndex(e => e.type === 'goto' && e.subtype === 'chat' && e.target === 'chat_linh');
  assert.ok(hideMemory >= 0 && hideEvidence >= 0 && hideMemory < gotoChat && hideEvidence < gotoChat, 'hide opposing Action before chat transition');
});

test('Evidence commitment sets branch before reward and locks Memory Action', () => {
  const pass = actions.action_recover_class_register.effect.pass;
  assert.equal(pass[0].target, 'school_choice');
  assert.equal(pass[0].value, 'evidence');
  assert.ok(pass.some(e => e.type === 'item' && e.target === 'class_register_copy'));
  assert.ok(pass.some(e => e.type === 'set' && e.subtype === 'action' && e.target === 'action_talk_linh' && e.value === 'hide'));
});

test('desk conflict discovery no longer grants both branch reward bundles', () => {
  const pass = actions.action_check_desk.effect.pass;
  assert.ok(pass.some(e => e.type === 'set' && e.target === 'clue_photo'));
  assert.ok(!pass.some(e => e.type === 'item' && e.target === 'class_photo'));
  assert.ok(!pass.some(e => e.type === 'set' && e.target === 'truth_fragments'));
});

test('roster decoding is Evidence-only and gives map progression', () => {
  const checks = requirementChecks('action_decode_roster');
  assert.ok(checks.some(c => c.type === 'state' && c.property === 'school_choice' && c.value === 'evidence'));
  assert.ok(checks.some(c => c.type === 'item' && c.value === 'class_register_copy'));
  assert.ok(actions.action_decode_roster.effect.pass.some(e => e.type === 'item' && e.target === 'map_fragment'));
});

test('Memory has dedicated station and release Actions with flat requirements', () => {
  const station = actions.action_reach_station_memory;
  const ending = actions.action_choose_fate_memory;
  assert.ok(station && ending);
  for (const id of ['action_reach_station_memory', 'action_choose_fate_memory']) requirementChecks(id);
  assert.ok(requirementChecks('action_reach_station_memory').some(c => c.property === 'school_choice' && c.value === 'memory'));
  assert.ok(requirementChecks('action_choose_fate_memory').some(c => c.property === 'school_choice' && c.value === 'memory'));
});

test('Evidence progression templates remain flat and evidence-gated', () => {
  for (const name of ['station_ready', 'release_ready']) {
    const req = reqs[name];
    assert.ok(req);
    assert.ok(req.check.every(c => c && typeof c.type === 'string' && !('logic' in c)));
  }
});

test('both station router states expose Memory route Action', () => {
  const refs = [];
  for (const [sceneId, scene] of Object.entries(DEMO_SCRIPT.scenes)) {
    for (const [routerId, router] of Object.entries(scene.routers || {})) {
      if (router.actions?.includes('action_reach_station_memory')) refs.push(`${sceneId}.${routerId}`);
    }
  }
  assert.ok(refs.length >= 2, 'Memory station Action should be reachable from both tunnel routers');
});

test('Memory ending Action is available in station routers', () => {
  const refs = [];
  for (const [sceneId, scene] of Object.entries(DEMO_SCRIPT.scenes)) {
    for (const [routerId, router] of Object.entries(scene.routers || {})) {
      if (router.actions?.includes('action_choose_fate_memory')) refs.push(`${sceneId}.${routerId}`);
    }
  }
  assert.ok(refs.length >= 2, 'Memory release Action should be exposed in both station routers');
});


test('plaza and inn dialogue react to the irreversible branch', () => {
  for (const chatId of ['chat_mai_memory', 'chat_mai_evidence', 'chat_hanh_memory', 'chat_hanh_evidence']) assert.ok(DEMO_SCRIPT.chat[chatId], `Missing branch chat ${chatId}`);
  assert.ok(actions.action_talk_mai.effect.normal.some(e => e.target === 'chat_mai_memory' && e.req?.check?.some(c => c.property === 'school_choice' && c.value === 'memory')));
  assert.ok(actions.action_talk_mai.effect.normal.some(e => e.target === 'chat_mai_evidence' && e.req?.check?.some(c => c.property === 'school_choice' && c.value === 'evidence')));
  assert.ok(actions.action_talk_hanh.effect.normal.some(e => e.target === 'chat_hanh_memory' && e.req?.check?.some(c => c.property === 'school_choice' && c.value === 'memory')));
  assert.ok(actions.action_talk_hanh.effect.normal.some(e => e.target === 'chat_hanh_evidence' && e.req?.check?.some(c => c.property === 'school_choice' && c.value === 'evidence')));
});

test('commitment updates branch Action visibility in both directions', () => {
  const memory = actions.action_talk_linh.effect.pass;
  const evidence = actions.action_recover_class_register.effect.pass;
  const hasDisplay = (list, id, value) => list.some(e => e.type === 'set' && e.subtype === 'action' && e.target === id && e.property === 'display' && e.value === value);
  assert.ok(hasDisplay(memory, 'action_reach_station', 'hide'));
  assert.ok(hasDisplay(memory, 'action_choose_fate', 'hide'));
  assert.ok(hasDisplay(memory, 'action_reach_station_memory', 'show'));
  assert.ok(hasDisplay(memory, 'action_choose_fate_memory', 'show'));
  assert.ok(hasDisplay(evidence, 'action_reach_station_memory', 'hide'));
  assert.ok(hasDisplay(evidence, 'action_choose_fate_memory', 'hide'));
  assert.ok(hasDisplay(evidence, 'action_reach_station', 'show'));
  assert.ok(hasDisplay(evidence, 'action_choose_fate', 'show'));
});
