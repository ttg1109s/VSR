import test,{afterEach}from'node:test';
import assert from'node:assert/strict';
import{GameEngine}from'../engine/GameEngine.js';
import{DEMO_SCRIPT}from'../demo_script.js';
import{JsonProtocol}from'../core/protocol/JsonProtocol.js';
import{normalizeScenario,validateScenario}from'../engine/scenario/Scenario.js';
const engines=[];
const makeEngine=options=>{const e=new GameEngine(options);engines.push(e);return e;};
afterEach(()=>{for(const e of engines.splice(0))e.dispose();});
test('Engine constructs headlessly without browser globals',()=>{assert.equal(typeof globalThis.window,'undefined');assert.equal(typeof globalThis.document,'undefined');const e=makeEngine();assert.ok(e.protocol instanceof JsonProtocol);assert.ok(e.api);assert.ok(e.taskManager);});
test('Scenario normalization clones input and adds independent format version',()=>{const original=structuredClone(DEMO_SCRIPT);const normalized=normalizeScenario(original);assert.equal(original.formatVersion,undefined);assert.equal(normalized.formatVersion,1);assert.notEqual(normalized,original);assert.deepEqual(validateScenario(original),[]);});
test('Invalid scenario is rejected before source assignment',async()=>{const e=makeEngine();await assert.rejects(()=>e.init({scenes:{}}),/Invalid VSR scenario/);assert.equal(e.src,null);});
test('Demo scenario loads and enters initial scene without DOM',async()=>{const e=makeEngine();await e.init(structuredClone(DEMO_SCRIPT));assert.ok(e.src);assert.equal(e.state.sceneId,DEMO_SCRIPT.meta.entryScene);assert.ok(e.state.scenes[e.state.sceneId].activeRouterId);assert.equal(e.api.engine.state.get('title'),DEMO_SCRIPT.meta.title);assert.doesNotThrow(()=>JSON.stringify(e.protocol.createSnapshot(e)));});
test('Two Engine instances isolate state and presentation streams',async()=>{const a=makeEngine({engineId:'session-a'}),b=makeEngine({engineId:'session-b'});const sa=structuredClone(DEMO_SCRIPT),sb=structuredClone(DEMO_SCRIPT);sa.meta.title='A';sb.meta.title='B';await a.init(sa);await b.init(sb);assert.equal(a.api.engine.state.get('title'),'A');assert.equal(b.api.engine.state.get('title'),'B');const beforeA=a.protocol.eventSequence,beforeB=b.protocol.eventSequence;a.api.presentation.notification.add('A','only','info');assert.ok(a.protocol.eventSequence>beforeA);assert.equal(b.protocol.eventSequence,beforeB);});
test('Scene command awaits completion and commits state',async()=>{const e=makeEngine();await e.init(structuredClone(DEMO_SCRIPT));const target=Object.keys(e.state.scenes).find(id=>id!==e.state.sceneId);assert.ok(target);const before=e.protocol.stateRevision;const ack=await e.dispatchProtocolCommand(e.protocol.createCommand('scene.enter',{sceneId:target,skipTransition:true},{commandId:'scene-enter'}));assert.equal(ack.ok,true);assert.equal(e.state.sceneId,target);assert.ok(e.protocol.stateRevision>before);assert.ok(e.protocol.getEventsAfter(0).events.some(x=>x.event==='state.snapshot'));});
test('Password command trusts only scenario-owned password definitions',async()=>{const e=makeEngine();const s=structuredClone(DEMO_SCRIPT),sid=s.meta.entryScene,rid=s.scenes[sid].set.activeRouterId;s.passwords.string.vsr_secret={value:'OpenSesame'};s.actions.vsr_password={meta:{title:'Password'},set:{display:'show',password:'string:vsr_secret'},effect:{pass:[],pwFailed:[]}};s.scenes[sid].routers[rid].actions.push('vsr_password');await e.init(s);const unsolicited=await e.dispatchProtocolCommand(e.protocol.createCommand('password.submit',{actionId:'vsr_password',input:'OpenSesame'},{commandId:'password-unsolicited'}));
assert.equal(unsolicited.ok,false);
const beforePrompt=e.protocol.eventSequence;
await e.handleAction('vsr_password');
const promptEvents=e.protocol.getEventsAfter(beforePrompt).events.filter(x=>x.event==='presentation.components.keyboard');
assert.equal(promptEvents.length,1);
assert.equal(JSON.stringify(promptEvents[0]).includes('OpenSesame'),false);
const spoof=await e.dispatchProtocolCommand(e.protocol.createCommand('password.submit',{actionId:'vsr_password',passwordType:'string',passwordConfig:{value:'fake'},actionDef:{effect:{pass:[]}},input:'fake'},{commandId:'password-spoof'}));
assert.equal(spoof.ok,true);
const key=`${sid}_${rid}_vsr_password`;
assert.equal(e.state.actions[key].countFails,1);
await e.handleAction('vsr_password');
const valid=await e.dispatchProtocolCommand(e.protocol.createCommand('password.submit',{actionId:'vsr_password',input:'OpenSesame'},{commandId:'password-valid'}));
assert.equal(valid.ok,true);});
test('Unknown commands and duplicate command IDs are handled safely',async()=>{const p=new JsonProtocol();let n=0;p.registerCommand('test.add',x=>++n+x.amount);const c=p.createCommand('test.add',{amount:1},{commandId:'once'});const a=await p.dispatch(c),b=await p.dispatch(c);assert.equal(a.result,2);assert.equal(b.result,2);assert.equal(n,1);const bad=await p.dispatch(p.createCommand('constructor',{}, {commandId:'unknown'}));assert.equal(bad.error.code,'UNKNOWN_COMMAND');});
test('State revision and event sequence are independent',async()=>{const p=new JsonProtocol(),engine={src:{},state:{sceneId:'s',scenes:{s:{activeRouterId:'r'}}}};p.registerCommand('mutate',()=>p.commitState(engine,'mutate'));p.publish('presentation.toast');assert.equal(p.stateRevision,0);assert.equal(p.eventSequence,1);const ok=await p.dispatch(p.createCommand('mutate',{}, {commandId:'rev-ok',expectedStateRevision:0}));assert.equal(ok.ok,true);assert.equal(p.stateRevision,1);const stale=await p.dispatch(p.createCommand('mutate',{}, {commandId:'rev-stale',expectedStateRevision:0}));assert.equal(stale.error.code,'REVISION_CONFLICT');});
test('Command dispatch is serialized',async()=>{const p=new JsonProtocol();let value=0;p.registerCommand('add',async x=>{const old=value;await new Promise(r=>setTimeout(r,4));value=old+x.n;return value;});const [a,b]=await Promise.all([p.dispatch(p.createCommand('add',{n:1},{commandId:'a'})),p.dispatch(p.createCommand('add',{n:1},{commandId:'b'}))]);assert.ok(a.ok&&b.ok);assert.equal(value,2);});
test('Authorization hook can reject untrusted command context',async()=>{const p=new JsonProtocol({authorizeCommand:({context})=>context.authenticated===true});p.registerCommand('private',()=>1);const ack=await p.dispatch(p.createCommand('private',{}, {commandId:'forbidden'}),{authenticated:false});assert.equal(ack.error.code,'FORBIDDEN');});
test('Effect queue cancellation resolves pending callers',async()=>{const e=makeEngine();let resolve;const pending=new Promise(r=>resolve=r);e.state.effectQueue.sync.push({resolve});e.clearEffectQueue();assert.deepEqual(await pending,{cancelled:true});});
test('Save roundtrip excludes runtime queues and restores domain state',async()=>{const a=makeEngine();await a.init(structuredClone(DEMO_SCRIPT));const save=a.exportSave();assert.equal(save.protocol,'vsr-save');assert.equal('effectQueue'in save.state,false);const b=makeEngine();await b.restoreSave(save);assert.equal(b.state.sceneId,a.state.sceneId);assert.equal(b.src.meta.title,a.src.meta.title);});
test('Presentation events are JSON-safe without renderer',async()=>{const e=makeEngine();await e.init(structuredClone(DEMO_SCRIPT));const events=e.protocol.getEventsAfter(0).events;assert.ok(events.some(x=>x.event.startsWith('presentation.')));for(const event of events)assert.doesNotThrow(()=>JSON.stringify(event));});

