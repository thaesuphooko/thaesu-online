import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticate } from '@/lib/socialAuth';

// ========== Configuration ==========
const CACHE_TTL = 30 * 1000; // 30 seconds
const RATE_LIMIT = 20;       // requests per minute

// ========== In-Memory Caches & Rate Limiter ==========
const cache = new Map();
const rateLimitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, reset: now + 60000 };
  if (now > entry.reset) {
    entry.count = 1;
    entry.reset = now + 60000;
  } else {
    entry.count++;
  }
  rateLimitMap.set(ip, entry);
  return entry.count <= RATE_LIMIT;
}

// ========== API Handlers ==========

/**
 * GET /api/stories
 * - Returns stories from users the current user follows, plus own story.
 * - If not logged in, returns an empty array.
 * - Supports pagination (page & limit query params).
 * - Caches result per user for 30s.
 */
export async function GET(req) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  const user = await authenticate(req);
  if (!user) {
    return NextResponse.json({ stories: [] });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20); // max 20

  const cacheKey = `stories:${user.id}:${page}:${limit}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ stories: cached.data, cached: true });
  }

  try {
    // Get followed user IDs
    const followed = await query('SELECT following_id FROM follows WHERE follower_id = $1', [user.id]);
    const userIds = [user.id, ...followed.rows.map(r => r.following_id)];

    const offset = (page - 1) * limit;

    const { rows } = await query(
      `SELECT s.*, u.full_name, u.avatar_url
       FROM stories s
       JOIN users u ON s.user_id = u.id
       WHERE s.user_id = ANY($1::uuid[])
         AND s.expires_at > NOW()
       ORDER BY s.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userIds, limit, offset]
    );

    // Cache the result
    cache.set(cacheKey, { data: rows, timestamp: Date.now() });

    return NextResponse.json({ stories: rows });
  } catch (error) {
    console.error('Stories GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/stories
 * - Create a new story (image or video).
 * - Requires authentication.
 * - Returns the created story.
 */
export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  const user = await authenticate(req);
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  try {
    const { media_url, type = 'image' } = await req.json();
    if (!media_url) return NextResponse.json({ error: 'media_url required' }, { status: 400 });
    if (!['image', 'video'].includes(type)) return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

    const { rows } = await query(
      'INSERT INTO stories (user_id, media_url, type) VALUES ($1, $2, $3) RETURNING *',
      [user.id, media_url, type]
    );

    // Invalidate relevant caches (simplified: clear all story caches)
    cache.clear();

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Stories POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/stories?id=<storyId>
 * - Delete own story.
 * - Requires authentication.
 */
export async function DELETE(req) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  const user = await authenticate(req);
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const storyId = searchParams.get('id');
  if (!storyId) return NextResponse.json({ error: 'Story id required' }, { status: 400 });

  try {
    const { rowCount } = await query('DELETE FROM stories WHERE id = $1 AND user_id = $2', [storyId, user.id]);
    if (rowCount === 0) return NextResponse.json({ error: 'Story not found or not authorized' }, { status: 404 });

    cache.clear();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Stories DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
