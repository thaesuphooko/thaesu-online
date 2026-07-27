import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request, { params }) {
  const { uid } = await params;
  
  // Extract viewer token (optional)
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  let viewerId = null;
  if (token) {
    try {
      const decoded = verifyToken(token);
      if (decoded?.id) viewerId = decoded.id;
    } catch (err) {
      // Invalid token – ignore, treat as guest
    }
  }

  try {
    const { rows: [user] } = await db.query(`
      SELECT 
        u.id, u.uid, u.full_name, u.email, u.phone, u.bio,
        u.avatar_url, u.cover_url, u.website,
        COALESCE(u.social_links, '{}'::jsonb) AS social_links,
        u.is_verified, u.membership_tier, u.role, u.vendor_status,
        u.wallet_balance, u.referral_code,
        u.created_at, u.updated_at,
        
        -- Post count
        (SELECT COUNT(*) FROM posts WHERE user_id = u.id) AS post_count,
        
        -- Product count
        (SELECT COUNT(*) FROM products WHERE vendor_id = u.id) AS product_count,
        
        -- Followers count
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS followers_count,
        
        -- Following count
        (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) AS following_count,
        
        -- Is the viewer following this user?
        ${viewerId ? `EXISTS(SELECT 1 FROM follows WHERE follower_id = '${viewerId}' AND following_id = u.id)` : 'FALSE'} AS is_following
        
      FROM users u
      WHERE u.uid = $1
    `, [uid]);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse social_links if it's still a string
    if (typeof user.social_links === 'string') {
      try {
        user.social_links = JSON.parse(user.social_links);
      } catch (e) {
        user.social_links = {};
      }
    }

    // Prepare response
    const responsePayload = {
      success: true,
      user: {
        ...user,
        is_following: Boolean(user.is_following),
      },
    };

    return NextResponse.json(responsePayload, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('❌ Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
