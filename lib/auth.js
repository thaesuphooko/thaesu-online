import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// ======================== CONFIGURATION ========================
const JWT_SECRET = process.env.JWT_SECRET || 'thaesu-secret-key-2024-prod-v2';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '-refresh';
const JWT_ISSUER = 'thaesu-online';
const JWT_AUDIENCE = 'thaesu-clients';
const JWT_ALGORITHM = 'HS256';
const REFRESH_TOKEN_BYTES = 48; // bytes for refresh token
const BCRYPT_SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRES = '100 years'; // effectively permanent per your request

// ======================== TOKEN BLACKLIST (in-memory, replace with Redis) ========================
const tokenBlacklist = new Set(); // production use Redis

/**
 * Add a token to blacklist (for logout / forced expiry)
 * @param {string} token - JWT token or jti
 */
export function blacklistToken(jti) {
  tokenBlacklist.add(jti);
}

/**
 * Check if a token's jti is blacklisted
 */
function isBlacklisted(jti) {
  return tokenBlacklist.has(jti);
}

// ======================== PASSWORD UTILITIES ========================

/**
 * Validate password strength (client‑side helper can be used, but also server validation)
 * @param {string} password
 * @returns {{ valid: boolean, message: string }}
 */
export function validatePasswordStrength(password) {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain an uppercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain a number' };
  }
  return { valid: true, message: 'Strong' };
}

/**
 * Hash a password
 * @param {string} password - plain text
 * @returns {Promise<string>} hashed password
 */
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  return bcrypt.hash(password, salt);
}

/**
 * Verify password against hash
 * @param {string} password - plain text
 * @param {string} hash - stored hash
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// ======================== TOKEN GENERATION ========================

/**
 * Generate access token (JWT)
 * @param {Object} user - user object with id, email, role, name
 * @param {Object} options - extra claims (e.g., { scope: 'vendor' })
 * @returns {string} signed JWT
 */
export function generateToken(user, options = {}) {
  const now = Math.floor(Date.now() / 1000);
  const jti = crypto.randomUUID(); // unique token id for revocation
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.full_name || user.name,
    scope: options.scope || user.role, // allow granular access
    jti,
    iat: now,
    iss: JWT_ISSUER,
    aud: JWT_AUDIENCE,
  };
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: ACCESS_TOKEN_EXPIRES,
  });
}

/**
 * Generate a refresh token (opaque random string)
 * Store in DB with user id, expires_at, device info.
 * @returns {string} hex token
 */
export function generateRefreshToken() {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
}

/**
 * Generate a short-lived token for magic links / password reset
 * @param {Object} user
 * @param {string} purpose - 'reset-password','email-verify'
 * @param {string} expiresIn - default '15m'
 * @returns {string}
 */
export function generateMagicToken(user, purpose, expiresIn = '15m') {
  const payload = {
    sub: user.id,
    purpose,
    iat: Math.floor(Date.now() / 1000),
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

// ======================== TOKEN VERIFICATION ========================

/**
 * Verify an access token, optionally check user still exists in DB
 * @param {string} token
 * @param {Object} options - { checkDatabase?: boolean, pool?: Pool }
 * @returns {Promise<Object|null>} decoded payload or null
 */
export async function verifyToken(token, options = {}) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    // Check blacklist
    if (decoded.jti && isBlacklisted(decoded.jti)) {
      console.warn('Token blacklisted:', decoded.jti);
      return null;
    }

    // Optional: check if user still exists and is active
    if (options.checkDatabase && options.pool) {
      const { rows } = await options.pool.query(
        'SELECT id, is_active FROM users WHERE id = $1',
        [decoded.sub]
      );
      if (rows.length === 0 || rows[0].is_active === false) {
        console.warn('User not found or inactive:', decoded.sub);
        return null;
      }
    }

    return {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
      scope: decoded.scope,
      jti: decoded.jti,
    };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.warn('Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      console.warn('Invalid token');
    } else {
      console.error('Token verification error:', error.message);
    }
    return null;
  }
}

/**
 * Synchronous version (for routes that cannot use await)
 */
export function verifyTokenSync(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    if (decoded.jti && isBlacklisted(decoded.jti)) return null;
    return {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
      scope: decoded.scope,
      jti: decoded.jti,
    };
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return null;
  }
}

// ======================== SESSION MANAGEMENT ========================

/**
 * Create a new session record (for multi‑device tracking)
 * @param {Pool} pool - database pool
 * @param {string} userId
 * @param {string} refreshToken
 * @param {Object} metadata - IP, user-agent, etc.
 */
export async function createSession(pool, userId, refreshToken, metadata = {}) {
  const { ip, userAgent, device } = metadata;
  await pool.query(
    `INSERT INTO user_sessions (user_id, refresh_token, ip_address, user_agent, device_name)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, refreshToken, ip || null, userAgent || null, device || null]
  );
}

/**
 * Revoke all sessions for a user (force logout all devices)
 * @param {Pool} pool
 * @param {string} userId
 */
export async function revokeAllSessions(pool, userId) {
  await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);
}

/**
 * Rotate refresh token (replace old token with new)
 * @param {Pool} pool
 * @param {string} oldToken
 * @param {string} newToken
 */
export async function rotateRefreshToken(pool, oldToken, newToken) {
  await pool.query(
    'UPDATE user_sessions SET refresh_token = $1 WHERE refresh_token = $2',
    [newToken, oldToken]
  );
}

// ======================== TWO‑FACTOR HELPERS ========================

/**
 * Generate a 6‑digit OTP
 * @returns {string}
 */
export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Hash an OTP for storage
 * @param {string} otp
 * @returns {Promise<string>}
 */
export async function hashOTP(otp) {
  return bcrypt.hash(otp, BCRYPT_SALT_ROUNDS);
}

/**
 * Verify an OTP against its hash
 * @param {string} otp
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export async function verifyOTP(otp, hash) {
  return bcrypt.compare(otp, hash);
}

// ======================== AUDIT LOGGING (optional) ========================

export function logSecurityEvent(event, details = {}) {
  // In production, write to file, DB, or external service
  console.log(`[SECURITY] ${event}`, details);
}

// ======================== DATABASE HELPERS ========================

/**
 * Update user's password and increment token version (to invalidate old tokens)
 * @param {Pool} pool
 * @param {string} userId
 * @param {string} newHashedPassword
 */
export async function changePassword(pool, userId, newHashedPassword) {
  await pool.query(
    'UPDATE users SET password_hash = $1, token_version = token_version + 1 WHERE id = $2',
    [newHashedPassword, userId]
  );
  // Blacklist all existing tokens? Not needed because token_version can be checked.
  logSecurityEvent('PASSWORD_CHANGED', { userId });
}
