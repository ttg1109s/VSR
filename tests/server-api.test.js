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

test('standalone Engine HTTP API accepts JSON commands and returns JSON snapshots', async () => {
  const port = await availablePort();
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: process.cwd(),
    env: { ...process.env, VSR_HOST: '127.0.0.1', VSR_PORT: String(port) },
    stdio: 'ignore'
  });
  const base = `http://127.0.0.1:${port}/api`;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 50; attempt++) {
      try {
        const response = await fetch(`${base}/health`);
        if (response.ok) { ready = true; break; }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(ready, true, 'Engine HTTP service should start');

    const scenarioResponse = await fetch(`${base}/demo-scenario`);
    assert.equal(scenarioResponse.ok, true);
    const script = await scenarioResponse.json();
    const command = {
      protocol: 'vsr', protocolVersion: 2, type: 'command',
      commandId: 'http-integration-init', command: 'engine.init', payload: { script }
    };
    const commandResponse = await fetch(`${base}/command`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(command)
    });
    const acknowledgement = await commandResponse.json();
    assert.equal(acknowledgement.ok, true);

    const snapshotResponse = await fetch(`${base}/snapshot`);
    const snapshot = await snapshotResponse.json();
    assert.equal(snapshot.type, 'snapshot');
    assert.equal(snapshot.game.initialized, true);
    assert.equal(snapshot.game.sceneId, 'scene_garden');
    assert.equal(Object.hasOwn(snapshot, 'source'), false);
  } finally {
    child.kill('SIGTERM');
    await new Promise(resolve => child.once('exit', resolve));
  }
});
