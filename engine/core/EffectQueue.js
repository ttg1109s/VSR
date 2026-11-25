export const EffectQueue = {
 pushToEffectQueue(effectiveList,context,isAsync=false){
   return new Promise(resolve=>{
    const item={effectiveList,context,isAsync,resolve};
    const queue=isAsync?this.runtime.effectQueue.async:this.runtime.effectQueue.sync;queue.push(item);
    if(isAsync&&!this.runtime.isAsyncQueueRunning)this.runAsyncQueue();
    if(!isAsync&&!this.runtime.isSyncQueueRunning)this.runSyncQueue();
   });
  }
 
 async runSyncQueue(){
   const runtime=this.runtime, generation=this._lifecycleGeneration||0;
   runtime.isSyncQueueRunning=true;
   try{
    while(runtime.effectQueue.sync.length && !runtime.effectQueuesPaused && this.runtime===runtime && (this._lifecycleGeneration||0)===generation){
     const item=runtime.effectQueue.sync.shift();this.isActionProcessing=true;
     this.api.presentation.navigation.setBlocking(true);
     const queuedContext={...item.context,shouldContinue:()=>this.runtime===runtime&&(this._lifecycleGeneration||0)===generation&&(!item.context?.shouldContinue||item.context.shouldContinue())};
     try{
      const startResult=typeof item.context?.onQueueStart==='function'?item.context.onQueueStart({queue:'sync',runtime,generation}):true;
      if(startResult===false||!queuedContext.shouldContinue()){item.resolve?.({cancelled:true,reason:item.context?.cancelReason||'cancelled_before_start',useId:item.context?.useId});continue;}
      await this.processRunnables(item.effectiveList,queuedContext,false,true);item.resolve?.({cancelled:this.runtime!==runtime||(this._lifecycleGeneration||0)!==generation, useId:item.context?.useId});
     }
     catch(error){if(this.runtime!==runtime||(this._lifecycleGeneration||0)!==generation)item.resolve?.({cancelled:true});else{console.error('EffectQueue sync error:',error);item.resolve?.({cancelled:false,error});}}
    }
   }finally{
    if(this.runtime===runtime && (this._lifecycleGeneration||0)===generation){
     runtime.isSyncQueueRunning=false;this.isActionProcessing=false;
     this.api.presentation.navigation.setBlocking(false);
    }
   }
  }
 
 async runAsyncQueue(){
   const runtime=this.runtime,generation=this._lifecycleGeneration||0;
   runtime.isAsyncQueueRunning=true;
   try{
    while(runtime.effectQueue.async.length && !runtime.effectQueuesPaused && this.runtime===runtime && (this._lifecycleGeneration||0)===generation){
     const item=runtime.effectQueue.async.shift();
     const queuedContext={...item.context,shouldContinue:()=>this.runtime===runtime&&(this._lifecycleGeneration||0)===generation&&(!item.context?.shouldContinue||item.context.shouldContinue())};
     try{
      const startResult=typeof item.context?.onQueueStart==='function'?item.context.onQueueStart({queue:'async',runtime,generation}):true;
      if(startResult===false||!queuedContext.shouldContinue()){item.resolve?.({cancelled:true,reason:item.context?.cancelReason||'cancelled_before_start',useId:item.context?.useId});continue;}
      await this.processRunnables(item.effectiveList,queuedContext,true,true);item.resolve?.({cancelled:this.runtime!==runtime||(this._lifecycleGeneration||0)!==generation, useId:item.context?.useId});
     }
     catch(error){if(this.runtime!==runtime||(this._lifecycleGeneration||0)!==generation)item.resolve?.({cancelled:true});else{console.error('EffectQueue async error:',error);item.resolve?.({cancelled:false,error});}}
    }
   }finally{if(this.runtime===runtime && (this._lifecycleGeneration||0)===generation)runtime.isAsyncQueueRunning=false;}
  }
 
 clearEffectQueue(queueType='all'){
   if(!this.runtime?.effectQueue)return;
   const cancel=queue=>{for(const item of queue.splice(0))item.resolve?.({cancelled:true});};
   if(queueType==='all'||queueType==='sync')cancel(this.runtime.effectQueue.sync);
   if(queueType==='all'||queueType==='async')cancel(this.runtime.effectQueue.async);
  }
};
