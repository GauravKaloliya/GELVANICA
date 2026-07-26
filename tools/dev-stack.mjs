#!/usr/bin/env node

import net from 'node:net';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PYTHON = process.env.PYTHON || resolve(ROOT, '.venv/bin/python');
const BACKEND_PYTHON = process.env.BACKEND_PYTHON || resolve(ROOT, 'backend/.venv/bin/python');
const DEV_CORS_ORIGINS = 'http://localhost:3000,http://localhost:3001,http://localhost:5173';

const mode = process.argv[2];
const children = [];

const CONFIG = {
  'cloud-web': [
    {
      name: 'flask',
      cmd: PYTHON,
      args: ['backend/run.py'],
      cwd: ROOT,
      env: {
        GNOVIUM_MODE: 'cloud',
        DATABASE_URL: process.env.CLOUD_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://gaurav:GnoviummT3hadyrlVJCBsY@localhost:5432/gnovium_cloud',
        ALLOWED_HOSTS: 'localhost,127.0.0.1',
        AUTO_CREATE_TABLES: 'true',
        CORS_ORIGINS: DEV_CORS_ORIGINS,
        REDIS_URL: 'redis://localhost:6379/0',
      },
      port: 5000,
    },
    {
      name: 'cloud-web',
      cmd: 'npm',
      args: ['run', 'dev:next', '--workspace=cloud-web', '--', '--port', '3001'],
      cwd: ROOT,
      env: { NEXT_PUBLIC_CLOUD_WEB_BASE_PATH: '/app' },
      port: 3001,
    },
  ],
  'local-app': [
    {
      name: 'flask',
      cmd: BACKEND_PYTHON,
      args: ['-m', 'flask', 'run', '--port', '5001'],
      cwd: resolve(ROOT, 'backend'),
      env: {
        GNOVIUM_MODE: 'local',
        DATABASE_URL: '',
        CLOUD_API_URL: process.env.CLOUD_API_URL || 'https://api.gnovium.com',
        FLASK_PORT: '5001',
        FLASK_ENV: 'development',
        PYTHONUNBUFFERED: '1',
        CORS_ORIGINS: DEV_CORS_ORIGINS,
      },
      port: 5001,
    },
    {
      name: 'cloud-web',
      cmd: 'npm',
      args: ['run', 'dev:next', '--workspace=cloud-web', '--', '--port', '3001'],
      cwd: ROOT,
      env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_DESKTOP_AUTH_API_URL || 'https://api.gnovium.com',
        NEXT_PUBLIC_AUTH_API_URL: process.env.NEXT_PUBLIC_AUTH_API_URL || 'https://api.gnovium.com',
        NEXT_PUBLIC_CLOUD_WEB_BASE_PATH: '/app',
      },
      port: 3001,
    },
    {
      name: 'local-app',
      cmd: 'npm',
      args: ['run', 'dev:electron'],
      cwd: resolve(ROOT, 'local-app'),
      env: { VITE_GNOVIUM_AUTH_URL: 'http://localhost:3001/app/auth/sign-in' },
      port: 5173,
    },
  ],
};

if (!CONFIG[mode]) {
  console.error(`Usage: node tools/dev-stack.mjs <${Object.keys(CONFIG).join('|')}>`);
  process.exit(1);
}

function log(name, message) {
  const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
  process.stdout.write(`[${ts}|${name}] ${message}\n`);
}

async function isPortOpen(port) {
  return new Promise((resolveOpen) => {
    const socket = new net.Socket();
    socket.setTimeout(500);
    socket.on('connect', () => {
      socket.destroy();
      resolveOpen(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolveOpen(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolveOpen(false);
    });
    socket.connect(port, 'localhost');
  });
}

async function waitForPort(name, port, timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isPortOpen(port)) {
      log(name, `ready on port ${port}`);
      return;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
  }
  throw new Error(`${name} did not open port ${port} within ${timeoutMs}ms`);
}

async function start(service) {
  if (service.port && await isPortOpen(service.port)) {
    log(service.name, `port ${service.port} already in use; reusing existing server`);
    return;
  }

  const child = spawn(service.cmd, service.args, {
    cwd: service.cwd,
    stdio: 'inherit',
    env: { ...process.env, ...service.env },
  });

  children.push(child);

  child.on('exit', (code, signal) => {
    if (signal) {
      log(service.name, `exited with signal ${signal}`);
    } else {
      log(service.name, `exited with code ${code}`);
    }
  });

  if (service.port) {
    await waitForPort(service.name, service.port);
  }
}

function shutdown() {
  log('dev-stack', 'shutting down...');
  for (const child of children.toReversed()) {
    try {
      child.kill('SIGINT');
    } catch {}
  }
  setTimeout(() => process.exit(0), 1000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

log('dev-stack', `starting ${mode}`);

try {
  for (const service of CONFIG[mode]) {
    await start(service);
  }
  log('dev-stack', `${mode} is running`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  shutdown();
}
