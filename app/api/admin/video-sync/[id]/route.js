export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';
import { syncJob } from '@/lib/videoSync';

export async function GET(request, { params }) {
  const auth = checkAdmin(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;
  const job = await query('SELECT * FROM video_sync_jobs WHERE id = $1', [id]);
  const products = await query('SELECT * FROM video_products WHERE job_id = $1 ORDER BY created_at DESC', [id]);
  return NextResponse.json({ job: job.rows[0], products: products.rows });
}

export async function PATCH(request, { params }) {
  const auth = checkAdmin(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;
  const body = await request.json();
  if (body.action === 'sync') {
    try {
      await syncJob(id);
      return NextResponse.json({ message: 'Sync completed' });
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
