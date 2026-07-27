import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import db from '@/lib/db';
import crypto from 'crypto';

// ─── Global Rate Limiter (configurable) ─────────────────
const rateLimitStore = new Map();
const DEFAULT_WINDOW_MS = 60_000;   // 1 minute
const DEFAULT_MAX_REQUESTS = 200;    // per window per IP+route

function getClientIP(req) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         req.headers.get('x-real-ip') ||
         'unknown';
}

function checkRateLimit(req, maxRequests = DEFAULT_MAX_REQUESTS, windowMs = DEFAULT_WINDOW_MS) {
  const ip = getClientIP(req);
  const route = new URL(req.url).pathname;
  const key = `${ip}:${route}`;
  const now = Date.now();

  const record = rateLimitStore.get(key);
  if (record && (now - record.start < windowMs)) {
    record.count++;
    if (record.count > maxRequests) {
      return { allowed: false, retryAfter: Math.ceil((record.start + windowMs - now) / 1000) };
    }
  } else {
    rateLimitStore.set(key, { start: now, count: 1 });
  }
  return { allowed: true };
}

// ─── Telegram Notification on Critical Errors ──────────
async function sendTelegramAlert(message, req, errorStack) {
  try {
    const { rows: [config] } = await db.query(
      'SELECT bot_token, chat_id FROM telegram_configs WHERE is_active = true ORDER BY created_at DESC LIMIT 1'
    );
    if (!config) return;

    const truncatedStack = (errorStack || '').slice(0, 300);
    const text = `🚨 <b>Critical API Error</b>\n⏰ ${new Date().toISOString()}\n📍 ${req.method} ${req.url}\n📄 ${truncatedStack}`;
    await fetch(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: config.chat_id, text, parse_mode: 'HTML' }),
    });
  } catch (e) {
    console.error('Telegram notification failed:', e);
  }
}

// ─── Security Headers Helper ───────────────────────────
function addSecurityHeaders(response) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

// ─── Main Wrapper (Higher‑Order Function) ─────────────
export function withErrorHandler(handler, options = {}) {
  const maxReq = options.maxRequests || DEFAULT_MAX_REQUESTS;

  return async (req, context) => {
    // Rate limiting
    const { allowed, retryAfter } = checkRateLimit(req, maxReq);
    if (!allowed) {
      return addSecurityHeaders(
        new NextResponse(JSON.stringify({ error: 'Too Many Requests' }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
          },
        })
      );
    }

    try {
      const response = await handler(req, context);
      return addSecurityHeaders(response);
    } catch (error) {
      // Log structured error
      console.error(JSON.stringify({
        requestId: req.headers.get('x-request-id') || '',
        method: req.method,
        url: req.url,
        error: error.message,
        stack: error.stack?.split('\n').slice(0, 3).join(' | '),
        timestamp: new Date().toISOString(),
      }));

      // Broadcast to Telegram if 500
      if (!error.statusCode || error.statusCode >= 500) {
        sendTelegramAlert(error.message, req, error.stack);
      }

      const status = error.statusCode || 500;
      const message = status === 500 ? 'Internal Server Error' : error.message;

      return addSecurityHeaders(
        NextResponse.json({ error: message }, { status })
      );
    }
  };
}

// ─── Unified API Route Creator ─────────────────────────
export function createApiRoute(handlers, options = {}) {
  const allowedMethods = Object.keys(handlers);

  return async (req, context) => {
    const method = req.method.toUpperCase();

    if (!handlers[method]) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: `Method ${method} Not Allowed` },
          { status: 405, headers: { 'Allow': allowedMethods.join(', ') } }
        )
      );
    }

    // Pre‑validate JSON for POST/PUT
    if (['POST', 'PUT'].includes(method)) {
      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try { await req.clone().json(); } catch {
          return addSecurityHeaders(
            NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
          );
        }
      }
    }

    // Generate request ID for tracing
    if (!req.headers.get('x-request-id')) {
      req.headers.set('x-request-id', crypto.randomUUID());
    }

    return withErrorHandler(handlers[method], options)(req, context);
  };
}

// ─── Input Validation Helper ───────────────────────────
export function validateBody(body, requiredFields = []) {
  if (!body || typeof body !== 'object') {
    const error = new Error('Invalid request body');
    error.statusCode = 400;
    throw error;
  }
  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      const error = new Error(`Missing required field: ${field}`);
      error.statusCode = 400;
      throw error;
    }
  }
  return body;
}

// ─── Admin Authorization Middleware ────────────────────
export function requireAdmin(handler) {
  return async (req, context) => {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    try {
      const user = verifyToken(token);
      if (!user?.id) throw new Error('Invalid token');
      if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

      // Attach user to request context
      return handler(req, { ...context, userId: user.id, userRole: user.role });
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
  };
}
