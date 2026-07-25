import jwt from 'jsonwebtoken';
import { query } from '@/lib/db'; // optional, see below

// ========== Configuration ==========
const JWT_SECRET = process.env.JWT_SECRET || 'thaesu-secret-key-2024-prod-v2';
const JWT_ALGORITHMS = ['HS256'];
const CACHE_TTL = 30 * 1000; // 30 seconds
const ENABLE_DB_VALIDATION = process.env.DB_USER_VALIDATION === 'true'; // off by default

// ========== In-memory caches ==========
const userCache = new Map();
const tokenBlacklist = new Set();

function getCachedUser(userId) {
  const entry = userCache.get(userId);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  userCache.delete(userId);
  return null;
}

function setCachedUser(userId, data) {
  userCache.set(userId, { data, timestamp: Date.now() });
}

// ========== Token blacklist helpers ==========
export function revokeToken(token) {
  tokenBlacklist.add(token);
}

export function clearUserCache(userId) {
  userCache.delete(userId);
}

// ========== Core Async Authentication ==========
/**
 * Premium Social Authentication Middleware (async)
 *
 * - Verifies JWT (algorithm, expiration)
 * - Checks token blacklist (revoked tokens)
 * - Uses in-memory cache to avoid repeated DB calls
 * - Optionally validates user existence in database (if DB_USER_VALIDATION=true)
 *
 * @param {Request} req - Next.js request object
 * @returns {Promise<{id: string, email: string, role: string, name?: string} | null>}
 */
export async function authenticate(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.debug('🔒 SocialAuth: No Bearer token');
    return null;
  }

  const token = authHeader.split(' ')[1];

  // Blacklist check
  if (tokenBlacklist.has(token)) {
    console.warn('🚫 SocialAuth: Token has been revoked');
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: JWT_ALGORITHMS });
    if (!decoded || !decoded.id || !decoded.role) {
      console.warn('⚠️  SocialAuth: Invalid token payload');
      return null;
    }

    // Use cache if available
    let user = getCachedUser(decoded.id);
    if (user) {
      console.debug('✅ SocialAuth (cached):', decoded.id);
      return user;
    }

    // Optional DB validation
    if (ENABLE_DB_VALIDATION) {
      // Adjust columns to match your actual database (e.g., may not have is_active)
      const { rows } = await query(
        'SELECT id, email, role FROM users WHERE id = $1',
        [decoded.id]
      );
      if (rows.length === 0) {
        console.warn('⚠️  SocialAuth: User not found in DB');
        return null;
      }
      // You can add more checks (is_active, deleted_at, etc.) when needed
    }

    // Construct user object
    user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name, // if present
    };

    setCachedUser(decoded.id, user);
    console.debug('✅ SocialAuth (fresh):', decoded.id);
    return user;
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      console.warn('⏰ SocialAuth: Token expired');
    } else if (err.name === 'JsonWebTokenError') {
      console.warn('🔑 SocialAuth: Invalid token signature');
    } else if (err.name === 'NotBeforeError') {
      console.warn('⏳ SocialAuth: Token not yet active');
    } else {
      console.error('❌ SocialAuth: Verification error', err.message);
    }
    return null;
  }
}

// ========== Synchronous version (lightweight) ==========
/**
 * Synchronous version – same logic without DB / cache (for simple routes)
 */
export function authenticateSync(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  if (tokenBlacklist.has(token)) {
    console.warn('🚫 SocialAuth Sync: Token revoked');
    return null;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: JWT_ALGORITHMS });
    if (!decoded || !decoded.id || !decoded.role) return null;
    return { id: decoded.id, email: decoded.email, role: decoded.role };
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      console.warn('⏰ SocialAuth Sync: Token expired');
    } else if (err.name === 'JsonWebTokenError') {
      console.warn('🔑 SocialAuth Sync: Invalid token signature');
    } else {
      console.error('❌ SocialAuth Sync:', err.message);
    }
    return null;
  }
}
