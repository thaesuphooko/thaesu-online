export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const jobs = await query('SELECT * FROM video_sync_jobs ORDER BY created_at DESC');
  return NextResponse.json(jobs.rows);
}

export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { platform, account_url, config } = await request.json();
  if (!platform || !account_url) {
    return NextResponse.json({ error: 'platform and account_url required' }, { status: 400 });
  }
  const res = await query(
    'INSERT INTO video_sync_jobs (platform, account_url, config) VALUES ($1,$2,$3) RETURNING *',
    [platform, account_url, JSON.stringify(config || {})]
  );
  return NextResponse.json({ job: res.rows[0] }, { status: 201 });
}
