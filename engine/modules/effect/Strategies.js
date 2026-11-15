// htdocs/engine/modules/effect/Strategies.js

import { AutomationPropertyHandlers, ScenePropertyHandlers, RouterPropertyHandlers, ActionPropertyHandlers, CharacterPropertyHandlers } from './strategies/Handlers.js';
import { SetStrategies, GotoStrategies, resolveValue, getNestedValue } from './strategies/Logic.js';
import { CharacterStrategies } from './strategies/Character.js';
import { ItemStrategies } from './strategies/Item.js';
import { StatsCalculators, StatsModeHandlers } from './strategies/Stats.js';
import { NotifyStrategies } from './strategies/Notifications.js';
import { EffectKeyStrategies, EffectScopeResolvers, StaticListResolvers, ManageSubtypeHandlers } from './strategies/Management.js';
import { CmsStrategies } from './strategies/Cms.js';

// [REFACTOR] Wired SetStrategies with Handlers
const BaseSetStrategies = SetStrategies;

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
        const sId = state.sceneId;
        const rId = resolveValue(eff.target, engine) || state.get('scene.activeRouterId', { id: sId });
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
        const sId = state.sceneId;
        const rId = state.get('scene.activeRouterId', { id: sId });
        const aId = resolveValue(eff.target, engine);
        const actKey = `${sId}_${rId}_${aId}`;
        const action = state.getRuntime('actions.[actionKey]', { actionKey: actKey });
        const val = resolveValue(eff.value, engine);
        const prop = resolveValue(eff.property, engine);

        if (action) {
            const handler = ActionPropertyHandlers[prop] || ActionPropertyHandlers.__default__;
            handler(engine, action, val, actKey, prop);
        }
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
            text: resolveValue(eff.text, this)
        };
        handler(this, resolvedEff);
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
                        // Strategies eff.format overrides or fallback?
                        // eff.format is optional in schema?
                        // If eff.format is missing, maybe invoke exec with format from definition.
                        // But exec expects format in params.
                        // Let's modify params passed to exec.
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

    item(eff, context) {
        const resolvedEff = {
            ...eff,
            target: resolveValue(eff.target, this),
            value: resolveValue(eff.value, this)
        };
        const handler = ItemStrategies[eff.subtype];
        if (typeof handler !== 'function') {
            throw new TypeError(`Unsupported item subtype: ${String(eff.subtype)}`);
        }
        handler(this, resolvedEff, context);
    },

    set(eff) {
        const handler = SetStrategies[eff.subtype];
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
        if (!this.checkHardLock || !this.checkHardLock(eff.subtype, resolvedEff.target)) {
            await handler(this, resolvedEff);
        }
    }
};
