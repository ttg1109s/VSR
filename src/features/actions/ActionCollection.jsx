import React,{useCallback,useEffect,useMemo,useRef,useState}from'react';
import useEmblaCarousel from'embla-carousel-react';
import ActionCard from'./ActionCard.jsx';
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

const MESSAGES={
 action_hidden:'Hành động hiện không hiển thị.',locked:'Hành động đang bị khóa.',
 permission_denied:'Nhân vật hiện tại không có quyền thực hiện.',not_read:'Cần đọc mô tả trước khi thực hiện.',
 cooldown:'Hành động đang trong thời gian hồi chiêu.',requirement_failed:'Chưa đáp ứng điều kiện thực hiện.',
 target_locked:'Đích đang bị khóa.',busy:'Engine đang xử lý một thao tác khác.',
 transitioning:'Engine đang chuyển cảnh. Hãy đợi quá trình hoàn tất.',
 challenge_active:'Hãy hoàn tất hoặc hủy thử thách mật khẩu hiện tại trước.',
 invalid_context:'Không còn ngữ cảnh hành động hợp lệ.',action_not_found:'Hành động không còn thuộc màn chơi hiện tại.',
 invalid_result:'Engine trả về kết quả thực thi không hợp lệ.',cancelled:'Thao tác đã bị hủy.',
 expired:'Thử thách đã hết hạn.',exhausted:'Bạn đã sử dụng hết số lần thử.'
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
 const[pending,setPending]=useState(()=>new Set()),[feedback,setFeedback]=useState({}),cache=useRef(new Map());
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
 const report=useCallback(async(k,e)=>{
  if(e?.code==='REVISION_CONFLICT'){try{await client.refreshSnapshot();setFeedback(s=>({...s,[k]:'Trạng thái vừa thay đổi. Đã đồng bộ snapshot; hãy kiểm tra trước khi thử lại.'}));return true;}catch(x){e=x;}}
  const m=e?.message||'Không thể hoàn tất thao tác.';setFeedback(s=>({...s,[k]:m}));onError?.(m);return false;
 },[client,onError]);
 const trigger=useCallback(async a=>{
  if(!client)return;const k=a.key;mark(k,true);setFeedback(s=>({...s,[k]:''}));
  try{const r=(await client.triggerAction(a.id,a.key))?.result;if(r?.success===false)setFeedback(s=>({...s,[k]:MESSAGES[r.reason]||'Hành động chưa được thực hiện.'}));return r;}
  catch(e){await report(k,e);return null;}finally{mark(k,false);}
 },[client,mark,report]);
 const submit=useCallback(async(c,input)=>{
  if(!client||!c?.challengeId)return{message:'Không có kết nối Engine hoặc thử thách không hợp lệ.'};
  try{return(await client.submitPassword(c.challengeId,input))?.result||{message:'Engine không trả về kết quả xác thực.'};}
  catch(e){const refreshed=await report(c.uniqueId,e);if(refreshed)return{reason:'revision_conflict',message:'Trạng thái vừa thay đổi. Đã đồng bộ snapshot; hãy kiểm tra lại thử thách.'};return{reason:e?.code||'command_failed',message:e?.message||'Không thể gửi câu trả lời tới Engine.'};}
 },[client,report]);
 const cancel=useCallback(async c=>{
  if(!client||!c?.challengeId)return;
  try{return await client.submitPassword(c.challengeId,null,true);}catch(e){await report(c.uniqueId,e);throw e;}
 },[client,report]);
 const read=useCallback(async a=>{
  if(!client)return false;
  try{const acknowledgement=await client.markActionRead(a.key),result=acknowledgement?.result;
   if(result?.success===false){setFeedback(s=>({...s,[a.key]:MESSAGES[result.reason]||'Không thể cập nhật trạng thái đã đọc.'}));return false;}
   return true;
  }catch(e){await report(a.key,e);return false;}
 },[client,report]);
 const refresh=useCallback(async()=>{
  if(!client)return null;
  try{return await client.refreshSnapshot();}catch(e){onError?.(e?.message||'Không thể làm mới trạng thái hành động.');return null;}
 },[client,onError]);

 if(!ordered.length)return <section className="vsr-card" aria-label="Hành động"><p>Không có hành động trong ngữ cảnh hiện tại.</p></section>;
 return <section className="vsr-stack vsr-stack--gap-4 vsr-action-carousel" aria-label="Hành động">
  <div ref={carouselRef} className="vsr-action-carousel__viewport" role="region" aria-roledescription="băng chuyền" aria-label="Danh sách hành động, dùng phím mũi tên trái và phải để di chuyển" tabIndex={0} onKeyDown={event=>{if(event.key==='ArrowRight'){event.preventDefault();scrollToIndex(activeIndex+1);}else if(event.key==='ArrowLeft'){event.preventDefault();scrollToIndex(activeIndex-1);}}}>
   <div className="vsr-action-carousel__track">
    {ordered.map((a,index)=><div key={a.key||a.id} className="vsr-action-carousel__slide" role="group" aria-roledescription="trang chiếu" aria-label={`Hành động ${index+1} trên ${ordered.length}`}>
     <ActionCard action={a} pending={pending.has(a.key)} interactionBlocked={pending.size>0||Boolean(passwordChallenge)} passwordChallenge={passwordChallenge} onTrigger={trigger} onMarkRead={read} onSubmitPassword={submit} onCancelPassword={cancel} onRefreshSnapshot={refresh} feedback={feedback[a.key]||''}/>
    </div>)}
   </div>
  </div>
 </section>;
}
