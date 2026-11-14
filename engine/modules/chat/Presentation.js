// Presentation commands emitted by Chat domain transitions.
export const ensureInputVisible = engine => engine.api.presentation.chat.inputVisible();
export const hideInput = engine => engine.api.presentation.chat.inputHidden();
