import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { requireAdmin, withErrorHandler } from '@/lib/api-wrapper';
import crypto from 'crypto';

// ─── Rate Limiter (in‑memory, 10 runs per minute per IP) ─────
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60_000;   // 1 minute
const RATE_LIMIT_MAX = 10;

function checkRateLimit(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const key = `run-cron:${ip}`;
  const now = Date.now();
  const record = rateLimitMap.get(key);
  if (record && (now - record.start < RATE_LIMIT_WINDOW)) {
    record.count++;
    if (record.count > RATE_LIMIT_MAX) return false;
  } else {
    rateLimitMap.set(key, { start: now, count: 1 });
  }
  return true;
}

// ─── Cron type definitions ──────────────────────────────────
const ALLOWED_TYPES = {
  engage: 'cron-engage.js',
  order: 'cron-order-status.js',
};

// ─── Execute script with timeout ────────────────────────────
function executeScript(scriptName, timeoutMs = 60_000) {
  return new Promise((resolve, reject) => {
    const child = exec(`node ${scriptName}`, {
      cwd: process.cwd(),
      timeout: timeoutMs,
      maxBuffer: 1024 * 500,  // 500 KB output buffer
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data; });
    child.stderr.on('data', (data) => { stderr += data; });

    child.on('error', (err) => {
      reject({ error: err.message, output: stdout, errorOutput: stderr });
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ output: stdout, errorOutput: stderr });
      } else {
        reject({
          code,
          message: `Script exited with code ${code}`,
          output: stdout,
          errorOutput: stderr,
        });
      }
    });
  });
}

// ─── POST Handler ───────────────────────────────────────────
export const POST = withErrorHandler(
  requireAdmin(async (req) => {
    // 1. Rate limiting
    if (!checkRateLimit(req)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // 2. Input validation
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    if (!type || !ALLOWED_TYPES[type]) {
      return NextResponse.json(
        { error: `Invalid cron type. Allowed: ${Object.keys(ALLOWED_TYPES).join(', ')}` },
        { status: 400 }
      );
    }

    const scriptName = ALLOWED_TYPES[type];
    const startTime = Date.now();
    const runId = crypto.randomUUID();

    try {
      const result = await executeScript(scriptName);
      const durationMs = Date.now() - startTime;

      // Log success to console
      console.log(`[CRON-API] ${type} completed in ${durationMs}ms by admin`);

      return NextResponse.json({
        success: true,
        runId,
        type,
        output: result.output,
        errorOutput: result.errorOutput || null,
        durationMs,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      const durationMs = Date.now() - startTime;
      console.error(`[CRON-API] ${type} failed:`, err);

      return NextResponse.json(
        {
          success: false,
          runId,
          type,
          output: err.output || '',
          errorOutput: err.errorOutput || err.message || 'Unknown error',
          durationMs,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }
  })
);

// ─── GET Handler (list available types) ──────────────────────
export const GET = requireAdmin(async (req) => {
  return NextResponse.json({
    available: Object.keys(ALLOWED_TYPES).map((type) => ({
      type,
      description: type === 'engage' ? 'Send reminders to inactive users' : 'Cancel expired pending orders',
      endpoint: `/api/admin/run-cron?type=${type}`,
      method: 'POST',
    })),
  });
});
