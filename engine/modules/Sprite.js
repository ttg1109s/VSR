import { adaptSpriteTrajectory } from '../protocol/JsonProtocol.js';
// Runtime Sprite operations. Effect syntax is resolved in effect/Strategies.js.

function sampleSerializedSegments(segments, time, terminalClamp=true) {
    if (!Array.isArray(segments) || !segments.length) return null;
    const terminal=segments.at(-1);
    if(terminalClamp&&time>=terminal.endTime-1e-9){
        const last=sampleSerializedSegments([terminal],terminal.endTime,false);
        return last?{position:last.position,velocity:[0,0,0]}:null;
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
        if(Number(segment.linearDamping)>0&&segment.acceleration.every(value=>Math.abs(value)<1e-12)){const k=Number(segment.linearDamping),factor=(1-Math.exp(-k*dt))/k;return {position:segment.initialPosition.map((value,axis)=>value+segment.initialVelocity[axis]*factor),velocity:segment.initialVelocity.map(value=>value*Math.exp(-k*dt))};}
        return {position:segment.initialPosition.map((value,axis)=>value+segment.initialVelocity[axis]*dt+.5*segment.acceleration[axis]*dt*dt),velocity:segment.initialVelocity.map((value,axis)=>value+segment.acceleration[axis]*dt)};
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

import { createBezierTrajectory, createPiecewiseBezierTrajectory, createLinearPhysicsSegment, AuthoritativeSpriteSimulation } from './sprite/index.js';
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
        if (prop === 'position' && activeBeforeSet) {
            const elapsed = Math.max(0, (Date.now() - (activeBeforeSet.startedAt || Date.now())) / 1000);
            const serialized = activeBeforeSet.descriptor?.trajectories?.[spriteId];
            const sampled = sampleSerializedSegments(serialized, elapsed);
            if (sampled?.position?.every(Number.isFinite)) sampledActivePosition = sampled.position;
        }
        if (prop === 'state') {
            if (typeof value !== 'string' || !Object.hasOwn(definition.state, value)) throw new TypeError(`Sprite '${spriteId}' has no state '${String(value)}'.`);
            state.update('sprites.[id]', runtime => ({ ...(runtime || {}), state: value }), { id: spriteId });
            return;
        }
        if (prop === 'layer') {
            if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError('Sprite layer requires a finite number.');
            state.update('sprites.[id]', runtime => ({ ...(runtime || {}), layer: value }), { id: spriteId });
            return;
        }
        if (prop === 'position') {
            if (!Array.isArray(value) || value.length < 1 || value.length > 3 || value.some(v => v !== null && (typeof v !== 'number' || !Number.isFinite(v)))) {
                throw new TypeError('Sprite position requires an array of 1 to 3 finite numbers or null axis values.');
            }
            const from = [...(sampledActivePosition || current.position || definition.position)];
            const target = [...from];
            for (let index = 0; index < value.length; index++) {
                if (value[index] !== null) target[index] = value[index];
            }
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
                    const origin = definition.position;
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
                const currentTransform = current.transform || definition.transform || { scale: 1, rotate: 0 };
                const authoredTransforms = referencePoints.map(point => ({
                    rotate: point.r === undefined ? null : point.r,
                    scale: point.s === undefined ? null : point.s
                }));
                const transformNodes = [
                    { position: from, rotate: Number(currentTransform.rotate || 0), scale: Number(currentTransform.scale || 1) },
                    ...intermediate.map((point, index) => ({
                        position: [point.x, point.y, point.z],
                        rotate: authoredTransforms[index]?.rotate ?? null,
                        scale: authoredTransforms[index]?.scale ?? null
                    })),
                    { position: target, rotate: Number(currentTransform.rotate || 0), scale: Number(currentTransform.scale || 1) }
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
                const transformTrajectory=[{time:0,rotate:transformNodes[0].rotate,scale:transformNodes[0].scale}];
                for(let i=1;i<transformNodes.length;i++){
                    transformTime += Number(motion.duration||0) * (transformTotal>1e-9 ? transformDistances[i-1]/transformTotal : 1/(transformNodes.length-1));
                    transformTrajectory.push({time:transformTime/1000,rotate:transformNodes[i].rotate,scale:transformNodes[i].scale});
                }
                engine.spriteMotionSequence = (engine.spriteMotionSequence || 0) + 1;
                const motionId = `${spriteId}:motion:${engine.spriteMotionSequence}`;
                descriptor = {
                    spriteId, motionId,
                    path: { type: intermediate.length >= 2 ? 'bezier-chain' : 'bezier', points: motionPoints },
                    start: toPoint(from), end: toPoint(target),
                    duration: motion.duration, easing: motion.easing,
                    impact: motion.impact || { enable: false, physics: false },
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
                state.update('sprites.[id]', runtime => ({ ...(runtime || {}), position: resolvedTarget, motion: null }), { id: spriteId });
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
            const initialTrajectory = { ...bezier, endTime: durationSeconds, sample: time => bezier.sample(Math.min(durationSeconds, Math.max(0, time))), velocity: time => time >= durationSeconds ? [0,0,0] : bezier.velocity(Math.max(0,time)), segments: bezier.segments||[bezier] };
            const trajectoryMap = new Map([[spriteId, initialTrajectory]]);
            const bodies = {};
            const physicsByBody = {};
            const definitions = engine.src?.sprite || {};
            const runtimeSprites = state.getRuntimeSnapshot('sprites') || {};
            for (const [otherId, otherDef] of Object.entries(definitions)) {
                const otherRuntime = runtimeSprites[otherId] || {};
                let otherPosition = otherRuntime.position || otherDef.position || [0,0,0];
                let otherVector = [...otherPosition,0,0].slice(0,3).map(v=>v??0);
                let otherVelocity=[0,0,0];
                const activeOther=engine.activeSpriteMotions.get(otherId);
                if(activeOther&&otherId!==spriteId){
                    const elapsed=Math.max(0,(Date.now()-(activeOther.startedAt||Date.now()))/1000);
                    const serialized=activeOther.descriptor.trajectories?.[otherId];
                    const sampled=sampleSerializedSegments(serialized,elapsed);
                    if(sampled){otherVector=sampled.position;otherVelocity=sampled.velocity;otherPosition=sampled.position;
                        
                        trajectoryMap.set(otherId,{segmentId:`${otherId}:active-rebased`,type:'active-rebased',startTime:0,endTime:eventWindow,segments:rebaseSerializedSegments(serialized,elapsed,eventWindow).map(seg=>seg.type==='bezier'?{...seg,points:seg.controlPoints,easingName:seg.easing}:seg),sample:t=>sampleSerializedSegments(serialized,elapsed+t)?.position||otherVector,velocity:t=>sampleSerializedSegments(serialized,elapsed+t)?.velocity||otherVelocity});
                    }
                }
                bodies[otherId] = {
                    id: otherId, layer: Number.isFinite(otherRuntime.layer) ? otherRuntime.layer : otherDef.layer,
                    radius: Number(otherDef.collision?.radius ?? otherDef.radius ?? 0),
                    mass: Number(otherDef.physics?.mass ?? 1), bodyType: otherDef.physics?.bodyType ?? 'dynamic',
                    collisionEnabled: otherId === spriteId ? descriptor.impact?.enable === true : otherDef.collision?.enable !== false, physicsEnabled: descriptor.impact?.physics === true, isMotionOwner: otherId === spriteId
                };
                if (otherId !== spriteId) {
                    if(!activeOther) trajectoryMap.set(otherId, createLinearPhysicsSegment({ segmentId: `${otherId}:initial-runtime`, startTime: 0, duration: eventWindow, position: otherVector, velocity: otherVelocity, acceleration: otherDef.physics?.bodyType === 'static' ? [0,0,0] : (otherDef.physics?.gravity || [0,0,0]) }));
                }
                physicsByBody[otherId] = { ...(otherDef.physics || {}), bodyType: otherDef.physics?.bodyType ?? 'dynamic' };
            }
            bodies[spriteId].collisionEnabled = descriptor.impact?.enable === true;
            physicsByBody[spriteId] = { ...spritePhysics, bodyType: spritePhysics.bodyType ?? 'dynamic', restitution: spritePhysics.restitution ?? 0.5, friction: spritePhysics.friction ?? 0 };
            let result;
            if (descriptor.impact?.enable === true) {
                const simulation = new AuthoritativeSpriteSimulation({ subdivisions: 192, maxCollisionEvents: 16, gravity: spritePhysics.gravity || [0,0,0] });
                result = simulation.run({ bodies, initialTrajectories: trajectoryMap, physicsByBody, startTime: 0 });
            } else {
                result = { startTime: 0, endTime: durationSeconds, collisions: [], segments: new Map([[spriteId, [initialTrajectory]]]), finalPositions: new Map([[spriteId, initialTrajectory.sample(durationSeconds)]]), positionsAtImpact: new Map([[spriteId,startVector]]) };
            }
            if(result.collisionLimitReached) throw new Error(`Sprite physics collision event limit exceeded (${simulation.options.maxCollisionEvents}); motion rejected rather than silently truncated.`);
            const impactEvents = result.collisions.map(event => ({ ...event }));
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
            for (const [bodyId, pos] of result.finalPositions) if(affectedBodies.has(bodyId)) bodyFinalPositions[bodyId] = pos;
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
            const solvedTrajectoryEndTime = impactEvents.length
                ? Math.max(durationSeconds, ...Object.values(postImpactResults).filter(result => result.completion === 'natural-equilibrium').map(result => result.startTime + result.duration))
                : durationSeconds;
            descriptor = {
                protocolVersion: 2, spriteId, motionId: descriptor.motionId, trajectoryId,
                startTime: 0, endTime: solvedTrajectoryEndTime, duration: solvedTrajectoryEndTime,
                requestedTarget: targetVector, initialTrajectory: bodyTrajectories[spriteId],
                trajectories: bodyTrajectories, finalPositions: bodyFinalPositions, postImpactResults,
                impacts: impactEvents, geometryMode: effectiveMode, transformTrajectory: descriptor.transformTrajectory,
                presentation: { requiredSegments: Object.values(bodyTrajectories).flat().map(seg => seg.segmentId) }
            };
            const activeMotion = { motionId: descriptor.motionId, trajectoryId, descriptor, finalPositions: bodyFinalPositions, startPosition: startVector, endTime: descriptor.endTime, startedAt: Date.now(), phase: 'presentation-pending' };
            engine.activeSpriteMotions.set(spriteId, activeMotion);
            // Runtime remains at the authoritative start position until presentation ACK commits simulation results.
            const moverSimulatedPosition=result.positionsAtImpact.get(spriteId)||startVector;
            state.update('sprites.[id]', runtime => ({ ...(runtime || {}), position: moverSimulatedPosition, motion: { motionId: descriptor.motionId, trajectoryId, phase: impactEvents.length?'post-impact':'presentation-pending', currentTime: impactEvents.at(-1)?.time||0, finalPositions: bodyFinalPositions } }), { id: spriteId });
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
            state.update('sprites.[id]', runtime => ({ ...(runtime || {}), transform: { ...(runtime?.transform || current.transform || definition.transform || { scale: 1, rotate: 0 }), [prop]: value } }), { id: spriteId });
            return;
        }
        if (prop === 'transform') {
            if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length < 1 || Object.keys(value).some(key => !['scale', 'rotate'].includes(key))) throw new TypeError('Sprite transform requires a partial {scale, rotate} object.');
            if (value.scale !== undefined && (typeof value.scale !== 'number' || !Number.isFinite(value.scale) || value.scale <= 0)) throw new TypeError('Sprite transform.scale must be a finite positive number.');
            if (value.rotate !== undefined && (typeof value.rotate !== 'number' || !Number.isFinite(value.rotate))) throw new TypeError('Sprite transform.rotate must be a finite number.');
            state.update('sprites.[id]', runtime => ({ ...(runtime || {}), transform: { ...(runtime?.transform || current.transform || definition.transform || { scale: 1, rotate: 0 }), ...value } }), { id: spriteId });
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
        position: Array.isArray(runtime.position) ? runtime.position : definition.position,
        transform: runtime.transform || definition.transform || { scale: 1, rotate: 0 },
        motion: definition.motion || { enable: false, duration: 0, type: 'linear', easing: 'linear', step: [] },
        state: runtime.state ?? Object.keys(definition.state || {})[0] ?? null,
        states: definition.state || {}
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
