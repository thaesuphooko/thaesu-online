import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const exact = searchParams.get('exact') === 'true';

    let count = 0;
    if (exact) {
      const { rows } = await query('SELECT COUNT(*)::int AS count FROM users');
      count = rows[0]?.count || 0;
    } else {
      // Fast approximate count using PostgreSQL statistics
      const { rows } = await query(
        `SELECT COALESCE(n_live_tup, 0)::int AS count
         FROM pg_stat_user_tables
         WHERE relname = 'users'`
      );
      count = rows[0]?.count || 0;
    }

    return NextResponse.json(
      { count },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('❌ Users count error:', error);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}
