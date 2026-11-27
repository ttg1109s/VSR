import { adaptSpriteTrajectory, validateMotionLifecycleProtocol } from '../protocol/JsonProtocol.js';
// Runtime Sprite operations. Effect syntax is resolved in effect/Strategies.js.
function poseLocation(value) { return Array.isArray(value?.location) ? value.location : Array.isArray(value) ? value : null; }
function poseTransform(value, fallback={rotate:0,scale:1,origin:'center'}) {
 const tuple=value?.transform;
 if(Array.isArray(tuple)&&tuple.length===3)return {rotate:Number(tuple[0]??fallback.rotate),scale:Number(tuple[1]??fallback.scale),origin:String(tuple[2]??fallback.origin)};
 if(tuple&&typeof tuple==='object'){const rotation=tuple.rotation??tuple.rotate??fallback.rotate,scale=tuple.scale??fallback.scale,origin=tuple.origin??fallback.origin;return {rotate:Array.isArray(rotation)?Number(rotation[2]??fallback.rotate):Number(rotation),scale:Array.isArray(scale)?Number(scale[0]??fallback.scale):Number(scale),origin:Array.isArray(origin)?String(fallback.origin):String(origin)};}
 return {...fallback};
}
function sampleTransformKeys(keys,time,endTime,fallback) {
 if(!Array.isArray(keys)||!keys.length)return {...fallback};
 const t=Math.max(0,Math.min(Number(time),Number(endTime)||0)),right=keys.findIndex(k=>k.time>=t);
 if(right<=0)return {rotate:keys[0].rotate,scale:keys[0].scale,origin:keys[0].origin??fallback.origin};
 if(right<0)return {...keys.at(-1)};
 const a=keys[right-1],b=keys[right],span=Math.max(1e-9,b.time-a.time),u=Math.max(0,Math.min(1,(t-a.time)/span));
 return {rotate:a.rotate+(b.rotate-a.rotate)*u,scale:a.scale+(b.scale-a.scale)*u,origin:b.origin??a.origin??fallback.origin};
}

function sampleSerializedSegments(segments, time, terminalClamp=true) {
    if (!Array.isArray(segments) || !segments.length) return null;
    const terminal=segments.at(-1);
    if(terminalClamp&&time>=terminal.endTime-1e-9){
        const last=sampleSerializedSegments([terminal],terminal.endTime,false);
        return last?{position:terminal.finalPosition||last.position,velocity:terminal.finalVelocity||last.velocity}:null;
    }
    const segment=[...segments].reverse().find(item=>time>=item.startTime-1e-9)||segments[0];
    const duration=Math.max(1e-9,segment.endTime-segment.startTime),t=Math.max(0,Math.min(1,(time-segment.startTime)/duration));
    if(segment.type==='bezier'){
        const easing=segment.easing||'linear';
        const easeFns={linear:t=>t,ease_in:t=>t*t,ease_out:t=>1-(1-t)*(1-t),ease_in_out:t=>t<.5?2*t*t:1-2*(1-t)*(1-t),sin_in:t=>1-Math.cos(t*Math.PI/2),sin_out:t=>Math.sin(t*Math.PI/2),sin_in_out:t=>-(Math.cos(Math.PI*t)-1)/2,step:t=>t>=1?1:0};
        const ease=easeFns[easing]||easeFns.linear,u=ease(t),eps=1e-5,du=(ease(Math.min(1,t+eps))-ease(Math.max(0,t-eps)))/(Math.min(1,t+eps)-Math.max(0,t-eps));
        const p=segment.controlPoints,v=1-u;
        const position=[0,1,2].map(axis=>v*v*v*p[0][axis]+3*v*v*u*p[1][axis]+3*v*u*u*p[2][axis]+u*u*u*p[3][axis]);
        const derivative=[0,1,2].map(axis=>3*v*v*(p[1][axis]-p[0][axis])+6*v*u*(p[2][axis]-p[1][axis])+3*u*u*(p[3][axis]-p[2][axis]));
        return {position,velocity:derivative.map(value=>value*du/duration)};
    }
    if(segment.type==='physics'){
        const dt=Math.max(0,Math.min(duration,time-segment.startTime));
        if(Number(segment.linearDamping)>0&&segment.acceleration.every(value=>Math.abs(value)<1e-12)){const k=Number(segment.linearDamping),factor=(1-Math.exp(-k*dt))/k,sampled={position:segment.initialPosition.map((value,axis)=>value+segment.initialVelocity[axis]*factor),velocity:segment.initialVelocity.map(value=>value*Math.exp(-k*dt))};if(time>=segment.endTime-1e-9){if(segment.finalPosition)sampled.position=segment.finalPosition;if(segment.finalVelocity)sampled.velocity=segment.finalVelocity;}return sampled;}
        const sampled={position:segment.initialPosition.map((value,axis)=>value+segment.initialVelocity[axis]*dt+.5*segment.acceleration[axis]*dt*dt),velocity:segment.initialVelocity.map((value,axis)=>value+segment.acceleration[axis]*dt)};
        if(time>=segment.endTime-1e-9){if(segment.finalPosition)sampled.position=segment.finalPosition;if(segment.finalVelocity)sampled.velocity=segment.finalVelocity;}
        return sampled;
    }
    return null;
}

function rebaseSerializedSegments(segments,elapsed,windowEnd){
    if(!Array.isArray(segments)||!segments.length)return[];
    const rebased=[];
    for(const segment of segments){
        if(segment.endTime<=elapsed+1e-9)continue;
        if(segment.startTime<=elapsed+1e-9){
            const sampled=sampleSerializedSegments([segment],elapsed);
            const remaining=Math.max(1e-6,segment.endTime-elapsed);
            if(segment.type==='physics'){
                rebased.push({segmentId:`${segment.segmentId}:rebased`,type:'physics',startTime:0,endTime:Math.min(windowEnd,remaining),initialPosition:sampled.position,initialVelocity:sampled.velocity,acceleration:segment.acceleration,linearDamping:segment.linearDamping});
            }else if(segment.type==='bezier'){
                const end=segment.controlPoints[3];
                const endSample=sampleSerializedSegments([segment],segment.endTime);
                const p0=sampled.position,p3=end,p1=p0.map((v,i)=>v+sampled.velocity[i]*remaining/3),p2=p3.map((v,i)=>v-endSample.velocity[i]*remaining/3);
                rebased.push({segmentId:`${segment.segmentId}:rebased`,type:'bezier',startTime:0,endTime:Math.min(windowEnd,remaining),controlPoints:[p0,p1,p2,p3],easing:'linear'});
            }
        }else{
            rebased.push({...segment,startTime:segment.startTime-elapsed,endTime:Math.min(windowEnd,segment.endTime-elapsed)});
        }
    }
    if(!rebased.length){const last=sampleSerializedSegments(segments,elapsed);rebased.push({segmentId:`${segments.at(-1).segmentId}:terminal`,type:'physics',startTime:0,endTime:windowEnd,initialPosition:last.position,initialVelocity:[0,0,0],acceleration:[0,0,0]});}
    return rebased;
}

