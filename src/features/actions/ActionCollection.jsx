import React,{useCallback,useEffect,useMemo,useRef,useState}from'react';
import useEmblaCarousel from'embla-carousel-react';
import ActionCard from'./ActionCard.jsx';
import { delay } from './abortableDelay.js';
import './action-carousel.css';

const EMPTY_ACTIONS=[];
const CAROUSEL_OPTIONS={
 loop:true,
 align:'start',
 slidesToScroll:1,
 breakpoints:{
  '(prefers-reduced-motion: reduce)':{duration:0}
 }
};



function shuffled(items){
 const result=[...items];
 for(let i=result.length-1;i>0;i--){
  const j=Math.floor(Math.random()*(i+1));
  [result[i],result[j]]=[result[j],result[i]];
 }
 return result;
}

export default function ActionCollection({actions=EMPTY_ACTIONS,client,passwordChallenge=null,onError,sceneId=null}){
 const[pending,setPending]=useState(()=>new Set()),cache=useRef(new Map());
 const busyDelayControllers=useRef(new Set());
 useEffect(()=>()=>{for(const controller of busyDelayControllers.current)controller.abort();busyDelayControllers.current.clear();},[]);
 const [order,setOrder]=useState({sceneId:null,keys:[]});
 const [carouselRef,emblaApi]=useEmblaCarousel(CAROUSEL_OPTIONS);
 const [activeIndex,setActiveIndex]=useState(0);
 const stable=useMemo(()=> (Array.isArray(actions)?actions:[]).map(a=>{
  const k=a.key||a.id,old=cache.current.get(k);
  return old&&JSON.stringify(old)===JSON.stringify(a)?old:a;
 }),[actions]);
 useEffect(()=>{
  const next=new Map(stable.map(a=>[a.key||a.id,a]));
  cache.current=next;
 },[stable]);
 useEffect(()=>{
  const keys=stable.map(a=>a.key||a.id);
  setOrder(previous=>{
   if(previous.sceneId!==sceneId)return {sceneId,keys:shuffled(keys)};
   const retained=previous.keys.filter(k=>keys.includes(k));
   const known=new Set(retained);
   const nextKeys=[...retained,...shuffled(keys.filter(k=>!known.has(k)))];
   if(nextKeys.length===previous.keys.length&&nextKeys.every((key,index)=>key===previous.keys[index]))return previous;
   return {sceneId,keys:nextKeys};
  });
 },[stable,sceneId]);
 const ordered=useMemo(()=>{
  const byKey=new Map(stable.map(a=>[a.key||a.id,a]));
  return order.keys.map(k=>byKey.get(k)).filter(Boolean);
 },[stable,order]);
 const scrollToIndex=useCallback((index)=>{
  if(!ordered.length||!emblaApi)return;
  const next=(index+ordered.length)%ordered.length;
  emblaApi.scrollTo(next);
 },[emblaApi,ordered.length]);
 useEffect(()=>{
  if(!emblaApi)return;
  const updateActiveIndex=()=>setActiveIndex(emblaApi.selectedScrollSnap());
  emblaApi.on('select',updateActiveIndex);
  emblaApi.on('reInit',updateActiveIndex);
  updateActiveIndex();
  return()=>{
   emblaApi.off('select',updateActiveIndex);
   emblaApi.off('reInit',updateActiveIndex);
  };
 },[emblaApi]);
 useEffect(()=>{
  if(!emblaApi)return;
  setActiveIndex(0);
  emblaApi.scrollTo(0,true);
 },[sceneId,ordered.length,emblaApi]);
 useEffect(()=>{
  if(activeIndex>=ordered.length)setActiveIndex(Math.max(0,ordered.length-1));
 },[activeIndex,ordered.length]);

 const mark=useCallback((k,on)=>setPending(s=>{const n=new Set(s);on?n.add(k):n.delete(k);return n;}),[]);
 const report=useCallback(async(e,{notify=true}={})=>{
  if(e?.code==='REVISION_CONFLICT'){
   try{
    await client.refreshSnapshot();
    if(notify)onError?.('The state changed. The snapshot has been synchronized; review it before retrying.');
    return true;
   }catch(refreshError){
    e=refreshError;
   }
  }
  // An Engine acknowledgement means the command reached the Engine. Action and
  // password commands own their failure notifications there; only transport-
  // level failures need a client-side fallback.
  const acknowledged=Boolean(e?.acknowledgement);
  const message=e?.message||'Unable to complete the action.';
  if(notify&&!acknowledged)onError?.(message);
  return false;
 },[client,onError]);
 const trigger=useCallback(async a=>{
  if(!client){onError?.('The Engine connection is unavailable.');return null;}
  const k=a.key;
  const startedAt=Date.now();
  const minimumBusyMs=500;
  const delayController=new AbortController();
  busyDelayControllers.current.add(delayController);
  mark(k,true);
  try{
   const r=(await client.triggerAction(a.id,a.key))?.result;
   return r;
  }catch(e){
   if(!delayController.signal.aborted)await report(e);
   return null;
  }finally{
   const remaining=Math.max(0,minimumBusyMs-(Date.now()-startedAt));
   try{if(remaining>0)await delay(remaining,{signal:delayController.signal});}
   catch(error){if(error?.name!=='AbortError')throw error;}
   finally{busyDelayControllers.current.delete(delayController);}
   if(!delayController.signal.aborted)mark(k,false);
  }
 },[client,mark,report,onError]);
 const submit=useCallback(async(c,input)=>{
  if(!client||!c?.challengeId){onError?.('The Engine connection is unavailable or the password challenge is invalid.');return{reason:'command_unavailable',message:'The Engine connection is unavailable or the password challenge is invalid.'};}
  try{return(await client.submitPassword(c.challengeId,input))?.result||{message:'The engine returned no authentication result.'};}
  catch(e){const refreshed=await report(e);if(refreshed)return{reason:'revision_conflict',message:'The state changed. The snapshot has been synchronized; review the challenge again.'};return{reason:e?.code||'command_failed',message:e?.message||'Unable to submit the answer to the engine.'};}
 },[client,report,onError]);
 const cancel=useCallback(async c=>{
  if(!client||!c?.challengeId){onError?.('The Engine connection is unavailable or the password challenge is invalid.');return;}
  try{return await client.submitPassword(c.challengeId,null,true);}catch(e){await report(e);throw e;}
 },[client,report,onError]);
 const read=useCallback(async a=>{
  if(!client){onError?.('The Engine connection is unavailable.');return false;}
  try{const acknowledgement=await client.markActionRead(a.key),result=acknowledgement?.result;
   if(result?.success===false)return false;
   return true;
  }catch(e){await report(e);return false;}
 },[client,report,onError]);
 const refresh=useCallback(async()=>{
  if(!client)return null;
  try{return await client.refreshSnapshot();}catch(e){onError?.(e?.message||'Unable to refresh the action state.');return null;}
 },[client,onError]);

 if(!ordered.length)return <section className="vsr-card" aria-label="Actions"><p>No actions in the current context.</p></section>;
 return <section className="vsr-stack vsr-stack--gap-4 vsr-action-carousel" aria-label="Actions">
  <div ref={carouselRef} className="vsr-action-carousel__viewport" role="region" aria-roledescription="carousel" aria-label="Action list. Use the left and right arrow keys to navigate." tabIndex={0} onKeyDown={event=>{if(event.key==='ArrowRight'){event.preventDefault();scrollToIndex(activeIndex+1);}else if(event.key==='ArrowLeft'){event.preventDefault();scrollToIndex(activeIndex-1);}}}>
   <div className="vsr-action-carousel__track">
    {ordered.map((a,index)=><div key={a.key||a.id} className="vsr-action-carousel__slide" role="group" aria-roledescription="slide" aria-label={`Action ${index+1} of ${ordered.length}`}>
     <ActionCard action={a} pending={pending.has(a.key)} interactionBlocked={pending.size>0||Boolean(passwordChallenge)} passwordChallenge={passwordChallenge} onTrigger={trigger} onMarkRead={read} onSubmitPassword={submit} onCancelPassword={cancel} onRefreshSnapshot={refresh}/>
    </div>)}
   </div>
  </div>
 </section>;
}
