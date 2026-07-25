import { NextResponse } from 'next/server';
import { verifyAdminHash } from '@/lib/adminAuth';
import { query } from '@/lib/db';

export async function GET(request) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key') || 'tracking_timings';
  const res = await query('SELECT value FROM config WHERE key = $1', [key]);
  if (res.rows.length === 0) return NextResponse.json({ error: 'Config not found' }, { status: 404 });
  return NextResponse.json(res.rows[0].value);
}

export async function PUT(request) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;
  const { key, value } = await request.json();
  if (!key || !value) return NextResponse.json({ error: 'key and value required' }, { status: 400 });
  await query(
    'INSERT INTO config (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()',
    [key, JSON.stringify(value)]
  );
  return NextResponse.json({ success: true });
}
