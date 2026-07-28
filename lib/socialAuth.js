import { verifyToken, verifyTokenSync } from '@/lib/auth';

// ════════════════════════════════════════════════════════════
//  GOD MODE SOCIAL AUTH (Premium Ultra Max)
//  · Uses project’s own verifyToken (iss/aud/blacklist)
//  · In‑memory user cache (auto‑cleanup)
//  · Async & sync versions for all routes
// ════════════════════════════════════════════════════════════

// ─── Memory‑safe user cache (30s TTL, auto‑cleanup every 60s) ──
const userCache = new Map();
const CACHE_TTL = 30_000;               // 30 seconds

// Periodic cache cleanup (prevent memory leaks)
const cacheCleaner = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of userCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      userCache.delete(key);
    }
  }
}, 60_000);
cacheCleaner.unref?.();

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

// ─── Public cache utilities ─────────────────────────────
export function clearUserCache(userId) {
  if (userId) {
    userCache.delete(userId);
  } else {
    userCache.clear();
  }
}

// ════════════════════════════════════════════════════════════
//  Async authentication (for routes that need database, etc.)
// ════════════════════════════════════════════════════════════
export async function authenticate(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.debug('🔒 SocialAuth: No Bearer token');
    return null;
  }

  const token = authHeader.slice(7);
  if (!token) return null;

  // 1. Verify using the project's verifyToken (checks iss, aud, blacklist, etc.)
  let decoded;
  try {
    decoded = await verifyToken(token);
  } catch (err) {
    console.warn('❌ SocialAuth: verifyToken threw an error:', err.message);
    return null;
  }

  if (!decoded) {
    console.warn('⚠️  SocialAuth: Invalid token (verifyToken returned null)');
    return null;
  }

  // 2. Use cache if available
  let user = getCachedUser(decoded.id);
  if (user) {
    console.debug('✅ SocialAuth (cached):', decoded.id);
    return user;
  }

  // 3. Build user object from decoded payload
  user = {
    id: decoded.id,
    email: decoded.email,
    role: decoded.role,
    name: decoded.name,
    scope: decoded.scope,
  };

  setCachedUser(decoded.id, user);
  console.debug('✅ SocialAuth (fresh):', decoded.id);
  return user;
}

// ════════════════════════════════════════════════════════════
//  Synchronous authentication (for simple routes)
// ════════════════════════════════════════════════════════════
export function authenticateSync(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  if (!token) return null;

  let decoded;
  try {
    decoded = verifyTokenSync(token);
  } catch (err) {
    console.warn('❌ SocialAuth Sync: verifyTokenSync error:', err.message);
    return null;
  }

  if (!decoded) {
    console.warn('⚠️  SocialAuth Sync: Invalid token');
    return null;
  }

  // Use cache if available
  let user = getCachedUser(decoded.id);
  if (user) {
    return user;
  }

  user = {
    id: decoded.id,
    email: decoded.email,
    role: decoded.role,
    name: decoded.name,
    scope: decoded.scope,
  };
  setCachedUser(decoded.id, user);
  return user;
}
