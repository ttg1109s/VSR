// htdocs/engine/modules/effect/strategies/Stats.js
import { resolveValue } from './Logic.js';

const toFiniteNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

export const StatsCalculators = {
    // The schema permits mode=full for either field. For max, full is
    // equivalent to setting the maximum to the supplied value.
    max: {
        set: (_old, _max, value) => Number(value),
        add: (old, _max, value) => old + Number(value),
        full: (_old, _max, value) => Number(value)
    },
    current: {
        set: (_old, _max, value) => Number(value),
        full: (_old, max) => Number(max),
        add: (old, _max, value) => old + Number(value)
    }
};

export const StatsHelpers = {
    remove_stats: (targetObj, eff, isChar, effectiveTarget, engine) => {
        const prop = resolveValue(eff.property, engine);
        if (!targetObj?.stats || !Object.prototype.hasOwnProperty.call(targetObj.stats, prop)) return;

        delete targetObj.stats[prop];
        if (eff.notify) engine.api.notifications.add("Xóa chỉ số", `Đã xóa ${prop}`, "info", { source: 'scenario', category: 'scenario.stats.removed' });
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
            color: parts[3] || null
        };

        targetObj.stats ||= {};
        targetObj.stats[prop] = newStat;

        if (eff.notify) {
            const type = parsedCurrent < 0 ? "danger" : "success";
            engine.api.notifications.add(newStat.label, current, type, { source: 'scenario', category: 'scenario.stats.added' });
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

        const field = eff.field === 'max' ? 'max' : 'current';
        const mode = eff.mode || 'add';
        const calculator = StatsCalculators[field][mode] || StatsCalculators[field].add;
        const oldValue = toFiniteNumber(stat[field]);
        if (oldValue === null) return false;

        const rawValue = resolveValue(eff.value, engine);
        const value = mode === 'full' && field === 'current'
            ? toFiniteNumber(stat.max)
            : toFiniteNumber(rawValue);
        if (value === null) return false;

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
            const diff = stat[field] - oldValue;
            const label = stat.label || prop;
            const name = targetObj?.set?.name || targetObj?.name || effectiveTarget;
            const type = diff > 0 ? "success" : diff < 0 ? "danger" : "info";
            const sign = diff > 0 ? "+" : "";
            engine.api.notifications.add(
                isChar ? "Chỉ số" : "Vật phẩm",
                `${name} (${label}): ${sign}${diff}`,
                type,
                { source: 'scenario', category: 'scenario.stats.changed' }
            );
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
