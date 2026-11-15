import React, { memo, useEffect, useState } from 'react';
import { Badge, Button, Dialog, Grid, Input, MediaFrame, Textarea } from '../../design-system/index.js';
const REASONS={locked:'Đang khóa',permission_denied:'Không đủ quyền',not_read:'Cần đọc mô tả',cooldown:'Đang hồi chiêu',requirement_failed:'Chưa đủ điều kiện',target_locked:'Đích đang khóa',busy:'Engine đang xử lý',password_required:'Cần xác thực'};
const seconds=(until,now)=>Number.isFinite(until)?Math.max(0,Math.ceil((until-now)/1000)):0;
function ActionCard({action,pending=false,passwordChallenge=null,onTrigger,onMarkRead,onSubmitPassword,onCancelPassword}){
 const [detailsOpen,setDetailsOpen]=useState(false),[input,setInput]=useState(''),[error,setError]=useState(''),[feedback,setFeedback]=useState(''),[passwordPending,setPasswordPending]=useState(false),[clock,setClock]=useState(Date.now());
 const meta=action.meta||{},presentation=action.presentation||{},availability=action.availability||{canTrigger:true,reason:'available'};
 const description=meta.description||meta.desc||'',locked=presentation.display==='locked'||availability.reason==='locked',canRead=presentation.readRequired&&!presentation.read;
 const challengeOpen=!!passwordChallenge&&passwordChallenge.uniqueId===action.key,structured=['puzzle','find_way'].includes(passwordChallenge?.type);
 const cooldown=seconds(availability.cooldownUntil,clock),deadline=seconds(passwordChallenge?.deadlineAt,clock);
 useEffect(()=>{const ds=[availability.cooldownUntil,passwordChallenge?.deadlineAt].filter(Number.isFinite);if(!ds.some(x=>x>Date.now()))return;const t=setInterval(()=>{const now=Date.now();setClock(now);if(!ds.some(x=>x>now))clearInterval(t);},1000);return()=>clearInterval(t);},[availability.cooldownUntil,passwordChallenge?.deadlineAt]);
 useEffect(()=>{setInput('');setError('');setFeedback('');},[passwordChallenge?.challengeId]);
 const submit=async e=>{e.preventDefault();if(!input.trim()||passwordPending)return;setPasswordPending(true);setError('');setFeedback('');try{const r=await onSubmitPassword?.(passwordChallenge,input);if(r?.retry){setFeedback(r.remainingAttempts===null?'Sai thông tin. Có thể thử lại.':`Sai thông tin. Còn ${r.remainingAttempts} lượt.`);setInput('');}else if(r?.reason==='expired')setError('Thử thách đã hết thời gian.');else if(r?.reason==='exhausted')setError('Đã hết số lượt thử.');else if(r?.reason==='revision_conflict')setError('Trạng thái vừa thay đổi. Hãy kiểm tra lại thử thách.');}catch(x){setError(x?.message||'Không thể gửi câu trả lời.');}finally{setPasswordPending(false);}};
 const cancel=async()=>{if(passwordPending||!passwordChallenge?.challengeId)return;setPasswordPending(true);setError('');try{await onCancelPassword?.(passwordChallenge);setInput('');}catch(x){setError(x?.message||'Không thể hủy thử thách.');}finally{setPasswordPending(false);}};
 return <article className="vsr-card" data-action-key={action.key}>
  <div className="vsr-stack vsr-stack--gap-4">
   {meta.thumbnail?.url||meta.cover?.url?<MediaFrame src={(meta.thumbnail||meta.cover).url} type={(meta.thumbnail||meta.cover).type||'photo'} ratio={(meta.thumbnail||meta.cover).ratio||'16:9'} alt={meta.title||action.title||'Hình minh họa hành động'}/>:null}
   <div className="vsr-stack vsr-stack--gap-2">
    {(locked||canRead||REASONS[availability.reason])&&<Badge tone={locked?'danger':canRead?'warning':'neutral'}>{locked?'Đang khóa':canRead?'Chưa đọc':REASONS[availability.reason]}</Badge>}
    <h3 className="vsr-text-body">{meta.title||action.title||action.id}</h3>
    {meta.subTitleStatus&&<p className="vsr-text-secondary">{meta.subTitleStatus}</p>}
    {description&&<p className="vsr-text-body">{description}</p>}
    {availability.reason!=='available'&&availability.reason!=='password_required'&&<p className="vsr-text-secondary" role="status">{availability.reason==='cooldown'?(cooldown?`Còn ${cooldown} giây`:'Đang chờ Engine xác nhận hết hồi chiêu'):(REASONS[availability.reason]||'')}</p>}
   </div>
   <Grid columns="auto" gap="2">
    {canRead&&<Button variant="secondary" disabled={pending} onClick={()=>setDetailsOpen(true)}>Đọc mô tả</Button>}
    <Button size="lg" leadingIcon={meta.buttonIcon} disabled={pending||!availability.canTrigger||locked} loading={pending} onClick={()=>onTrigger?.(action)} aria-label={meta.buttonLabel||`Thực hiện ${meta.title||action.id}`}>{meta.buttonLabel||(availability.reason==='password_required'?'Xác thực':'Thực hiện')}</Button>
   </Grid>
  </div>
  <Dialog open={detailsOpen} onClose={()=>setDetailsOpen(false)} title={meta.title||action.title||action.id} description="Thông tin chi tiết của hành động">
   <p className="vsr-text-body">{description||'Không có mô tả chi tiết.'}</p>
   {canRead&&<Button onClick={async()=>{await onMarkRead?.(action);setDetailsOpen(false);}}>Đã đọc mô tả</Button>}
  </Dialog>
  <Dialog open={challengeOpen} onClose={cancel} title="Xác thực hành động" description={passwordChallenge?.description||'Trả lời thử thách do Engine cung cấp.'}>
   <form className="vsr-stack vsr-stack--gap-3" onSubmit={submit}>
    {passwordChallenge?.type==='puzzle'&&passwordChallenge.puzzle?.url&&<MediaFrame src={passwordChallenge.puzzle.url} ratio="1:1" alt="Hình thử thách xếp mảnh"/>}
    {passwordChallenge?.type==='find_way'&&passwordChallenge.findWay&&<div className="vsr-stack vsr-stack--gap-1"><p className="vsr-text-secondary">Lưới: {passwordChallenge.findWay.area?.join(' × ')||'—'}</p><p className="vsr-text-secondary">Bắt đầu: {passwordChallenge.findWay.start?.join(', ')||'—'}</p><p className="vsr-text-secondary">Đích: {passwordChallenge.findWay.target?.join(', ')||'—'}</p></div>}
    {structured?<Textarea label={passwordChallenge.type==='puzzle'?'Thứ tự mảnh ghép (JSON)':'Đường đi (JSON tọa độ)'} hint={passwordChallenge.type==='puzzle'?'Nhập mảng chỉ số mảnh theo thứ tự hàng, ví dụ [0,1,2,3,4,5,6,7,8].':'Nhập mảng tọa độ [x,y], bắt đầu tại điểm đầu và kết thúc tại điểm đích.'} rows={4} value={input} onChange={e=>setInput(e.target.value)} required/>:<Input label="Mật khẩu" type="password" autoComplete="current-password" value={input} onChange={e=>setInput(e.target.value)} required/>}
    {Number.isFinite(passwordChallenge?.remainingAttempts)&&<p className="vsr-text-secondary" role="status">Số lượt còn lại: {passwordChallenge.remainingAttempts}</p>}
    {deadline>0&&<p className="vsr-text-secondary" role="status">Thời gian còn lại: {deadline} giây</p>}
    {feedback&&<p role="status">{feedback}</p>}{error&&<p className="vsr-text-error" role="alert">{error}</p>}
    <Grid columns="auto" gap="2"><Button size="lg" type="button" variant="secondary" disabled={passwordPending} onClick={cancel}>Hủy thử thách</Button><Button size="lg" type="submit" disabled={!input.trim()||passwordPending} loading={passwordPending}>Gửi câu trả lời</Button></Grid>
   </form>
  </Dialog>
 </article>;
}
export default memo(ActionCard);
