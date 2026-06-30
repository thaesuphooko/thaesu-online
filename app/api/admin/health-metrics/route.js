export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { checkAdmin } from '@/lib/adminAuth';
import { redis } from '@/lib/redis';

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const requests = parseInt(await redis.get('health:total_requests') || '0', 10);
    const alerts = parseInt(await redis.get('health:telegram_alerts_today') || '0', 10);
    const healed = parseInt(await redis.get('health:ai_healed_total') || '0', 10);

    let startTime = await redis.get('health:start_time');
    if (!startTime) {
      startTime = Date.now().toString();
      await redis.set('health:start_time', startTime);
    }
    const uptimeMs = Date.now() - parseInt(startTime, 10);
    const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptimeMs % (86400000)) / (3600000));
    const uptimeStr = `${days}d ${hours}h`;

    return NextResponse.json({
      totalRequestsMonitored: requests,
      activeProtectionTime: uptimeStr,
      telegramAlertsSent: alerts,
      aiAutoHealed: healed,
    });
  } catch (e) {
    console.error('Health metrics error:', e);
    return NextResponse.json({
      totalRequestsMonitored: 0,
      activeProtectionTime: '0d 0h',
      telegramAlertsSent: 0,
      aiAutoHealed: 0,
    });
  }
}
