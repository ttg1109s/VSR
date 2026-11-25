// htdocs/engine/modules/effect/Strategies.js

import { AutomationPropertyHandlers, ScenePropertyHandlers, RouterPropertyHandlers, ActionPropertyHandlers, CharacterPropertyHandlers } from './strategies/Handlers.js';
import { SetStrategies as BaseSetStrategies, GotoStrategies, resolveValue, getNestedValue } from './strategies/Logic.js';
import { CharacterStrategies } from './strategies/Character.js';
import { ItemStrategies } from './strategies/Item.js';
import { StatsCalculators, StatsModeHandlers } from './strategies/Stats.js';
import { NotifyStrategies } from './strategies/Notifications.js';
import { EffectKeyStrategies, EffectScopeResolvers, StaticListResolvers, ManageSubtypeHandlers } from './strategies/Management.js';
import { CmsStrategies } from './strategies/Cms.js';

// Action definitions and runtime state share one global ID namespace.
function resolveActionRuntime(engine, actionId) {
    if (!actionId || !Object.prototype.hasOwnProperty.call(engine.src?.actions || {}, actionId)) return null;
    return engine.api.engine.state.getRuntime('actions.[id]', { id: actionId });
}

// [REFACTOR] Wired SetStrategies with Handlers
const WiredSetStrategies = {
    ...BaseSetStrategies,

    scene: (engine, eff) => {
        const target = resolveValue(eff.target, engine);
        const val = resolveValue(eff.value, engine);
        const prop = resolveValue(eff.property, engine);
        const state = engine.api.engine.state;
        const sId = state.sceneId;
        const scene = state.getFrom('runtime', 'scenes.[id]', { id: target });

        if (scene) {
            const handler = ScenePropertyHandlers[prop] || ScenePropertyHandlers.__default__;
            handler(engine, scene, val, target, prop);
        }
    },

    router: (engine, eff) => {
        const state = engine.api.engine.state;
        const currentSceneId = state.sceneId;
        const rId = resolveValue(eff.target, engine) || state.get('scene.activeRouterId', { id: currentSceneId });
        const sId = engine.src?.path?.routers?.[rId] || currentSceneId;
        const rKey = `${sId}_${rId}`;
        const router = state.getRuntime('routers.[routerKey]', { routerKey: rKey });
        const val = resolveValue(eff.value, engine);
        const prop = resolveValue(eff.property, engine);

        if (router) {
            const handler = RouterPropertyHandlers[prop] || RouterPropertyHandlers.__default__;
            handler(engine, router, val, rId, prop);
        }
    },

    action: (engine, eff) => {
        const state = engine.api.engine.state;
        const actionId = String(resolveValue(eff.target, engine) ?? '');
        const val = resolveValue(eff.value, engine);
        const prop = resolveValue(eff.property, engine);
        const action = resolveActionRuntime(engine, actionId);
        if (!action) throw new Error(`Unknown Action ID: ${actionId}`);
        const handler = ActionPropertyHandlers[prop] || ActionPropertyHandlers.__default__;
        handler(engine, action, val, actionId, prop);
    },

    sprite: (engine, eff) => {
        const state = engine.api.engine.state;
        const spriteId = String(resolveValue(eff.target, engine) ?? '');
        const prop = resolveValue(eff.property, engine);
        const value = resolveValue(eff.value, engine);
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
            if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError('set/sprite layer requires a finite number.');
            state.update('sprites.[id]', runtime => ({ ...(runtime || {}), layer: value }), { id: spriteId });
            return;
        }
        if (prop === 'position') {
            if (!Array.isArray(value) || value.length < 1 || value.length > 3 || value.some(v => v !== null && (typeof v !== 'number' || !Number.isFinite(v)))) {
                throw new TypeError('set/sprite position requires an array of 1 to 3 finite numbers or null axis values.');
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
            const isWaypointPath = Array.isArray(configuredPath?.point?.[0]);
            const isLegacyPath = !Array.isArray(configuredPath?.point) &&
                configuredPath?.type === 'bezier' &&
                Array.isArray(configuredPath?.points) &&
                configuredPath.points.length === 4;
            const referencePoints = isWaypointPath
                ? configuredPath.point[0]
                : isLegacyPath ? configuredPath.points.slice(1, -1) : [];
            const mode = configuredPath?.point?.[1] ?? (isLegacyPath ? 'absolute' : 'geometry-preserving');
            if (motion.enable === true && (isWaypointPath || isLegacyPath)) {
                const validPoints = referencePoints.every(point =>
                    point && ['x', 'y', 'z'].every(axis => typeof point[axis] === 'number' && Number.isFinite(point[axis]))
                );
                if (!validPoints) throw new TypeError(`Sprite '${spriteId}' motion path contains an invalid reference point.`);
                if (!['geometry-preserving', 'absolute'].includes(mode)) throw new TypeError(`Unsupported Sprite motion path mode: ${String(mode)}`);
                const toPoint = vector => ({ x: vector[0], y: vector[1], z: vector[2] });
                let intermediate = referencePoints.map(point => ({ x: point.x, y: point.y, z: point.z }));
                if (mode === 'geometry-preserving') {
                    const origin = definition.position;
                    const direction = target.map((axis, index) => axis - from[index]);
                    const length = Math.hypot(...direction);
                    const normalizedOffset = point => [
                        point.x - origin[0],
                        point.y - origin[1],
                        point.z - origin[2]
                    ];
                    if (length > 0) {
                        // Apply the minimal proper 3D rotation from reference +X to runtime direction.
                        const unit = direction.map(axis => axis / length);
                        const cross = [0, -unit[2], unit[1]];
                        const sine = Math.hypot(...cross);
                        const cosine = Math.max(-1, Math.min(1, unit[0]));
                        const quaternion = sine > 1e-12
                            ? [Math.sqrt((1 + cosine) / 2), cross[0] / Math.sqrt(2 * (1 + cosine)), cross[1] / Math.sqrt(2 * (1 + cosine)), cross[2] / Math.sqrt(2 * (1 + cosine))]
                            : (cosine < 0 ? [0, 0, 0, 1] : [1, 0, 0, 0]);
                        intermediate = intermediate.map(point => {
                            const v = normalizedOffset(point);
                            const [w, x, y, z] = quaternion;
                            const qv = [x, y, z];
                            const qCrossV = [
                                qv[1] * v[2] - qv[2] * v[1],
                                qv[2] * v[0] - qv[0] * v[2],
                                qv[0] * v[1] - qv[1] * v[0]
                            ];
                            const qCrossTwice = qCrossV.map(value => 2 * value);
                            const qvCrossTwice = [
                                qv[1] * qCrossTwice[2] - qv[2] * qCrossTwice[1],
                                qv[2] * qCrossTwice[0] - qv[0] * qCrossTwice[2],
                                qv[0] * qCrossTwice[1] - qv[1] * qCrossTwice[0]
                            ];
                            const rotated = v.map((value, index) => value + w * qCrossTwice[index] + qvCrossTwice[index]);
                            return toPoint(rotated.map((value, index) => value + from[index]));
                        });
                    } else {
                        // The zero vector has no direction, so retain the reference +X orientation.
                        intermediate = intermediate.map(point =>
                            toPoint(normalizedOffset(point).map((value, index) => value + from[index]))
                        );
                } else {
                                const cross = [
                                    axisUnit[1] * offset[2] - axisUnit[2] * offset[1],
                                    axisUnit[2] * offset[0] - axisUnit[0] * offset[2],
                                    axisUnit[0] * offset[1] - axisUnit[1] * offset[0]
                                ];
                                const projection = axisUnit.reduce((sum, value, index) => sum + value * offset[index], 0);
                                rotated = offset.map((value, index) =>
                                    value * dot + cross[index] * sine + axisUnit[index] * projection * (1 - dot)
                                );
                            }
                            return toPoint(rotated.map((value, index) => value + from[index]));
                        });
                    } else {
                        // The zero vector has no direction, so retain the reference +X orientation.
                        intermediate = intermediate.map(point =>
                            toPoint(normalizedOffset(point).map((value, index) => value + from[index]))
                        );
                    }
                }
                const points = [toPoint(from), ...intermediate, toPoint(target)];
                const motionPoints = points.length >= 4
                    ? points
                    : [
                        points[0],
                        toPoint(from.map((axis, index) => axis + (target[index] - axis) / 3)),
                        toPoint(from.map((axis, index) => axis + 2 * (target[index] - axis) / 3)),
                        points.at(-1)
                    ];
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
            if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length < 1 || Object.keys(value).some(key => !['scale', 'rotate'].includes(key))) throw new TypeError('set/sprite transform requires a partial {scale, rotate} object.');
            if (value.scale !== undefined && (typeof value.scale !== 'number' || !Number.isFinite(value.scale) || value.scale <= 0)) throw new TypeError('set/sprite transform.scale must be a finite positive number.');
            if (value.rotate !== undefined && (typeof value.rotate !== 'number' || !Number.isFinite(value.rotate))) throw new TypeError('set/sprite transform.rotate must be a finite number.');
            state.update('sprites.[id]', runtime => ({ ...(runtime || {}), transform: { ...(runtime?.transform || current.transform || definition.transform || { scale: 1, rotate: 0 }), ...value } }), { id: spriteId });
            return;
        }
        throw new TypeError(`Unsupported set/sprite property: ${String(prop)}`);
    },

    action_count: (engine, eff) => {
        const state = engine.api.engine.state;
        const actionId = String(resolveValue(eff.target, engine) ?? '');
        const phase = resolveValue(eff.phase, engine);
        const value = resolveValue(eff.value, engine);
        if (!['normal', 'pass', 'fail', 'pwFailed'].includes(phase)) {
            throw new TypeError(`Unsupported action counter phase: ${String(phase)}`);
        }
        if (eff.mode !== undefined) throw new TypeError('set/action_count does not support mode.');
        if (!Number.isSafeInteger(value) || value < 0) {
            throw new TypeError('set/action_count requires a non-negative safe integer value.');
        }

        if (!resolveActionRuntime(engine, actionId)) throw new Error(`Unknown Action ID: ${actionId}`);
        state.update('actions.[id]', current => {
            const count = { normal: 0, pass: 0, fail: 0, pwFailed: 0, ...(current?.count || {}) };
            return { ...(current || {}), count: { ...count, [phase]: value } };
        }, { id: actionId });
    },

    character: (engine, eff) => {
        const rawTarget = resolveValue(eff.target, engine);
        const charId = engine.redirectTarget ? engine.redirectTarget(rawTarget) : rawTarget;
        const char = engine.api.engine.state.getRuntime('characters.[id]', { id: charId });
        const val = resolveValue(eff.value, engine);
        const prop = resolveValue(eff.property, engine);

        if (char) {
            const handler = CharacterPropertyHandlers[prop] || CharacterPropertyHandlers.__default__;
            handler(engine, char, val, charId, prop);
        }
    },

    automation: (engine, eff) => {
        const target = resolveValue(eff.target, engine);
        const val = resolveValue(eff.value, engine);
        const prop = resolveValue(eff.property, engine);

        const handler = AutomationPropertyHandlers[prop] || AutomationPropertyHandlers.__default__;
        handler(engine, target, val, prop);
    }
};

