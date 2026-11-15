// htdocs/engine/modules/effect/strategies/Character.js
import { resolveValue } from './Logic.js';
import { StatsHelpers } from './Stats.js';

const cloneValue = value => JSON.parse(JSON.stringify(value));
const isMoveEntry = value => !!(value && typeof value === 'object' && !Array.isArray(value) && typeof value.scene_id === 'string' && value.scene_id.length > 0);
const MOVE_TYPES = new Set(['random', 'list', 'list_reverse', 'list_loop_reverse', 'edge_bounce_first', 'edge_bounce_last', 'random_weight', 'random_count', 'follow_player', 'avoid_player']);

// Character movement effects operate on the character's movement configuration.
// Supported operations: set (move/moving/moveList), add/remove/replace (moveList).
const MovingLogic = {
    set: (char, eff) => {
        if (eff.property === 'move') {
            if (typeof eff.value !== 'string' || !MOVE_TYPES.has(eff.value)) return false;
            char.set ||= {};
            char.set.move = eff.value;
            return true;
        }
        if (eff.property === 'moving') {
            if (typeof eff.value !== 'boolean') return false;
            char.set ||= {};
            char.set.moving = eff.value;
            return true;
        }
        if (eff.property === 'moveList' && Array.isArray(eff.value) && eff.value.every(isMoveEntry)) {
            char.moveList = cloneValue(eff.value);
            char.place ||= { scene_id: null, currentIndex: 0 };
            char.place.currentIndex = 0;
            return true;
        }
        return false;
    },
    add: (char, eff) => {
        if (eff.property !== 'moveList' || !isMoveEntry(eff.value)) return false;
        char.moveList ||= [];
        char.moveList.push(cloneValue(eff.value));
        return true;
    },
    remove: (char, eff, indices) => {
        if (eff.property !== 'moveList' || !Array.isArray(char.moveList) || !indices.length) return false;
        const valid = [...new Set(indices)].filter(i => Number.isInteger(i) && i >= 0 && i < char.moveList.length).sort((a, b) => b - a);
        if (!valid.length) return false;
        const oldIndex = Number.isInteger(char.place?.currentIndex) ? char.place.currentIndex : 0;
        const removedBeforeCursor = valid.filter(i => i < oldIndex).length;
        valid.forEach(i => char.moveList.splice(i, 1));
        char.place ||= { scene_id: null, currentIndex: 0 };
        char.place.currentIndex = Math.max(0, Math.min(oldIndex - removedBeforeCursor, char.moveList.length - 1));
        return true;
    },
    replace: (char, eff, indices) => {
        if (eff.property !== 'moveList' || !Array.isArray(char.moveList) || indices.length !== 1 || !isMoveEntry(eff.value)) return false;
        const index = indices[0];
        if (!Number.isInteger(index) || index < 0 || index >= char.moveList.length) return false;
        char.moveList[index] = cloneValue(eff.value);
        return true;
    }
};

const resolveCharacterPair = (engine, eff, defaultSource = null) => {
    const target = String(eff.target ?? '');
    if (eff.source !== undefined && eff.source !== null && eff.source !== '') {
        return [
            engine.redirectTarget(target),
            engine.redirectTarget(String(eff.source))
        ];
    }

    // Backward compatibility: legacy target syntax is "destination:source".
    const separator = target.indexOf(':');
    if (separator < 0) {
        return [engine.redirectTarget(target), defaultSource ? engine.redirectTarget(defaultSource) : null];
    }
    return [
        engine.redirectTarget(target.slice(0, separator)),
        engine.redirectTarget(target.slice(separator + 1))
    ];
};

