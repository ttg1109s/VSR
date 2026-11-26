// htdocs/engine/modules/Effect.js
// [REFACTORED] EffectSystem - Standardized 'skip' & V9.2 Logic

import { EffectHandlers, EffectKeyStrategies } from './effect/Strategies.js';

export const EffectSystem = {
    generateBanKey(scope, params) { return EffectKeyStrategies[scope]?.(params) || null; },

    async processRunnables(originalList, context = {}, isAsync = false, isFromQueue = false) {
        const sourceList = Array.isArray(originalList) ? originalList : [];
        if (sourceList.length === 0 || (typeof context.shouldContinue === 'function' && !context.shouldContinue())) return;

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
            const scope = context.effectScope === 'character_move'
                ? (context.charId && typeof context.moveEntryId === 'string' && /^[A-Za-z0-9.-]+$/.test(context.moveEntryId) ? 'character_move' : null)
                : (context.actionId ? 'action' : (context.charId ? 'character' : (context.routerId ? 'router' : null)));
            if (scope) {
                listKey = this.generateBanKey(scope, {
                    sId: context.sceneId,
                    rId: context.routerId,
                    aId: context.actionId,
                    cId: context.charId,
                    moveEntryId: context.moveEntryId,
                    hook: context.hook
                });
            }
        }

        const overrides = this.api.engine.state.getRuntimeSnapshot('effect_overrides') || {};
        if (listKey && overrides[listKey]) {
            effectiveList = overrides[listKey];
        }

        if (!isFromQueue && this.pushToEffectQueue) {
            const result = await this.pushToEffectQueue(effectiveList, context, isAsync);
            if (result?.error) throw result.error;
            return result;
        }

        for (let i = 0; i < effectiveList.length; i++) {
            if (typeof context.shouldContinue === 'function' && !context.shouldContinue()) break;
            if (context.skipRunnableIndexes?.has?.(i)) continue;
            const ledgerRoot = context.hookLedgerRoot === true;
            const wrapper = effectiveList[i];
            if (!wrapper || typeof wrapper !== 'object' || Array.isArray(wrapper)) {
                throw new TypeError('Runnable wrapper must be an object.');
            }

            // All wrapper types, including skip_all, pass through the same
            // skip and requirement gate before their control-flow semantics run.
            if (ledgerRoot && typeof context.onRunnableStart === 'function') await context.onRunnableStart(i, wrapper);
            const runnableContext={...context,operationPath:[...(context.operationPath||[]),i],operationId:context.operationIdBase?`${context.operationIdBase}:${[...(context.operationPath||[]),i].join('.')}`:context.operationId};
            const executeRunnable=async({idempotencyKey}={})=>this.processRunnable(wrapper,{...runnableContext,idempotencyKey:idempotencyKey||runnableContext.operationId},listKey,sourceList,isAsync);
            let shouldStop;
            if(runnableContext.operationId&&context.operationLedger?.run)await context.operationLedger.run(runnableContext.operationId,executeRunnable);
            else shouldStop=await executeRunnable({idempotencyKey:runnableContext.operationId});
            if (ledgerRoot && typeof context.onRunnableComplete === 'function') await context.onRunnableComplete(i, wrapper);
            if (shouldStop === true || (typeof context.shouldContinue === 'function' && !context.shouldContinue())) break;
        }
    },

    async processRunnable(wrapper, context = {}, listKey = null, sourceList = [], isAsync = false) {
        if (!wrapper || typeof wrapper !== 'object') throw new TypeError('Runnable wrapper must be an object.');
        if (typeof context.shouldContinue === 'function' && !context.shouldContinue()) return true;
        if (wrapper.skip === true) return;
        if (Object.prototype.hasOwnProperty.call(wrapper, 'req') && !this.checkReq(wrapper.req).pass) return;

        if (wrapper.type === 'skip_all') return true;
        if (wrapper.type === 'effect') {
            const templateContent = wrapper.ref ? this.src?.templates?.effects?.[wrapper.ref] : null;
            if (wrapper.ref && !templateContent) throw new Error(`Unknown effect template reference: ${wrapper.ref}`);
            if (!wrapper.ref && !wrapper.inline) throw new TypeError("An 'effect' wrapper requires ref or inline.");

            const process = async (content) => {
                if (Array.isArray(content)) {
                    await this.processRunnables(content, { ...context, hookLedgerRoot: false, skipRunnableIndexes: undefined, onRunnableStart: undefined, onRunnableComplete: undefined }, isAsync, true);
                    return typeof context.shouldContinue === 'function' && !context.shouldContinue();
                }
                // effect_details permits skip_all as an inline payload type.
                if (content?.type === 'skip_all') return true;
                await this.applyEffect(content, context, listKey, sourceList);
                return typeof context.shouldContinue === 'function' && !context.shouldContinue();
            };

            if (templateContent && await process(templateContent)) return true;
            if (wrapper.inline && await process(wrapper.inline)) return true;
            return false;
        }

        if (!EffectHandlers[wrapper.type]) {
            throw new TypeError(`Unsupported runnable wrapper type: ${String(wrapper.type)}`);
        }
        await this.applyEffect(wrapper, context, listKey, sourceList);
        return typeof context.shouldContinue === 'function' && !context.shouldContinue();
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