test('Chat presentation helper is scoped to its Engine',async()=>{const a=makeEngine(),b=makeEngine();await a.init(structuredClone(DEMO_SCRIPT));await b.init(structuredClone(DEMO_SCRIPT));const beforeA=a.protocol.eventSequence,beforeB=b.protocol.eventSequence;a.endChat();assert.ok(a.protocol.eventSequence>beforeA);assert.equal(b.protocol.eventSequence,beforeB);});

test('Real Engine State Access transaction commits one coherent revision',async()=>{
 const e=makeEngine();
 await e.init(structuredClone(DEMO_SCRIPT));
 const before=e.protocol.stateRevision;
 const source=e.src.meta;
 await e.api.engine.state.transaction(tx=>{
  tx.set('global.__state_layer_probe',{type:'number',value:17});
  const detached=tx.get('meta',{}, {namespace:'source'});
  detached.title='tampered';
 });
 assert.equal(e.state.global.__state_layer_probe.value,17);
 assert.equal(e.src.meta.title,source.title);
 assert.ok(e.protocol.stateRevision>before);
 const snapshot=e.api.engine.state.getRuntimeSnapshot('global.__state_layer_probe');
 snapshot.value=99;
 assert.equal(e.state.global.__state_layer_probe.value,17);
});

test('CMS effects commit against the real GameEngine runtime',async()=>{
 const e=makeEngine();
 await e.init(structuredClone(DEMO_SCRIPT));
 const charId=Object.keys(e.state.characters)[0];
 assert.ok(charId);
 e.state.characters[charId].set ||= {};
 e.state.characters[charId].set.relationship=[];
 const sceneId=e.state.sceneId;
 const routerId=e.state.scenes[sceneId].activeRouterId;
 const routerKey=`${sceneId}_${routerId}`;
 e.state.routers[routerKey].actions ||= [];
 await e.applyEffect({type:'cms',table:'characters',id:charId,column:'relationship',method:'add',value:['npc','friend']});
 await e.applyEffect({type:'cms',table:'routers',id:routerId,column:'actions',method:'add',value:'__cms_probe_action'});
 assert.deepEqual(e.state.characters[charId].set.relationship,[['npc','friend']]);
 assert.ok(e.state.routers[routerKey].actions.includes('__cms_probe_action'));
});

