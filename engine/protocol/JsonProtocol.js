import { getFakerActingIds, getFakerRelationshipIdentityId } from '../modules/entity/Identity.js';
import { createStateAccess } from '../state/StateAccess.js';
import { COMMUNICATION_SENDER_ID, UNKNOWN_SENDER_ID } from '../modules/chat/systemSenders.js';
const RUNTIME_ONLY_STATE_KEYS=new Set(['effectQueue','isSyncQueueRunning','isAsyncQueueRunning','pausedBackgroundTasks']);
export function cloneJsonValue(value,seen=new WeakSet()){
 if(value===null||typeof value==='string'||typeof value==='boolean')return value;
 if(typeof value==='number'){if(!Number.isFinite(value))throw new TypeError('Protocol JSON cannot contain non-finite numbers.');return value;}
 if(value===undefined||typeof value==='function'||typeof value==='symbol')return undefined;
 if(typeof value!=='object')throw new TypeError(`Unsupported protocol value: ${typeof value}`);
 if(seen.has(value))throw new TypeError('Protocol JSON cannot contain circular references.');seen.add(value);
 let out;if(Array.isArray(value))out=value.map(v=>{const c=cloneJsonValue(v,seen);return c===undefined?null:c;});
 else if(value instanceof Date)out=value.toISOString();
 else{out=Object.create(null);for(const k of Object.keys(value)){const c=cloneJsonValue(value[k],seen);if(c!==undefined)Object.defineProperty(out,k,{value:c,enumerable:true,writable:true,configurable:true});}}
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
 constructor({engineId=`vsr-${Math.random().toString(36).slice(2,10)}`,protocolVersion=2,maxEvents=1000,maxRememberedCommands=500,authorizeCommand=null,requireAuthorization=false,onCommandSuccess=null,presentationAvailable=null}={}){
  if(typeof requireAuthorization!=='boolean')throw new TypeError('requireAuthorization must be boolean.');
  if(requireAuthorization&&typeof authorizeCommand!=='function')throw new TypeError('requireAuthorization needs an authorizeCommand function.');
  Object.assign(this,{engineId,protocolVersion,maxEvents,maxRememberedCommands,authorizeCommand,requireAuthorization,onCommandSuccess,presentationAvailable});
  this.stateRevision=0;this.revision=0;this.eventSequence=0;this.commandSequence=0;this.listeners=new Set();this.eventLog=[];this.commandHandlers=new Map();this.commandResults=new Map();this.dispatchQueue=Promise.resolve();this.presentationRequests=new Map();this.presentationRequestSequence=0;
 }
 subscribe(fn){if(typeof fn!=='function')throw new TypeError('Protocol listener must be a function.');this.listeners.add(fn);return()=>this.listeners.delete(fn);}
 registerCommand(name,fn){if(typeof name!=='string'||!name.trim()||typeof fn!=='function')throw new TypeError('Invalid command registration.');this.commandHandlers.set(name,fn);return()=>this.commandHandlers.delete(name);}
 createSnapshot(engine){
  const apiStateAccess = engine?.api?.engine?.state;
  const stateAccess = typeof apiStateAccess?.getRuntimeRoot === 'function'
   ? apiStateAccess
   : createStateAccess(engine);
  const runtimeSnapshot = stateAccess?.getRuntimeRoot?.();
  const detachedRuntimeSnapshot = cloneJsonValue(runtimeSnapshot);
  if (!runtimeSnapshot || typeof runtimeSnapshot !== 'object') throw new Error('Engine state is not initialized.');
  const state = {};
  const faker = detachedRuntimeSnapshot.faker || {};
  const currentIdentityId = detachedRuntimeSnapshot.entryCharacter || 'player';
  const characters = detachedRuntimeSnapshot.characters || {};
  const currentCharacter = characters[currentIdentityId] || null;
  const fakerTarget = faker.active && faker.targetId ? characters[faker.targetId] || null : null;
  for (const k of Object.keys(detachedRuntimeSnapshot)) {
   if(RUNTIME_ONLY_STATE_KEYS.has(k))continue;
   const v=cloneJsonValue(detachedRuntimeSnapshot[k]);if(v!==undefined)state[k]=v;
  }
  // Item templates contain executable effects and requirement expressions. Keep them
  // inside the Engine; clients receive only the explicit inventory projection below.
  delete state.itemInfo;
  if(state.session)delete state.session.passwordChallenge;
  const sceneId = state.sceneId || null;
  const routerId = sceneId ? (state.scenes?.[sceneId]?.activeRouterId || null) : null;
  const sourceScene=sceneId?engine.src?.scenes?.[sceneId]||null:null;
  const sourceRouter=sourceScene&&routerId?sourceScene.routers?.[routerId]||null:null;
  const resolveCover=value=>{
   if(!value)return null;
   if(typeof value==='object')return cloneJsonValue(value);
   if(typeof value!=='string')return null;
   const match=value.match(/^(photo|video):(.*)$/i);
   const mediaId=match?match[2]:value;
   // Scene and router covers use direct URLs, not media-registry IDs.
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
  const spriteMode=sourceRouter?.meta?.sprite===true;
  const actionProjections=sourceScene&&sourceRouter&&typeof engine.getEffectiveActions==='function'
   ?engine.getEffectiveActions(sceneId,routerId).map(action=>{
    const key=`${sceneId}_${routerId}_${action.id}`;
    const runtime=state.actions?.[action.id] || {};
    const display=runtime.display??action.set?.display??'show';
    const readRequired=!spriteMode&&!!((engine.getConfig?.('allDescRead')||action.set?.readDesc===true)&&(action.meta?.desc??action.meta?.description));
    const read=runtime.readDesc===true;
    const cooldownUntil=Number.isFinite(runtime.cooldownEnd)?runtime.cooldownEnd:null;
    const cooldownDuration=Number.isFinite(runtime.cooldownDuration)&&runtime.cooldownDuration>0?runtime.cooldownDuration:(Number.isFinite(action.set?.cooldown)&&action.set.cooldown>0?action.set.cooldown:null);
    const cooldownStartedAt=cooldownUntil!==null&&cooldownDuration!==null?cooldownUntil-cooldownDuration*1000:null;
    let reason='available';
    const set=action.set||{};
    const entryCharacter = state.entryCharacter || 'player';
    const faker = state.faker || {};
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
    else if(engine.pendingPasswordAction && engine.pendingPasswordAction.actionId !== action.id)reason='challenge_active';
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
  const actionProjectionById=new Map(actionProjections.map(action=>[action.id,action]));
  const sprites=spriteMode&&sourceRouter&&Array.isArray(sourceRouter.sprites)
   ?sourceRouter.sprites.map(spriteId=>{
    const definition=engine.src?.sprite?.[spriteId];
    const runtime=state.sprites?.[spriteId]||{};
    const action=definition?actionProjectionById.get(definition.action):null;
    if(!definition||!action)return null;
    return{id:spriteId,actionId:definition.action,layer:Number.isFinite(runtime.layer)?runtime.layer:definition.layer,position:Array.isArray(runtime.position)?cloneJsonValue(runtime.position):cloneJsonValue(definition.position),transform:cloneJsonValue(runtime.transform||definition.transform||{scale:1,rotate:0}),motion:cloneJsonValue(definition.motion||{enable:false,duration:0,type:'linear',easing:'linear',step:[]}),state:runtime.state??Object.keys(definition.state||{})[0]??null,states:cloneJsonValue(definition.state||{}),action};
   }).filter(Boolean)
   :[];
  const actions=spriteMode?[]:actionProjections;
  const challenge=engine.pendingPasswordAction;
  const passwordConfig=challenge?engine.src?.passwords?.[challenge.type]?.[challenge.passwordId]||null:null;
  const puzzleMedia=challenge?.type==='puzzle'?resolveCover(passwordConfig?.url):null;
  const activeChatBlock=engine.chatState?.active&&engine.chatState?.id
   ?engine.resolveBlock?.(engine.chatState.id,engine.chatState.blockId)
   :null;
  const activeChatMeta=engine.src?.chat?.[engine.chatState?.id]?.meta||{};
  const activeIdentityId = faker.active && faker.targetId ? faker.targetId : currentIdentityId;
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
      const check = engine.checkReq?.(choice.req);
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
    history:cloneJsonValue(state.chatHistory || {})
   },
   passwordChallenge:challenge?{
    challengeId:challenge.challengeId,type:challenge.type,actionId:challenge.actionId,
    uniqueId:challenge.uniqueId,sceneId:challenge.sceneId,routerId:challenge.routerId,
    ...(challenge.type==='number'?{display:['keyboard','combination','rotary_dial'].includes(passwordConfig?.display)?passwordConfig.display:'keyboard',codeLength:typeof passwordConfig?.value==='string'?Math.max(1,passwordConfig.value.length):undefined}:{}),
    status:challenge.status,countTest:challenge.countTest,retryMax:challenge.retryMax,
    remainingAttempts:challenge.retryMax===0?null:Math.max(0,challenge.retryMax-challenge.countTest),
    deadlineAt:challenge.deadlineAt,description:typeof passwordConfig?.desc==='string'?passwordConfig.desc:'',
    ...(challenge.type==='puzzle'?{puzzle:{url:puzzleMedia?.url||(typeof passwordConfig?.url==='string'?passwordConfig.url:null),ratio:passwordConfig?.ratio??[3,3],level:passwordConfig?.level??null}}:{}),
    ...(challenge.type==='find_way'?{findWay:{area:passwordConfig?.area??null,start:passwordConfig?.start??null,target:passwordConfig?.target??null}}:{}),
    ...(challenge.type==='switch'?{switchPanel:{count:typeof passwordConfig?.value==='string'?Math.max(1,Math.min(100,passwordConfig.value.length)):3}}:{})
   }:null,
   timer:engine.timerState?cloneJsonValue(engine.timerState):null,
   notifications:{
    pending:engine.notifications?.getPending?.()||[],
    history:engine.notifications?.getHistory?.({limit:200})||[],
    unreadCount:(engine.notifications?.getHistory?.({limit:200})||[]).filter(item=>!item.read).length
   }
  };
  const projectRelationships=(character)=>{
   const relationships=Array.isArray(character?.relationship)?character.relationship:[];
   return relationships.map(item=>{
    const characterId=Array.isArray(item)?item[1]??null:item?.characterId??null;
    return{
     tag:Array.isArray(item)?item[0]??null:item?.tag??null,
     characterId,
     characterName:typeof characterId==='string'?(characters[characterId]?.meta?.name||characterId):null
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
  const playerRelationshipCharacter=characters[playerRelationshipIdentityId]||currentCharacter;
  const fakerBackupCharacterId=faker.backupPlayer?.characterId||faker.backupPlayer?.entryCharacter||null;
  const originalIdentityId=faker.active&&fakerMode==='swap'&&fakerBackupCharacterId
   ?fakerBackupCharacterId:currentIdentityId;
  const currentBodyId=faker.active&&fakerMode==='soul'&&faker.targetId
   ?faker.targetId:currentIdentityId;
  const activePersonaId=faker.active&&fakerMode==='mask'&&faker.targetId
   ?faker.targetId:currentIdentityId;
  const describeIdentity=(characterId,{useSetName=false}={})=>{
   const character=characters[characterId];
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
  const contacts=Object.entries(characters)
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
  // Inventory is scoped to the scenario's single entry character. Do not
  // project other characters' inventories into the player-facing snapshot.
  const inventoryOwnerId = state.entryCharacter || null;
  const inventoryCharacter = inventoryOwnerId ? (characters[inventoryOwnerId] || null) : null;
  const inventoryIds=Array.isArray(inventoryCharacter?.inventory)?inventoryCharacter.inventory:[];
  const handIds=Array.isArray(inventoryCharacter?.hand)?inventoryCharacter.hand:[];
  const maxInventoryConfig=engine.getConfig?.('maxInventory')||[];
  const ownerLimit=Array.isArray(maxInventoryConfig)
   ?maxInventoryConfig.find(pair=>Array.isArray(pair)&&pair[1]===inventoryOwnerId)?.[0]||0:0;
  const maxHand=Number(engine.getConfig?.('maxHandOn'))||0;
  const inventoryItems=inventoryIds.map(itemId=>{
   const item = detachedRuntimeSnapshot.itemInfo?.[itemId];
   // Legacy/corrupt saves may retain an owned item ID after its definition is
   // removed. Keep the item visible in inventory instead of silently dropping it.
   if(!item)return{
    id:itemId,name:String(itemId),icon:null,description:'Item definition is missing.',
    category:'missing_definition',equipped:handIds.includes(itemId),
    requirements:{hasRequirements:false,passed:null},usage:null,broken:false,
    canEquip:false,canUse:false,hasUseEffect:false,stats:[],missingDefinition:true
   };
   let requirementsPass=null;
   if(item.requirements){
    if(!hasSnapshotUnsafeExpression(item.requirements)){
     try{requirementsPass=engine.checkReq?.(item.requirements)?.pass===true;}catch(_){requirementsPass=null;}
    }
   }else requirementsPass=true;
   const current=Number(item.usage?.current),max=Number(item.usage?.max);
   const hasUsage=Number.isFinite(current)&&Number.isFinite(max);
   const broken=hasUsage&&max>0&&current>=max;
   const stats=Object.entries(item.stats||{}).map(([id,stat])=>({
    id,label:typeof stat?.label==='string'?stat.label:id,
    current:Number.isFinite(stat?.current)?stat.current:null,
    max:Number.isFinite(stat?.max)?stat.max:null,
    color:typeof stat?.color==='string'?stat.color:null
   }));
   return{
    id:itemId,name:item.name||itemId,icon:item.icon||null,description:item.desc||'',
    category:typeof item.category==='string'&&item.category.trim()?item.category:'uncategorized',
    equipped:handIds.includes(itemId),
    requirements:{hasRequirements:!!item.requirements,passed:requirementsPass},
    usage:hasUsage?{current,max,autoInc:item.usage.autoInc!==false,status:Array.isArray(item.usage.status)?cloneJsonValue(item.usage.status):[]}:null,
    broken,canEquip:requirementsPass!==false&&(handIds.includes(itemId)||maxHand<=0||handIds.length<maxHand),
    canUse:requirementsPass!==false&&!(broken&&engine.getConfig?.('brokenDisable')===true),
    hasUseEffect:Array.isArray(item.effect?.use)&&item.effect.use.length>0,
    stats,missingDefinition:false
   };
  });
  const inventoryProjection={
   enabled:engine.getConfig?.('navInventory')!==false,ownerId:inventoryOwnerId,ownerName:inventoryCharacter?.meta?.name||inventoryOwnerId||'Unknown owner',items:inventoryItems,
   missingDefinitionCount:inventoryItems.filter(item=>item.missingDefinition).length,
   handCount:handIds.length,handLimit:maxHand>0?maxHand:null,
   itemCount:inventoryIds.length,inventoryLimit:ownerLimit>0?ownerLimit:null
  };
  const snapshot={
   protocol:'vsr',protocolVersion:this.protocolVersion,type:'snapshot',engineId:this.engineId,
   revision:this.stateRevision,stateRevision:this.stateRevision,eventSequence:this.eventSequence,
   createdAt:new Date().toISOString(),
   game:{initialized:!!engine.src,sceneId,routerId},
   presentation:{
    ending:engine.endingState?cloneJsonValue(engine.endingState):null,
    scenarioMeta:engine.src?.meta?{title:engine.src.meta.title,version:engine.src.meta.version,author:engine.src.meta.writer||engine.src.meta.author||null}:null,
    scenarioTitle:engine.src?.meta?.title||'VSR',
    scene:sourceScene?{id:sceneId,meta:safeMeta(sourceScene.meta||{}),title:sourceScene.title||null,hasParentScene:!!(sourceScene.meta?.parentScene&&engine.src?.scenes?.[sourceScene.meta.parentScene])}:null,
    router:sourceRouter?{id:routerId,meta:safeMeta(sourceRouter.meta||{}),sprite:spriteMode}:null,
    scenePath:sceneId?(state.sceneTree?.[sceneId]||[]).map(node=>({id:node.id,title:node.title})):[],
    player:playerProjection,
    contacts,
    systemContacts,
    inventory:inventoryProjection,
    sprites,
    actions
   },
   session,state
  };
  return snapshot;
 }

 requestPresentation(operation,payload={}, {timeoutMs=2500}={}){
  // No presentation subscriber means this Engine is running headless (HTTP API,
  // CLI, unit-test harness, or server-side execution). Presentation requests
  // must not stall Engine lifecycle waiting for a UI that cannot acknowledge.
  if(typeof this.presentationAvailable==='function'&&!this.presentationAvailable())return Promise.resolve({status:'headless',operation});
  if(typeof operation!=='string'||!operation.trim())throw new TypeError('Presentation operation must be a non-empty string.');
  if(!Number.isFinite(timeoutMs)||timeoutMs<0)throw new TypeError('Presentation timeout must be a non-negative number.');
  const requestId=id('pres',++this.presentationRequestSequence);
  return new Promise(resolve=>{
   let settled=false;
   const finish=(result)=>{if(settled)return;settled=true;clearTimeout(timer);this.presentationRequests.delete(requestId);resolve(result);};
   const timer=setTimeout(()=>finish({requestId,status:'timeout',operation}),timeoutMs);
   this.presentationRequests.set(requestId,{operation,finish});
   this.publish('presentation.request',{requestId,operation,payload:cloneJsonValue(payload),revision:this.stateRevision});
  });
 }
 acknowledge(requestId,response={}){
  if(typeof requestId!=='string')return false;
  const pending=this.presentationRequests.get(requestId);
  if(!pending)return false;
  const status=['committed','completed','cancelled','failed','error','timeout'].includes(response?.status)?response.status:'ignored';
  pending.finish({requestId,status,operation:pending.operation,result:cloneJsonValue(response)});
  return true;
 }
 cancelPresentationRequests(reason='cancelled'){
  for(const [requestId,pending] of [...this.presentationRequests])pending.finish({requestId,status:reason,operation:pending.operation});
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
 #remember(key, requestFingerprint, ack) {
  this.commandResults.set(key, { requestFingerprint, ack: cloneJsonValue(ack) });
  if (this.commandResults.size > this.maxRememberedCommands) {
   this.commandResults.delete(this.commandResults.keys().next().value);
  }
  return cloneJsonValue(ack);
 }
 dispatch(command, context = {}) {
  const run = this.dispatchQueue.then(() => this.#dispatch(command, context));
  this.dispatchQueue = run.then(() => undefined, () => undefined);
  return run;
 }
  async #dispatch(command, context) {
    if (!command || typeof command !== 'object' || Array.isArray(command) ||
        command.protocol !== 'vsr' || command.protocolVersion !== this.protocolVersion ||
        command.type !== 'command' || typeof command.command !== 'string') {
      throw new TypeError('Invalid VSR command envelope.');
    }
    if (typeof command.commandId !== 'string' || !command.commandId.trim()) {
      throw new TypeError('commandId is required.');
    }
    const expected = command.expectedStateRevision ?? command.expectedRevision;
    if (expected !== undefined && (!Number.isInteger(expected) || expected < 0)) {
      throw new TypeError('expectedStateRevision must be non-negative.');
    }
    if (command.payload !== undefined && (!command.payload || typeof command.payload !== 'object' || Array.isArray(command.payload))) {
      throw new TypeError('Command payload must be an object.');
    }
    const payload = command.payload === undefined ? {} : cloneJsonValue(command.payload);

    // Authenticate/authorize before consulting idempotency state.
    let authorized = true;
    if (this.authorizeCommand) {
      try {
        authorized = !!(await this.authorizeCommand({ command: command.command, payload, context }));
      } catch {
        authorized = false;
      }
    }
    const principalId = context?.principal?.id ?? context?.principalId ?? null;
    if (this.requireAuthorization && (principalId === null || String(principalId).trim() === '')) authorized = false;
    if (!authorized) {
      return {
        protocol: 'vsr', protocolVersion: this.protocolVersion, type: 'ack',
        commandId: command.commandId, ok: false, error: { code: 'FORBIDDEN' },
        revision: this.stateRevision, stateRevision: this.stateRevision
      };
    }

    // Principal isolation prevents one caller from replaying another caller's
    // result. A command ID reused with a different payload is rejected.
    const idempotencyKey = principalId === null ? command.commandId : `${String(principalId)}:${command.commandId}`;
    const requestFingerprint = JSON.stringify({ command: command.command, payload });
    const previous = this.commandResults.get(idempotencyKey);
    if (previous) {
      if (previous.requestFingerprint !== requestFingerprint) {
        return {
          protocol: 'vsr', protocolVersion: this.protocolVersion, type: 'ack',
          commandId: command.commandId, ok: false,
          error: { code: 'IDEMPOTENCY_KEY_REUSED', message: 'commandId was already used for a different command payload.' },
          revision: this.stateRevision, stateRevision: this.stateRevision
        };
      }
      return cloneJsonValue(previous.ack);
    }

    // A stale revision is not an execution result. Do not cache it under the
    // command ID; callers must refresh and explicitly decide whether to issue
    // a new mutation with a new command ID.
    if (expected !== undefined && expected !== this.stateRevision) {
      return {
        protocol: 'vsr', protocolVersion: this.protocolVersion, type: 'ack',
        commandId: command.commandId, ok: false,
        error: { code: 'REVISION_CONFLICT', expected, actual: this.stateRevision },
        revision: this.stateRevision, stateRevision: this.stateRevision
      };
    }

    const handler = this.commandHandlers.get(command.command);
    if (!handler) {
      return this.#remember(idempotencyKey, requestFingerprint, {
        protocol: 'vsr', protocolVersion: this.protocolVersion, type: 'ack',
        commandId: command.commandId, ok: false,
        error: { code: 'UNKNOWN_COMMAND', command: command.command },
        revision: this.stateRevision, stateRevision: this.stateRevision
      });
    }

    const revisionBefore = this.stateRevision;
    this.publish('command.accepted', { commandId: command.commandId, command: command.command });
    try {
      const result = await handler(payload, context);
      await this.onCommandSuccess?.({ command: command.command, payload, context, revisionBefore });
      this.publish('command.completed', { commandId: command.commandId, command: command.command });
      return this.#remember(idempotencyKey, requestFingerprint, {
        protocol: 'vsr', protocolVersion: this.protocolVersion, type: 'ack',
        commandId: command.commandId, ok: true, revision: this.stateRevision,
        stateRevision: this.stateRevision, result: result === undefined ? null : cloneJsonValue(result)
      });
    } catch (error) {
      this.publish('command.failed', {
        commandId: command.commandId, command: command.command,
        code: error?.code || 'COMMAND_FAILED', message: error?.message || String(error)
      });
      return this.#remember(idempotencyKey, requestFingerprint, {
        protocol: 'vsr', protocolVersion: this.protocolVersion, type: 'ack',
        commandId: command.commandId, ok: false,
        error: { code: error?.code || 'COMMAND_FAILED', message: error?.message || String(error) },
        revision: this.stateRevision, stateRevision: this.stateRevision
      });
    }
  }

 createCommand(command, payload = {}, { commandId, expectedRevision, expectedStateRevision } = {}) {
  if (typeof command !== 'string' || !command.trim() || !payload || typeof payload !== 'object' || Array.isArray(payload)) {
   throw new TypeError('Invalid command name or payload.');
  }
  const expected = expectedStateRevision ?? expectedRevision;
  if (expected !== undefined && (!Number.isInteger(expected) || expected < 0)) {
   throw new TypeError('expectedStateRevision must be non-negative.');
  }
  const out = { protocol: 'vsr', protocolVersion: this.protocolVersion, type: 'command',
   commandId: commandId || id('cmd', ++this.commandSequence), command, payload: cloneJsonValue(payload) };
  if (expected !== undefined) out.expectedStateRevision = expected;
  return out;
 }
}