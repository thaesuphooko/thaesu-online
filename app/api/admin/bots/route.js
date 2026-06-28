export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { exec } from 'child_process';
import util from 'util';
const execPromise = util.promisify(exec);

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  try {
    const { stdout } = await execPromise('pm2 jlist');
    const list = JSON.parse(stdout);
    const bots = list
      .filter(p => p.name === 'thaesu' || p.name.includes('telegram-bot'))
      .map(p => ({
        id: p.pm_id,
        name: p.name,
        status: p.pm2_env.status,
      }));
    return Response.json(bots);
  } catch (err) {
    return Response.json([{ id: 0, name: 'thaesu', status: 'unknown' }]);
  }
}

export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const { action, botName } = await request.json();
  if (!botName || !['restart', 'stop', 'start'].includes(action)) {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
  try {
    await execPromise(`pm2 ${action} ${botName}`);
    return Response.json({ message: `Bot ${botName} ${action}ed` });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
