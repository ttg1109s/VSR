// Module: UI Helpers cho Chat Engine (Refactored)
// Nhiệm vụ: Gọi xuống tầng Render thông qua API, không thao tác DOM trực tiếp.
import { API } from '../../../api/index.js';

export const ensureInputVisible = () => {
    if (API.presentation && API.presentation.components && API.presentation.components.inputBar) {
        API.presentation.components.inputBar();
    } else {
        console.warn("[UIHelper] API.presentation.components.inputBar not available");
    }
};

export const hideInput = () => {
    if (API.presentation && API.presentation.components && API.presentation.components.hideInput) {
        API.presentation.components.hideInput();
    } else {
        console.warn("[UIHelper] API.presentation.components.hideInput not available");
    }
};