test('Item inventory and hand operations preserve synchronous add and transactional hand updates',async()=>{
 const e=makeEngine();
 await e.init(structuredClone(DEMO_SCRIPT));
 const ownerId=e.state.meta?.entryCharacter||'player';
 const character=e.state.characters[ownerId];
 assert.ok(character);
 character.inventory=[];
 character.hand=[];
 e.state.itemInfo.__item_probe={name:'Probe'};
 const before=e.protocol.stateRevision;
 const added=e.addItem('__item_probe');
 assert.equal(added,true);
 assert.deepEqual(e.state.characters[ownerId].inventory,['__item_probe']);
 assert.equal(e.addItem('__item_probe'),false);
 assert.equal(e.protocol.stateRevision,before+1);
 await e.toggleHand('__item_probe');
 assert.deepEqual(e.state.characters[ownerId].hand,['__item_probe']);
 await e.toggleHand('__item_probe');
 assert.deepEqual(e.state.characters[ownerId].hand,[]);
});

test('Entity meeting counters update through detached StateAccess values',async()=>{
 const e=makeEngine();
 await e.init(structuredClone(DEMO_SCRIPT));
 const charId=Object.keys(e.state.characters).find(id=>id!==(e.state.meta?.entryCharacter||'player'));
 assert.ok(charId);
 e.updateMetState(charId,'__identity_probe');
 assert.ok(e.state.characters[charId].met.includes('__identity_probe:1'));
 const snapshot=e.api.engine.state.getRuntimeSnapshot('characters.[id]',{id:charId});
 snapshot.met.push('__mutated_outside__');
 assert.equal(e.state.characters[charId].met.includes('__mutated_outside__'),false);
 e.updateMetState(charId,'__identity_probe');
 assert.equal(e.state.characters[charId].met.find(x=>x.startsWith('__identity_probe:')),'__identity_probe:2');
});

