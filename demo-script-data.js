import { readFileSync } from 'node:fs';

// The canonical demo scenario intentionally remains in demo_script.js.
// It is JSON-shaped data with a JavaScript-style trailing semicolon.
const source = readFileSync(new URL('./demo_script.js', import.meta.url), 'utf8').trim();
export const DEMO_SCRIPT = JSON.parse(source.replace(/;\s*$/, ''));
