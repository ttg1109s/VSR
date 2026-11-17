#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const foundation = 'src/design-system/foundations/base.css';
const required = ['top', 'right', 'bottom', 'left'];
const errors = [];
const cssFiles = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && !['.git', 'node_modules', 'dist', 'build', 'coverage'].includes(entry.name)) {
      walk(path.join(dir, entry.name));
    } else if (entry.isFile() && entry.name.endsWith('.css')) {
      cssFiles.push(path.relative(root, path.join(dir, entry.name)).replaceAll(path.sep, '/'));
    }
  }
}

walk(path.join(root, 'src'));
const foundationText = fs.readFileSync(path.join(root, foundation), 'utf8');
const layoutText = fs.readFileSync(path.join(root, 'src/design-system/foundations/layout.css'), 'utf8');

for (const side of required) {
  const declaration = '--vsr-safe-area-' + side + ': env(safe-area-inset-' + side + ', 0px);';
  if (!foundationText.includes(declaration)) errors.push('Foundation is missing canonical token for ' + side);
}

for (const file of cssFiles) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (file !== foundation && /env\(\s*safe-area-inset-(?:top|right|bottom|left)/i.test(source)) {
    errors.push('Direct safe-area env() usage outside Foundation: ' + file);
  }
}

const bodyRule = /body\s*\{([^}]*)\}/s.exec(foundationText)?.[1] || '';
const bodyInset = /padding:\s*var\(--vsr-safe-area-top\)\s+var\(--vsr-safe-area-right\)\s+var\(--vsr-safe-area-bottom\)\s+var\(--vsr-safe-area-left\)\s*;/s;
const rootRule = /#root\s*\{([^}]*)\}/s.exec(foundationText)?.[1] || '';
if (!bodyInset.test(bodyRule)) errors.push('body must constrain the application viewport with all four Safe Area insets');
if (/padding[^;]*var\(--vsr-safe-area-(?:top|right|bottom|left)\)/s.test(rootRule)) {
  errors.push('#root must not duplicate Safe Area padding already owned by body');
}
if (/padding[^;]*var\(--vsr-safe-area-(?:top|right|bottom|left)\)/s.test(layoutText)) {
  errors.push('Document-flow layout must not re-apply Safe Area padding already owned by body');
}

const overlayText = fs.readFileSync(path.join(root, 'src/design-system/components/index.css'), 'utf8');
const contactText = fs.readFileSync(path.join(root, 'src/design-system/components/contact-workspace.css'), 'utf8');
const sharedDrawerRule = /\.vsr-drawer\.vsr-overlay-panel\s*\{([^}]*)\}/s.exec(overlayText)?.[1] || '';
const drawerInset = /padding:\s*var\(--vsr-safe-area-top\)\s+var\(--vsr-safe-area-right\)\s+var\(--vsr-safe-area-bottom\)\s+var\(--vsr-safe-area-left\)\s*;/s;
if (!drawerInset.test(sharedDrawerRule)) errors.push('Shared Drawer Portal wrapper must own all four Safe Area insets');
if (/padding[^;]*var\(--vsr-safe-area-(?:top|right|bottom|left)\)/s.test(contactText)) {
  errors.push('Contact Drawer must use the shared Drawer Safe Area owner instead of applying its own insets');
}
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (/name=["']viewport["'][^>]*viewport-fit\s*=\s*cover/i.test(html)) {
  errors.push('Home Screen viewport must not use viewport-fit=cover when content must stay outside the device cutout');
}
if (/name=["']apple-mobile-web-app-status-bar-style["'][^>]*content=["']black-translucent["']/i.test(html)) {
  errors.push('Home Screen status bar must not overlay application content (black-translucent)');
}

if (errors.length) {
  for (const error of errors) console.error('FAIL ' + error);
  process.exitCode = 1;
} else {
  console.log('Safe Area audit passed: canonical tokens, root ownership, no duplicate document-flow inset padding, no direct feature env() usage, and viewport-fit=cover.');
}
