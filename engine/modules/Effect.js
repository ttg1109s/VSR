// htdocs/engine/modules/Effect.js
// [REFACTORED] EffectSystem - Standardized 'skip' & V9.2 Logic

import { EffectHandlers, EffectKeyStrategies, EffectScopeResolvers, StaticListResolvers, ManageSubtypeHandlers } from './effect/Strategies.js';

export const EffectSystem = {
    generateBanKey(scope, params) { return EffectKeyStrategies[scope]?.(params) || null; },

    async processRunnables(originalList, context = {}, isAsync = false, isFromQueue = false) {
        const sourceList = Array.isArray(originalList) ? originalList : [];
        if (sourceList.length === 0) return;

        let effectiveList = sourceList;
        let listKey = null;

        // Resolve the active source list for every schema-defined effect scope.
        // Chat and item effects do not necessarily have a scene/router context.
        if (context.chatId !== undefined && context.chatId !== null &&
            context.blockId !== undefined && context.blockId !== null &&
            context.choiceId !== undefined && context.choiceId !== null) {
            listKey = this.generateBanKey('chat', {
                chatId: context.chatId,
                blockId: context.blockId,
                choiceId: context.choiceId
            });
        } else if (context.itemId && context.hook) {
            listKey = this.generateBanKey('item', {
                itemId: context.itemId,
                hook: context.hook
            });
        } else if (context.sceneId && context.hook) {
            const scope = context.actionId ? 'action' : (context.charId ? 'character' : (context.routerId ? 'router' : null));
            if (scope) {
                listKey = this.generateBanKey(scope, {
                    sId: context.sceneId,
                    rId: context.routerId,
                    aId: context.actionId,
                    cId: context.charId,
                    hook: context.hook
                });
            }
        }

        const overrides = this.api.engine.state.getRuntimeSnapshot('effect_overrides') || {};
        if (listKey && overrides[listKey]) effectiveList = overrides[listKey];

        if (!isFromQueue && this.pushToEffectQueue) {
            return this.pushToEffectQueue(effectiveList, context, isAsync);
        }

        for (let i = 0; i < effectiveList.length; i++) {
            const wrapper = effectiveList[i];
            if (!wrapper || typeof wrapper !== 'object' || Array.isArray(wrapper)) {
                throw new TypeError('Runnable wrapper must be an object.');
            }

            // All wrapper types, including skip_all, pass through the same
            // skip and requirement gate before their control-flow semantics run.
            const shouldStop = await this.processRunnable(wrapper, context, listKey, sourceList, isAsync);
            if (shouldStop === true) break;
        }
    },

    async processRunnable(wrapper, context = {}, listKey = null, sourceList = [], isAsync = false) {
        if (!wrapper || typeof wrapper !== 'object') throw new TypeError('Runnable wrapper must be an object.');
        if (wrapper.skip === true) return;
        if (Object.prototype.hasOwnProperty.call(wrapper, 'req') && !this.checkReq(wrapper.req).pass) return;

        if (wrapper.type === 'skip_all') return true;
        if (wrapper.type === 'effect') {
            const templateContent = wrapper.ref ? this.src?.templates?.effects?.[wrapper.ref] : null;
            if (wrapper.ref && !templateContent) throw new Error(`Unknown effect template reference: ${wrapper.ref}`);
            if (!wrapper.ref && !wrapper.inline) throw new TypeError("An 'effect' wrapper requires ref or inline.");

            const process = async (content) => {
                if (Array.isArray(content)) {
                    await this.processRunnables(content, context, isAsync, true);
                    return false;
                }
                // effect_details permits skip_all as an inline payload type.
                if (content?.type === 'skip_all') return true;
                await this.applyEffect(content, context, listKey, sourceList);
                return false;
            };

            if (templateContent && await process(templateContent)) return true;
            if (wrapper.inline && await process(wrapper.inline)) return true;
            return false;
        }

        if (!EffectHandlers[wrapper.type]) {
            throw new TypeError(`Unsupported runnable wrapper type: ${String(wrapper.type)}`);
        }
        await this.applyEffect(wrapper, context, listKey, sourceList);
        return false;
    },

    getStaticList(scope, params) {
        if (!this.src) return [];
        try {
            return StaticListResolvers[scope]?.(this.src, params) || [];
        } catch (e) {
            console.warn("EffectSystem: Lookup Static List Failed", e);
            return [];
        }
    },

    async handleManageEffect(cfg, context, currentKey, sourceList) {
        const resolveScope = EffectScopeResolvers[cfg.space];
        if (typeof resolveScope !== 'function') {
            throw new TypeError(`Unsupported manage_effect space: ${String(cfg.space)}`);
        }
        const result = resolveScope(cfg, context, this);
        if (!result) {
            throw new Error(`Unable to resolve manage_effect target for space '${cfg.space}'.`);
        }

        const targetKey = this.generateBanKey(result.scope, result.params);
        if (!targetKey) {
            throw new Error(`Unable to generate manage_effect key for space '${cfg.space}'.`);
        }

        const handler = ManageSubtypeHandlers[cfg.subtype];
        if (typeof handler !== 'function') {
            throw new TypeError(`Unsupported manage_effect subtype: ${String(cfg.subtype)}`);
        }

        let defaultList = [];
        if (targetKey === currentKey) {
            defaultList = sourceList;
        } else {
            defaultList = this.getStaticList(result.scope, result.params);
        }
        await handler(this, targetKey, cfg, defaultList);
    },

    async applyEffect(eff, context, listKey = null, sourceList = []) {
        if (!eff || !eff.type) throw new TypeError('Effect payload must declare a type.');
        const handler = EffectHandlers[eff.type];
        if (typeof handler !== 'function') throw new TypeError(`Unsupported effect payload type: ${String(eff.type)}`);
        try {
            await handler.call(this, eff, context, listKey, sourceList);
        } catch (error) {
            const wrapped = new Error(`Effect '${eff.type}' failed: ${error.message}`, { cause: error });
            wrapped.code = 'EFFECT_EXECUTION_FAILED';
            throw wrapped;
        }
    }
};