// Transfer a single item ID between two characters without cloning itemInfo state.
const ItemTransferLogic = {
    transfer: async (engine, eff) => {
        const [targetId, sourceId] = resolveCharacterPair(engine, eff);
        const itemId = typeof eff.value === 'string' ? eff.value : '';
        if (!targetId || !sourceId || !itemId || targetId === sourceId) return;

        const state = engine.api.engine.state;
        const itemInfo = state.getRuntimeSnapshot('itemInfo.[id]', { id: itemId });
        if (!itemInfo) return;

        const maxInventory = (engine.getConfig ? engine.getConfig('maxInventory') : null)
            || state.getRuntimeSnapshot('config.maxInventory')
            || [];
        const targetLimitPair = Array.isArray(maxInventory)
            ? maxInventory.find(pair => Array.isArray(pair) && pair[1] === targetId)
            : null;
        const targetLimit = targetLimitPair ? Number(targetLimitPair[0]) : 0;
        const configuredMaxHand = engine.getConfig ? engine.getConfig('maxHandOn') : undefined;
        const maxHand = configuredMaxHand === undefined || configuredMaxHand === null
            ? 10
            : Number(configuredMaxHand);

        const result = await state.transaction(tx => {
            const source = tx.get('characters.[id]', { id: sourceId });
            const target = tx.get('characters.[id]', { id: targetId });
            if (!source || !target) return 'missing_character';

            const sourceInventory = Array.isArray(source.inventory) ? [...source.inventory] : [];
            const targetInventory = Array.isArray(target.inventory) ? [...target.inventory] : [];
            if (!sourceInventory.includes(itemId)) return 'not_owned';
            if (targetInventory.includes(itemId)) return 'duplicate';
            if (targetLimit > 0 && targetInventory.length >= targetLimit) return 'inventory_full';

            const sourceHand = Array.isArray(source.hand) ? [...source.hand] : [];
            const targetHand = Array.isArray(target.hand) ? [...target.hand] : [];
            const wasInHand = sourceHand.includes(itemId);

            source.inventory = sourceInventory.filter(id => id !== itemId);
            source.hand = sourceHand.filter(id => id !== itemId);
            target.inventory = [...targetInventory, itemId];

            // A zero/non-positive hand limit means unlimited, matching the schema contract.
            if (wasInHand && (!(maxHand > 0) || targetHand.length < maxHand)) {
                target.hand = targetHand.includes(itemId) ? targetHand : [...targetHand, itemId];
            }

            tx.set('characters.[id]', source, { id: sourceId });
            tx.set('characters.[id]', target, { id: targetId });
            return wasInHand && !target.hand?.includes(itemId) ? 'transferred_unequipped' : 'transferred';
        });

        if (result !== 'transferred' && result !== 'transferred_unequipped') return;

        const entryChar = state.getRuntime('meta.entryCharacter') || 'player';
        if (sourceId === entryChar || targetId === entryChar) {
            engine.api.presentation.components?.updateItemModal?.(itemId);
            engine.api.presentation.components?.explorer?.();
            engine.api.presentation.components?.updatePlayerCard?.();
        }
        engine.commitState?.('inventory.changed');
        engine.api.notifications?.add?.(
            'Chuyển vật phẩm',
            `Đã chuyển ${itemInfo.name || itemId} từ ${sourceId} sang ${targetId}.`,
            'info',
            { source: 'scenario', category: 'scenario.character.item_transfer' }
        );
    }
};

