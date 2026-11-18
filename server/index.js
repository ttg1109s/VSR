import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { GameEngine, DEMO_SCRIPT } from '../engine/index.js';

const host = process.env.VSR_HOST || '127.0.0.1';
const port = Number(process.env.VSR_PORT || 3001);
const maxBodyBytes = 8 * 1024 * 1024;
const apiToken = process.env.VSR_API_TOKEN || null;
const isLoopback = ['127.0.0.1', '::1', 'localhost'].includes(host);
if (!isLoopback && !apiToken) {
  throw new Error('VSR_API_TOKEN is required when VSR_HOST is not loopback.');
}
const engine = new GameEngine({
  requireAuthorization: true,
  authorizeCommand: ({ context }) => Boolean(context?.principal?.id)
});
const clients = new Set();

function sendJson(response, status, value) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  });
  response.end(JSON.stringify(value));
}

function authorizeRequest(request) {
  if (!apiToken && isLoopback) return { id: 'loopback' };
  const header = request.headers.authorization || '';
  const supplied = header.startsWith('Bearer ') ? header.slice(7) : '';
  const expected = Buffer.from(apiToken || '');
  const actual = Buffer.from(supplied);
  if (!supplied || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  return { id: 'http-token-client' };
}

function publishToClients(message) {
  const frame = `id: ${message.sequence || ''}\ndata: ${JSON.stringify(message)}\n\n`;
  for (const response of clients) {
    try { response.write(frame); }
    catch { clients.delete(response); }
  }
}

engine.protocol.subscribe(publishToClients);

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) throw Object.assign(new Error('Request body is too large.'), { statusCode: 413 });
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function openEventStream(request, response) {
  response.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no'
  });
  response.flushHeaders?.();
  clients.add(response);
  response.on('close', () => clients.delete(response));

  const lastId = Number(request.headers['last-event-id'] || 0);
  const replay = engine.protocol.getEventsAfter(Number.isInteger(lastId) && lastId >= 0 ? lastId : 0);
  if (replay.gap) {
    response.write(`data: ${JSON.stringify(engine.protocol.createSnapshot(engine))}\n\n`);
  } else if (replay.events.length) {
    for (const event of replay.events) response.write(`id: ${event.sequence}\ndata: ${JSON.stringify(event)}\n\n`);
  } else {
    response.write(`data: ${JSON.stringify(engine.protocol.createSnapshot(engine))}\n\n`);
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  if (request.method === 'GET' && url.pathname === '/api/health') {
    return sendJson(response, 200, { ok: true, protocolVersion: engine.protocol.protocolVersion });
  }
  const principal = authorizeRequest(request);
  if (!(request.method === 'GET' && url.pathname === '/api/health') && !principal) {
    return sendJson(response, 401, { ok: false, error: 'UNAUTHORIZED' });
  }
  if (request.method === 'GET' && url.pathname === '/api/demo-scenario') {
    return sendJson(response, 200, DEMO_SCRIPT);
  }
  if (request.method === 'GET' && url.pathname === '/api/snapshot') {
    return sendJson(response, 200, engine.protocol.createSnapshot(engine));
  }
  if (request.method === 'GET' && url.pathname === '/api/events') return openEventStream(request, response);
  if (request.method === 'POST' && url.pathname === '/api/command') {
    try {
      const command = await readJson(request);
      const acknowledgement = await engine.dispatchProtocolCommand(command, { principal });
      return sendJson(response, 200, acknowledgement);
    } catch (error) {
      return sendJson(response, error.statusCode || 400, {
        protocol: 'vsr', protocolVersion: engine.protocol.protocolVersion, type: 'ack',
        commandId: 'invalid-command', ok: false,
        error: { code: error.statusCode === 413 ? 'PAYLOAD_TOO_LARGE' : 'INVALID_COMMAND', message: error.message }
      });
    }
  }
  sendJson(response, 404, { ok: false, error: 'NOT_FOUND' });
});

server.listen(port, host, () => {
  process.stdout.write(`VSR JSON Engine API listening at http://${host}:${port}\n`);
});

function shutdown() {
  for (const client of clients) client.end();
  clients.clear();
  engine.dispose();
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
