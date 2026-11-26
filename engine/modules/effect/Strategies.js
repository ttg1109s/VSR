// htdocs/engine/modules/effect/Strategies.js

import { AutomationPropertyHandlers } from '../Automation.js';
import { ScenePropertyHandlers, RouterPropertyHandlers } from '../Scene.js';
import { ActionPropertyHandlers } from '../Action.js';
import { CharacterPropertyHandlers, CharacterStrategies } from '../Character.js';
import { GotoStrategies, resolveValue, getNestedValue } from './strategies/Logic.js';
import { WiredSetStrategies } from '../SetEffects.js';
import { ItemStrategies } from '../Item.js';
import { StatsCalculators, StatsModeHandlers } from '../Stats.js';
import { NotifyStrategies } from './strategies/Notifications.js';
import { EffectKeyStrategies, EffectScopeResolvers, StaticListResolvers, ManageSubtypeHandlers, manageEffect } from '../Management.js';
import { CmsStrategies } from '../Cms.js';



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
        await manageEffect(this, resolvedEff.inline, context, key, list);
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
        return this.executeSetEffect(eff);
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
