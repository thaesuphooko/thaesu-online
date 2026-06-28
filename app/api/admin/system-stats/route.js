export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { execSync } from 'child_process';

function safeExec(cmd) {
  try {
    return execSync(cmd, { timeout: 3000 }).toString().trim();
  } catch (e) {
    return null;
  }
}

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  // CPU usage via top
  const cpuLine = safeExec("top -bn1 | grep 'CPU' | head -1");
  let cpu = 0;
  if (cpuLine) {
    const idleMatch = cpuLine.match(/(\d+)% idle/);
    if (idleMatch) cpu = 100 - parseInt(idleMatch[1]);
  }

  // RAM via free
  const memLine = safeExec("free -m | grep Mem");
  let ram = { used: 0, total: 1, percent: 0 };
  if (memLine) {
    const parts = memLine.split(/\s+/);
    const total = parseInt(parts[1]);
    const used = parseInt(parts[2]);
    ram = { used: used * 1024 * 1024, total: total * 1024 * 1024, percent: Math.round((used / total) * 100) };
  }

  // Disk via df
  const diskLine = safeExec("df -h /data | tail -1");
  let disk = { used: 0, total: 1, percent: 0 };
  if (diskLine) {
    const parts = diskLine.split(/\s+/);
    disk = {
      used: parseInt(parts[2]) || 0,
      total: parseInt(parts[1]) || 1,
      percent: parseInt(parts[4]) || 0,
    };
  }

  return Response.json({ cpu, ram, disk });
}