const StatsLogic = {
    swap: (engine, eff) => {
        const [idA, idB] = resolveCharacterPair(engine, eff);
        if (!idA || !idB) return;

        const charA = engine.api.engine.state.getRuntimeSnapshot('characters.[id]', { id: idA });
        const charB = engine.api.engine.state.getRuntimeSnapshot('characters.[id]', { id: idB });

        const entryChar = engine.api.engine.state.getRuntime('meta.entryCharacter') || 'player';

        if (idA !== idB && charA && charB && charA.stats && charB.stats) {
            engine.api.engine.state.update('characters', characters => {
                const sourceStats = JSON.parse(JSON.stringify(characters[idA].stats));
                characters[idA].stats = JSON.parse(JSON.stringify(characters[idB].stats));
                characters[idB].stats = sourceStats;
                return characters;
            });
            if (idA === entryChar || idB === entryChar) engine.api.presentation.components.updatePlayerCard();
            engine.api.notifications.add("Hoán đổi", `Chỉ số giữa ${charA.set.name} và ${charB.set.name} đã thay đổi.`, "info", { source: 'scenario', category: 'scenario.character.stats_swap' });
        }
    },
    copy_to: (engine, eff) => {
        const entryChar = engine.api.engine.state.getRuntime('meta.entryCharacter') || 'player';
        const [destId, srcId] = resolveCharacterPair(engine, eff, entryChar);
        if (!destId || !srcId) return;
        const statKey = eff.value;

        const destChar = engine.api.engine.state.getRuntimeSnapshot('characters.[id]', { id: destId });
        const srcChar = engine.api.engine.state.getRuntimeSnapshot('characters.[id]', { id: srcId });

        if (destId !== srcId && destChar && srcChar && srcChar.stats && Object.prototype.hasOwnProperty.call(srcChar.stats, statKey)) {
            engine.api.engine.state.update('characters.[id]', current => ({
                ...current,
                stats: { ...(current.stats || {}), [statKey]: JSON.parse(JSON.stringify(srcChar.stats[statKey])) }
            }), { id: destId });
            if (destId === entryChar) engine.api.presentation.components.updatePlayerCard();
        }
    },
    cut_to: (engine, eff) => {
        const entryChar = engine.api.engine.state.getRuntime('meta.entryCharacter') || 'player';
        const [destId, srcId] = resolveCharacterPair(engine, eff, entryChar);
        if (!destId || !srcId) return;
        const statKey = eff.value;

        const destChar = engine.api.engine.state.getRuntime('characters.[id]', { id: destId });
        const srcChar = engine.api.engine.state.getRuntime('characters.[id]', { id: srcId });

        if (destId !== srcId && destChar && srcChar && srcChar.stats && Object.prototype.hasOwnProperty.call(srcChar.stats, statKey)) {
            engine.api.engine.state.update('characters', characters => {
                characters[destId].stats ||= {};
                characters[destId].stats[statKey] = JSON.parse(JSON.stringify(characters[srcId].stats[statKey]));
                delete characters[srcId].stats[statKey];
                return characters;
            });
            if (destId === entryChar || srcId === entryChar) engine.api.presentation.components.updatePlayerCard();
        }
    },
    delete: (engine, eff) => {
        const entryChar = engine.api.engine.state.getRuntime('meta.entryCharacter') || 'player';
        const targetId = engine.redirectTarget(eff.target);
        const statKey = eff.value;
        const char = engine.api.engine.state.getRuntimeSnapshot('characters.[id]', { id: targetId });

        if (char && char.stats && Object.prototype.hasOwnProperty.call(char.stats, statKey)) {
            engine.api.engine.state.update('characters.[id].stats', stats => {
                const next = { ...(stats || {}) };
                delete next[statKey];
                return next;
            }, { id: targetId });
            if (targetId === entryChar) engine.api.presentation.components.updatePlayerCard();
        }
    },

};

export const CharacterStrategies = {
    edit_stats: (engine, eff) => {
        const charId = engine.redirectTarget(eff.target);
        const char = engine.api.engine.state.getRuntime('characters.[id]', { id: charId });
        if (!char) return;

        if (!char.stats) char.stats = {};

        // Delegate to StatsHelpers.edit_value on a detached character snapshot.
        StatsHelpers.edit_value(char, eff, true, charId, engine);
        engine.api.engine.state.set('characters.[id]', char, { id: charId });
    },
    mng_stats: (engine, eff) => {
        const handler = StatsLogic[eff.exec];
        if (typeof handler !== 'function') {
            throw new TypeError(`Unsupported characters.mng_stats operation: ${String(eff.exec)}`);
        }
        const resolvedEff = {
            ...eff,
            target: resolveValue(eff.target, engine),
            source: resolveValue(eff.source, engine),
            value: resolveValue(eff.value, engine)
        };
        handler(engine, resolvedEff);
    },
    mng_items: (engine, eff) => {
        const resolvedEff = {
            ...eff,
            target: resolveValue(eff.target, engine),
            source: resolveValue(eff.source, engine),
            value: resolveValue(eff.value, engine)
        };
        ItemTransferLogic[eff.exec]?.(engine, resolvedEff);
    },
    moving: (engine, eff) => {
        const rawTarget = resolveValue(eff.target, engine);
        const charId = engine.redirectTarget ? engine.redirectTarget(rawTarget) : rawTarget;
        const char = engine.api.engine.state.getRuntime('characters.[id]', { id: charId });
        if (!char) return;

        const resolvedEff = {
            ...eff,
            target: charId,
            property: resolveValue(eff.property, engine),
            value: resolveValue(eff.value, engine)
        };
        const indices = Array.isArray(eff.index) ? eff.index : (Number.isInteger(eff.index) ? [eff.index] : []);
        const changed = MovingLogic[eff.exec]?.(char, resolvedEff, indices) === true;
        if (!changed) return;

        engine.api.engine.state.set('characters.[id]', char, { id: charId });
        engine.taskManager?.kill?.(`move_char_${charId}`);
        if (engine.validateMoveState(charId)) engine.scheduleCharacterMove(charId);
    }
};