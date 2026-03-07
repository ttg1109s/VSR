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

        if (context.sceneId && context.hook) {
            const scope = context.actionId ? 'action' : (context.charId ? 'character' : (context.routerId ? 'router' : null));
            if (scope) {
                listKey = this.generateBanKey(scope, { sId: context.sceneId, rId: context.routerId, aId: context.actionId, cId: context.charId, hook: context.hook });
            }
        }

        if (listKey && this.state.effect_overrides && this.state.effect_overrides[listKey]) {
            effectiveList = this.state.effect_overrides[listKey];
        }

        if (!isFromQueue && this.pushToEffectQueue) {
            return this.pushToEffectQueue(effectiveList, context, isAsync);
        }

        for (let i = 0; i < effectiveList.length; i++) {
            const wrapper = effectiveList[i];

            // [REFACTOR] Unified Skip Logic (Replaces _disabled)
            if (wrapper.skip === true) continue;

            if (wrapper.type === 'skip_all') break;

            await this.processRunnable(wrapper, context, listKey, sourceList, isAsync);
        }
    },

    async processRunnable(wrapper, context = {}, listKey = null, sourceList = [], isAsync = false) {
        if (!wrapper || typeof wrapper !== 'object') return;
        if (wrapper.req && !this.checkReq(wrapper.req).pass) return;

        if (wrapper.type === 'effect') {
            const process = async (content) => Array.isArray(content) ? await this.processRunnables(content, context, isAsync, true) : await this.applyEffect(content, context, listKey, sourceList);
            if (wrapper.ref) { const templateContent = this.src.templates.effects[wrapper.ref]; if (templateContent) await process(templateContent); else console.warn(`Effect Ref Not Found: ${wrapper.ref}`); }
            if (wrapper.inline) await process(wrapper.inline);
            return;
        }

        if (wrapper.type === 'req') return;
        if (wrapper.type && EffectHandlers[wrapper.type]) { await this.applyEffect(wrapper, context, listKey, sourceList); }
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
        const result = EffectScopeResolvers[cfg.space]?.(cfg, context, this);
        if (!result) return;

        const targetKey = this.generateBanKey(result.scope, result.params);
        if (!targetKey) return;

        const handler = ManageSubtypeHandlers[cfg.subtype];
        if (handler) {
            let defaultList = [];
            if (targetKey === currentKey) {
                defaultList = sourceList;
            } else {
                defaultList = this.getStaticList(result.scope, result.params);
            }
            handler(this, targetKey, cfg, defaultList);
        } else {
            console.warn(`Manage Effect: Unknown subtype '${cfg.subtype}'`);
        }
    },

    async applyEffect(eff, context, listKey = null, sourceList = []) {
        if (!eff || !eff.type) return;
        try {
            await EffectHandlers[eff.type]?.call(this, eff, context, listKey, sourceList);
        } catch (err) {
            console.error(`SAFEGUARD: Error applying effect [${eff.type}]`, eff, err);
        }
    }
};