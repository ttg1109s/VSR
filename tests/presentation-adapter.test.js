import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine, DEMO_SCRIPT } from '../engine/index.js';
import { EngineAdapter } from '../client/adapters/EngineAdapter.js';
import { PresentationAdapter } from '../client/adapters/PresentationAdapter.js';

test('EngineAdapter projects only the active router action list', async () => {
  const engine = new GameEngine();
  const engineAdapter = new EngineAdapter(engine);
  const adapter = new PresentationAdapter(engineAdapter);
  const presentationEvents = [];
  adapter.subscribe(message => { if (message.type === 'presentation') presentationEvents.push(message); });
  try {
    await engineAdapter.initialize(DEMO_SCRIPT);
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
    const sceneRender = presentationEvents.find(message => message.name === 'scene.render');
    assert.ok(sceneRender, 'SceneSystem.render() should reach the presentation adapter');
    assert.equal(sceneRender.payload.sceneId, 'scene_garden');
    assert.equal(sceneRender.payload.routerId, 'square_gate');
    assert.deepEqual(sceneRender.payload.actionIds, initial.actions.map(action => action.id));

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
    engineAdapter.dispose();
    engine.dispose();
  }
});
