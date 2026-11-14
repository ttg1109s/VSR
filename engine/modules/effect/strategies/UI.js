// htdocs/engine/modules/effect/strategies/UI.js
// [FIXED] Sửa đường dẫn import API (Lùi 4 cấp thư mục)

export const NotifyStrategies = {
    modal: (engine, eff) => engine.api.presentation.notification.alert(eff.title || "Thông báo", eff.text, eff.level || "info", { source: 'scenario', category: 'scenario.notify', dedupeKey: eff.dedupeKey }),
    default: (engine, eff) => engine.api.presentation.notification.add(eff.title || "Thông báo", eff.text, eff.level || "info", { source: 'scenario', category: 'scenario.notify', dedupeKey: eff.dedupeKey })
};
