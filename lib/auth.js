import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// !!! IMPORTANT: Set a strong secret in Vercel Env (JWT_SECRET)
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const SALT_ROUNDS = 12;   // bcrypt salt rounds (high security)

// Hash a plain text password
export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Compare plain password with hash
export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// Generate a JWT token for a user (expires in 7 days)
export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Verify a JWT token and return payload
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
