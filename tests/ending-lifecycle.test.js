import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importModule } from './imports/index.js';
const {GameEngine}=await importModule('GameEngine');

function scenario(){
 const s=JSON.parse(readFileSync(new URL('./fixtures/engine/minimal-scenario.json',import.meta.url),'utf8'));
 s.endings.good={title:'A New Dawn',desc:'The journey is complete.\n\nThe world begins again.'};
 return s;
}
test('ending activation is authoritative, idempotent, and terminal commands are rejected',async()=>{
 const engine=new GameEngine();
 await engine.init(scenario());
 const first=engine.activateEnding('good');
 assert.equal(first.success,true);
 assert.equal(engine.endingState.id,'good');
 const second=engine.activateEnding('good');
 assert.equal(second.alreadyEnded,true);
 const ack=await engine.dispatchProtocolCommand({protocol:'vsr',protocolVersion:2,type:'command',commandId:'terminal-action-1',command:'action.trigger',payload:{actionId:'test_action',uniqueId:'start_main_test_action'},expectedStateRevision:engine.protocol.stateRevision});
 assert.equal(ack.ok,false);
 assert.equal(ack.error.code,'SCENARIO_TERMINAL');
 const save=engine.exportSave();
 assert.equal(save.endingState.id,'good');
 engine.dispose?.();
});
test('ending lifecycle survives save and restore with authoritative snapshot payload',async()=>{
 const engine=new GameEngine();
 await engine.init(scenario());
 engine.activateEnding('good');
 const save=engine.exportSave();
 const restored=new GameEngine();
 const result=await restored.restoreSave(save);
 assert.equal(result.restored,true);
 assert.equal(restored.endingState.id,'good');
 const snapshot=restored.protocol.createSnapshot(restored);
 assert.equal(snapshot.presentation.ending.title,'A New Dawn');
 assert.equal(snapshot.presentation.ending.desc,'The journey is complete.\n\nThe world begins again.');
});
test('invalid ending in save is rejected before replacing the current runtime',async()=>{
 const engine=new GameEngine();
 await engine.init(scenario());
 const currentScene=engine.api.engine.state.get('sceneId');
 const save=engine.exportSave();
 save.endingState={id:'missing-ending',title:'Bad',desc:'Bad'};
 await assert.rejects(()=>engine.restoreSave(save),/Save ending does not exist in scenario/);
 assert.equal(engine.api.engine.state.get('sceneId'),currentScene);
 assert.equal(engine.endingState,null);
});
