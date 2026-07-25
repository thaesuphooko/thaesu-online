import jwt from 'jsonwebtoken';
import pool from '@/lib/db';

// ========== Configuration ==========
const JWT_SECRET = process.env.JWT_SECRET || 'thaesu-secret-key-2024-prod-v2';
const JWT_ALGORITHMS = ['HS256'];
const CACHE_TTL = 30 * 1000; // 30 seconds

// ========== Simple in-memory cache ==========
const userCache = new Map();

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

// ========== Token blacklist (revoke support) ==========
const tokenBlacklist = new Set();

/**
 * Premium Vendor Authentication Middleware
 * @param {Request} request - Next.js request object
 * @returns {Promise<{id: string, role: string} | null>} Vendor object or null
 */
export async function verifyVendor(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.debug('🔒 VendorAuth: No Bearer token');
    return null;
  }

  const token = authHeader.slice(7);

  // Check blacklist
  if (tokenBlacklist.has(token)) {
    console.warn('🚫 VendorAuth: Token has been revoked');
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: JWT_ALGORITHMS,
    });

    if (!decoded || !decoded.id || decoded.role !== 'vendor') {
      console.warn('⚠️  VendorAuth: Invalid token payload');
      return null;
    }

    // Use cache if available
    let vendor = getCachedUser(decoded.id);
    if (vendor) return vendor;

    // Database validation (only columns that exist)
    const { rows } = await pool.query(
      'SELECT id, role, vendor_status FROM users WHERE id = $1',
      [decoded.id]
    );

    if (rows.length === 0) {
      console.warn('⚠️  VendorAuth: User not found (deleted?)');
      return null;
    }

    const user = rows[0];
    if (user.role !== 'vendor') {
      console.warn('⚠️  VendorAuth: Role mismatch (expected vendor, got ' + user.role + ')');
      return null;
    }
    if (user.vendor_status !== 'approved') {
      console.warn('⚠️  VendorAuth: Vendor not approved (status: ' + user.vendor_status + ')');
      return null;
    }

    vendor = { id: user.id, role: 'vendor' };
    setCachedUser(decoded.id, vendor);
    console.debug('✅ VendorAuth: Authenticated', user.id);
    return vendor;
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      console.warn('⏰ VendorAuth: Token expired');
    } else if (err.name === 'JsonWebTokenError') {
      console.warn('🔑 VendorAuth: Invalid token signature');
    } else if (err.name === 'NotBeforeError') {
      console.warn('⏳ VendorAuth: Token not yet active');
    } else {
      console.error('❌ VendorAuth: Verification error', err.message);
    }
    return null;
  }
}

/**
 * Revoke a token (add to blacklist)
 * @param {string} token
 */
export function revokeToken(token) {
  tokenBlacklist.add(token);
}

/**
 * Clear the user cache (useful after vendor status change)
 * @param {string} userId
 */
export function clearUserCache(userId) {
  userCache.delete(userId);
}
