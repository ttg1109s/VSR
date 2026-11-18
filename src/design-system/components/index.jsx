import React, { cloneElement, isValidElement, createContext, forwardRef, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
const cx = (...v) => v.filter(Boolean).join(' ');

export const Label = forwardRef(function Label({ required, className, children, ...props }, ref) {
  return <label ref={ref} className={cx('vsr-label', className)} {...props}>{children}{required && <span className="vsr-required"> *</span>}</label>;
});
export const Button = forwardRef(function Button({ variant='primary', size='md', layout, loading=false, disabled=false, leadingIcon, trailingIcon, className, children, type='button', ...props }, ref) {
  return <button ref={ref} type={type} className={cx('vsr-button','vsr-button--'+variant,'vsr-button--'+size,layout&&'vsr-button--'+layout,className)} disabled={disabled||loading} aria-busy={loading||undefined} {...props}>
    {loading ? <span className="vsr-spinner" aria-hidden="true"/> : leadingIcon && <span className="vsr-button__icon vsr-icon" aria-hidden="true">{leadingIcon}</span>}
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
  const uid=useId(),id=given||uid; return <Field id={id} label={label} hint={hint} error={error} required={required} className={className}>{a=><div className={cx('vsr-control-wrap',leadingIcon&&'has-leading',trailingIcon&&'has-trailing')}>{leadingIcon&&<span className="vsr-control-icon vsr-icon left" aria-hidden="true">{leadingIcon}</span>}<input ref={ref} id={id} className={cx('vsr-control',error&&'is-invalid')} required={required} {...a} {...props}/>{trailingIcon&&<span className="vsr-control-icon vsr-icon right" aria-hidden="true">{trailingIcon}</span>}</div>}</Field>;
});
export const Textarea=forwardRef(function Textarea({id:given,label,hint,error,required,className,rows=4,...props},ref){
  const uid=useId(),id=given||uid; return <Field id={id} label={label} hint={hint} error={error} required={required} className={className}>{a=><textarea ref={ref} id={id} rows={rows} className={cx('vsr-control','vsr-textarea',error&&'is-invalid')} required={required} {...a} {...props}/>}</Field>;
});
export const Select=forwardRef(function Select({id:given,label,hint,error,required,className,options=[],placeholder='Select an option',children,...props},ref){
  const uid=useId(),id=given||uid; return <Field id={id} label={label} hint={hint} error={error} required={required} className={className}>{a=><div className="vsr-select-wrap"><select ref={ref} id={id} className={cx('vsr-control','vsr-select',error&&'is-invalid')} required={required} {...a} {...props}>{placeholder&&<option value="" disabled>{placeholder}</option>}{children||options.map(o=><option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}</select><span className="vsr-select-chevron" aria-hidden="true">expand_more</span></div>}</Field>;
});
export const IconButton=forwardRef(function IconButton({icon,label,className,variant='tertiary',size='md',...props},ref){
  return <Button ref={ref} variant={variant} size={size} className={cx('vsr-icon-button','vsr-icon-button--'+size,className)} aria-label={label} {...props}>{icon}</Button>;
});
export function SegmentedControl({options,value,onChange,label,className,disabled=false}){
  return <div className={cx('vsr-segmented-control',className)} role="group" aria-label={label}>{options.map(option=><button key={option.value} type="button" className="vsr-segmented-control__item" aria-pressed={value===option.value} disabled={disabled||option.disabled} onClick={()=>onChange?.(option.value)}>{option.label}{option.count>0&&<span className="vsr-segmented-control__count">{option.count}</span>}</button>)}</div>;
}
export const Checkbox=forwardRef(function Checkbox({label,description,className,...props},ref){
  return <label className={cx('vsr-check-row',className)}><input ref={ref} type="checkbox" className="vsr-check-native" {...props}/><span className="vsr-check-box" aria-hidden="true">check</span><span className="vsr-check-copy"><span>{label}</span>{description&&<small>{description}</small>}</span></label>;
});
export const Switch=forwardRef(function Switch({label,description,className,...props},ref){
  return <label className={cx('vsr-switch-row',className)}><span className="vsr-check-copy"><span>{label}</span>{description&&<small>{description}</small>}</span><input ref={ref} type="checkbox" role="switch" className="vsr-switch-native" {...props}/><span className="vsr-switch-track" aria-hidden="true"><i/></span></label>;
});
export function RadioGroup({label,name,value,defaultValue,onChange,options=[],disabled=false,orientation='vertical',className}){
  const id=useId(); return <fieldset className={cx('vsr-radio-group',className)} disabled={disabled}><legend>{label}</legend><div className={'vsr-radio-options vsr-radio-options--'+orientation}>{options.map(o=><label key={o.value} className="vsr-radio-row"><input type="radio" name={name||id} value={o.value} checked={value!==undefined?value===o.value:undefined} defaultChecked={defaultValue===o.value} disabled={disabled||o.disabled} onChange={e=>onChange&&onChange(e.target.value)}/><span className="vsr-radio-dot"/><span className="vsr-check-copy"><span>{o.label}</span>{o.description&&<small>{o.description}</small>}</span></label>)}</div></fieldset>;
}
export function ProgressBar({status='indeterminate',label='Loading',value,max=100,className}){
  const determinate=status==='determinate'||Number.isFinite(value);
  if(determinate){
    const safeMax=Number.isFinite(Number(max))&&Number(max)>0?Number(max):100;
    const safeValue=Number.isFinite(Number(value))?Math.min(safeMax,Math.max(0,Number(value))):0;
    return <progress className={cx('vsr-progress','vsr-progress--determinate',className)} aria-label={label} value={safeValue} max={safeMax}/>;
  }
  const complete=status==='complete';
  return <div className={cx('vsr-progress',complete&&'vsr-progress--complete',className)} role="progressbar" aria-label={label} aria-valuemin="0" aria-valuemax="100" {...(complete?{'aria-valuenow':100}:{'aria-valuetext':'Loading'})}>
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
const activeOverlayLayers = [];

function useLayer(open,onClose,ref){
  const onCloseRef=useRef(onClose);
  onCloseRef.current=onClose;
  useEffect(()=>{
    if(!open)return;
    const previous=document.activeElement;
    activeOverlayLayers.push(ref);
    const key=e=>{
      if(activeOverlayLayers[activeOverlayLayers.length-1]!==ref)return;
      if(e.key==='Escape'){
        e.preventDefault();
        e.stopImmediatePropagation();
        onCloseRef.current?.();
        return;
      }
      if(e.key!=='Tab'||!ref.current)return;
      const selector='a[href],area[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
      const elements=[...ref.current.querySelectorAll(selector)].filter(node=>!node.hasAttribute('hidden')&&node.getAttribute('aria-hidden')!=='true'&&node.getClientRects().length>0);
      if(!elements.length){e.preventDefault();ref.current.focus();return;}
      const first=elements[0],last=elements[elements.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    };
    document.addEventListener('keydown',key,true);
    const frame=requestAnimationFrame(()=>{
      if(activeOverlayLayers[activeOverlayLayers.length-1]!==ref)return;
      (ref.current?.querySelector('[autofocus],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])')||ref.current)?.focus?.();
    });
    return()=>{
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown',key,true);
      const index=activeOverlayLayers.lastIndexOf(ref);
      if(index>=0)activeOverlayLayers.splice(index,1);
      if(previous?.isConnected)previous.focus?.();
    };
  },[open,ref]);
}
function Overlay({open,onClose,title,description,headerActions,headerContent,headerClassName,headerContentClassName,contentClassName,ariaLabel,children,size='md',side='right',className,lockScroll=false,width}){
  const ref=useRef(null),titleId=useId(),descId=useId();
  useLayer(open,onClose,ref);
  useEffect(()=>{
    const locksPageScroll = open && lockScroll;
    if(!locksPageScroll || typeof document==='undefined')return;
    const body=document.body,html=document.documentElement;
    const previous={
      bodyOverflow:body.style.overflow,
      bodyPaddingRight:body.style.paddingRight,
      htmlOverflow:html.style.overflow,
      htmlOverscroll:html.style.overscrollBehavior
    };
    const scrollbarWidth=Math.max(0,window.innerWidth-html.clientWidth);
    body.style.overflow='hidden';
    if(scrollbarWidth)body.style.paddingRight=scrollbarWidth+'px';
    html.style.overflow='hidden';
    html.style.overscrollBehavior='none';
    return()=>{
      body.style.overflow=previous.bodyOverflow;
      body.style.paddingRight=previous.bodyPaddingRight;
      html.style.overflow=previous.htmlOverflow;
      html.style.overscrollBehavior=previous.htmlOverscroll;
    };
  },[open,lockScroll]);
  if(!open||typeof document==='undefined')return null;
  return createPortal(<div className={cx("vsr-overlay",className?.includes("vsr-drawer")&&"vsr-overlay--drawer")} onMouseDown={e=>{if(e.target===e.currentTarget)onClose&&onClose();}}><section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={headerContent?undefined:titleId} aria-label={headerContent?(ariaLabel||title||'Dialog'):undefined} aria-describedby={description&&!headerContent?descId:undefined} style={width?{'--vsr-overlay-panel-width':typeof width==='number'?width+'px':width}:undefined} className={cx('vsr-overlay-panel','vsr-overlay-panel--'+size,'vsr-overlay-panel--'+side,className)}><header className={cx('vsr-overlay-header',headerClassName)}>{headerContent?<div className={cx('vsr-overlay-header__custom',headerContentClassName)}>{headerContent}</div>:<><div className="vsr-overlay-header__copy">{title&&<h2 id={titleId}>{title}</h2>}{description&&<p id={descId}>{description}</p>}</div>{headerActions&&<div className="vsr-overlay-header__actions">{headerActions}</div>}</>}<button type="button" className="vsr-icon-button" aria-label="Close" onClick={onClose}>close</button></header><div className={cx('vsr-overlay-content',contentClassName)}>{children}</div></section></div>,document.body);
}
export function Dialog(props){return <Overlay {...props}/>;}
export function Drawer({className,...props}){return <Overlay {...props} className={cx('vsr-drawer',className)}/>;}
export function Menu({trigger,items=[],label='Open menu',align='start',className,onOpenChange}){
  const [open,setOpen]=useState(false),root=useRef(null),menu=useRef(null);
  useEffect(()=>{if(!open)return;const close=()=>{setOpen(false);onOpenChange?.(false);};const outside=e=>{if(!root.current?.contains(e.target))close();};const key=e=>{if(e.key==='Escape'){close();root.current?.querySelector('button')?.focus();}if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const nodes=[...(menu.current?.querySelectorAll('[role=menuitem]:not([disabled])')||[])],i=nodes.indexOf(document.activeElement);nodes[(i+(e.key==='ArrowDown'?1:-1)+nodes.length)%nodes.length]?.focus();}};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);menu.current?.querySelector('[role=menuitem]')?.focus();return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);};},[open,onOpenChange]);
  const triggerNode=isValidElement(trigger)?cloneElement(trigger,{'aria-haspopup':'menu','aria-expanded':open,onClick:e=>{trigger.props.onClick?.(e);if(!e.defaultPrevented)setOpen(v=>{const next=!v;onOpenChange?.(next);return next;});}}):<button type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={()=>setOpen(v=>{const next=!v;onOpenChange?.(next);return next;})}>{trigger}</button>;
  return <div ref={root} className={cx('vsr-menu',className)}>{triggerNode}{open&&<div ref={menu} role="menu" className={'vsr-menu-content vsr-menu-content--'+align}>{items.map((item,i)=>item.separator?<Separator key={'s'+i}/>:<button key={item.key||item.label} type="button" role="menuitem" disabled={item.disabled} className={cx('vsr-menu-item',item.danger&&'is-danger')} onClick={()=>{setOpen(false);onOpenChange?.(false);item.onSelect?.();}}>{item.icon&&<span className="material-symbols-rounded vsr-menu-item__icon" aria-hidden="true">{item.icon}</span>}{item.label}</button>)}</div>}</div>;
}
export function Popover({trigger,children,align='start',label='Open additional content',className,onOpenChange}){
  const [open,setOpen]=useState(false),[position,setPosition]=useState(null);
  const root=useRef(null),triggerRef=useRef(null),contentRef=useRef(null);
  const close=()=>{setOpen(false);setPosition(null);onOpenChange?.(false);};
  const updatePosition=()=>{
    const trigger=triggerRef.current;
    const anchor=trigger?.getBoundingClientRect();
    if(!anchor)return;
    const card=trigger.closest('.vsr-action-card')?.getBoundingClientRect();
    const margin=16,gap=10;
    const rootStyle=getComputedStyle(document.documentElement);
    const safeTop=parseFloat(rootStyle.getPropertyValue('--vsr-safe-area-top'))||0;
    const safeRight=parseFloat(rootStyle.getPropertyValue('--vsr-safe-area-right'))||0;
    const safeBottom=parseFloat(rootStyle.getPropertyValue('--vsr-safe-area-bottom'))||0;
    const safeLeft=parseFloat(rootStyle.getPropertyValue('--vsr-safe-area-left'))||0;
    const leftBound=Math.max(margin+safeLeft,(card?.left??0)+margin);
    const rightBound=Math.min(window.innerWidth-margin-safeRight,(card?.right??window.innerWidth)-margin-safeRight);
    const width=Math.max(0,Math.min(480,rightBound-leftBound));
    const left=Math.max(leftBound,Math.min(align==='end'?anchor.right-width:leftBound,rightBound-width));
    const initialTop=anchor.bottom+gap;
    setPosition({left,top:initialTop,width,minWidth:Math.min(220,width),arrowLeft:Math.max(12,Math.min(width-12,anchor.left+anchor.width/2-left)),above:false});
  };
  useEffect(()=>{
    if(!open)return;
    let frame=0;
    const place=()=>{
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        updatePosition();
        const anchor=triggerRef.current?.getBoundingClientRect(),panel=contentRef.current?.getBoundingClientRect();
        if(!anchor||!panel)return;
        const margin=16,gap=10;
        const rootStyle=getComputedStyle(document.documentElement);
        const safeTop=parseFloat(rootStyle.getPropertyValue('--vsr-safe-area-top'))||0;
        const safeBottom=parseFloat(rootStyle.getPropertyValue('--vsr-safe-area-bottom'))||0;
        const topBound=margin+safeTop,bottomBound=window.innerHeight-margin-safeBottom;
        const above=anchor.bottom+gap+panel.height>bottomBound&&anchor.top-gap-panel.height>=topBound;
        const top=above?Math.max(topBound,anchor.top-gap-panel.height):Math.min(anchor.bottom+gap,bottomBound-panel.height);
        setPosition(current=>current?{...current,top,above}:current);
      });
    };
    place();
    window.addEventListener('resize',place);
    window.addEventListener('scroll',place,true);
    return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);};
  },[open,align]);
  useEffect(()=>{
    if(!open)return;
    const outside=e=>{if(!root.current?.contains(e.target)&&!contentRef.current?.contains(e.target))close();};
    const key=e=>{if(e.key==='Escape'){close();triggerRef.current?.focus?.();}};
    document.addEventListener('pointerdown',outside);
    document.addEventListener('keydown',key);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);};
  },[open]);
  const toggle=()=>setOpen(value=>{const next=!value;if(next)onOpenChange?.(true);else{setPosition(null);onOpenChange?.(false);}return next;});
  const triggerNode=isValidElement(trigger)?cloneElement(trigger,{ref:node=>{triggerRef.current=node;const original=trigger.ref;if(typeof original==='function')original(node);else if(original)original.current=node;},'aria-expanded':open,onClick:e=>{trigger.props.onClick?.(e);if(!e.defaultPrevented)toggle();}}):<button ref={triggerRef} type="button" aria-label={label} aria-expanded={open} onClick={toggle}>{trigger}</button>;
  return <div ref={root} className={cx('vsr-popover',className)}>{triggerNode}{open&&typeof document!=='undefined'&&createPortal(<div ref={contentRef} className={'vsr-popover-content vsr-popover-content--'+align+(position?.above?' is-above':'')} style={{position:'fixed',left:position?.left??16,top:position?.top??16,width:position?.width??'calc(100vw - 32px)',maxWidth:'calc(100vw - 32px)',minWidth:position?.minWidth??0,boxSizing:'border-box',zIndex:1100,visibility:position?'visible':'hidden','--vsr-popover-arrow-left':(position?.arrowLeft??24)+'px'}}>{<div className="vsr-popover-content__body">{children}</div>}</div>,document.body)}</div>;
}
export function Tooltip({content,children,side='top'}){return <span className="vsr-tooltip">{children}<span role="tooltip" className={'vsr-tooltip-bubble vsr-tooltip-bubble--'+side}>{content}</span></span>;}
const ToastContext=createContext(null);let toastId=0;
export function ToastProvider({children,duration=4000,position='bottom-right'}){
  const [items,setItems]=useState([]),timers=useRef(new Map());
  const dismiss=useCallback(id=>{const t=timers.current.get(id);if(t)clearTimeout(t);timers.current.delete(id);setItems(v=>v.filter(x=>x.id!==id));},[]);
  const toast=useCallback((message,options={})=>{const id=options.id??++toastId;const existing=timers.current.get(id);if(existing)clearTimeout(existing);timers.current.delete(id);setItems(v=>[...v.filter(x=>x.id!==id),{id,message,tone:options.tone||'default',action:options.action}].slice(-5));const ms=options.duration??duration;if(ms!==null&&Number.isFinite(ms)&&ms>=0)timers.current.set(id,setTimeout(()=>dismiss(id),ms));return id;},[dismiss,duration]);
  const toastApi=useMemo(()=>Object.assign((message,options)=>toast(message,options),{dismiss}),[toast,dismiss]);
  useEffect(()=>()=>{timers.current.forEach(clearTimeout);timers.current.clear();},[]);
  return <ToastContext.Provider value={toastApi}>{children}{typeof document!=='undefined'&&createPortal(<div className={'vsr-toasts vsr-toasts--'+position} aria-live="polite" aria-relevant="additions">{items.map(x=><div key={x.id} role={x.tone==='error'?'alert':'status'} className={cx('vsr-toast','vsr-toast--'+x.tone)}><span>{x.message}</span>{x.action&&<button type="button" onClick={()=>{x.action.onClick?.();dismiss(x.id);}}>{x.action.label}</button>}<button type="button" className="vsr-icon-button" aria-label="Dismiss notification" onClick={()=>dismiss(x.id)}>close</button></div>)}</div>,document.body)}</ToastContext.Provider>;
}
export function useToast(){const toast=useContext(ToastContext);if(!toast)throw new Error('useToast must be used inside ToastProvider.');return toast;}
