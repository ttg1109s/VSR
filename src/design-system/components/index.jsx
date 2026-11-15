import React, { cloneElement, isValidElement, createContext, forwardRef, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
const cx = (...v) => v.filter(Boolean).join(' ');

export const Label = forwardRef(function Label({ required, className, children, ...props }, ref) {
  return <label ref={ref} className={cx('vsr-label', className)} {...props}>{children}{required && <span className="vsr-required"> *</span>}</label>;
});
export const Button = forwardRef(function Button({ variant='primary', size='md', loading=false, disabled=false, leadingIcon, trailingIcon, className, children, type='button', ...props }, ref) {
  return <button ref={ref} type={type} className={cx('vsr-button','vsr-button--'+variant,'vsr-button--'+size,className)} disabled={disabled||loading} aria-busy={loading||undefined} {...props}>
    {loading ? <span className="vsr-spinner" aria-hidden="true"/> : leadingIcon && <span className="vsr-button__icon" aria-hidden="true">{leadingIcon}</span>}
    <span className="vsr-button__label">{children}</span>{!loading&&trailingIcon&&<span className="vsr-button__icon" aria-hidden="true">{trailingIcon}</span>}
  </button>;
});
function Field({ id,label,hint,error,required,className,children }) {
  const hintId=id+'-hint', errorId=id+'-error';
  return <div className={cx('vsr-field',className)}>{label&&<Label htmlFor={id} required={required}>{label}</Label>}
    {children({'aria-describedby':[hint&&hintId,error&&errorId].filter(Boolean).join(' ')||undefined,'aria-invalid':error?true:undefined})}
    {hint&&!error&&<small id={hintId} className="vsr-hint">{hint}</small>}{error&&<small id={errorId} className="vsr-error" role="alert">{error}</small>}</div>;
}
export const Input=forwardRef(function Input({id:given,label,hint,error,required,className,leadingIcon,trailingIcon,...props},ref){
  const uid=useId(),id=given||uid; return <Field id={id} label={label} hint={hint} error={error} required={required} className={className}>{a=><div className={cx('vsr-control-wrap',leadingIcon&&'has-leading',trailingIcon&&'has-trailing')}>{leadingIcon&&<span className="vsr-control-icon left">{leadingIcon}</span>}<input ref={ref} id={id} className={cx('vsr-control',error&&'is-invalid')} required={required} {...a} {...props}/>{trailingIcon&&<span className="vsr-control-icon right">{trailingIcon}</span>}</div>}</Field>;
});
export const Textarea=forwardRef(function Textarea({id:given,label,hint,error,required,className,rows=4,...props},ref){
  const uid=useId(),id=given||uid; return <Field id={id} label={label} hint={hint} error={error} required={required} className={className}>{a=><textarea ref={ref} id={id} rows={rows} className={cx('vsr-control','vsr-textarea',error&&'is-invalid')} required={required} {...a} {...props}/>}</Field>;
});
export const Select=forwardRef(function Select({id:given,label,hint,error,required,className,options=[],placeholder='Select an option',children,...props},ref){
  const uid=useId(),id=given||uid; return <Field id={id} label={label} hint={hint} error={error} required={required} className={className}>{a=><div className="vsr-select-wrap"><select ref={ref} id={id} className={cx('vsr-control','vsr-select',error&&'is-invalid')} required={required} {...a} {...props}>{placeholder&&<option value="" disabled>{placeholder}</option>}{children||options.map(o=><option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}</select><span className="vsr-select-chevron" aria-hidden="true">expand_more</span></div>}</Field>;
});
export const Checkbox=forwardRef(function Checkbox({label,description,className,...props},ref){
  return <label className={cx('vsr-check-row',className)}><input ref={ref} type="checkbox" className="vsr-check-native" {...props}/><span className="vsr-check-box" aria-hidden="true">check</span><span className="vsr-check-copy"><span>{label}</span>{description&&<small>{description}</small>}</span></label>;
});
export const Switch=forwardRef(function Switch({label,description,className,...props},ref){
  return <label className={cx('vsr-switch-row',className)}><span className="vsr-check-copy"><span>{label}</span>{description&&<small>{description}</small>}</span><input ref={ref} type="checkbox" role="switch" className="vsr-switch-native" {...props}/><span className="vsr-switch-track" aria-hidden="true"><i/></span></label>;
});
export function RadioGroup({label,name,value,defaultValue,onChange,options=[],disabled=false,orientation='vertical',className}){
  const id=useId(); return <fieldset className={cx('vsr-radio-group',className)} disabled={disabled}><legend>{label}</legend><div className={'vsr-radio-options vsr-radio-options--'+orientation}>{options.map(o=><label key={o.value} className="vsr-radio-row"><input type="radio" name={name||id} value={o.value} checked={value!==undefined?value===o.value:undefined} defaultChecked={defaultValue===o.value} disabled={disabled||o.disabled} onChange={e=>onChange&&onChange(e.target.value)}/><span className="vsr-radio-dot"/><span className="vsr-check-copy"><span>{o.label}</span>{o.description&&<small>{o.description}</small>}</span></label>)}</div></fieldset>;
}
export function ProgressBar({status='indeterminate',label='Loading'}){
  const complete=status==='complete';
  return <div className={'vsr-progress'+(complete?' vsr-progress--complete':'')} role="progressbar" aria-label={label} aria-valuemin="0" aria-valuemax="100" {...(complete?{'aria-valuenow':100}:{'aria-valuetext':'Loading'})}>
    <span className={'vsr-progress__indicator'+(complete?' vsr-progress__indicator--complete':' vsr-progress__indicator--indeterminate')}/>
  </div>;
}
export function Grid({columns='auto',gap='3',className,children,...props}){
  return <div className={cx('vsr-grid','vsr-grid--columns-'+columns,'vsr-grid--gap-'+gap,className)} {...props}>{children}</div>;
}
export function DescriptionList({layout='list',columns='auto',gap='comfortable',divided=false,className,children,...props}){
  const layoutClass=layout==='grid'?'vsr-description-list--grid':'vsr-description-list--list';
  const columnsClass=layout==='grid'?'vsr-description-list--columns-'+columns:'';
  return <dl className={cx('vsr-description-list',layoutClass,columnsClass,'vsr-description-list--gap-'+gap,divided&&'vsr-description-list--divided',className)} {...props}>{children}</dl>;
}
export function DescriptionListItem({label,value,layout='stacked',span='auto',className}){
  if(value===null||value===undefined||value==='')return null;
  return <div className={cx('vsr-description-list__row',layout==='inline'&&'vsr-description-list__row--inline',span==='full'&&'vsr-description-list__row--span-full',className)}>
    <dt className="vsr-description-list__term">{label}</dt>
    <dd className="vsr-description-list__detail">{value}</dd>
  </div>;
}
export function Separator({orientation='horizontal',decorative=true,className,...props}){
  return <div className={cx('vsr-separator','vsr-separator--'+orientation,className)} role={decorative?undefined:'separator'} aria-orientation={decorative?undefined:orientation} {...props}/>;
}
function useLayer(open,onClose,ref){
  useEffect(()=>{if(!open)return;const previous=document.activeElement;const key=e=>{
    if(e.key==='Escape'){e.stopPropagation();onClose&&onClose();}
    if(e.key==='Tab'&&ref.current){const els=[...ref.current.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')];if(!els.length){e.preventDefault();ref.current.focus();return;}if(e.shiftKey&&document.activeElement===els[0]){e.preventDefault();els[els.length-1].focus();}else if(!e.shiftKey&&document.activeElement===els[els.length-1]){e.preventDefault();els[0].focus();}}
  };document.addEventListener('keydown',key);const frame=requestAnimationFrame(()=>{(ref.current?.querySelector('[autofocus],button:not([disabled]),input:not([disabled])')||ref.current)?.focus?.();});return()=>{cancelAnimationFrame(frame);document.removeEventListener('keydown',key);previous?.focus?.();};},[open,onClose,ref]);
}
function Overlay({open,onClose,title,description,children,size='md',side='right',className}){
  const ref=useRef(null),titleId=useId(),descId=useId();useLayer(open,onClose,ref);if(!open||typeof document==='undefined')return null;
  return createPortal(<div className="vsr-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose&&onClose();}}><section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description?descId:undefined} className={cx('vsr-overlay-panel','vsr-overlay-panel--'+size,'vsr-overlay-panel--'+side,className)}><header className="vsr-overlay-header"><div>{title&&<h2 id={titleId}>{title}</h2>}{description&&<p id={descId}>{description}</p>}</div><button type="button" className="vsr-icon-button" aria-label="Close" onClick={onClose}>close</button></header><div className="vsr-overlay-content">{children}</div></section></div>,document.body);
}
export function Dialog(props){return <Overlay {...props}/>;}
export function Drawer({className,...props}){return <Overlay {...props} className={cx('vsr-drawer',className)}/>;}
export function Menu({trigger,items=[],label='Open menu',align='start',className}){
  const [open,setOpen]=useState(false),root=useRef(null),menu=useRef(null);
  useEffect(()=>{if(!open)return;const outside=e=>{if(!root.current?.contains(e.target))setOpen(false);};const key=e=>{if(e.key==='Escape'){setOpen(false);root.current?.querySelector('button')?.focus();}if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const nodes=[...(menu.current?.querySelectorAll('[role=menuitem]:not([disabled])')||[])],i=nodes.indexOf(document.activeElement);nodes[(i+(e.key==='ArrowDown'?1:-1)+nodes.length)%nodes.length]?.focus();}};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);menu.current?.querySelector('[role=menuitem]')?.focus();return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);};},[open]);
  const triggerNode=isValidElement(trigger)?cloneElement(trigger,{'aria-haspopup':'menu','aria-expanded':open,onClick:e=>{trigger.props.onClick?.(e);if(!e.defaultPrevented)setOpen(v=>{const next=!v;onOpenChange?.(next);return next;});}}):<button type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={()=>setOpen(v=>{const next=!v;onOpenChange?.(next);return next;})}>{trigger}</button>;
  return <div ref={root} className={cx('vsr-menu',className)}>{triggerNode}{open&&<div ref={menu} role="menu" className={'vsr-menu-content vsr-menu-content--'+align}>{items.map((item,i)=>item.separator?<Separator key={'s'+i}/>:<button key={item.key||item.label} type="button" role="menuitem" disabled={item.disabled} className={cx('vsr-menu-item',item.danger&&'is-danger')} onClick={()=>{setOpen(false);item.onSelect?.();}}>{item.icon&&<span>{item.icon}</span>}{item.label}</button>)}</div>}</div>;
}
export function Popover({trigger,children,align='start',label='Open additional content',className,onOpenChange}){
  const [open,setOpen]=useState(false),root=useRef(null);useEffect(()=>{if(!open)return;const outside=e=>{if(!root.current?.contains(e.target))setOpen(false);},key=e=>{if(e.key==='Escape')setOpen(false);};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);};},[open]);
  const triggerNode=isValidElement(trigger)?cloneElement(trigger,{'aria-expanded':open,onClick:e=>{trigger.props.onClick?.(e);if(!e.defaultPrevented)setOpen(v=>{const next=!v;onOpenChange?.(next);return next;});}}):<button type="button" aria-label={label} aria-expanded={open} onClick={()=>setOpen(v=>{const next=!v;onOpenChange?.(next);return next;})}>{trigger}</button>;
  return <div ref={root} className={cx('vsr-popover',className)}>{triggerNode}{open&&<div className={'vsr-popover-content vsr-popover-content--'+align}>{children}</div>}</div>;
}
export function Tooltip({content,children,side='top'}){return <span className="vsr-tooltip">{children}<span role="tooltip" className={'vsr-tooltip-bubble vsr-tooltip-bubble--'+side}>{content}</span></span>;}
const ToastContext=createContext(null);let toastId=0;
export function ToastProvider({children,duration=4000,position='bottom-right'}){
  const [items,setItems]=useState([]),timers=useRef(new Map());
  const dismiss=useCallback(id=>{const t=timers.current.get(id);if(t)clearTimeout(t);timers.current.delete(id);setItems(v=>v.filter(x=>x.id!==id));},[]);
  const toast=useCallback((message,options={})=>{const id=++toastId;setItems(v=>[...v,{id,message,tone:options.tone||'default',action:options.action}].slice(-5));const ms=options.duration??duration;if(ms>0)timers.current.set(id,setTimeout(()=>dismiss(id),ms));return id;},[dismiss,duration]);
  useEffect(()=>()=>timers.current.forEach(clearTimeout),[]);
  return <ToastContext.Provider value={toast}>{children}{typeof document!=='undefined'&&createPortal(<div className={'vsr-toasts vsr-toasts--'+position} aria-live="polite" aria-relevant="additions">{items.map(x=><div key={x.id} role={x.tone==='error'?'alert':'status'} className={cx('vsr-toast','vsr-toast--'+x.tone)}><span>{x.message}</span>{x.action&&<button type="button" onClick={()=>{x.action.onClick?.();dismiss(x.id);}}>{x.action.label}</button>}<button type="button" className="vsr-icon-button" aria-label="Dismiss notification" onClick={()=>dismiss(x.id)}>close</button></div>)}</div>,document.body)}</ToastContext.Provider>;
}
export function useToast(){const toast=useContext(ToastContext);if(!toast)throw new Error('useToast must be used inside ToastProvider.');return toast;}
