import { lightTheme } from './lightTheme.js';

/** Returns an immutable theme configuration; dark mode can be added without changing consumers. */
export function createTheme(overrides = {}) {
  return Object.freeze({
    ...lightTheme,
    ...overrides,
    colors: { ...lightTheme.colors, ...overrides.colors }
  });
}
