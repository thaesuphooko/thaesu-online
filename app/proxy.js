import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

async function sendVisitorAlert(request, pathname) {
  const tracking = await query('SELECT * FROM visitor_tracking LIMIT 1');
  if (tracking.rows.length === 0) return;
  const t = tracking.rows[0];

  const configs = await query('SELECT bot_token, user_ids FROM telegram_config WHERE is_active = true');
  if (configs.rows.length === 0) return;

  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const userAgent = request.headers.get('user-agent') || '';
  const referer = request.headers.get('referer') || '';
  const device = /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent) ? '📱 Mobile' : '💻 Desktop';

  let message = '👤 Visitor Alert\n';
  if (t.track_ip) message += `IP: ${ip}\n`;
  if (t.track_device) message += `Device: ${device}\nBrowser: ${userAgent.split(' ').slice(-1)[0]}\n`;
  if (t.track_referrer && referer) message += `Referrer: ${referer}\n`;
  if (t.track_page) message += `Page: ${pathname}\n`;

  if (message === '👤 Visitor Alert\n') return; // no fields selected

  for (const cfg of configs.rows) {
    const userIds = cfg.user_ids.split(',').map(s => s.trim());
    for (const chatId of userIds) {
      fetch(`https://api.telegram.org/bot${cfg.bot_token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message }),
      }).catch(() => {});
      await new Promise(r => setTimeout(r, 50)); // rate limit
    }
  }
}

export default async function proxy(request) {
  const pathname = request.nextUrl.pathname;

  if (!pathname.startsWith('/_next') && !pathname.startsWith('/api') && !pathname.startsWith('/dashboard')) {
    sendVisitorAlert(request, pathname).catch(() => {});
  }

  if (pathname.startsWith('/dashboard')) {
    const hash = request.nextUrl.hash.substring(1);
    if (hash !== process.env.ADMIN_HASH) {
      return new NextResponse('Not Found', { status: 404 });
    }
  }

  return NextResponse.next();
}
