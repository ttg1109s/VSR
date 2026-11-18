// Notification effect strategies. Emits protocol events; does not render UI.
// [FIXED] Sửa đường dẫn import API (Lùi 4 cấp thư mục)

const notificationOptions = eff => ({
    source: 'scenario',
    category: eff.category || 'scenario.notify',
    dedupeKey: eff.dedupeKey,
    priority: eff.priority,
    duration: eff.durationMs,
    sound: eff.sound !== false,
    soundProfile: eff.soundProfile || ({ danger: 'critical', info: 'soft' }[eff.level] || eff.level || 'default')
});

const addToast = (engine, eff) => engine.api.notifications.add(
    eff.title || "Notice",
    eff.text,
    eff.level || "info",
    notificationOptions(eff)
);

export const NotifyStrategies = {
    default: addToast,
    toast: addToast,
    modal: (engine, eff) => engine.api.notifications.alert(
        eff.title || "Notice",
        eff.text,
        eff.level || "info",
        notificationOptions(eff)
    )
};
