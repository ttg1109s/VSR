// htdocs/engine/modules/effect/strategies/Stats.js
import { resolveValue } from './Logic.js';

const notifyStat = (engine, payload) => engine.api.notifications.notify({
    title: payload.title, message: payload.message, level: payload.level,
    source: 'engine', category: payload.category, sound: payload.sound,
    metadata: payload.metadata
});

const toFiniteNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

export const StatsCalculators = {
    // The schema permits mode=full only for the current field.
    max: {
        set: (_old, _max, value) => Number(value),
        adjust: (old, _max, value) => old + Number(value),
    },
    current: {
        set: (_old, _max, value) => Number(value),
        full: (_old, max) => Number(max),
        adjust: (old, _max, value) => old + Number(value)
    }
};

export const StatsHelpers = {
    remove_stats: (targetObj, eff, isChar, effectiveTarget, engine) => {
        const prop = resolveValue(eff.property, engine);
        if (!targetObj?.stats || !Object.prototype.hasOwnProperty.call(targetObj.stats, prop)) return;

        const removedStat = targetObj.stats[prop];
        delete targetObj.stats[prop];
        if (eff.notify) notifyStat(engine, {
            title: "Stat removed", message: `Removed ${removedStat.label || prop}`, level: "info", category: "stats.removed",
            metadata: { operation: "remove", targetId: effectiveTarget, statId: prop, statLabel: removedStat.label || prop, oldValue: removedStat.current, oldMax: removedStat.max }
        });
        const entryChar = engine.api.engine.state.getRuntime('meta.entryCharacter') || 'player';
        if (isChar && effectiveTarget === entryChar) engine.api.presentation.components.updatePlayerCard();
        if (isChar && engine.api.presentation.updateContactDetails) engine.api.presentation.updateContactDetails(effectiveTarget);
        if (!isChar) engine.api.presentation.components.explorer();
    },

    add_stats: (targetObj, eff, isChar, effectiveTarget, engine) => {
        const prop = resolveValue(eff.property, engine);
        if (!prop || !targetObj) return false;

        const resolvedValue = resolveValue(eff.value, engine);
        const parts = String(resolvedValue ?? '').split(':');
        const parsedCurrent = toFiniteNumber(parts[0] === '' ? 0 : parts[0]);
        if (parsedCurrent === null) return false;

        // An omitted max defaults to current; an explicit zero remains zero.
        const parsedMax = parts[1] === undefined || parts[1] === ''
            ? parsedCurrent
            : toFiniteNumber(parts[1]);
        if (parsedMax === null) return false;

        const max = Math.max(0, parsedMax);
        const current = Math.min(max, Math.max(0, parsedCurrent));
        const newStat = {
            current,
            max,
            label: parts[2] || prop,
            color: parts[3] || null,
            // Preserve the visibility flag when an existing stat is refreshed.
            unknown: targetObj.stats?.[prop]?.unknown === true
        };

        targetObj.stats ||= {};
        const previousStat = targetObj.stats[prop] ? { ...targetObj.stats[prop] } : null;
        targetObj.stats[prop] = newStat;

        if (eff.notify) {
            const level = previousStat && current < Number(previousStat.current) ? "danger" : "success";
            notifyStat(engine, {
                title: newStat.label, message: `${current}/${max}`,
                level, category: "stats.added",
                metadata: { operation: previousStat ? "refresh" : "add", targetId: effectiveTarget, statId: prop, statLabel: newStat.label, oldValue: previousStat?.current ?? null, newValue: current, oldMax: previousStat?.max ?? null, newMax: max, delta: previousStat ? current - Number(previousStat.current || 0) : null }
            });
        }

        const entryChar = engine.api.engine.state.getRuntime('meta.entryCharacter') || 'player';
        if (isChar && effectiveTarget === entryChar) engine.api.presentation.components.updatePlayerCard();
        if (isChar && engine.api.presentation.updateContactDetails) engine.api.presentation.updateContactDetails(effectiveTarget);
        if (!isChar) engine.api.presentation.components.explorer();
        return true;
    },

    edit_value: (targetObj, eff, isChar, effectiveTarget, engine) => {
        const prop = resolveValue(eff.property, engine);
        const stat = targetObj?.stats?.[prop];
        if (!stat || typeof stat !== 'object') return false;

        const field = eff.field || 'current';
        const mode = eff.mode || 'adjust';
        if (!['current', 'max'].includes(field) || !['set', 'adjust', 'full'].includes(mode)) return false;
        if (field === 'max' && mode === 'full') return false;
        const calculator = StatsCalculators[field]?.[mode];
        if (typeof calculator !== 'function') return false;
        const oldValue = toFiniteNumber(stat[field]);
        if (oldValue === null) return false;

        const rawValue = resolveValue(eff.value, engine);
        const value = mode === 'full' && field === 'current'
            ? toFiniteNumber(stat.max)
            : toFiniteNumber(rawValue);
        if (value === null) return false;

        const oldCurrent = toFiniteNumber(stat.current);
        const oldMax = toFiniteNumber(stat.max);
        const storedMax = toFiniteNumber(stat.max);
        if (storedMax === null) return false;
        const maxValue = Math.max(0, storedMax);
        const calculated = calculator(oldValue, maxValue, value);
        if (!Number.isFinite(calculated)) return false;

        if (field === 'max') {
            stat.max = Math.max(0, calculated);
            const current = toFiniteNumber(stat.current);
            stat.current = Math.min(stat.max, Math.max(0, current ?? 0));
        } else {
            stat.current = Math.min(maxValue, Math.max(0, calculated));
        }

        if (eff.notify) {
            const label = stat.label || prop;
            const name = targetObj?.set?.name || targetObj?.name || effectiveTarget;
            const newCurrent = toFiniteNumber(stat.current) ?? 0;
            const newMax = toFiniteNumber(stat.max) ?? 0;
            const currentDelta = newCurrent - (oldCurrent ?? 0);
            const maxDelta = newMax - (oldMax ?? 0);
            const fieldDelta = (toFiniteNumber(stat[field]) ?? 0) - oldValue;
            if (fieldDelta !== 0 || currentDelta !== 0 || maxDelta !== 0) {
                const level = currentDelta < 0 ? "danger" : fieldDelta > 0 ? "success" : "warning";
                const message = field === "max"
                    ? `${name} (${label}): Max ${oldMax} → ${newMax}${currentDelta !== 0 ? `; Current ${oldCurrent} → ${newCurrent}` : ""}`
                    : `${name} (${label}): ${currentDelta > 0 ? "+" : ""}${currentDelta}`;
                notifyStat(engine, {
                    title: isChar ? "Stats" : "Items",
                    message,
                    level, category: "stats.changed",
                    metadata: {
                        operation: mode, targetId: effectiveTarget, statId: prop, statLabel: label, field,
                        oldValue, newValue: toFiniteNumber(stat[field]) ?? 0, delta: fieldDelta,
                        oldCurrent, newCurrent, currentDelta, oldMax, newMax, maxDelta,
                        clamped: field === "max" && currentDelta !== 0
                    }
                });
            }
        }

        const entryChar = engine.api.engine.state.getRuntime('meta.entryCharacter') || 'player';
        if (isChar && effectiveTarget === entryChar) engine.api.presentation.components.updatePlayerCard();
        if (isChar && engine.api.presentation.updateContactDetails) engine.api.presentation.updateContactDetails(effectiveTarget);
        if (!isChar) engine.api.presentation.components.explorer();
        return true;
    }
};

export const StatsModeHandlers = {
    remove_stats: StatsHelpers.remove_stats,
    add_stats: StatsHelpers.add_stats,
    __default__: StatsHelpers.edit_value
};
