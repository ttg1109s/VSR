// Presentation commands emitted by Chat domain transitions.
import { API } from '../../../api/index.js';

export const ensureInputVisible = () => API.presentation.chat.inputVisible();
export const hideInput = () => API.presentation.chat.inputHidden();
