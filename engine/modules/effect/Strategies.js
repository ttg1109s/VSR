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
        const spriteId = String(resolveValue(eff.target, engine) ?? '');
        const prop = resolveValue(eff.property, engine);
        const value = resolveValue(eff.value, engine);
        engine.setSpriteProperty(spriteId, prop, value);
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
