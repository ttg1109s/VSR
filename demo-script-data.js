import { readFileSync } from 'node:fs';

// Canonical demo scenario remains JSON text in demo_script.js (extension intentionally retained).
export const DEMO_SCRIPT = JSON.parse(readFileSync(new URL('./demo_script.js', import.meta.url), 'utf8'));
