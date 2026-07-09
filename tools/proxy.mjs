#!/usr/bin/env node

import http from 'node:http';
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Configuration ────────────────────────────────────────────
const PORTS = {
  landing: 3000,
  'cloud-web': 3001,
  docs: 3002,
  backend: 5000,
  proxy: 8080,
};

const TARGETS = [
  { prefix: '/api/v1/docs', url: `http://localhost:${PORTS.docs}`, strip: false },
  { prefix: '/app',         url: `http://localhost:${PORTS['cloud-web']}`, strip: false },
  { prefix: '/api/v1',      url: `http://localhost:${PORTS.backend}`, strip: true },
];

const FALLBACK = { url: `http://localhost:${PORTS.landing}`, strip: false };

// Shared keep-alive agent for connection reuse
const agent = new http.Agent({ keepAlive: true, maxSockets: 64 });

// ── Helpers ──────────────────────────────────────────────────

function matchTarget(path) {
  for (const t of TARGETS) {
    if (path === t.prefix || path.startsWith(t.prefix + '/')) {
      const proxyPath = t.strip ? path.slice(t.prefix.length) || '/' : path;
      return { url: t.url, path: proxyPath };
    }
  }
  return { url: FALLBACK.url, path };
}

function log(prefix, msg) {
  const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
  process.stdout.write(`[${ts}|${prefix}] ${msg}\n`);
}

// ── Spawn & wait ─────────────────────────────────────────────

function start(name, command, args, opts = {}) {
  const proc = spawn(command, args, {
    stdio: 'inherit',
    cwd: ROOT,
    env: { ...process.env, ...opts.env },
  });
  proc.on('exit', (code) => {
    log(name, `exited with code ${code}`);
  });
  return proc;
}

async function waitForServer(name, port, healthPath = '/', timeoutMs = 30_000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${port}${healthPath}`, { agent: false, timeout: 1000 }, (res) => {
          res.resume();
          resolve();
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      });
      log(name, `ready on port ${port}`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  log(name, `WARN: not responding after ${timeoutMs}ms — continuing anyway`);
}

// ── Spawn all servers ────────────────────────────────────────

const NEXT_DEV = ['run', 'dev', '--turbo'];
if (process.env.VERCEL) NEXT_DEV.pop();

log('proxy', 'Starting dev servers...\n');

const procs = [
  { name: 'landing',  cmd: 'npm', args: [...NEXT_DEV, '-w=landing', '--', '--port', String(PORTS.landing)],                               port: PORTS.landing,  health: '/' },
  { name: 'cloud-web', cmd: 'npm', args: [...NEXT_DEV, '-w=cloud-web', '--', '--port', String(PORTS['cloud-web'])],  env: { NEXT_PUBLIC_BASE_PATH: '/app' },       port: PORTS['cloud-web'], health: '/app' },
  { name: 'docs',     cmd: 'npm', args: [...NEXT_DEV, '-w=docs', '--', '--port', String(PORTS.docs)],          env: { NEXT_PUBLIC_BASE_PATH: '/api/v1/docs' }, port: PORTS.docs,     health: '/api/v1/docs' },
  { name: 'backend',  cmd: 'python3', args: ['backend/run.py'],                                                                          port: PORTS.backend, health: '/' },
];

for (const p of procs) {
  p.proc = start(p.name, p.cmd, p.args, p.env ? { env: p.env } : {});
  await waitForServer(p.name, p.port, p.health);
}

// ── Reverse proxy ────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const { url, path: proxyPath } = matchTarget(req.url);
  const u = new URL(url);

  // Strip hop-by-hop headers that Node.js manages itself
  const headers = { ...req.headers };
  delete headers.connection;
  delete headers['keep-alive'];
  delete headers['proxy-connection'];
  delete headers['transfer-encoding'];
  // Keep original Host so Next.js generates correct asset URLs
  // (critical for basePath /api/v1/docs and /app)

  const options = {
    hostname: u.hostname,
    port: u.port,
    path: proxyPath,
    method: req.method,
    headers,
    agent,
    timeout: 60_000,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    const responseHeaders = { ...proxyRes.headers };
    delete responseHeaders['transfer-encoding'];
    res.writeHead(proxyRes.statusCode, responseHeaders);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    log('proxy', `${req.method} ${req.url} → ${url}${proxyPath} ❌ ${err.message}`);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/html' });
      res.end(`<html><body style="font-family:monospace;padding:2em">
        <h2>502 Bad Gateway</h2>
        <p>${url} is not responding.</p>
        <p style="color:#666">${err.message}</p>
      </body></html>`);
    }
  });

  proxyReq.on('timeout', () => {
    proxyReq.destroy();
    if (!res.headersSent) {
      res.writeHead(504, { 'Content-Type': 'text/html' });
      res.end(`<html><body style="font-family:monospace;padding:2em">
        <h2>504 Gateway Timeout</h2>
        <p>${url} did not respond in time.</p>
      </body></html>`);
    }
  });

  req.pipe(proxyReq);
});

// ── WebSocket proxy (required for Turbopack HMR) ──────────

server.on('upgrade', (req, socket, head) => {
  const { url, path: proxyPath } = matchTarget(req.url);
  const u = new URL(url);

  const headers = { ...req.headers };
  delete headers.connection;

  const options = {
    hostname: u.hostname,
    port: u.port,
    path: proxyPath,
    method: 'GET',
    headers,
  };

  const proxyReq = http.request(options);
  proxyReq.on('upgrade', (proxyRes, proxySocket) => {
    const statusLine = `HTTP/1.1 101 Switching Protocols\r\n`;
    const responseHeaders = Object.entries(proxyRes.headers)
      .filter(([k]) => k !== 'connection' && k !== 'transfer-encoding')
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      .join('\r\n');
    socket.write(statusLine + responseHeaders + '\r\n\r\n');
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });
  proxyReq.on('error', (err) => {
    log('proxy', `WS ${req.url} → ${url}${proxyPath} ❌ ${err.message}`);
    socket.destroy();
  });
  proxyReq.on('timeout', () => {
    proxyReq.destroy();
    socket.destroy();
  });
  proxyReq.end();
});

// ── Start ──────────────────────────────────────────────────

server.listen(PORTS.proxy, () => {
  log('proxy', `Running on http://localhost:${PORTS.proxy}`);
  log('proxy', `  Landing:  /`);
  log('proxy', `  App:      /app`);
  log('proxy', `  Docs:     /api/v1/docs`);
  log('proxy', `  API:      /api/v1/`);
  console.log('');
});

// ── Graceful shutdown ──────────────────────────────────────

function shutdown() {
  log('proxy', 'Shutting down...');
  for (const p of procs) {
    try { p.proc?.kill?.(); } catch {}
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
