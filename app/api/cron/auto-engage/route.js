import { NextResponse } from 'next/server';
import { safeQuery } from '@/lib/db-wrapper';

export async function GET(req) {
  // Only allow cron secret or internal calls
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Find inactive users (last login > 7 days)
    const { rows: inactiveUsers } = await safeQuery(
      `SELECT id, email, full_name FROM users
       WHERE is_active = true AND (last_login IS NULL OR last_login < NOW() - INTERVAL '7 days')`
    );
    
    // Log engagement attempt
    if (inactiveUsers.length > 0) {
      await safeQuery(
        'INSERT INTO email_campaigns (name, subject, content, status) VALUES ($1, $2, $3, $4)',
        ['Auto-Engage', 'We miss you!', JSON.stringify({ userIds: inactiveUsers.map(u => u.id) }), 'queued']
      );
    }
    
    return NextResponse.json({ engaged: inactiveUsers.length, status: 'ok' });
  } catch (error) {
    console.error('Auto-engage error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
