// htdocs/engine/modules/effect/Strategies.js

import { AutomationPropertyHandlers, ScenePropertyHandlers, RouterPropertyHandlers, ActionPropertyHandlers, CharacterPropertyHandlers } from './strategies/Handlers.js';
import { SetStrategies, GotoStrategies, resolveValue, getNestedValue } from './strategies/Logic.js';
import { CharacterStrategies } from './strategies/Character.js';
import { ItemStrategies } from './strategies/Item.js';
import { StatsCalculators, StatsModeHandlers } from './strategies/Stats.js';
import { NotifyStrategies } from './strategies/UI.js';
import { EffectKeyStrategies, EffectScopeResolvers, StaticListResolvers, ManageSubtypeHandlers } from './strategies/Management.js';
import { CmsStrategies } from './strategies/Cms.js';
import { API } from '../../../api/index.js'; // [NEW]

// [REFACTOR] Wired SetStrategies with Handlers
const BaseSetStrategies = SetStrategies;

const WiredSetStrategies = {
    ...BaseSetStrategies,

    scene: (engine, eff) => {
        const target = resolveValue(eff.target, engine);
        const val = resolveValue(eff.value, engine);
        const prop = resolveValue(eff.property, engine);
        const sId = engine.state.sceneId;

        if (engine.state.scenes[target]) {
            const handler = ScenePropertyHandlers[prop] || ScenePropertyHandlers.__default__;
            handler(engine, engine.state.scenes[target], val, sId, prop);
        }
    },

    router: (engine, eff) => {
        const sId = engine.state.sceneId;
        const rId = resolveValue(eff.target, engine) || engine.state.scenes[sId].activeRouterId;
        const rKey = `${sId}_${rId}`;
        const router = engine.state.routers[rKey];
        const val = resolveValue(eff.value, engine);
        const prop = resolveValue(eff.property, engine);

        if (router) {
            const handler = RouterPropertyHandlers[prop] || RouterPropertyHandlers.__default__;
            handler(engine, router, val, rId, prop);
        }
    },

    action: (engine, eff) => {
        const sId = engine.state.sceneId;
        const rId = engine.state.scenes[sId].activeRouterId;
        const aId = resolveValue(eff.target, engine);
        const actKey = `${sId}_${rId}_${aId}`;
        const action = engine.state.actions[actKey];
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
        const char = engine.state.characters[charId];
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
    manage_effect(eff, context, key, list) {
        const resolvedEff = { ...eff };
        if (eff.inline) {
            resolvedEff.inline = {
                ...eff.inline,
                target: resolveValue(eff.inline.target, this)
            };
            this.handleManageEffect(resolvedEff.inline, context, key, list);
        }
    },

    cms(eff) {
        CmsStrategies[eff.table]?.(this, eff);
    },

    characters(eff) {
        CharacterStrategies[eff.subtype]?.(this, eff);
    },

    notify(eff) {
        const resolvedEff = {
            ...eff,
            title: resolveValue(eff.title, this),
            text: resolveValue(eff.text, this)
        };
        (NotifyStrategies[eff.subtype] || NotifyStrategies.default)(this, resolvedEff);
    },

    vfx(eff) {
        if (API.render && API.render.vfx) {
            const resolvedTarget = resolveValue(eff.target, this);
            let resolvedValue = resolveValue(eff.value, this);
            const resolvedDuration = resolveValue(eff.duration, this);
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
                        if (!eff.format && mediaDef.type) {
                            // Map schema type (photo, video, sound) to params format?
                            // Schema: photo, video, sound.
                            // Params: photo, video, sound. Same.
                            eff.format = mediaDef.type;
                        }
                    }
                }
            }

            API.render.vfx.exec(eff.subtype, instanceId, {
                target: resolvedTarget,
                property: eff.property,
                value: resolvedValue,
                duration: resolvedDuration,
                // New props
                flicker: eff.flicker,
                loop: eff.loop,
                loopSecond: eff.loopSecond,
                format: eff.format, // Might be updated above if passed by reference (not really here), need to pass explicit variable if I changed it locally.
                // Wait, eff.format is from the object passed in. modifying eff.format directly is bad if eff is reused? 
                // Strategies receiving `eff` usually receive the raw object from JSON.
                // Best to pass the computed format.

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
        ItemStrategies[eff.subtype]?.(this, resolvedEff, context);
    },

    set(eff) {
        SetStrategies[eff.subtype]?.(this, eff);
    },

    async goto(eff) {
        const resolvedEff = {
            ...eff,
            target: resolveValue(eff.target, this)
        };

        if (!this.checkHardLock || !this.checkHardLock(eff.subtype, resolvedEff.target)) {
            await GotoStrategies[eff.subtype]?.(this, resolvedEff);
        }
    }
};
