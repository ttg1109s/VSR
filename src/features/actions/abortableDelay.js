export function delay(ms,{signal}={}){
 if(typeof ms!=='number'||!Number.isFinite(ms)||ms<0)return Promise.reject(new TypeError('Delay must be a finite non-negative number.'));
 if(signal?.aborted)return Promise.reject(createAbortError());
 return new Promise((resolve,reject)=>{
  let settled=false;
  const finish=(callback,value)=>{
   if(settled)return;
   settled=true;
   clearTimeout(timer);
   signal?.removeEventListener('abort',onAbort);
   callback(value);
  };
  const onAbort=()=>finish(reject,createAbortError());
  const timer=setTimeout(()=>finish(resolve),ms);
  signal?.addEventListener('abort',onAbort,{once:true});
  if(signal?.aborted)onAbort();
 });
}
function createAbortError(){
 const error=new Error('The delay was aborted.');
 error.name='AbortError';
 return error;
}
