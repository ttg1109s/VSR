import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_SCRIPT } from '../demo_script.js';
import { validateScenario } from '../engine/scenario/Scenario.js';

const removedConditionStates = [
  'radio_toolkit_damaged',
  'compass_damaged',
  'bell_wire_damaged',
  'seal_damaged'
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

test('item-condition refactor preserves schema and removes redundant/dead condition flags', () => {
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
