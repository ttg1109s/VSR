// Notification effect strategies. Emits protocol events; does not render UI.
// [FIXED] Sửa đường dẫn import API (Lùi 4 cấp thư mục)

const addToast = (engine, eff) => engine.api.notifications.add(
    eff.title || "Notice",
    eff.text,
    eff.level || "info",
    { source: 'scenario', category: 'scenario.notify', dedupeKey: eff.dedupeKey }
);

export const NotifyStrategies = {
    default: addToast,
    toast: addToast,
    modal: (engine, eff) => engine.api.notifications.alert(
        eff.title || "Notice",
        eff.text,
        eff.level || "info",
        { source: 'scenario', category: 'scenario.notify', dedupeKey: eff.dedupeKey }
    )
};
