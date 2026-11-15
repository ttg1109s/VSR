import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine, DEMO_SCRIPT } from '../engine/index.js';
import { EngineAdapter } from '../client/adapters/EngineAdapter.js';

test('EngineAdapter projects only the active router action list', async () => {
  const engine = new GameEngine();
  const adapter = new EngineAdapter(engine);
  try {
    await adapter.initialize(DEMO_SCRIPT);
    const initial = adapter.getViewModel();

    assert.equal(initial.sceneId, 'scene_garden');
    assert.equal(initial.routerId, 'square_gate');
    assert.deepEqual(initial.actions.map(action => action.id), [
      'act_read_notice',
      'act_talk_mai',
      'act_enter_well',
      'act_travel_inn',
      'act_travel_chapel',
      'act_travel_school',
      'act_travel_forest'
    ]);
    assert.equal(initial.actions.some(action => action.id === 'act_inspect_well'), false);

    await engine.enterRouter('square_well', true, false, true);
    const next = adapter.getViewModel();

    assert.equal(next.sceneId, 'scene_garden');
    assert.equal(next.routerId, 'square_well');
    assert.deepEqual(next.actions.map(action => action.id), [
      'act_inspect_well',
      'act_use_lantern',
      'act_return_square'
    ]);
    assert.equal(next.actions.some(action => action.id === 'act_read_notice'), false);
  } finally {
    adapter.dispose();
    engine.dispose();
  }
});