import { createBezierTrajectory, createPiecewiseBezierTrajectory, createLinearPhysicsSegment, AuthoritativeSpriteSimulation, FallingPhase, MotionLifecycle, normalizeMotionState, assertMotionStateContinuity, createMotionPhaseResult, finalizeMotionLifecycle } from './sprite/index.js';
export function setSpriteProperty(engine, spriteId, prop, value) {
        const state = engine.api.engine.state;
        const definition = engine.src?.sprite?.[spriteId];
        if (!definition) throw new Error(`Unknown Sprite ID: ${spriteId}`);
        const current = state.getRuntimeSnapshot('sprites.[id]', { id: spriteId });
        if (!current) throw new Error(`Sprite runtime state missing: ${spriteId}`);
        // When a position effect supersedes an in-flight motion, rebase from the
        // presentation trajectory at effect time, not from the ACK-authoritative
        // runtime position (which intentionally remains at the old start).
        const activeBeforeSet = engine.activeSpriteMotions?.get(spriteId);
        let sampledActivePosition = null;
        let sampledActiveTransform = null;
        if (prop === 'position' && activeBeforeSet) {
            const elapsed = Math.max(0, (Date.now() - (activeBeforeSet.startedAt || Date.now())) / 1000);
            const serialized = activeBeforeSet.descriptor?.trajectories?.[spriteId];
            const sampled = sampleSerializedSegments(serialized, elapsed);
            if (sampled?.position?.every(Number.isFinite)) sampledActivePosition = sampled.position;
            sampledActiveTransform=sampleTransformKeys(activeBeforeSet.descriptor?.transformTrajectory,elapsed,activeBeforeSet.descriptor?.endTime||0,poseTransform(definition.position,current.transform||{rotate:0,scale:1,origin:'center'}));
        }
        if (prop === 'state') {
            if (typeof value !== 'string' || !Object.hasOwn(definition.state?.map || {}, value)) throw new TypeError(`Sprite '${spriteId}' has no state '${String(value)}'.`);
            state.update('sprites.[id]', runtime => ({ ...(runtime || {}), state: value }), { id: spriteId });
            return;
        }
        if (prop === 'layer') {
            if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError('Sprite layer requires a finite number.');
            state.update('sprites.[id]', runtime => ({ ...(runtime || {}), layer: value }), { id: spriteId });
            return;
        }
        if (prop === 'position') {
            const incomingLocation=poseLocation(value);
            if (!incomingLocation || incomingLocation.length < 1 || incomingLocation.length > 3 || incomingLocation.some(v => v !== null && (typeof v !== 'number' || !Number.isFinite(v)))) throw new TypeError('Sprite position requires {location:[x,y,z], transform:[rotate,scale,origin]}.');
            const from = [...(sampledActivePosition || poseLocation(current.position) || poseLocation(definition.position) || [0,0,0])];
            const target = [...from];
            for (let index = 0; index < incomingLocation.length; index++) if (incomingLocation[index] !== null) target[index] = incomingLocation[index];
            const baseTransform=sampledActiveTransform || poseTransform(definition.position,current.transform||{rotate:0,scale:1,origin:'center'});
            const targetTransform=poseTransform(value,baseTransform);
            if(!Number.isFinite(targetTransform.rotate)||!Number.isFinite(targetTransform.scale)||targetTransform.scale<=0||typeof targetTransform.origin!=='string'||!targetTransform.origin.trim())throw new TypeError('Sprite position.transform must be [finite rotate, positive scale, non-empty origin].');
            const motion = definition.motion || { enable: false, duration: 0, path: null, easing: 'linear' };
            let descriptor = null;
            let resolvedTarget = target;
            const configuredPath = motion.path;
            const configuredPoint = configuredPath?.point;
            const referencePoints = Array.isArray(configuredPoint?.[0]) ? configuredPoint[0] : [];
            const hasWaypoints = referencePoints.length > 0;
            const mode = configuredPoint?.[1] ?? 'geometry-preserving';
            const effectiveMode = hasWaypoints ? mode : 'geometry-preserving';
            if (motion.enable === true) {
                if (motion.impact?.physics === true && (motion.easing === 'step' || !Number.isFinite(motion.duration) || motion.duration <= 0)) throw new TypeError('Physics-enabled Sprite motion requires a positive duration and continuous easing; step easing is not supported.');
                if (hasWaypoints && !['geometry-preserving', 'absolute'].includes(mode)) throw new TypeError(`Unsupported Sprite motion path mode: ${String(mode)}`);
                const validPoints = referencePoints.every(point =>
                    point && ['x', 'y', 'z'].every(axis => typeof point[axis] === 'number' && Number.isFinite(point[axis]))
                );
                if (!validPoints) throw new TypeError(`Sprite '${spriteId}' motion path contains an invalid reference point.`);
                const validTransforms = referencePoints.every(point =>
                    (point.r === undefined || (typeof point.r === 'number' && Number.isFinite(point.r))) &&
                    (point.s === undefined || (typeof point.s === 'number' && Number.isFinite(point.s) && point.s > 0))
                );
                if (!validTransforms) throw new TypeError(`Sprite '${spriteId}' motion path contains invalid r/ s transform values.`);
                const toPoint = vector => ({ x: vector[0], y: vector[1], z: vector[2] });
                let intermediate = referencePoints.map(point => ({ x: point.x, y: point.y, z: point.z }));
                if (hasWaypoints && mode === 'geometry-preserving') {
                    const origin = poseLocation(definition.position) || from;
                    const direction = target.map((axis, index) => axis - from[index]);
                    const length = Math.hypot(...direction);
                    const offsetFromOrigin = point => [
                        point.x - origin[0],
                        point.y - origin[1],
                        point.z - origin[2]
                    ];
                    if (length > 0) {
                        // A minimal proper rotation maps reference +X to the runtime Start -> End vector.
                        const unit = direction.map(axis => axis / length);
                        const crossAxis = [0, -unit[2], unit[1]];
                        const sinHalf = Math.sqrt(Math.max(0, (1 - unit[0]) / 2));
                        const cosHalf = Math.sqrt(Math.max(0, (1 + unit[0]) / 2));
                        const axisLength = Math.hypot(...crossAxis);
                        const quaternion = axisLength > 1e-12
                            ? [cosHalf, ...crossAxis.map(value => value * sinHalf / axisLength)]
                            : (unit[0] < 0 ? [0, 0, 0, 1] : [1, 0, 0, 0]);
                        const [w, qx, qy, qz] = quaternion;
                        intermediate = intermediate.map(point => {
                            const v = offsetFromOrigin(point);
                            const tx = 2 * (qy * v[2] - qz * v[1]);
                            const ty = 2 * (qz * v[0] - qx * v[2]);
                            const tz = 2 * (qx * v[1] - qy * v[0]);
                            const rotated = [
                                v[0] + w * tx + (qy * tz - qz * ty),
                                v[1] + w * ty + (qz * tx - qx * tz),
                                v[2] + w * tz + (qx * ty - qy * tx)
                            ];
                            return toPoint(rotated.map((value, index) => value + from[index]));
                        });
                    } else {
                        // A zero-length move has no direction: translate without rotation.
                        intermediate = intermediate.map(point =>
                            toPoint(offsetFromOrigin(point).map((value, index) => value + from[index]))
                        );
                    }
                }
                const allPoints = [toPoint(from), ...intermediate, toPoint(target)];
                let motionPoints;
                if (intermediate.length >= 2) {
                    // Two or more authored intermediate points are traversed by a piecewise spline.
                    motionPoints = allPoints;
                } else if (allPoints.length === 3) {
                    // Convert a single authored midpoint into symmetric cubic controls,
                    // so the Bezier passes through that waypoint exactly at t=0.5.
                    const midpoint = allPoints[1];
                    motionPoints = [
                        allPoints[0],
                        toPoint(from.map((value, index) => value + 2 * (midpoint[['x', 'y', 'z'][index]] - value) / 3)),
                        toPoint(target.map((value, index) => value + 2 * (midpoint[['x', 'y', 'z'][index]] - value) / 3)),
                        allPoints[2]
                    ];
                } else {
                    // With no intermediate points the canonical curve is a straight line.
                    motionPoints = [
                        allPoints[0],
                        toPoint(from.map((value, index) => value + (target[index] - value) / 3)),
                        toPoint(from.map((value, index) => value + 2 * (target[index] - value) / 3)),
                        allPoints.at(-1)
                    ];
                }
                const currentTransform = baseTransform;
                const authoredTransforms = referencePoints.map(point => ({
                    rotate: point.r === undefined ? null : point.r,
                    scale: point.s === undefined ? null : point.s
                }));
                const transformNodes = [
                    { position: from, rotate: Number(currentTransform.rotate), scale: Number(currentTransform.scale), origin: currentTransform.origin },
                    ...intermediate.map((point, index) => ({
                        position: [point.x, point.y, point.z],
                        rotate: authoredTransforms[index]?.rotate ?? null,
                        scale: authoredTransforms[index]?.scale ?? null, origin: currentTransform.origin
                    })),
                    { position: target, rotate: Number(targetTransform.rotate), scale: Number(targetTransform.scale), origin: targetTransform.origin }
                ];
                let lastRotate = transformNodes[0].rotate, lastScale = transformNodes[0].scale;
                for (let i=1;i<transformNodes.length;i++) {
                    if (transformNodes[i].rotate === null) transformNodes[i].rotate = lastRotate;
                    else {
                        let delta=((transformNodes[i].rotate-lastRotate+180)%360+360)%360-180;
                        transformNodes[i].rotate=lastRotate+delta;
                    }
                    if (transformNodes[i].scale === null) transformNodes[i].scale = lastScale;
                    lastRotate=transformNodes[i].rotate;lastScale=transformNodes[i].scale;
                }
                const transformDistances = transformNodes.slice(0,-1).map((node,index)=>Math.hypot(...node.position.map((v,k)=>v-transformNodes[index+1].position[k])));
                const transformTotal=transformDistances.reduce((sum,d)=>sum+d,0);
                let transformTime=0;
                const transformTrajectory=[{time:0,rotate:transformNodes[0].rotate,scale:transformNodes[0].scale,origin:transformNodes[0].origin}];
                for(let i=1;i<transformNodes.length;i++){
                    transformTime += Number(motion.duration||0) * (transformTotal>1e-9 ? transformDistances[i-1]/transformTotal : 1/(transformNodes.length-1));
                    transformTrajectory.push({time:transformTime/1000,rotate:transformNodes[i].rotate,scale:transformNodes[i].scale,origin:transformNodes[i].origin});
                }
                engine.spriteMotionSequence = (engine.spriteMotionSequence || 0) + 1;
                const motionId = `${spriteId}:motion:${engine.spriteMotionSequence}`;
                descriptor = {
                    spriteId, motionId,
                    path: { type: intermediate.length >= 2 ? 'bezier-chain' : 'bezier', points: motionPoints },
                    start: toPoint(from), end: toPoint(target),
                    duration: motion.duration, easing: motion.easing,
                    impact: motion.impact || { enable: false, physics: false }, falling: motion.falling || false,
                    geometryMode: effectiveMode, transformTrajectory
                };
            }
            engine.activeSpriteMotions ||= new Map();
            const previous = engine.activeSpriteMotions.get(spriteId);
            if (previous) {
                engine.activeSpriteMotions.delete(spriteId);
                engine.protocol?.publish?.('presentation.sprite.trajectory.cancelled', {
                    spriteId, motionId: previous.motionId, trajectoryId: previous.trajectoryId,
                    replacedBy: descriptor?.motionId ?? null, reason: descriptor ? 'superseded' : 'teleport'
                });
            }
            if (!descriptor) {
                state.update('sprites.[id]', runtime => ({ ...(runtime || {}), position: resolvedTarget, transform: targetTransform, motion: null }), { id: spriteId });
                return;
            }

            const durationSeconds = Math.max(0.001, Number(descriptor.duration || 0) / 1000);
            const startVector = from.map(v => v ?? 0), targetVector = target.map(v => v ?? 0);
            const bezierPoints = descriptor.path.points.map(point => [point.x, point.y, point.z]);
            const spritePhysics = definition.physics || {};
            // Event search follows the authored motion window and any analytically
            // solved natural-equilibrium segment; no physics horizon determines endpoints.
            const eventWindow = durationSeconds;
            const bezier = descriptor.path.type==='bezier-chain'
                ? createPiecewiseBezierTrajectory({points:bezierPoints,duration:durationSeconds,easing:descriptor.easing||'linear',startTime:0,segmentId:`${descriptor.motionId}:initial`})
                : createBezierTrajectory({ points: bezierPoints, duration: durationSeconds, easing: descriptor.easing || 'linear', startTime: 0, segmentId: `${descriptor.motionId}:initial` });
            const initialTrajectory = { ...bezier, endTime: durationSeconds, sample: time => bezier.sample(Math.min(durationSeconds, Math.max(0, time))), velocity: time => bezier.velocity(Math.max(0,Math.min(durationSeconds,Number(time)||0))), segments: bezier.segments||[bezier] };
            const trajectoryMap = new Map([[spriteId, initialTrajectory]]);
            const bodies = {};
            const physicsByBody = {};
            const definitions = engine.src?.sprite || {};
            const runtimeSprites = state.getRuntimeSnapshot('sprites') || {};
            for (const [otherId, otherDef] of Object.entries(definitions)) {
                const otherRuntime = runtimeSprites[otherId] || {};
                let otherPosition = poseLocation(otherRuntime.position) || poseLocation(otherDef.position) || [0,0,0];
                let otherVector = [...otherPosition,0,0].slice(0,3).map(v=>v??0);
                let otherVelocity=[0,0,0];
                const activeOther=engine.activeSpriteMotions.get(otherId);
                if(activeOther&&otherId!==spriteId){
                    const elapsed=Math.max(0,(Date.now()-(activeOther.startedAt||Date.now()))/1000);
                    const serialized=activeOther.descriptor.trajectories?.[otherId];
                    const sampled=sampleSerializedSegments(serialized,elapsed);
                    if(sampled){otherVector=sampled.position;otherVelocity=sampled.velocity;otherPosition=sampled.position;
                        
                        trajectoryMap.set(otherId,{segmentId:`${otherId}:active-rebased`,type:'active-rebased',startTime:0,endTime:eventWindow,segments:rebaseSerializedSegments(serialized,elapsed,eventWindow).map(seg=>seg.type==='bezier'?{...seg,duration:seg.endTime-seg.startTime,points:seg.controlPoints,easingName:seg.easing}:seg),sample:t=>sampleSerializedSegments(serialized,elapsed+t)?.position||otherVector,velocity:t=>sampleSerializedSegments(serialized,elapsed+t)?.velocity||otherVelocity});
                    }
                }
                bodies[otherId] = {
                    id: otherId, layer: Number.isFinite(otherRuntime.layer) ? otherRuntime.layer : otherDef.layer,
                    radius: Number(otherDef.collision?.radius ?? otherDef.radius ?? 0),
                    mass: Number(otherDef.physics?.mass ?? 1), bodyType: otherDef.physics?.bodyType ?? 'dynamic',
                    collisionEnabled: otherId === spriteId ? descriptor.impact?.enable === true : otherDef.collision?.enable !== false, physicsEnabled: descriptor.impact?.physics === true, isMotionOwner: otherId === spriteId
                };
                if (otherId !== spriteId) {
                    if(!activeOther) trajectoryMap.set(otherId, createLinearPhysicsSegment({ segmentId: `${otherId}:initial-runtime`, startTime: 0, duration: eventWindow, position: otherVector, velocity: otherVelocity, acceleration: otherDef.physics?.bodyType === 'static' ? [0,0,0] : (engine.src?.config?.physicsWorld?.gravity || [0,0,0]) }));
                }
                physicsByBody[otherId] = { ...(otherDef.physics || {}), bodyType: otherDef.physics?.bodyType ?? 'dynamic' };
            }
            bodies[spriteId].collisionEnabled = descriptor.impact?.enable === true;
            physicsByBody[spriteId] = { ...spritePhysics, bodyType: spritePhysics.bodyType ?? 'dynamic', restitution: spritePhysics.restitution ?? 0.5, friction: spritePhysics.friction ?? 0 };
            let result;
            if (descriptor.impact?.enable === true) {
                const simulation = new AuthoritativeSpriteSimulation({ subdivisions: 192, maxCollisionEvents: 16, gravity: engine.src?.config?.physicsWorld?.gravity || [0,0,0] });
                result = simulation.run({ bodies, initialTrajectories: trajectoryMap, physicsByBody, startTime: 0 });
            } else {
                result = { startTime: 0, endTime: durationSeconds, collisions: [], segments: new Map([[spriteId, [initialTrajectory]]]), finalPositions: new Map([[spriteId, initialTrajectory.sample(durationSeconds)]]), positionsAtImpact: new Map([[spriteId,startVector]]) };
            }
            if(result.collisionLimitReached) throw new Error(`Sprite physics collision event limit exceeded (${simulation.options.maxCollisionEvents}); motion rejected rather than silently truncated.`);
            let impactEvents = result.collisions.map(event => ({ ...event }));
            const trajectoryId = `${descriptor.motionId}:trajectory:1`;
            const bodyTrajectories = {};
            const bodyFinalPositions = {};
            const affectedBodies=new Set([spriteId,...impactEvents.flatMap(event=>[event.spriteA,event.spriteB])]);
            for (const bodyId of affectedBodies) {
                const segs=result.segments.get(bodyId)||[];
                bodyTrajectories[bodyId] = segs.flatMap(seg => seg.type === 'bezier-chain' ? seg.segments.map(chainSeg => ({ segmentId: chainSeg.segmentId, type:'bezier', startTime:chainSeg.startTime, endTime:chainSeg.endTime, controlPoints:chainSeg.points, easing:descriptor.easing||'linear' })) : [seg]).map(seg => seg.type === 'bezier'
                    ? { segmentId: seg.segmentId, type: 'bezier', startTime: seg.startTime, endTime: seg.endTime, duration: seg.endTime-seg.startTime, controlPoints: seg.points, easing: seg.easingName || seg.easing || descriptor.easing || 'linear' }
                    : { segmentId: seg.segmentId, type: 'physics', startTime: seg.startTime, endTime: seg.endTime, duration: seg.endTime-seg.startTime, initialPosition: seg.initialPosition, initialVelocity: seg.initialVelocity, acceleration: seg.acceleration, finalPosition: seg.finalPosition || seg.sample(seg.endTime), finalVelocity: seg.finalVelocity || seg.velocity(seg.endTime), linearDamping: seg.linearDamping || 0, completion: seg.completion || 'non-terminating-dynamics' });
            }
            let solvedTrajectoryEndTime=durationSeconds;
            const fallingConfig=descriptor.falling===true?{enable:true}:descriptor.falling&&typeof descriptor.falling==='object'?{enable:descriptor.falling.enable!==false,...descriptor.falling}:{enable:false};
            let fallingResult=null,fallingSamples=[],motionLifecycle=null,fallingSimulationBodies=[];
            const fallWorld={...(engine.src?.config?.physicsWorld||{}),...(fallingConfig.world||{})};
            if(fallingConfig.enable){
                const hasAuthoredImpact=impactEvents.some(event=>(event.time??event.t??0)<=durationSeconds+1e-9&&!String(event.eventId||'').startsWith('falling-')&&typeof event.eventId==='string'&&(event.spriteA||event.spriteB));const entrySample=hasAuthoredImpact?(sampleSerializedSegments(bodyTrajectories[spriteId],durationSeconds,false)||{position:targetVector,velocity:bezier.velocity(durationSeconds)}):{position:initialTrajectory.sample(durationSeconds),velocity:initialTrajectory.velocity(durationSeconds)};
                const entryPosition=entrySample.position||targetVector,entryVelocity=entrySample.velocity||bezier.velocity(durationSeconds);
                // Post-authored impact segments are clipped at the phase boundary. Falling continues from the exact resolved sample.
                for(const bodyId of Object.keys(bodyTrajectories)){
                    bodyTrajectories[bodyId]=bodyTrajectories[bodyId].filter(seg=>seg.startTime<durationSeconds+1e-9).map(seg=>{
                        if(seg.endTime<=durationSeconds+1e-9)return seg;
                        const sample=sampleSerializedSegments([seg],durationSeconds,false);
                        return {...seg,endTime:durationSeconds,finalPosition:sample?.position,finalVelocity:sample?.velocity};
                    }).filter(seg=>seg.endTime>=seg.startTime);
                }
                const simulationBodies=[];
                for(const [otherId,otherDef] of Object.entries(definitions)){
                    if(otherId===spriteId)continue;
                    const otherRuntime=runtimeSprites[otherId]||{},otherPhysics=otherDef.physics||{},otherCollision=otherDef.collision||{};
                    const otherSegs=bodyTrajectories[otherId];
                    const sampled=otherSegs?.length?sampleSerializedSegments(otherSegs,durationSeconds,false):trajectoryMap.get(otherId)?.sample?.(durationSeconds);
                    const otherPos=sampled?.position||poseLocation(otherRuntime.position)||poseLocation(otherDef.position)||[0,0,0];
                    const otherVel=sampled?.velocity||[0,0,0];
                    const otherMotionActive=engine.activeSpriteMotions?.get(otherId)?.motionId,otherPhysicsEnabled=Object.hasOwn(otherDef,'physics');simulationBodies.push({id:otherId,bodyType:otherPhysics.bodyType==='static'?'static':otherMotionActive&&!affectedBodies.has(otherId)?'kinematic':otherPhysicsEnabled?(otherPhysics.bodyType||'dynamic'):'kinematic',position:otherPos,velocity:otherVel,orientation:[1,0,0,0],angularVelocity:otherPhysics.angularVelocity||[0,0,0],radius:Number(otherCollision.radius??otherDef.radius??0.5),mass:Number(otherPhysics.mass??1),restitution:Number(otherPhysics.restitution??0.2),friction:Number(otherPhysics.friction??0.5),linearDamping:Number(otherPhysics.linearDamping??0),angularDamping:Number(otherPhysics.angularDamping??0),collider:{shape:otherCollision.shape||'sphere',radius:Number(otherCollision.radius??otherDef.radius??0.5),halfExtents:otherCollision.halfExtents||[0.5,0.5,0.5],offset:otherCollision.offset||[0,0,0]},collisionEnabled:otherCollision.enable!==false,ccd:otherCollision.ccd===true||otherPhysics.ccd===true});
                }
                fallingSimulationBodies=simulationBodies;
                const angle=Number(targetTransform.rotate||0)*Math.PI/180,orientation=[Math.cos(angle/2),0,0,Math.sin(angle/2)];
                const fallingEntry=normalizeMotionState({simulationTime:durationSeconds,state:{position:entryPosition,velocity:entryVelocity,orientation,angularVelocity:physicsByBody[spriteId].angularVelocity||[0,0,0],scale:[targetTransform.scale,targetTransform.scale,targetTransform.scale]},body:{...physicsByBody[spriteId],bodyType:physicsByBody[spriteId].bodyType||'dynamic'},collider:{enabled:bodies[spriteId].collisionEnabled,shape:definitions[spriteId].collision?.shape||'sphere',radius:Number(definitions[spriteId].collision?.radius??definitions[spriteId].radius??0.5),halfExtents:definitions[spriteId].collision?.halfExtents||[0.5,0.5,0.5],offset:definitions[spriteId].collision?.offset||[0,0,0],ccd:definitions[spriteId].collision?.ccd===true},world:{gravity:fallWorld.gravity||[0,-9.81,0],dimension:fallWorld.dimension||'2D',plane:fallWorld.plane||'XY',planeOffset:fallWorld.planeOffset||0},context:{bodyId:spriteId,spriteId,sourcePhase:impactEvents.length?'impact-resolution':'authored-motion',lifecycleId:descriptor.motionId,simulationBodies}});
                const fallingPhase=new FallingPhase({phaseId:`${descriptor.motionId}:falling`,worldConfig:fallWorld,fixedDt:fallingConfig.fixedDt||fallWorld.fixedDt||1/120,maxDuration:fallingConfig.maxDuration||20,maxTicks:fallingConfig.maxTicks||24000,sampleEveryTicks:fallingConfig.sampleEveryTicks||1,restLinearThreshold:fallingConfig.restLinearThreshold??fallWorld.sleepLinearThreshold??0.05,restAngularThreshold:fallingConfig.restAngularThreshold??fallWorld.sleepAngularThreshold??0.05,restDwell:fallingConfig.restDwell??fallWorld.sleepDwell??0.5,environment:fallingConfig.environment||[],stopWhenResting:fallingConfig.stopWhenResting!==false,terminalPolicy:fallingConfig.terminalPolicy||'supported-and-resting'});
                fallingResult=fallingPhase.run(fallingEntry,{lifecycleId:descriptor.motionId,phaseId:`${descriptor.motionId}:falling`});fallingSamples=fallingResult.trajectory.samples;
                const grouped=new Map();for(const sample of fallingSamples){let group=grouped.get(sample.bodyId);if(!group)grouped.set(sample.bodyId,group=[]);group.push(sample);}
                for(const [bodyId,trackSamples] of grouped){if(!bodyTrajectories[bodyId])bodyTrajectories[bodyId]=[];for(let i=1;i<trackSamples.length;i++){const a=trackSamples[i-1],b=trackSamples[i],dt=b.t-a.t;if(dt<=1e-9)continue;const accel=a.v.map((v,axis)=>(b.v[axis]-v)/dt);bodyTrajectories[bodyId].push({segmentId:`${descriptor.motionId}:falling:${bodyId}:${i}`,type:'physics',startTime:a.t,endTime:b.t,initialPosition:a.p,initialVelocity:a.v,acceleration:accel,finalPosition:b.p,finalVelocity:b.v,linearDamping:0,completion:'falling-sample-segment'});bodyFinalPositions[bodyId]=trackSamples.at(-1).p;affectedBodies.add(bodyId);}
                }
                impactEvents=[...impactEvents,...fallingResult.events.map(event=>({eventId:`falling-${event.type}-${event.t}-${event.bodyA||event.bodyId||''}`,time:event.t??event.time,type:event.type,spriteA:event.bodyA||event.bodyId||spriteId,spriteB:event.bodyB||null,...event}))];
                solvedTrajectoryEndTime=fallingResult.interval.endTime;
            }
            for (const [bodyId, pos] of result.finalPositions) if(affectedBodies.has(bodyId)&&!fallingResult) bodyFinalPositions[bodyId] = pos;
            for(const affectedId of affectedBodies){
                if(affectedId===spriteId)continue;
                const activeAffected=engine.activeSpriteMotions.get(affectedId);
                const impactPosition=result.positionsAtImpact.get(affectedId);
                if(activeAffected){
                    engine.activeSpriteMotions.delete(affectedId);
                    engine.protocol?.publish?.('presentation.sprite.trajectory.cancelled',{spriteId:affectedId,motionId:activeAffected.motionId,trajectoryId:activeAffected.trajectoryId,replacedBy:descriptor.motionId,reason:'collision-superseded'});
                }
                state.update('sprites.[id]',runtime=>({...runtime||{},position:impactPosition||runtime?.position,motion:{motionId:descriptor.motionId,trajectoryId,phase:'post-impact',currentTime:impactEvents.at(-1)?.time||0,finalPositions:bodyFinalPositions}}),{id:affectedId});
            }
            const postImpactResults = {};
            for (const bodyId of affectedBodies) {
                const bodySegments = result.segments.get(bodyId) || [];
                const impactForBody = impactEvents.filter(event => event.spriteA === bodyId || event.spriteB === bodyId);
                if (!impactForBody.length) continue;
                const lastImpactTime = Math.max(...impactForBody.map(event => event.time));
                const postSegment = [...bodySegments].reverse().find(segment => segment.type === 'physics' && segment.startTime >= lastImpactTime - 1e-9);
                if (postSegment?.completion === 'natural-equilibrium') postImpactResults[bodyId] = {
                    from: postSegment.initialPosition,
                    to: postSegment.finalPosition || postSegment.sample(postSegment.endTime),
                    duration: postSegment.endTime - postSegment.startTime,
                    startTime: postSegment.startTime,
                    finalVelocity: postSegment.finalVelocity || postSegment.velocity(postSegment.endTime),
                    completion: 'natural-equilibrium'
                };
            }
            if(!fallingResult)solvedTrajectoryEndTime = impactEvents.length
                ? Math.max(durationSeconds, ...Object.values(postImpactResults).filter(result => result.completion === 'natural-equilibrium').map(result => result.startTime + result.duration))
                : durationSeconds;
            // Canonical LUT is generated only by the lifecycle terminal finalizer.
            const lutSampleTimes = [...new Set([0, solvedTrajectoryEndTime, ...impactEvents.map(e=>e.time), ...Object.values(bodyTrajectories).flat().flatMap(seg=>[seg.startTime,seg.endTime]), ...Array.from({length:Math.max(0,Math.ceil(solvedTrajectoryEndTime*60)-1)},(_,i)=>(i+1)/60).filter(t=>t<solvedTrajectoryEndTime), ...fallingSamples.map(sample=>sample.t)])].sort((a,b)=>a-b);
            let motionLUT=null;
            // Lifecycle result is additive to legacy v2 trajectory. Canonical LUT is generated at lifecycle terminal boundary.
            const makeState=(time,position,velocity,phaseContext={})=>normalizeMotionState({simulationTime:time,state:{position:[...position],velocity:[...velocity],orientation:[Math.cos(Number(targetTransform.rotate||0)*Math.PI/360),0,0,Math.sin(Number(targetTransform.rotate||0)*Math.PI/360)],angularVelocity:[...(physicsByBody[spriteId].angularVelocity||[0,0,0])],scale:[targetTransform.scale,targetTransform.scale,targetTransform.scale]},body:{...physicsByBody[spriteId]},collider:{shape:definitions[spriteId].collision?.shape||'sphere',radius:Number(definitions[spriteId].collision?.radius??definitions[spriteId].radius??0.5)},world:{gravity:fallWorld?.gravity||engine.src?.config?.physicsWorld?.gravity||[0,-9.81,0],dimension:fallWorld?.dimension||engine.src?.config?.physicsWorld?.dimension||'2D',plane:fallWorld?.plane||engine.src?.config?.physicsWorld?.plane||'XY'},context:{bodyId:spriteId,spriteId,lifecycleId:descriptor.motionId,...phaseContext}});
            const lifecycleStart=makeState(0,startVector,initialTrajectory.velocity(0),{sourcePhase:'initial'});
            const authoredImpactEvents=impactEvents.filter(event=>(event.time??event.t??0)<=durationSeconds+1e-9&&!String(event.eventId||'').startsWith('falling-'));
            const firstImpact=authoredImpactEvents.filter(event=>event.spriteA||event.spriteB).sort((a,b)=>(a.time??a.t??0)-(b.time??b.t??0))[0]||null;
            const firstImpactTime=firstImpact?Math.max(0,Math.min(durationSeconds,Number(firstImpact.time??firstImpact.t))):durationSeconds;
            const impactPosition=firstImpact?(result.positionsAtImpact.get(spriteId)||(firstImpact.spriteA===spriteId?firstImpact.contactA:firstImpact.spriteB===spriteId?firstImpact.contactB:initialTrajectory.sample(firstImpactTime))):null;
            const impactVelocity=firstImpact?(firstImpact.spriteA===spriteId?firstImpact.velocityBeforeA:firstImpact.spriteB===spriteId?firstImpact.velocityBeforeB:initialTrajectory.velocity(firstImpactTime)):null;
            const authoredEndPosition=firstImpact?impactPosition:initialTrajectory.sample(durationSeconds);
            const authoredEndVelocity=firstImpact?impactVelocity:initialTrajectory.velocity(durationSeconds);
            const authoredEndState=makeState(firstImpactTime,authoredEndPosition,authoredEndVelocity,{sourcePhase:'authored-motion'});
            const authoredSamples=[];for(const t of lutSampleTimes.filter(t=>t<=firstImpactTime+1e-9)){const sampled=initialTrajectory.sample(t),velocity=initialTrajectory.velocity(t),transform=sampleTransformKeys(descriptor.transformTrajectory?.keys,t,durationSeconds,poseTransform(definition.position)),angle=(transform?.rotate||0)*Math.PI/180,half=angle/2;authoredSamples.push({bodyId:spriteId,t,p:sampled,v:velocity,q:[Math.cos(half),0,0,Math.sin(half)],w:physicsByBody[spriteId].angularVelocity||[0,0,0],s:[transform.scale,transform.scale,transform.scale]});}
            const authoredPhase=createMotionPhaseResult({phaseId:`${descriptor.motionId}:authored`,phaseType:'authored-motion',status:'completed',interval:{startTime:0,endTime:firstImpactTime},stateAtStart:lifecycleStart,stateAtEnd:authoredEndState,trajectory:{samples:authoredSamples},events:[],terminal:{reason:firstImpact?'phase_complete':'authored_policy',physicallyResting:false,supported:false},continuation:{required:!!firstImpact||!!fallingResult,nextPhaseType:firstImpact?'impact-resolution':fallingResult?'falling':null,policy:firstImpact?'impact-detected':fallingResult?'falling-enabled':'terminal'}});
            const lifecyclePhases=[authoredPhase];
            if(firstImpact){
                const impactStartState=authoredEndState,impactPhaseEndTime=fallingResult?durationSeconds:solvedTrajectoryEndTime,impactEndSample=sampleSerializedSegments(bodyTrajectories[spriteId],impactPhaseEndTime,false)||{position:bodyFinalPositions[spriteId]||targetVector,velocity:[0,0,0]},impactEndState=makeState(impactPhaseEndTime,impactEndSample.position,impactEndSample.velocity,{sourcePhase:'impact-resolution'});
                const impactSamples=[];for(const t of lutSampleTimes.filter(t=>t>=firstImpactTime-1e-9&&t<=impactPhaseEndTime+1e-9)){for(const bodyId of affectedBodies){const sampled=sampleSerializedSegments(bodyTrajectories[bodyId],t,false);if(sampled){const transform=bodyId===spriteId?sampleTransformKeys(descriptor.transformTrajectory?.keys,t,impactPhaseEndTime,poseTransform(definition.position)):null,angle=(transform?.rotate||0)*Math.PI/180,half=angle/2;impactSamples.push({bodyId,t,p:sampled.position,v:sampled.velocity,q:bodyId===spriteId?[Math.cos(half),0,0,Math.sin(half)]:[1,0,0,0],w:bodyId===spriteId?(physicsByBody[spriteId].angularVelocity||[0,0,0]):[0,0,0],s:bodyId===spriteId?[transform?.scale||1,transform?.scale||1,transform?.scale||1]:[1,1,1]});}}}
                const impactPhase=createMotionPhaseResult({phaseId:`${descriptor.motionId}:impact`,phaseType:'impact-resolution',status:'completed',interval:{startTime:firstImpactTime,endTime:impactPhaseEndTime},stateAtStart:impactStartState,stateAtEnd:impactEndState,trajectory:{samples:impactSamples},events:authoredImpactEvents,terminal:{reason:fallingResult?'phase_complete':'authored_policy',physicallyResting:false,supported:false},continuation:{required:!!fallingResult,nextPhaseType:fallingResult?'falling':null,policy:fallingResult?'falling-enabled':'terminal'}});
                assertMotionStateContinuity(impactStartState,authoredPhase.stateAtEnd);if(fallingResult)assertMotionStateContinuity(impactEndState,fallingResult.stateAtStart);lifecyclePhases.push(impactPhase);
            }else if(fallingResult){assertMotionStateContinuity(authoredEndState,fallingResult.stateAtStart);}
            if(fallingResult)lifecyclePhases.push(fallingResult);
            const lifecycleRunner=new MotionLifecycle({lifecycleId:descriptor.motionId,initialState:lifecycleStart,phases:lifecyclePhases.map(phaseResult=>({phaseId:phaseResult.phaseId,phaseType:phaseResult.phaseType,run:()=>phaseResult})),transitionEvaluator:({index})=>index===lifecyclePhases.length-1?{terminal:true,reason:fallingResult?.terminal.reason||'authored_policy'}:{terminal:false,nextPhaseIndex:index+1}});
            const lifecycleResult=lifecycleRunner.runSync({spriteId});
            lifecycleResult.terminalReason=fallingResult?.terminal.reason||'authored_policy';lifecycleResult.interval={startTime:0,endTime:solvedTrajectoryEndTime};
            motionLifecycle=finalizeMotionLifecycle(lifecycleResult,{coordinateSystem:{dimension:fallWorld?.dimension||engine.src?.config?.physicsWorld?.dimension||'2D'},sampleInterval:fallingConfig?.fixedDt||1/60});
            motionLUT=motionLifecycle.canonicalMotionLUT;
            const participants=[];for(const track of motionLUT.tracks||[]){const first=track.samples[0],last=track.samples.at(-1);if(!first||!last)continue;const participantId=track.bodyId,primary=participantId===spriteId;const makeParticipantState=(sample)=>({simulationTime:sample.t,state:{position:sample.p,velocity:sample.v||[0,0,0],orientation:sample.q||[1,0,0,0],angularVelocity:sample.w||[0,0,0],scale:sample.s||[1,1,1]},body:primary?motionLifecycle.stateAtEnd.body:(physicsByBody[participantId]||{}),collider:primary?motionLifecycle.stateAtEnd.collider:(definitions[participantId]?.collision||{}),world:motionLifecycle.stateAtEnd.world,contactState:{supported:false,contacts:[]},context:{bodyId:participantId,spriteId:participantId,lifecycleId:primary?descriptor.motionId:`${descriptor.motionId}:${participantId}`,sourcePhase:primary?'primary':'affected'}});participants.push({bodyId:participantId,lifecycleId:primary?descriptor.motionId:`${descriptor.motionId}:${participantId}`,role:primary?'primary':'affected',stateAtStart:primary?motionLifecycle.stateAtStart:makeParticipantState(first),stateAtEnd:primary?motionLifecycle.stateAtEnd:makeParticipantState(last),phaseIds:motionLifecycle.phases.map(phase=>phase.phaseId),terminalReason:motionLifecycle.terminalReason});}
            motionLifecycle.participants=participants;validateMotionLifecycleProtocol(motionLifecycle);
            const finalStates={};for(const track of motionLUT.tracks||[]){const last=track.samples.at(-1);if(!last)continue;finalStates[track.bodyId]={simulationTime:last.t,position:last.p,velocity:last.v||[0,0,0],orientation:last.q||[1,0,0,0],angularVelocity:last.w||[0,0,0],scale:last.s||[1,1,1],terminalReason:motionLifecycle.terminalReason,physicallyResting:motionLifecycle.phases.at(-1)?.terminal?.physicallyResting===true,supported:motionLifecycle.phases.at(-1)?.terminal?.supported===true};}
            const authoritativeEnd=motionLifecycle.stateAtEnd;finalStates[spriteId]={simulationTime:authoritativeEnd.simulationTime,position:authoritativeEnd.state.position,velocity:authoritativeEnd.state.velocity,orientation:authoritativeEnd.state.orientation,angularVelocity:authoritativeEnd.state.angularVelocity,scale:authoritativeEnd.state.scale,body:authoritativeEnd.body,collider:authoritativeEnd.collider,world:authoritativeEnd.world,contactState:authoritativeEnd.contactState,context:authoritativeEnd.context,terminalReason:motionLifecycle.terminalReason,physicallyResting:motionLifecycle.phases.at(-1)?.terminal?.physicallyResting===true,supported:motionLifecycle.phases.at(-1)?.terminal?.supported===true};
            descriptor = {
                protocolVersion: 2, spriteId, motionId: descriptor.motionId, trajectoryId,
                motionLUT, motionLifecycle, finalStates,
                startTime: 0, endTime: solvedTrajectoryEndTime, duration: solvedTrajectoryEndTime,
                requestedTarget: targetVector, initialTrajectory: bodyTrajectories[spriteId],
                trajectories: bodyTrajectories, finalPositions: bodyFinalPositions, postImpactResults,
                impacts: impactEvents, geometryMode: effectiveMode, transformTrajectory: descriptor.transformTrajectory,
                presentation: { requiredSegments: Object.values(bodyTrajectories).flat().map(seg => seg.segmentId) }
            };
            const activeMotion = { motionId: descriptor.motionId, trajectoryId, descriptor, finalPositions: bodyFinalPositions, finalStates, startPosition: startVector, endTime: descriptor.endTime, startedAt: Date.now(), phase: 'presentation-pending' };
            engine.activeSpriteMotions.set(spriteId, activeMotion);
            // Runtime remains at the authoritative start position until presentation ACK commits simulation results.
            const moverSimulatedPosition=result.positionsAtImpact.get(spriteId)||startVector;
            state.update('sprites.[id]', runtime => ({ ...(runtime || {}), position: moverSimulatedPosition, transform: targetTransform, motion: { motionId: descriptor.motionId, trajectoryId, phase: impactEvents.length?'post-impact':'presentation-pending', currentTime: impactEvents.at(-1)?.time||0, finalPositions: bodyFinalPositions } }), { id: spriteId });
            for (const impact of impactEvents) {
                engine.lastSpriteImpact ||= new Map();
                const record = { motionId: descriptor.motionId, trajectoryId, impact, timestamp: Date.now() };
                engine.lastSpriteImpact.set(impact.spriteA, { ...record, targetSpriteId: impact.spriteB });
                engine.lastSpriteImpact.set(impact.spriteB, { ...record, targetSpriteId: impact.spriteA });
                engine.protocol?.publish?.('sprite.impact.v2', { ...impact, motionId: descriptor.motionId, trajectoryId });
            }
            const startEffects = Array.isArray(motion.effect?.start) ? motion.effect.start : [];
            const publishIfActive = () => {
                if (engine.activeSpriteMotions.get(spriteId)?.motionId !== descriptor.motionId) return { success: false, reason: 'stale_motion', motionId: descriptor.motionId };
                if(descriptor.motionLifecycle)engine.protocol?.publish?.('sprite.motion.lifecycle',descriptor.motionLifecycle);
                engine.protocol?.publish?.('presentation.sprite.simulation', adaptSpriteTrajectory(descriptor));
                return { success: true, motionId: descriptor.motionId, trajectoryId };
            };
            if (startEffects.length) {
                return Promise.resolve(engine.processRunnables(startEffects, { spriteId, hook: 'motion.start', motionId: descriptor.motionId, trajectoryId, operationIdBase: `sprite:${descriptor.motionId}:${trajectoryId}:motion.start`, operationLedger: engine.spriteOperationLedger }, true))
                    .then(publishIfActive)
                    .catch(error => {
                        if (engine.activeSpriteMotions.get(spriteId)?.motionId === descriptor.motionId) {
                            engine.activeSpriteMotions.delete(spriteId);
                            engine.protocol?.publish?.('presentation.sprite.trajectory.cancelled', { spriteId, motionId: descriptor.motionId, trajectoryId, reason: 'start_hook_failed' });
                        }
                        throw error;
                    });
            }
            return publishIfActive();
            return;
        }
        if (prop === 'scale' || prop === 'rotate') {
            if (typeof value !== 'number' || !Number.isFinite(value) || (prop === 'scale' && value <= 0)) throw new TypeError(`set/sprite ${prop} requires a finite${prop === 'scale' ? ' positive' : ''} number.`);
            state.update('sprites.[id]', runtime => ({ ...(runtime || {}), transform: { ...(runtime?.transform || current.transform || poseTransform(definition.position)), [prop]: value } }), { id: spriteId });
            return;
        }
        if (prop === 'transform') {
            if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length < 1 || Object.keys(value).some(key => !['scale', 'rotate'].includes(key))) throw new TypeError('Sprite transform requires a partial {scale, rotate} object.');
            if (value.scale !== undefined && (typeof value.scale !== 'number' || !Number.isFinite(value.scale) || value.scale <= 0)) throw new TypeError('Sprite transform.scale must be a finite positive number.');
            if (value.rotate !== undefined && (typeof value.rotate !== 'number' || !Number.isFinite(value.rotate))) throw new TypeError('Sprite transform.rotate must be a finite number.');
            state.update('sprites.[id]', runtime => ({ ...(runtime || {}), transform: { ...(runtime?.transform || current.transform || poseTransform(definition.position)), ...value } }), { id: spriteId });
            return;
        }
        throw new TypeError(`Unsupported set/sprite property: ${String(prop)}`);

}
// Build a JSON-safe Sprite presentation projection from definition and runtime state.
export function getSpritePresentationData(engine, spriteId, action = null) {
    const definition = engine.src?.sprite?.[spriteId];
    if (!definition) return null;
    const runtime = engine.api.engine.state.getRuntimeSnapshot('sprites.[id]', { id: spriteId }) || {};
    return {
        id: spriteId,
        actionId: definition.action,
        action,
        layer: Number.isFinite(runtime.layer) ? runtime.layer : definition.layer,
        position: { location: poseLocation(runtime.position) || poseLocation(definition.position), transform: [Number((runtime.transform||poseTransform(definition.position)).rotate), Number((runtime.transform||poseTransform(definition.position)).scale), String((runtime.transform||poseTransform(definition.position)).origin||'center')] },
        motion: definition.motion || { enable: false, duration: 0, type: 'linear', easing: 'linear', step: [] },
        state: runtime.state ?? definition.state?.active ?? Object.keys(definition.state?.map || {})[0] ?? null,
        states: definition.state?.map || {},
        stateMap: definition.state?.map || {}
    };
}


// Sprite subsystem facade, mixed into GameEngine. Keep implementation helpers
// engine-explicit so runtime operations and projections remain easy to test.
export const SpriteSystem = {
    setSpriteProperty(spriteId, prop, value) {
        return setSpriteProperty(this, spriteId, prop, value);
    },

    getSpritePresentationData(spriteId, actionPresentation = null) {
        return getSpritePresentationData(this, spriteId, actionPresentation);
    }
};