export {
    AutomationPropertyHandlers,
    ScenePropertyHandlers,
    RouterPropertyHandlers,
    ActionPropertyHandlers,
    CharacterPropertyHandlers,
    CharacterStrategies,
    ItemStrategies,
    WiredSetStrategies as SetStrategies,
    GotoStrategies,
    StatsCalculators,
    StatsModeHandlers,
    NotifyStrategies,
    EffectKeyStrategies,
    EffectScopeResolvers,
    StaticListResolvers,
    ManageSubtypeHandlers,
    resolveValue,
    getNestedValue
};

export const EffectHandlers = {
    async manage_effect(eff, context, key, list) {
        if (!eff.inline) throw new TypeError('manage_effect requires an inline configuration.');
        const resolvedEff = {
            ...eff,
            inline: {
                ...eff.inline,
                target: resolveValue(eff.inline.target, this)
            }
        };
        await this.handleManageEffect(resolvedEff.inline, context, key, list);
    },

    async cms(eff) {
        const handler = CmsStrategies[eff.table];
        if (typeof handler !== 'function') {
            throw new TypeError(`Unsupported CMS table: ${String(eff.table)}`);
        }
        return await handler(this, eff);
    },

    async characters(eff) {
        const handler = CharacterStrategies[eff.subtype];
        if (typeof handler !== 'function') {
            throw new TypeError(`Unsupported characters subtype: ${String(eff.subtype)}`);
        }
        return await handler(this, eff);
    },

    notify(eff) {
        const subtype = eff.subtype || 'toast';
        const handler = NotifyStrategies[subtype];
        if (typeof handler !== 'function') {
            throw new TypeError(`Unsupported notify subtype: ${String(subtype)}`);
        }
        const resolvedEff = {
            ...eff,
            title: resolveValue(eff.title, this),
            text: resolveValue(eff.text, this),
            category: resolveValue(eff.category, this),
            priority: resolveValue(eff.priority, this),
            durationMs: resolveValue(eff.durationMs, this),
            soundProfile: resolveValue(eff.soundProfile, this)
        };
        handler(this, resolvedEff);
    },

    timer(eff, context = {}) {
        if (!['router', 'cooldown'].includes(eff.subtype)) throw new TypeError(`Unsupported timer subtype: ${String(eff.subtype)}`);
        const target = resolveValue(eff.target, this);
        if (!['pause', 'resume'].includes(eff.control)) throw new TypeError(`Unsupported timer control: ${String(eff.control)}`);
        return eff.subtype === 'router' ? this.controlRouterTimer?.(target, eff.control, context) : this.controlActionCooldown?.(target, eff.control);
    },

    vfx(eff) {
        if (this.api.presentation && this.api.presentation.vfx) {
            const resolvedTarget = resolveValue(eff.target, this);
            let resolvedValue = resolveValue(eff.value, this);
            const resolvedDuration = resolveValue(eff.duration, this);
            let resolvedFormat = eff.format;
            const instanceId = resolveValue(eff.id, this) || resolvedTarget;

            // Media Lookup Logic
            if (eff.subtype === 'media') {
                // If value is not a direct URL, try to look up in src.media
                // Assuming resolvedTarget or resolvedValue could be the media ID.
                // If resolvedTarget is 'media.sound.bgm', we might need to parse it or use it.
                // If the user uses `target: "bgm_id"` and `value` is empty, look up ID.

                const mediaId = resolvedTarget;
                if ((!resolvedValue || !resolvedValue.includes('/')) && this.src && this.src.media) {
                    // Check if mediaId exists in media namespace
                    // Namespace structure: media: { id1: {type, url}, id2: ... } ?
                    // Or is it flattened? Schema said: "additionalProperties": { type: object, properties: {type, url} }
                    // So keys are IDs.
                    const mediaDef = this.src.media[mediaId];
                    if (mediaDef && mediaDef.url) {
                        resolvedValue = mediaDef.url;
                        // Should we also enforce format from definition?
                        if (!resolvedFormat && mediaDef.type) {
                            resolvedFormat = mediaDef.type;
                        }
                    }
                }
            }

            this.api.presentation.vfx.exec(eff.subtype, instanceId, {
                target: resolvedTarget,
                property: eff.property,
                value: resolvedValue,
                duration: resolvedDuration,
                // New props
                flicker: eff.flicker,
                loop: eff.loop,
                loopSecond: eff.loopSecond,
                format: resolvedFormat,

                control: eff.control,
                repeat: eff.repeat
            });
        }
    },

    async item(eff, context) {
        const resolvedEff = {
            ...eff,
            target: resolveValue(eff.target, this),
            value: resolveValue(eff.value, this)
        };
        const handler = ItemStrategies[eff.subtype];
        if (typeof handler !== 'function') {
            throw new TypeError(`Unsupported item subtype: ${String(eff.subtype)}`);
        }
        await handler(this, resolvedEff, context);
    },

    set(eff) {
        const handler = WiredSetStrategies[eff.subtype];
        if (typeof handler !== 'function') {
            throw new TypeError(`Unsupported set subtype: ${String(eff.subtype)}`);
        }
        handler(this, eff);
    },

    async goto(eff) {
        const resolvedEff = {
            ...eff,
            target: resolveValue(eff.target, this)
        };

        const handler = GotoStrategies[eff.subtype];
        if (typeof handler !== 'function') {
            throw new TypeError(`Unsupported goto subtype: ${String(eff.subtype)}`);
        }
        const isNavigationTarget = eff.subtype === 'scene' || eff.subtype === 'router';
        if (!isNavigationTarget || !this.checkHardLock?.(eff.subtype, resolvedEff.target)) {
            await handler(this, resolvedEff);
        }
    }
};
