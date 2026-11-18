import { getFakerActingIds, getFakerRelationshipIdentityId } from '../engine/modules/entity/Identity.js';
import { COMMUNICATION_SENDER_ID, UNKNOWN_SENDER_ID } from '../engine/modules/chat/systemSenders.js';
const RUNTIME_ONLY_STATE_KEYS=new Set(['effectQueue','isSyncQueueRunning','isAsyncQueueRunning','pausedBackgroundTasks']);
export function cloneJsonValue(value,seen=new WeakSet()){
 if(value===null||typeof value==='string'||typeof value==='boolean')return value;
 if(typeof value==='number'){if(!Number.isFinite(value))throw new TypeError('Protocol JSON cannot contain non-finite numbers.');return value;}
 if(value===undefined||typeof value==='function'||typeof value==='symbol')return undefined;
 if(typeof value!=='object')throw new TypeError(`Unsupported protocol value: ${typeof value}`);
 if(seen.has(value))throw new TypeError('Protocol JSON cannot contain circular references.');seen.add(value);
 let out;if(Array.isArray(value))out=value.map(v=>{const c=cloneJsonValue(v,seen);return c===undefined?null:c;});
 else if(value instanceof Date)out=value.toISOString();
 else{out={};for(const k of Object.keys(value)){const c=cloneJsonValue(value[k],seen);if(c!==undefined)out[k]=c;}}
 seen.delete(value);return out;
}
const id=(p,n)=>`${p}_${Date.now().toString(36)}_${n.toString(36)}`;
// Snapshot projections must be deterministic. Random resolver expressions are
// intentionally left unevaluated here; they belong to action execution, not projection.
const hasSnapshotUnsafeExpression=value=>{
 if(typeof value==='string')return /\$rdnumber\s*\(/i.test(value);
 if(Array.isArray(value))return value.some(hasSnapshotUnsafeExpression);
 if(value&&typeof value==='object')return Object.values(value).some(hasSnapshotUnsafeExpression);
 return false;
};
export class JsonProtocol{
 constructor({engineId=`vsr-${Math.random().toString(36).slice(2,10)}`,protocolVersion=2,maxEvents=1000,maxRememberedCommands=500,authorizeCommand=null,requireAuthorization=false,onCommandSuccess=null}={}){
  if(typeof requireAuthorization!=='boolean')throw new TypeError('requireAuthorization must be boolean.');
  if(requireAuthorization&&typeof authorizeCommand!=='function')throw new TypeError('requireAuthorization needs an authorizeCommand function.');
  Object.assign(this,{engineId,protocolVersion,maxEvents,maxRememberedCommands,authorizeCommand,requireAuthorization,onCommandSuccess});
  this.stateRevision=0;this.revision=0;this.eventSequence=0;this.commandSequence=0;this.listeners=new Set();this.eventLog=[];this.commandHandlers=new Map();this.commandResults=new Map();this.dispatchQueue=Promise.resolve();
 }
 subscribe(fn){if(typeof fn!=='function')throw new TypeError('Protocol listener must be a function.');this.listeners.add(fn);return()=>this.listeners.delete(fn);}
 registerCommand(name,fn){if(typeof name!=='string'||!name.trim()||typeof fn!=='function')throw new TypeError('Invalid command registration.');this.commandHandlers.set(name,fn);return()=>this.commandHandlers.delete(name);}
 createSnapshot(engine){
  if(!engine?.state)throw new Error('Engine state is not initialized.');
  const state={};
  for(const k of Object.keys(engine.state)){
   if(RUNTIME_ONLY_STATE_KEYS.has(k))continue;
   const v=cloneJsonValue(engine.state[k]);if(v!==undefined)state[k]=v;
  }
  // Session secrets and engine-only internals never cross the client boundary.
  if(state.session)delete state.session.passwordChallenge;
  const sceneId=engine.state.sceneId||null;
  const routerId=sceneId?(engine.state.scenes?.[sceneId]?.activeRouterId||null):null;
  const sourceScene=sceneId?engine.src?.scenes?.[sceneId]||null:null;
  const sourceRouter=sourceScene&&routerId?sourceScene.routers?.[routerId]||null:null;
  const resolveCover=value=>{
   if(!value)return null;
   if(typeof value==='object')return cloneJsonValue(value);
   if(typeof value!=='string')return null;
   const match=value.match(/^(photo|video):(.*)$/i);
   const mediaId=match?match[2]:value;
   const media=engine.src?.media?.[mediaId];
   if(media?.url)return{url:media.url,type:match?match[1].toLowerCase():media.type||'photo'};
   if(/^(https?:|\/)/i.test(mediaId))return{url:mediaId,type:match?match[1].toLowerCase():'photo'};
   return null;
  };
  const safeMeta=meta=>({
   title:meta?.title,desc:meta?.desc??meta?.description,description:meta?.desc??meta?.description,
   subTitleStatus:meta?.subTitleStatus,thumb:meta?.thumb,
   cover:resolveCover(meta?.cover),thumbnail:resolveCover(meta?.thumb)||(typeof meta?.thumb==='string'?{url:meta.thumb,type:'photo'}:null),
   buttonLabel:typeof meta?.buttonLabel==='string'?meta.buttonLabel:undefined,
   buttonIcon:typeof meta?.buttonIcon==='string'?meta.buttonIcon:undefined
  });
  const actions=sourceScene&&sourceRouter&&typeof engine.getEffectiveActions==='function'
   ?engine.getEffectiveActions(sceneId,routerId).map(action=>{
    const key=`${sceneId}_${routerId}_${action.id}`;
    const runtime=engine.state.actions?.[action.id]||{};
    const display=runtime.display??action.set?.display??'show';
    const readRequired=!!((engine.getConfig?.('allDescRead')||action.set?.readDesc===true)&&(action.meta?.desc??action.meta?.description));
    const read=runtime.readDesc===true;
    const cooldownUntil=Number.isFinite(runtime.cooldownEnd)?runtime.cooldownEnd:null;
    const cooldownDuration=Number.isFinite(runtime.cooldownDuration)&&runtime.cooldownDuration>0?runtime.cooldownDuration:(Number.isFinite(action.set?.cooldown)&&action.set.cooldown>0?action.set.cooldown:null);
    const cooldownStartedAt=cooldownUntil!==null&&cooldownDuration!==null?cooldownUntil-cooldownDuration*1000:null;
    let reason='available';
    const set=action.set||{};
    const entryCharacter=engine.state.entryCharacter||'player';
    const faker=engine.state.faker||{};
    const fakerMode=faker.mode||engine.getConfig?.('fakerMode')||'soul';
    const actingIds=getFakerActingIds(entryCharacter,faker,fakerMode);
    const permissionAllowed=!Array.isArray(set.charAllow)||set.charAllow.length===0||actingIds.some(id=>set.charAllow.includes(id));
    let requirementPass=null;
    if(set.requirement===true){
     const requirement=action.requirement;
     const template=typeof requirement?.ref==='string'?engine.src?.templates?.requirements?.[requirement.ref]:null;
     const evaluationInput=template||requirement;
     if(!hasSnapshotUnsafeExpression(evaluationInput)){
      try{requirementPass=!!(requirement&&engine.checkReq?.(requirement)?.pass);}catch(_){requirementPass=null;}
     }
    }
    const checks={
     permission:permissionAllowed?'passed':'failed',
     requirement:set.requirement===true?(requirementPass===null?'not_evaluated':requirementPass?'passed':'failed'):'not_required'
    };
    if(engine.isTransitioning||engine.isActionProcessing)reason='busy';
    else if(engine.pendingPasswordAction)reason='challenge_active';
    else if(display==='locked')reason='locked';
    else if(readRequired&&!read)reason='not_read';
    else if(set.cooldown>0&&cooldownUntil!==null&&cooldownUntil>Date.now())reason='cooldown';
    else if(set.password)reason='password_required';
    // An unevaluated random expression is not a denial. Let the Engine evaluate
    // it exactly once at execution time; the projection must remain deterministic.
    const title=action.meta?.title??action.title??action.name??action.id;
    const meta=safeMeta(action.meta||{});
    return{id:action.id,key,title,name:action.name,meta:{...meta,title,description:meta.desc??meta.description??''},
     presentation:{display:display==='locked'?'locked':'show',readRequired,read},
     availability:{canTrigger:reason==='available'||reason==='password_required',reason,cooldownUntil,cooldownStartedAt,cooldownDuration,checks},
     count:{
      normal:Number.isSafeInteger(runtime.count?.normal)&&runtime.count.normal>=0?runtime.count.normal:0,
      pass:Number.isSafeInteger(runtime.count?.pass)&&runtime.count.pass>=0?runtime.count.pass:0,
      fail:Number.isSafeInteger(runtime.count?.fail)&&runtime.count.fail>=0?runtime.count.fail:0,
      pwFailed:Number.isSafeInteger(runtime.count?.pwFailed)&&runtime.count.pwFailed>=0?runtime.count.pwFailed:0
     },
     runtimeState:{display,readDesc:read}};
   }).filter(action=>action.runtimeState.display!=='hide')
   :[];
  const challenge=engine.pendingPasswordAction;
  const passwordConfig=challenge?engine.src?.passwords?.[challenge.type]?.[challenge.passwordId]||null:null;
  const puzzleMedia=challenge?.type==='puzzle'?resolveCover(passwordConfig?.url):null;
  const activeChatBlock=engine.chatState?.active&&engine.chatState?.id
   ?engine.resolveBlock?.(engine.chatState.id,engine.chatState.blockId)
   :null;
  const activeChatMeta=engine.src?.chat?.[engine.chatState?.id]?.meta||{};
  const activeIdentityId=engine.state.faker?.active&&engine.state.faker?.targetId
   ?engine.state.faker.targetId
   :(engine.state.entryCharacter||'player');
  const chatContactId=engine.chatState?.id
   ?(engine.getChatOwner?.(engine.chatState.id)??(
     typeof activeChatMeta.sender==='string'&&activeChatMeta.sender!==activeIdentityId
      ?activeChatMeta.sender
      :(Array.isArray(activeChatMeta.to)?activeChatMeta.to.find(id=>typeof id==='string'&&id!==activeIdentityId):null)
    ))
   :null;
  const chatChoices=engine.chatState?.waitingChoice===true&&Array.isArray(activeChatBlock?.choices)
   ?activeChatBlock.choices.map((choice,index)=>{
    let requirementPass=true;
    if(choice?.req){
     try{
      const check=engine.checkReq?.(choice.req)??engine.state?.checkReq?.(choice.req);
      if(check&&check.pass===false)requirementPass=false;
     }catch(_){requirementPass=true;}
    }
    return{
     index,
     text:typeof choice?.text==='string'?choice.text:'',
     locked:choice?.set?.locked===true,
     active:choice?.set?.active!==false,
     requirementPass
    };
   }).filter(choice=>choice.text&&choice.active&&choice.requirementPass)
   :[];
  const session={
   chat:{
    active:!!engine.chatState?.active,
    mode:engine.chatState?.isReview===true?'review':(engine.chatState?.active?'active':'idle'),
    isReview:engine.chatState?.isReview===true,
    blocking:!!engine.chatState?.blocking,
    waitingChoice:engine.chatState?.isReview===true?false:engine.chatState?.waitingChoice===true,
    transitionPending:engine.chatState?.transitionPending===true,
    id:engine.chatState?.id??null,contactId:chatContactId,blockId:engine.chatState?.blockId??null,
    index:Number(engine.chatState?.index)||0,
    choices:chatChoices,
    prompt:typeof activeChatBlock?.text==='string'?activeChatBlock.text:'',
    history:cloneJsonValue(engine.state.chatHistory||{})
   },
   passwordChallenge:challenge?{
    challengeId:challenge.challengeId,type:challenge.type,actionId:challenge.actionId,
    uniqueId:challenge.uniqueId,sceneId:challenge.sceneId,routerId:challenge.routerId,
    status:challenge.status,countTest:challenge.countTest,retryMax:challenge.retryMax,
    remainingAttempts:challenge.retryMax===0?null:Math.max(0,challenge.retryMax-challenge.countTest),
    deadlineAt:challenge.deadlineAt,description:typeof passwordConfig?.desc==='string'?passwordConfig.desc:'',
    ...(challenge.type==='puzzle'?{puzzle:{url:puzzleMedia?.url||(typeof passwordConfig?.url==='string'?passwordConfig.url:null),ratio:passwordConfig?.ratio??[3,3],level:passwordConfig?.level??null}}:{}),
    ...(challenge.type==='find_way'?{findWay:{area:passwordConfig?.area??null,start:passwordConfig?.start??null,target:passwordConfig?.target??null}}:{})
   }:null,
   timer:engine.timerState?cloneJsonValue(engine.timerState):null,
   notifications:{
    pending:engine.notifications?.getPending?.()||[],
    history:engine.notifications?.getHistory?.({limit:200})||[],
    unreadCount:(engine.notifications?.getHistory?.({limit:200})||[]).filter(item=>!item.read).length
   }
  };
  const faker=engine.state.faker||{};
  const currentIdentityId=engine.state.entryCharacter||'player';
  const currentCharacter=engine.state.characters?.[currentIdentityId]||null;
  const fakerTarget=faker.active&&faker.targetId
   ?engine.state.characters?.[faker.targetId]||null
   :null;
  const projectRelationships=(character)=>{
   const relationships=Array.isArray(character?.relationship)?character.relationship:[];
   return relationships.map(item=>{
    const characterId=Array.isArray(item)?item[1]??null:item?.characterId??null;
    return{
     tag:Array.isArray(item)?item[0]??null:item?.tag??null,
     characterId,
     characterName:typeof characterId==='string'?(engine.state.characters?.[characterId]?.meta?.name||characterId):null
    };
   });
  };
  const fakerMode=faker.mode||engine.getConfig?.('fakerMode')||null;
  const projectCharacter=(characterId,character,{isPlayer=false}={})=>({
   id:characterId,
   name:(isPlayer&&faker.active&&fakerMode==='mask'?character.set?.name:null)||character.meta?.name||characterId,
   description:(isPlayer&&faker.active&&fakerMode==='mask'?character.set?.desc:null)??character.meta?.desc??null,
   avatar:character.meta?.avatar??null,
   stats:cloneJsonValue(character.stats||{}),
   relationship:projectRelationships(character),
   ...(isPlayer?{identityMode:faker.active?fakerMode:null}:{})
  });
  const playerRelationshipIdentityId=getFakerRelationshipIdentityId(
   currentIdentityId,currentIdentityId,{...faker,mode:fakerMode}
  );
  const playerRelationshipCharacter=engine.state.characters?.[playerRelationshipIdentityId]||currentCharacter;
  const fakerBackupCharacterId=faker.backupPlayer?.characterId||faker.backupPlayer?.entryCharacter||null;
  const originalIdentityId=faker.active&&fakerMode==='swap'&&fakerBackupCharacterId
   ?fakerBackupCharacterId:currentIdentityId;
  const currentBodyId=faker.active&&fakerMode==='soul'&&faker.targetId
   ?faker.targetId:currentIdentityId;
  const activePersonaId=faker.active&&fakerMode==='mask'&&faker.targetId
   ?faker.targetId:currentIdentityId;
  const describeIdentity=(characterId,{useSetName=false}={})=>{
   const character=engine.state.characters?.[characterId];
   if(!character)return null;
   return{
    id:characterId,
    name:(useSetName?character.set?.name:null)||character.meta?.name||characterId,
    avatar:character.meta?.avatar??null
   };
  };
  const playerIdentityContext={
   mode:faker.active?fakerMode:null,
   originalIdentity:describeIdentity(originalIdentityId),
   currentBody:describeIdentity(currentBodyId),
   activePersona:describeIdentity(activePersonaId,{useSetName:faker.active&&fakerMode==='mask'}),
   statsOwner:describeIdentity(currentIdentityId),
   relationshipOwner:describeIdentity(playerRelationshipIdentityId,{useSetName:faker.active&&fakerMode==='mask'})
  };
  const playerProjection=currentCharacter?{
   ...projectCharacter(currentIdentityId,currentCharacter,{isPlayer:true}),
   identityContext:playerIdentityContext,
   relationship:projectRelationships(playerRelationshipCharacter),
   name:faker.active&&fakerMode==='mask'
    ?(currentCharacter.set?.name||fakerTarget?.set?.name||fakerTarget?.meta?.name||currentCharacter.meta?.name||currentIdentityId)
    :(currentCharacter.meta?.name||currentIdentityId),
   description:faker.active&&fakerMode==='mask'
    ?(fakerTarget?.set?.desc??fakerTarget?.meta?.desc??currentCharacter.meta?.desc??null)
    :(currentCharacter.meta?.desc??null),
   avatar:faker.active&&fakerMode==='mask'
    ?(fakerTarget?.meta?.avatar??currentCharacter.meta?.avatar??null)
    :(currentCharacter.meta?.avatar??null),
   identityMode:faker.active?fakerMode:null,
   identityTarget:fakerTarget&&fakerMode!=='swap'?{
    id:faker.targetId,
    name:fakerTarget.set?.name||fakerTarget.meta?.name||faker.targetId,
    avatar:fakerTarget.meta?.avatar??null,
    description:fakerTarget.set?.desc??fakerTarget.meta?.desc??null
   }:null
  }:null;
  const getRelationshipWithEntryCharacter=(character)=>{
   const relationship=(Array.isArray(character?.relationship)?character.relationship:[])
    .find(item=>{
     const relatedCharacterId=Array.isArray(item)?item[1]??null:item?.characterId??null;
     return relatedCharacterId===currentIdentityId;
    });
   if(!relationship)return{hasRelationship:false,tag:null};
   return{
    hasRelationship:true,
    tag:Array.isArray(relationship)?relationship[0]??null:relationship?.tag??null
   };
  };
  const getMetCount=(characterId)=>{
   return (Array.isArray(currentCharacter?.met)?currentCharacter.met:[])
    .reduce((count,entry)=>{
     const [metCharacterId,countValue]=String(entry).split(':');
     if(metCharacterId!==characterId)return count;
     const parsed=Number(countValue);
     return Number.isSafeInteger(parsed)&&parsed>=0?count+parsed:count;
    },0);
  };
  const projectThreadList=(ownerId)=>typeof engine.getThreads==='function'
   ?engine.getThreads(ownerId).map(thread=>({
    id:thread.id,title:typeof thread.title==='string'?thread.title:thread.id,
    preview:typeof thread.preview==='string'?thread.preview:'',
    time:Number.isFinite(thread.time)?thread.time:0,
    isUnread:thread.isUnread===true,isFinished:thread.isFinished===true
   }))
   :[];
  const communicationThreads=projectThreadList(COMMUNICATION_SENDER_ID);
  const unknownThreads=projectThreadList(UNKNOWN_SENDER_ID);
  const systemContacts=[
   {
    id:COMMUNICATION_SENDER_ID,name:'Communication',description:'Notifications and content from system sources.',
    avatar:null,kind:'communication',threads:communicationThreads
   },
   {
    id:UNKNOWN_SENDER_ID,name:'Unknown / Spam',description:'Messages from an unknown or undeclared sender.',
    avatar:null,kind:'unknown',threads:unknownThreads
   }
  ];
  const contacts=Object.entries(engine.state.characters||{})
   .map(([characterId,character])=>{
    const met=Array.isArray(character?.met)?character.met:[];
    const hasMet=met.some(entry=>String(entry).split(':')[0]===currentIdentityId);
    const threads=characterId!==currentIdentityId&&typeof engine.getThreads==='function'
     ?engine.getThreads(characterId)
     :[];
    return{characterId,character,hasMet,threads};
   })
   .filter(({characterId,hasMet,threads})=>
    characterId!==currentIdentityId&&(hasMet||threads.length>0)
   )
   .map(({characterId,character,threads})=>{
    const {relationship: _relationships,...contactProjection}=projectCharacter(characterId,character);
    return{
     ...contactProjection,
     relationshipWithPlayer:getRelationshipWithEntryCharacter(character),
     threads:threads.map(thread=>({
      id:thread.id,title:typeof thread.title==='string'?thread.title:thread.id,
      preview:typeof thread.preview==='string'?thread.preview:'',
      time:Number.isFinite(thread.time)?thread.time:0,
      isUnread:thread.isUnread===true,isFinished:thread.isFinished===true
     })),
     presence:sceneId&&character?.place?.scene_id===sceneId?'present':'away',
     metCount:getMetCount(characterId)
    };
   })
   .sort((a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:'base'}));
  const snapshot={
   protocol:'vsr',protocolVersion:this.protocolVersion,type:'snapshot',engineId:this.engineId,
   revision:this.stateRevision,stateRevision:this.stateRevision,eventSequence:this.eventSequence,
   createdAt:new Date().toISOString(),
   game:{initialized:!!engine.src,sceneId,routerId},
   presentation:{
    scenarioTitle:engine.src?.meta?.title||'VSR',
    scene:sourceScene?{id:sceneId,meta:safeMeta(sourceScene.meta||{}),title:sourceScene.title||null,hasParentScene:!!(sourceScene.meta?.parentScene&&engine.src?.scenes?.[sourceScene.meta.parentScene])}:null,
    router:sourceRouter?{id:routerId,meta:safeMeta(sourceRouter.meta||{})}:null,
    scenePath:sceneId?(state.sceneTree?.[sceneId]||[]).map(node=>({id:node.id,title:node.title})):[],
    player:playerProjection,
    contacts,
    systemContacts,
    actions
   },
   session,state
  };
  return snapshot;
 }
 publish(type,payload={}){
  if(typeof type!=='string'||!type.trim()||!payload||typeof payload!=='object'||Array.isArray(payload))throw new TypeError('Invalid event envelope.');
  const sequence=++this.eventSequence,safe=cloneJsonValue(payload);
  const event={protocol:'vsr',protocolVersion:this.protocolVersion,type:'event',engineId:this.engineId,eventId:id('evt',sequence),sequence,revision:this.stateRevision,stateRevision:this.stateRevision,timestamp:new Date().toISOString(),event:type,payload:safe??{}};
  this.eventLog.push(event);if(this.eventLog.length>this.maxEvents)this.eventLog.shift();
  for(const listener of this.listeners){try{listener(cloneJsonValue(event));}catch(error){console.error('[VSR Protocol] Event listener failed:',error);}}
  return cloneJsonValue(event);
 }
 commitState(engine,reason='state.changed'){this.stateRevision++;this.revision=this.stateRevision;const snapshot=this.createSnapshot(engine);this.publish('state.snapshot',{reason,snapshot});return cloneJsonValue(snapshot);}
 publishSnapshot(engine,reason='state.changed'){return this.commitState(engine,reason);}
 getEventsSince(rev=0){if(!Number.isInteger(rev)||rev<0)throw new TypeError('stateRevision must be non-negative.');const first=this.eventLog[0],gap=!!first&&first.stateRevision>rev+1;return{gap,currentRevision:this.stateRevision,currentStateRevision:this.stateRevision,events:gap?[]:this.eventLog.filter(e=>e.stateRevision>rev).map(event => cloneJsonValue(event))};}
 getEventsAfter(seq=0){if(!Number.isInteger(seq)||seq<0)throw new TypeError('sequence must be non-negative.');const first=this.eventLog[0]?.sequence??this.eventSequence+1,gap=seq<first-1;return{gap,currentSequence:this.eventSequence,currentStateRevision:this.stateRevision,events:gap?[]:this.eventLog.filter(e=>e.sequence>seq).map(event => cloneJsonValue(event))};}
 #remember(key,ack){this.commandResults.set(key,ack);if(this.commandResults.size>this.maxRememberedCommands)this.commandResults.delete(this.commandResults.keys().next().value);return cloneJsonValue(ack);}
 dispatch(command,context={}){const run=this.dispatchQueue.then(()=>this.#dispatch(command,context));this.dispatchQueue=run.then(()=>undefined,()=>undefined);return run;}
 async #dispatch(command,context){
  if(!command||typeof command!=='object'||Array.isArray(command)||command.protocol!=='vsr'||command.protocolVersion!==this.protocolVersion||command.type!=='command'||typeof command.command!=='string')throw new TypeError('Invalid VSR command envelope.');
  if(typeof command.commandId!=='string'||!command.commandId.trim())throw new TypeError('commandId is required.');
  const expected=command.expectedStateRevision??command.expectedRevision;
  if(expected!==undefined&&(!Number.isInteger(expected)||expected<0))throw new TypeError('expectedStateRevision must be non-negative.');
  if(command.payload!==undefined&&(!command.payload||typeof command.payload!=='object'||Array.isArray(command.payload)))throw new TypeError('Command payload must be an object.');
  const payload=command.payload===undefined?{}:cloneJsonValue(command.payload);

  // Authorize before reading idempotency storage so rejected callers cannot
  // replay a known commandId to retrieve a prior acknowledgement.
  let authorized=true;
  if(this.authorizeCommand) {
   try { authorized=!!(await this.authorizeCommand({command:command.command,payload,context})); }
   catch (_) { authorized=false; }
  }
  const principalId=context?.principal?.id??context?.principalId??null;
  if(this.requireAuthorization&&(principalId===null||String(principalId).trim()===''))authorized=false;
  if(!authorized) {
   return {protocol:'vsr',protocolVersion:this.protocolVersion,type:'ack',commandId:command.commandId,ok:false,error:{code:'FORBIDDEN'},revision:this.stateRevision,stateRevision:this.stateRevision};
  }
  const idempotencyKey=principalId===null?command.commandId:`${String(principalId)}:${command.commandId}`;
  if(this.commandResults.has(idempotencyKey))return cloneJsonValue(this.commandResults.get(idempotencyKey));
  if(expected!==undefined&&expected!==this.stateRevision)return this.#remember(idempotencyKey,{protocol:'vsr',protocolVersion:this.protocolVersion,type:'ack',commandId:command.commandId,ok:false,error:{code:'REVISION_CONFLICT',expected,actual:this.stateRevision},revision:this.stateRevision,stateRevision:this.stateRevision});
  const handler=this.commandHandlers.get(command.command);
  if(!handler)return this.#remember(idempotencyKey,{protocol:'vsr',protocolVersion:this.protocolVersion,type:'ack',commandId:command.commandId,ok:false,error:{code:'UNKNOWN_COMMAND',command:command.command},revision:this.stateRevision,stateRevision:this.stateRevision});
  const revisionBefore=this.stateRevision;this.publish('command.accepted',{commandId:command.commandId,command:command.command});
  try{const result=await handler(payload,context);await this.onCommandSuccess?.({command:command.command,payload,context,revisionBefore});this.publish('command.completed',{commandId:command.commandId,command:command.command});return this.#remember(idempotencyKey,{protocol:'vsr',protocolVersion:this.protocolVersion,type:'ack',commandId:command.commandId,ok:true,revision:this.stateRevision,stateRevision:this.stateRevision,result:result===undefined?null:cloneJsonValue(result)});}
  catch(error){this.publish('command.failed',{commandId:command.commandId,command:command.command,code:error?.code||'COMMAND_FAILED',message:error?.message||String(error)});return this.#remember(idempotencyKey,{protocol:'vsr',protocolVersion:this.protocolVersion,type:'ack',commandId:command.commandId,ok:false,error:{code:error?.code||'COMMAND_FAILED',message:error?.message||String(error)},revision:this.stateRevision,stateRevision:this.stateRevision});}
 }
 createCommand(command,payload={}, {commandId,expectedRevision,expectedStateRevision}={}){
  if(typeof command!=='string'||!command.trim()||!payload||typeof payload!=='object'||Array.isArray(payload))throw new TypeError('Invalid command name or payload.');
  const expected=expectedStateRevision??expectedRevision;if(expected!==undefined&&(!Number.isInteger(expected)||expected<0))throw new TypeError('expectedStateRevision must be non-negative.');
  const out={protocol:'vsr',protocolVersion:this.protocolVersion,type:'command',commandId:commandId||id('cmd',++this.commandSequence),command,payload:cloneJsonValue(payload)};
  if(expected!==undefined)out.expectedStateRevision=expected;return out;
 }
}
