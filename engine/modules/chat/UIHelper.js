// Module: UI Helpers cho Chat Engine (Refactored)
// Nhiệm vụ: Gọi xuống tầng Render thông qua API, không thao tác DOM trực tiếp.
import { API } from '../../../api/index.js';

export const ensureInputVisible = () => {
    if (API.render && API.render.components && API.render.components.inputBar) {
        API.render.components.inputBar();
    } else {
        console.warn("[UIHelper] API.render.components.inputBar not available");
    }
};

export const hideInput = () => {
    if (API.render && API.render.components && API.render.components.hideInput) {
        API.render.components.hideInput();
    } else {
        console.warn("[UIHelper] API.render.components.hideInput not available");
    }
};