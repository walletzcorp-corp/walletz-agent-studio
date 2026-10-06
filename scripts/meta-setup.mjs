#!/usr/bin/env node
/**
 * Walletz — Meta/WhatsApp Automated Setup Script
 *
 * This script:
 * 1. Validates Meta credentials from env
 * 2. Starts a cloudflared Quick Tunnel for the local API
 * 3. Registers the webhook subscription with Meta via Graph API
 * 4. Subscribes to all required webhook fields
 * 5. Writes the public webhook URL back to .env.local
 * 6. Verifies the full setup
 *
 * Run AFTER you have META_APP_ID, META_APP_SECRET, META_CONFIG_ID in apps/api/.env.local
 * Usage: node scripts/meta-setup.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { spawn, execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const API_ENV = join(ROOT, 'apps', 'api', '.env.local');

// ─── Load env ───────────────────────────────────────────────────────────────

function loadEnv(path) {
  const lines = readFileSync(path, 'utf8').split('\n');
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return env;
}

function updateEnvValue(path, key, value) {
  let content = readFileSync(path, 'utf8');
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    content += `\n${key}=${value}`;
  }
  writeFileSync(path, content, 'utf8');
}

// ─── Validate credentials ────────────────────────────────────────────────────

const env = loadEnv(API_ENV);
const APP_ID = env['META_APP_ID'];
const APP_SECRET = env['META_APP_SECRET'];
const VERIFY_TOKEN = env['WHATSAPP_WEBHOOK_VERIFY_TOKEN'];
const GRAPH = 'https://graph.facebook.com/v22.0';

if (!APP_ID || APP_ID.startsWith('AGUARDANDO') || APP_ID.startsWith('REPLACE')) {
  console.error('\n❌  META_APP_ID not set in apps/api/.env.local');
  console.error('   Complete the Meta App creation first, then re-run this script.\n');
  process.exit(1);
}
if (!APP_SECRET || APP_SECRET.startsWith('AGUARDANDO') || APP_SECRET.startsWith('REPLACE')) {
  console.error('\n❌  META_APP_SECRET not set in apps/api/.env.local\n');
  process.exit(1);
}

console.log('\n🚀  Walletz Meta Setup');
console.log(`   App ID: ${APP_ID}`);
console.log(`   Verify Token: ${VERIFY_TOKEN?.slice(0, 8)}…\n`);

// ─── Start cloudflared tunnel ────────────────────────────────────────────────

const CLOUDFLARED = 'C:\\Users\\emman\\scoop\\shims\\cloudflared.exe';
const API_PORT = 3001;

async function startTunnel() {
  console.log('⏳  Starting cloudflared Quick Tunnel (port 3001)…');

  return new Promise((resolve, reject) => {
    const proc = spawn(CLOUDFLARED, ['tunnel', '--url', `http://localhost:${API_PORT}`, '--no-autoupdate'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let url = null;
    const timeout = setTimeout(() => {
      if (!url) {
        proc.kill();
        reject(new Error('Tunnel did not start in 30s'));
      }
    }, 30000);

    const handleOutput = (data) => {
      const text = data.toString();
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match && !url) {
        url = match[0];
        clearTimeout(timeout);
        console.log(`✅  Tunnel URL: ${url}\n`);
        resolve({ url, proc });
      }
    };

    proc.stdout.on('data', handleOutput);
    proc.stderr.on('data', handleOutput);
    proc.on('error', reject);
  });
}

// ─── Register webhook with Meta ───────────────────────────────────────────────

async function registerWebhook(webhookUrl) {
  const callbackUrl = `${webhookUrl}/webhook/whatsapp`;
  console.log(`⏳  Registering webhook: ${callbackUrl}`);

  const appAccessToken = `${APP_ID}|${APP_SECRET}`;

  // Subscribe app to webhook
  const url = `${GRAPH}/${APP_ID}/subscriptions`;
  const body = new URLSearchParams({
    object: 'whatsapp_business_account',
    callback_url: callbackUrl,
    verify_token: VERIFY_TOKEN,
    fields: 'messages,message_deliveries,message_reads,messaging_postbacks,message_reactions,business_capability_update,phone_number_name_update,phone_number_quality_update',
    access_token: appAccessToken,
  });

  const resp = await fetch(url, {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const data = await resp.json();

  if (data.success) {
    console.log('✅  Webhook subscription registered');
  } else {
    console.error('❌  Webhook registration failed:', JSON.stringify(data, null, 2));
    if (data.error?.code === 100) {
      console.log('\n💡  Tip: The API port may not be running yet. Start the API first:');
      console.log('    pnpm --filter @walletz/api dev\n');
    }
    return false;
  }

  return true;
}

// ─── Verify app info ─────────────────────────────────────────────────────────

async function verifyApp() {
  const appAccessToken = `${APP_ID}|${APP_SECRET}`;
  const resp = await fetch(`${GRAPH}/${APP_ID}?fields=name,status,whatsapp_business_management&access_token=${appAccessToken}`);
  const data = await resp.json();
  if (data.error) {
    console.error('❌  App verification failed:', data.error.message);
    return null;
  }
  console.log(`✅  App verified: "${data.name}" (id: ${data.id})`);
  return data;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Verify app credentials
  const app = await verifyApp();
  if (!app) {
    console.error('\n❌  Could not verify Meta App credentials. Check META_APP_ID and META_APP_SECRET.\n');
    process.exit(1);
  }

  // 2. Start tunnel
  let tunnel;
  try {
    tunnel = await startTunnel();
  } catch (e) {
    console.error('❌  Failed to start cloudflared tunnel:', e.message);
    console.log('\n💡  Is the API running? Start it with: pnpm --filter @walletz/api dev');
    process.exit(1);
  }

  // 3. Save webhook URL to .env.local
  const callbackUrl = `${tunnel.url}/webhook/whatsapp`;
  updateEnvValue(API_ENV, 'WHATSAPP_WEBHOOK_URL', tunnel.url);
  console.log(`💾  Saved WHATSAPP_WEBHOOK_URL to apps/api/.env.local`);

  // 4. Register webhook
  const ok = await registerWebhook(tunnel.url);
  if (!ok) {
    tunnel.proc.kill();
    process.exit(1);
  }

  console.log('\n─────────────────────────────────────────────────────────');
  console.log('✅  Meta webhook setup complete!');
  console.log(`   Webhook URL: ${callbackUrl}`);
  console.log('   The tunnel is running. Keep this process alive for dev.');
  console.log('   Press Ctrl+C to stop the tunnel.\n');

  // Keep tunnel alive
  process.on('SIGINT', () => {
    console.log('\nStopping tunnel…');
    tunnel.proc.kill();
    process.exit(0);
  });
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
