// Runtime Sprite operations. Effect syntax is resolved in effect/Strategies.js.
export function setSpriteProperty(engine, spriteId, prop, value) {
        const state = engine.api.engine.state;
        const definition = engine.src?.sprite?.[spriteId];
        if (!definition) throw new Error(`Unknown Sprite ID: ${spriteId}`);
        const current = state.getRuntimeSnapshot('sprites.[id]', { id: spriteId });
        if (!current) throw new Error(`Sprite runtime state missing: ${spriteId}`);
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
            const from = [...(current.position || definition.position)];
            const target = [...from];
            for (let index = 0; index < value.length; index++) {
                if (value[index] !== null) target[index] = value[index];
            }
            const motion = definition.motion || { enable: false, duration: 0, path: null, easing: 'linear' };
            let descriptor = null;
            let resolvedTarget = target;
            const configuredPath = motion.path;
            const hasWaypointList = Array.isArray(configuredPath?.point?.[0]);
            const isLegacyPath = !Array.isArray(configuredPath?.point) &&
                configuredPath?.type === 'bezier' &&
                Array.isArray(configuredPath?.points) &&
                configuredPath.points.length === 4;
            const referencePoints = hasWaypointList
                ? configuredPath.point[0]
                : isLegacyPath ? configuredPath.points.slice(1, -1) : [];
            const mode = configuredPath?.point?.[1] ?? (isLegacyPath ? 'absolute' : 'geometry-preserving');
            if (motion.enable === true && (hasWaypointList || isLegacyPath)) {
                if (!['geometry-preserving', 'absolute'].includes(mode)) throw new TypeError(`Unsupported Sprite motion path mode: ${String(mode)}`);
                const validPoints = referencePoints.every(point =>
                    point && ['x', 'y', 'z'].every(axis => typeof point[axis] === 'number' && Number.isFinite(point[axis]))
                );
                if (!validPoints) throw new TypeError(`Sprite '${spriteId}' motion path contains an invalid reference point.`);
                const toPoint = vector => ({ x: vector[0], y: vector[1], z: vector[2] });
                let intermediate = referencePoints.map(point => ({ x: point.x, y: point.y, z: point.z }));
                if (mode === 'geometry-preserving') {
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
                if (allPoints.length >= 4) {
                    // A cubic Bezier has two control points; preserve the first and last
                    // authored intermediate points in order when there are more than two.
                    motionPoints = [allPoints[0], allPoints[1], allPoints.at(-2), allPoints.at(-1)];
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
                engine.spriteMotionSequence = (engine.spriteMotionSequence || 0) + 1;
                const motionId = `${spriteId}:motion:${engine.spriteMotionSequence}`;
                descriptor = {
                    spriteId, motionId,
                    path: { type: 'bezier', points: motionPoints },
                    start: toPoint(from), end: toPoint(target),
                    duration: motion.duration, easing: motion.easing,
                    impact: motion.impact || { enable: false, physics: false },
                    geometryMode: mode
                };
            }
            state.update('sprites.[id]', runtime => ({ ...(runtime || {}), position: resolvedTarget }), { id: spriteId });
            if (descriptor) {
                const startEffects = Array.isArray(motion.effect?.start) ? motion.effect.start : [];
                if (startEffects.length) {
                    return Promise.resolve(engine.processRunnables(startEffects, { spriteId, hook: 'motion.start', motionId: descriptor.motionId }, true))
                        .then(() => engine.protocol?.publish?.('presentation.sprite.motion', descriptor));
                }
                engine.protocol?.publish?.('presentation.sprite.motion', descriptor);
            }
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