test('Chat choice progress stays in runtime state and endChat commits synchronously',async()=>{
 const e=makeEngine();
 await e.init(structuredClone(DEMO_SCRIPT));
 const chatId='__chat_state_probe';
 const chat={meta:{sender:'npc',entry:'start'},set:{read:false,step:0,bookmark:[]},block:{start:{choice_id:'probe_choices'}},choice:{probe_choices:[{text:'Continue'}]}};
 e.src.chat ||= {};
 e.src.chat[chatId]=structuredClone(chat);
 e.state.chats[chatId]=structuredClone(chat);
 e.state.chatHistory[chatId]=[];
 e.chatState={active:true,id:chatId,blockId:'start',index:0,blocking:false};
 await e.selectChatChoice(0);
 assert.equal(e.state.chats[chatId].block.start.choiced,true);
 assert.equal(e.state.chats[chatId].choice.probe_choices[0].set.choiced,true);
 assert.equal(e.src.chat[chatId].block.start.choiced,undefined);
 assert.deepEqual(e.state.chatHistory[chatId].map(line=>line.text),['Continue']);
 e.state.actions.__chat_action_probe={type:'show_chat',target:chatId,display:'show'};
 e.endChat();
 assert.equal(e.state.chats[chatId].set.read,true);
 assert.equal(e.state.actions.__chat_action_probe.display,'hide');
 assert.equal(e.chatState.active,false);
});

test('Starting a chat commits dialogue progress through StateAccess',async()=>{
 const e=makeEngine();
 await e.init(structuredClone(DEMO_SCRIPT));
 const chatId='__chat_dialogue_probe';
 const chat={meta:{sender:'npc',entry:'start',loop:false},set:{read:false,step:0,bookmark:[]},block:{start:{line:[{text:'Hello',char_id:'npc'}]}},choice:{}};
 e.src.chat ||= {};
 e.src.chat[chatId]=structuredClone(chat);
 e.state.chats[chatId]=structuredClone(chat);
 e.state.chatHistory[chatId]=[];
 e.startChat(chatId);
 assert.equal(e.chatState.active,true);
 assert.equal(e.chatState.index,1);
 assert.equal(e.state.chats[chatId].set.step,1);
 assert.deepEqual(e.state.chatHistory[chatId].map(line=>line.text),['Hello']);
 assert.deepEqual(e.state.chats[chatId].set.bookmark,['start']);
});

test('Faker identity changes use StateAccess and restore linked stats',async()=>{
 const e=makeEngine();
 await e.init(structuredClone(DEMO_SCRIPT));
 const player=e.state.characters.player;
 assert.ok(player);
 player.stats={strength:{current:5,max:10}};
 e.state.characters.__faker_probe={set:{name:'Target',linkEffect:true},meta:{name:'Target'},stats:{strength:{current:0,max:20}},place:{scene_id:e.state.sceneId,currentIndex:0},moveList:[],moveHistory:[]};
 await e.enterFaker('soul:__faker_probe');
 assert.equal(e.state.faker.active,true);
 assert.equal(e.state.characters.__faker_probe.stats.strength.current,10);
 await e.exitFaker();
 assert.equal(e.state.faker.active,false);
 assert.equal(e.state.characters.player.stats.strength.current,5);
});

test('Effective action thumbnail defaults do not mutate scenario source',async()=>{
 const e=makeEngine();
 const script=structuredClone(DEMO_SCRIPT);
 await e.init(script);
 const sceneId=e.state.sceneId;
 const routerId=e.state.scenes[sceneId].activeRouterId;
 e.src.actions.__thumb_probe={meta:{title:'Probe'},set:{},effect:{}};
 e.src.scenes[sceneId].routers[routerId].actions.push('__thumb_probe');
 const action=e.getEffectiveActions(sceneId,routerId).find(item=>item.id==='__thumb_probe');
 assert.equal(action.meta.thumb,'assets/images/thumbnail.jpg');
 assert.equal(e.src.actions.__thumb_probe.meta.thumb,undefined);
});
