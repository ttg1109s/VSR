import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

async function availablePort() {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function startServer(extraEnv = {}) {
  const port = await availablePort();
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: process.cwd(),
    env: { ...process.env, VSR_HOST: '127.0.0.1', VSR_PORT: String(port), ...extraEnv },
    stdio: 'ignore'
  });
  const base = `http://127.0.0.1:${port}/api`;
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const response = await fetch(`${base}/health`);
      if (response.ok) return { child, base };
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  child.kill('SIGTERM');
  throw new Error('Engine HTTP service did not start.');
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await new Promise(resolve => child.once('exit', resolve));
}

test('non-loopback deployment rejects unauthenticated snapshot, command, demo and SSE requests', async () => {
  const { child, base } = await startServer({ VSR_HOST: '0.0.0.0', VSR_API_TOKEN: 'test-secret' });
  try {
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);

    for (const [url, options] of [
      [`${base}/snapshot`, {}],
      [`${base}/demo-scenario`, {}],
      [`${base}/events`, {}],
      [`${base}/command`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }]
    ]) {
      const response = await fetch(url, options);
      assert.equal(response.status, 401, `${url} must require authentication`);
    }

    for (const url of [`${base}/snapshot`, `${base}/demo-scenario`]) {
      const response = await fetch(url, { headers: { authorization: 'Bearer test-secret' } });
      assert.equal(response.status, 200);
    }
  } finally {
    await stopServer(child);
  }
});
