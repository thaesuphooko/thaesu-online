export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ENV_FILE = path.join(process.cwd(), '.env.local');
const BACKUP_FILE = path.join(process.cwd(), '.env.backup');

function parseEnvFile(content) {
  const lines = content.split('\n');
  const entries = [];
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;
    const key = line.substring(0, eqIndex).trim();
    const value = line.substring(eqIndex + 1).trim();
    const isSecret = /token|secret|key|password/i.test(key);
    entries.push({ key, value, isSecret });
  }
  return entries;
}

function maskValue(value, isSecret) {
  if (!isSecret) return value;
  return '*'.repeat(Math.min(value.length, 12));
}

function reconstructEnvFile(entries) {
  return entries.map(e => `${e.key}=${e.value}`).join('\n');
}

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  if (!fs.existsSync(ENV_FILE)) return Response.json([]);
  const content = fs.readFileSync(ENV_FILE, 'utf8');
  const entries = parseEnvFile(content);
  const masked = entries.map(e => ({ ...e, value: maskValue(e.value, e.isSecret), isSecret: e.isSecret }));
  return Response.json(masked);
}

export async function PATCH(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const { changes } = await request.json(); // [{ key, value }]
  if (!Array.isArray(changes)) return Response.json({ error: 'Invalid body' }, { status: 400 });

  // Backup existing .env.local
  if (fs.existsSync(ENV_FILE)) {
    fs.copyFileSync(ENV_FILE, BACKUP_FILE);
  }

  // Read current content and map
  const content = fs.readFileSync(ENV_FILE, 'utf8');
  const entries = parseEnvFile(content);

  for (const change of changes) {
    const index = entries.findIndex(e => e.key === change.key);
    if (index !== -1) {
      entries[index].value = change.value;
    } else {
      entries.push({ key: change.key, value: change.value, isSecret: false });
    }
  }

  const newContent = reconstructEnvFile(entries);
  fs.writeFileSync(ENV_FILE, newContent);

  // Restart PM2 app (thaesu) to apply changes
  try {
    execSync('pm2 restart thaesu --update-env');
  } catch (e) {
    console.error('PM2 restart failed:', e.message);
  }

  return Response.json({ message: 'Environment updated and server restarted' });
}
