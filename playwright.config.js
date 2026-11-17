import { defineConfig } from '@playwright/test';

const basePath = process.env.GITHUB_ACTIONS ? '/VSR/' : '/';
const serverUrl = `http://127.0.0.1:5173${basePath}`;

export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: serverUrl,
    browserName: 'chromium',
    headless: true
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',
    url: serverUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  }
});
