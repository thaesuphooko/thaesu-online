import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticate } from '@/lib/socialAuth';

// ========== Rate Limiter ==========
const rateLimitMap = new Map();
const RATE_LIMIT = 15; // per minute per IP

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, reset: now + 60000 };
  if (now > entry.reset) { entry.count = 1; entry.reset = now + 60000; }
  else { entry.count++; }
  rateLimitMap.set(ip, entry);
  return entry.count <= RATE_LIMIT;
}

export async function POST(req, { params }) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  const user = await authenticate(req);
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { id: postId } = await params;
  const { option_index } = await req.json();
  if (option_index === undefined) return NextResponse.json({ error: 'option_index required' }, { status: 400 });

  try {
    const postRes = await query('SELECT poll FROM posts WHERE id = $1', [postId]);
    if (!postRes.rows.length || !postRes.rows[0].poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }
    const poll = postRes.rows[0].poll;
    if (option_index < 0 || option_index >= poll.options.length) {
      return NextResponse.json({ error: 'Invalid option index' }, { status: 400 });
    }

    const existing = await query('SELECT id FROM poll_votes WHERE post_id = $1 AND user_id = $2', [postId, user.id]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Already voted' }, { status: 400 });
    }

    // Transactional vote
    await query('BEGIN');
    try {
      await query('INSERT INTO poll_votes (post_id, user_id, option_index) VALUES ($1, $2, $3)', [postId, user.id, option_index]);
      const votePath = `{votes,${option_index}}`;
      await query(
        `UPDATE posts SET poll = jsonb_set( COALESCE(poll, '{}'), $1::text[], COALESCE((poll->'votes'->>$2)::int, 0) + 1 ) WHERE id = $3`,
        [votePath, option_index, postId]
      );
      await query('COMMIT');
    } catch (e) {
      await query('ROLLBACK');
      throw e;
    }

    // Return updated poll data
    const updated = await query('SELECT poll FROM posts WHERE id = $1', [postId]);
    const updatedPoll = updated.rows[0]?.poll || poll;
    const totalVotes = (updatedPoll.votes || []).reduce((a, b) => a + (b || 0), 0);

    return NextResponse.json({ success: true, poll: updatedPoll, totalVotes, message: 'Vote recorded' });
  } catch (error) {
    console.error('Poll vote error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
