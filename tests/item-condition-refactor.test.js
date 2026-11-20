import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_SCRIPT } from '../demo_script.js';
import { validateScenario } from '../engine/scenario/Scenario.js';

const removedConditionStates = [
  'radio_toolkit_damaged',
  'compass_damaged',
  'bell_wire_damaged',
  'seal_damaged',
  'identity_verified',
  'trust_mai',
  'final_choice',
  'clue_school_evacuation_notice',
  'cellar_open',
  'radio_signal_restored',
  'evidence_broadcast',
  'evidence_well_badge',
  'evidence_hymn_note',
  'evidence_bell_wire',
  'evidence_class_register',
  'evidence_forest_route',
  'evidence_gear_pin',
  'evidence_tunnel_manifest',
  'evidence_station_ticket',
  'room7_open',
  'room7_opened_cleanly',
  'room7_forced',
  'room7_key_repaired',
  'room7_clue_partial',
  'room7_clue_verified',
  'room7_opened_alternative',
  'room7_clue_source',
  'player_recovered',
  'mill_repair_failed',
  'evidence_corrupted',
  'mai_confessed',
  'hanh_confessed',
  'keeper_confessed',
  'npc_recovered_trust',
  'clue_well_bottom_partial',
  'echo_distorted',
  'archive_opened_alternative',
  'release_partial',
  'release_reconstructed',
  'memory_reward_roster',
  'memory_reward_well',
  'memory_reward_stakes',
  'resolve_reward_repair',
  'map_verified',
  'mill_powered_partial',
  'archive_reconstructed',
  'bell_rung_cleanly'
];

function collectReferences(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    node.forEach(value => collectReferences(value, out));
    return out;
  }
  if (node.type === 'state' && node.property) out.push(node.property);
  if (node.type === 'set' && node.subtype === 'state' && node.target) out.push(node.target);
  Object.values(node).forEach(value => collectReferences(value, out));
  return out;
}

test('item-condition refactor plus audited write-only-state cleanup preserves schema', () => {
  assert.deepEqual(validateScenario(DEMO_SCRIPT), []);

  for (const stateId of removedConditionStates) {
    assert.equal(Object.hasOwn(DEMO_SCRIPT.globalStates, stateId), false, stateId);
    assert.equal(collectReferences(DEMO_SCRIPT).includes(stateId), false, stateId);
  }

  const sealRequirement = DEMO_SCRIPT.actions.action_verify_seal.requirement.check;
  assert.ok(sealRequirement.some(check =>
    check.type === 'item' &&
    check.subtype === 'usage' &&
    check.target === 'evacuation_seal' &&
    check.op === '>' &&
    check.value === 0
  ));
  assert.equal(Object.hasOwn(DEMO_SCRIPT.globalStates, 'seal_damaged'), false);

  assert.ok(DEMO_SCRIPT.actions.action_force_seal.effect.pass.some(effect =>
    effect.type === 'item' &&
    effect.subtype === 'usage' &&
    effect.target === 'evacuation_seal' &&
    effect.value === 1
  ));

  // These flags encode action/event semantics not uniquely represented by usage.
  assert.equal(Object.hasOwn(DEMO_SCRIPT.globalStates, 'lantern_damaged'), true);
  assert.equal(Object.hasOwn(DEMO_SCRIPT.globalStates, 'room7_key_damaged'), true);
  assert.equal(Object.hasOwn(DEMO_SCRIPT.globalStates, 'room7_key_broken'), true);
});
