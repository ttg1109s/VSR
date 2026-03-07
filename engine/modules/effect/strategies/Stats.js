// htdocs/engine/modules/effect/strategies/Stats.js
import { resolveValue } from './Logic.js';
import { API } from '../../../../api/index.js'; // [NEW] Import API

export const StatsCalculators = {
    max: { set: (o, m, v) => Number(v), add: (o, m, v) => o + Number(v) },
    current: { set: (o, m, v) => Number(v), full: (o, m, v) => Number(m), add: (o, m, v) => o + Number(v) }
};

export const StatsHelpers = {
    remove_stats: (targetObj, eff, isChar, effectiveTarget) => {
        const prop = resolveValue(eff.property);

        if (targetObj.stats[prop]) {
            delete targetObj.stats[prop];
            // [API FIX]
            if (eff.notify) API.render.notification.add("Xóa chỉ số", `Đã xóa ${prop}`, "info");
            const entryChar = API.engine.state.meta?.entryCharacter || 'player';
            if (isChar && effectiveTarget === entryChar) API.render.components.updatePlayerCard();
            if (isChar && API.render.updateContactDetails) API.render.updateContactDetails(effectiveTarget);
            if (!isChar) API.render.components.explorer();
        }
    },
    add_stats: (targetObj, eff, isChar, effectiveTarget) => {
        const prop = resolveValue(eff.property);
        const valStr = String(eff.value);
        const parts = valStr.split(':');

        const currentVal = Number(parts[0]) || 0;

        const newStat = {
            current: currentVal,
            max: Number(parts[1]) || currentVal || 0,
            label: parts[2] || prop,
            color: parts[3] || null
        };

        targetObj.stats[prop] = newStat;

        // [LOGIC FIX] Check âm/dương để hiển thị màu thông báo phù hợp
        if (eff.notify) {
            const isNegative = newStat.current < 0;
            const type = isNegative ? "danger" : "success";
            const msg = newStat.current;
            API.render.notification.add(newStat.label, msg, type);
        }

        const entryChar = API.engine.state.meta?.entryCharacter || 'player';
        if (isChar && effectiveTarget === entryChar) API.render.components.updatePlayerCard();
        if (isChar && API.render.updateContactDetails) API.render.updateContactDetails(effectiveTarget);
        if (!isChar) API.render.components.explorer();
    },
    edit_value: (targetObj, eff, isChar, effectiveTarget) => {
        const prop = resolveValue(eff.property);

        if (!targetObj.stats[prop]) return;

        const s = targetObj.stats[prop];
        const field = eff.field === 'max' ? 'max' : 'current';
        const mode = eff.mode || 'add';
        const calc = StatsCalculators[field][mode] || StatsCalculators[field].add;

        const oldVal = field === 'max' ? Number(s.max) : Number(s.current);
        const valToApply = resolveValue(eff.value);

        const newVal = calc(oldVal, s.max, valToApply);

        // [LOGIC UPDATE] Tường minh hóa logic giới hạn giá trị
        if (field === 'max') {
            // Logic Max: Không cho phép Max < 0
            s.max = newVal < 0 ? 0 : newVal;

            // Đồng bộ: Nếu Current đang lớn hơn Max mới thì gán xuống Max
            if (Number(s.current) > s.max) s.current = s.max;
        } else {
            // Logic Current: 
            // 1. Cận dưới: Không nhỏ hơn 0
            let clampedVal = newVal < 0 ? 0 : newVal;

            // 2. Cận trên: Không lớn hơn Max
            // (Lưu ý: s.max có thể là 0, vẫn cần check)
            if (clampedVal > s.max) clampedVal = s.max;

            s.current = clampedVal;
        }

        // [API FIX] & [LOGIC FIX] Tách màu sắc rõ ràng cho Tăng/Giảm
        if (eff.notify) {
            const diff = (field === 'max' ? s.max : s.current) - oldVal;
            const label = s.label || prop;
            const name = (targetObj?.set?.name || targetObj?.name || effectiveTarget);

            let type = "info";
            let sign = "";

            if (diff > 0) {
                type = "success";
                sign = "+";
            } else if (diff < 0) {
                type = "danger";
                // diff đã có dấu trừ sẵn
            }

            API.render.notification.add(
                isChar ? "Chỉ số" : "Vật phẩm",
                `${name} (${label}): ${sign}${diff}`,
                type
            );
        }

        const entryChar = API.engine.state.meta?.entryCharacter || 'player';
        if (isChar && effectiveTarget === entryChar) API.render.components.updatePlayerCard();
        if (isChar && API.render.updateContactDetails) API.render.updateContactDetails(effectiveTarget);
        if (!isChar) API.render.components.explorer();
    }
};

export const StatsModeHandlers = {
    remove_stats: StatsHelpers.remove_stats,
    add_stats: StatsHelpers.add_stats,
    __default__: StatsHelpers.edit_value
};