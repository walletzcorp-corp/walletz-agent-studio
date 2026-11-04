#!/usr/bin/env node
/**
 * Walletz PC Connector
 * Connects this Windows PC to Walletz Agent Studio.
 * Usage: node walletz-pc-connector.mjs --token=<PAIRING_TOKEN> --api=http://localhost:3001/api
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const args = parseArgs(process.argv.slice(2));

const API_BASE = (args.api ?? 'http://localhost:3001/api') + '/v1';
const POLL_MS = 1000;
const HEARTBEAT_MS = 5000;

let deviceId = null;
let authorizedPaths = [];
let authorizedApps = ['notepad.exe', 'calc.exe', 'msedge.exe'];
let running = true;

// ── Startup ──────────────────────────────────────────────────────────────────

console.log('┌──────────────────────────────────────────────┐');
console.log('│        Walletz PC Connector v1.0.0           │');
console.log('└──────────────────────────────────────────────┘');
console.log(`API: ${API_BASE}`);
console.log(`Machine: ${os.hostname()} (${os.platform()} ${os.release()})\n`);

if (!args.token && !args.device) {
  console.error('ERROR: --token=<PAIRING_TOKEN> or --device=<DEVICE_ID> required');
  process.exit(1);
}

process.on('SIGINT', () => { running = false; console.log('\nConnector stopped.'); process.exit(0); });
process.on('SIGTERM', () => { running = false; process.exit(0); });

// ── Main ─────────────────────────────────────────────────────────────────────

if (args.token) {
  await pair(args.token);
} else if (args.device) {
  deviceId = args.device;
  console.log(`Resuming as device: ${deviceId}`);
  await createTestFolder();
  startPolling();
  // Keep process alive
  await new Promise(() => {});
} else {
  console.error('ERROR: --token=<PAIRING_TOKEN> or --device=<DEVICE_ID> required');
  process.exit(1);
}

// ── Pairing ──────────────────────────────────────────────────────────────────

async function pair(token) {
  console.log('Pairing with Walletz Agent Studio…');
  const body = {
    token,
    deviceName: `PC de ${os.userInfo().username} (${os.hostname()})`,
    platform: os.platform(),
  };

  try {
    const r = await post('/pc-connector/pair', body);
    deviceId = r.deviceId;
    console.log(`✓ Paired successfully! Device ID: ${deviceId}`);
    await createTestFolder();
    startPolling();
    // Keep process alive
    await new Promise(() => {});
  } catch (e) {
    console.error('Pairing failed:', e.message);
    process.exit(1);
  }
}

// ── Test folder ──────────────────────────────────────────────────────────────

async function createTestFolder() {
  const testPath = path.join(os.homedir(), 'Desktop', 'Walletz Agent Studio - Teste PC');
  if (!fs.existsSync(testPath)) {
    fs.mkdirSync(testPath, { recursive: true });
    console.log(`✓ Created test folder: ${testPath}`);
  } else {
    console.log(`✓ Test folder: ${testPath}`);
  }
  authorizedPaths = [testPath];
}

// ── Polling loop ──────────────────────────────────────────────────────────────

function startPolling() {
  console.log('\n✓ Connector running. Press Ctrl+C to stop.\n');
  poll();
}

async function poll() {
  if (!running) return;

  try {
    const commands = await get(`/pc-connector/devices/${deviceId}/commands`);
    if (commands && Array.isArray(commands)) {
      for (const cmd of commands) {
        await executeCommand(cmd);
      }
    }
  } catch (e) {
    // API unreachable — retry silently
  }

  if (running) setTimeout(poll, POLL_MS);
}

// ── Command execution ─────────────────────────────────────────────────────────

async function executeCommand(cmd) {
  console.log(`[CMD] ${cmd.toolName} — id:${cmd.id.slice(0, 8)}`);
  let result = null;
  let error = null;
  let success = false;

  try {
    result = await dispatch(cmd.toolName, cmd.params ?? {});
    success = true;
    console.log(`  ✓ ${JSON.stringify(result).slice(0, 100)}`);
  } catch (e) {
    error = e.message;
    console.log(`  ✗ ${error}`);
  }

  try {
    await post(`/pc-connector/devices/${deviceId}/commands/${cmd.id}/result`, { success, result, error });
  } catch (e) {
    console.error('  Failed to post result:', e.message);
  }
}

async function dispatch(toolName, params) {
  switch (toolName) {
    case 'pc.getDeviceInfo':
      return getDeviceInfo();
    case 'pc.listFiles':
      return listFiles(params.path);
    case 'pc.readFile':
      return readFile(params.path);
    case 'pc.createFile':
      return createFile(params.path, params.content ?? '');
    case 'pc.createFolder':
      return createFolder(params.path);
    case 'pc.renameFile':
      return renameFile(params.path, params.new_name);
    case 'pc.moveFile':
      return moveFile(params.source, params.destination);
    case 'pc.openApplication':
      return openApplication(params.app);
    case 'pc.openUrl':
      return openUrl(params.url);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// ── Tool implementations ──────────────────────────────────────────────────────

function getDeviceInfo() {
  return {
    hostname: os.hostname(),
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    username: os.userInfo().username,
    uptime: Math.floor(os.uptime()),
    authorizedPaths,
    authorizedApps,
  };
}

function guardPath(filePath) {
  const resolved = path.resolve(filePath);
  const allowed = authorizedPaths.some(ap => {
    const base = path.resolve(ap);
    const rel = path.relative(base, resolved);
    return !rel.startsWith('..') && !path.isAbsolute(rel);
  });
  if (!allowed) {
    throw new Error(`Access denied: path "${resolved}" is outside authorized directories.\nAuthorized: ${authorizedPaths.join(', ')}`);
  }
  return resolved;
}

function listFiles(dirPath) {
  const safe = guardPath(dirPath);
  if (!fs.existsSync(safe)) throw new Error(`Directory not found: ${safe}`);
  const stat = fs.statSync(safe);
  if (!stat.isDirectory()) throw new Error(`Not a directory: ${safe}`);

  const entries = fs.readdirSync(safe, { withFileTypes: true });
  return {
    path: safe,
    entries: entries.map(e => ({
      name: e.name,
      type: e.isDirectory() ? 'directory' : 'file',
      size: e.isDirectory() ? null : fs.statSync(path.join(safe, e.name)).size,
    })),
    count: entries.length,
  };
}

function readFile(filePath) {
  const safe = guardPath(filePath);
  if (!fs.existsSync(safe)) throw new Error(`File not found: ${safe}`);
  const stat = fs.statSync(safe);
  if (!stat.isFile()) throw new Error(`Not a file: ${safe}`);
  if (stat.size > 1024 * 1024) throw new Error('File too large (>1MB). Only small text files can be read.');

  const content = fs.readFileSync(safe, 'utf8');
  return { path: safe, content, size: stat.size };
}

function createFile(filePath, content) {
  const safe = guardPath(filePath);
  const dir = path.dirname(safe);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(safe, content, 'utf8');
  return { path: safe, created: true, size: Buffer.byteLength(content, 'utf8') };
}

function createFolder(folderPath) {
  const safe = guardPath(folderPath);
  if (fs.existsSync(safe)) return { path: safe, created: false, message: 'Folder already exists' };
  fs.mkdirSync(safe, { recursive: true });
  return { path: safe, created: true };
}

function renameFile(filePath, newName) {
  const safe = guardPath(filePath);
  if (!fs.existsSync(safe)) throw new Error(`Not found: ${safe}`);
  if (newName.includes('/') || newName.includes('\\') || newName.includes('..')) {
    throw new Error('newName must be a filename only, not a path');
  }
  const newPath = path.join(path.dirname(safe), newName);
  guardPath(newPath);
  fs.renameSync(safe, newPath);
  return { from: safe, to: newPath, renamed: true };
}

function moveFile(source, destination) {
  const safeSrc = guardPath(source);
  const safeDst = guardPath(destination);
  if (!fs.existsSync(safeSrc)) throw new Error(`Source not found: ${safeSrc}`);
  const dstDir = path.dirname(safeDst);
  if (!fs.existsSync(dstDir)) fs.mkdirSync(dstDir, { recursive: true });
  fs.renameSync(safeSrc, safeDst);
  return { from: safeSrc, to: safeDst, moved: true };
}

function openApplication(appName) {
  const app = appName.toLowerCase().replace(/[^a-z0-9._-]/g, '');
  const allowed = authorizedApps.map(a => a.toLowerCase());
  if (!allowed.includes(app)) {
    throw new Error(`Application "${app}" is not in the authorized list: ${authorizedApps.join(', ')}`);
  }

  const appMap = {
    'notepad.exe': 'notepad',
    'calc.exe': 'calc',
    'msedge.exe': 'msedge',
    'notepad': 'notepad',
    'calc': 'calc',
    'msedge': 'msedge',
  };
  const exe = appMap[app] ?? app;

  return new Promise((resolve, reject) => {
    execFile('cmd', ['/c', 'start', '', exe], { shell: false }, (err) => {
      if (err) reject(new Error(`Failed to open ${exe}: ${err.message}`));
      else resolve({ app: exe, launched: true });
    });
  });
}

function openUrl(url) {
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error('Invalid URL'); }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http:// and https:// URLs are allowed');
  }
  return new Promise((resolve, reject) => {
    execFile('cmd', ['/c', 'start', '', parsed.href], { shell: false }, (err) => {
      if (err) reject(new Error(`Failed to open URL: ${err.message}`));
      else resolve({ url: parsed.href, opened: true });
    });
  });
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

async function get(endpoint) {
  const r = await fetch(`${API_BASE}${endpoint}`);
  if (!r.ok) throw new Error(`GET ${endpoint} → ${r.status}`);
  return r.json();
}

async function post(endpoint, body) {
  const r = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`POST ${endpoint} → ${r.status}: ${text}`);
  }
  if (r.status === 204) return null;
  return r.json();
}

// ── Arg parser ────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const result = {};
  for (const arg of argv) {
    const m = arg.match(/^--?([^=]+)=?(.*)$/);
    if (m) result[m[1]] = m[2] || true;
  }
  return result;
}
