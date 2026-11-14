// htdocs/engine/modules/effect/strategies/UI.js
// [FIXED] Sửa đường dẫn import API (Lùi 4 cấp thư mục)
import { API } from '../../../../api/index.js';

export const NotifyStrategies = {
    modal: (engine, eff) => API.presentation.notification.alert(eff.title || "Thông báo", eff.text, eff.level || "info"),
    default: (engine, eff) => API.presentation.notification.add(eff.title || "Thông báo", eff.text, eff.level || "info")
};
