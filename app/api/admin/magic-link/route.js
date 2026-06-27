export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { randomBytes } from 'crypto';
import { headers } from 'next/headers';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_1 || process.env.TELEGRAM_BOT_TOKENS?.split(',')[0];
const TELEGRAM_USER_ID = process.env.TELEGRAM_USER_ID;
const BASE_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

// Simple in-memory rate limiter (5 requests per minute per IP)
const rateLimitMap = new Map();
const RATE_LIMIT = 5;
const RATE_WINDOW = 60 * 1000;

export async function POST() {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_USER_ID) {
    return Response.json({ error: 'Bot not configured' }, { status: 500 });
  }

  // Rate limiting by IP
  const headersList = headers();
  const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || '127.0.0.1';
  const now = Date.now();
  if (!rateLimitMap.has(ip)) rateLimitMap.set(ip, []);
  const timestamps = rateLimitMap.get(ip).filter(t => now - t < RATE_WINDOW);
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  if (timestamps.length > RATE_LIMIT) {
    return Response.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  // Generate token
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(now + 60 * 1000).toISOString();

  await query('INSERT INTO admin_magic_links (token, expires_at, ip_address, user_agent) VALUES ($1, $2, $3, $4)', 
    [token, expiresAt, ip, headersList.get('user-agent') || '']);

  const magicUrl = `${BASE_URL}/dashboard/auth?token=${token}`;

  // Send message with inline keyboard button
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_USER_ID,
      text: '🔐 *Admin Login Request*\n\nClick the button below to securely login.\n\n_Expires in 1 minute._',
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔓 Login to Admin Panel', url: magicUrl },
          ],
        ],
      },
    }),
  });

  return Response.json({ message: 'Magic link sent' });
}
