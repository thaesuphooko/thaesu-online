export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

async function getAIDiagnosis(errorCode, errorMessage, stack) {
  if (!DEEPSEEK_API_KEY) return null;
  try {
    const res = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{
          role: 'user',
          content: `Analyze the following error from a Next.js marketplace website. Provide:
1. Where: File path and line number (if present in stack)
2. Why: Root cause in simple terms
3. Solution: How to fix it (including code snippet if applicable)
4. Impact: Which pages or features might be affected?

Format your response as JSON: {"where":"...", "why":"...", "solution":"...", "impact":"...", "codeSnippet":"..."}

Error Code: ${errorCode}
Message: ${errorMessage}
Stack: ${stack || 'N/A'}`,
        }],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });
    const data = await res.json();
    const content = data.choices[0]?.message?.content?.trim();
    try {
      // Try to parse JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return { why: content, solution: 'Manual investigation needed', impact: 'Unknown' };
    } catch {
      return { why: content, solution: 'Manual investigation needed', impact: 'Unknown' };
    }
  } catch (e) {
    return null;
  }
}

// Emergency Telegram alert for critical errors
async function sendCriticalAlert(error) {
  const token = process.env.TELEGRAM_BOT_TOKEN_1 || process.env.TELEGRAM_BOT_TOKENS?.split(',')[0];
  const chatId = process.env.TELEGRAM_USER_ID;
  if (!token || !chatId) return;
  const msg = `🚨 *CRITICAL ERROR*\nModule: ${error.module || 'Unknown'}\nCode: ${error.error_code}\nMessage: ${error.error_message}\nTime: ${new Date().toISOString()}\n\nAction required immediately!`;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown' }),
  }).catch(() => {});
}

// GET: Return recent error logs with optional filter
export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get('filter') || ''; // CRITICAL, WARNING, DATABASE, API
  const limit = parseInt(searchParams.get('limit')) || 50;

  let conditions = [];
  let params = [];
  if (filter === 'CRITICAL') { conditions.push("error_code = 'CRITICAL'"); }
  else if (filter === 'WARNING') { conditions.push("error_code = 'WARNING'"); }
  else if (filter === 'DATABASE') { conditions.push("module ILIKE '%db%' OR module ILIKE '%database%'"); }
  else if (filter === 'API') { conditions.push("module ILIKE '%api%'"); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const res = await query(`SELECT * FROM error_logs ${where} ORDER BY created_at DESC LIMIT $1`, [limit]);
  return Response.json(res.rows);
}

// POST: Log a new error (called from middleware/API handlers)
export async function POST(request) {
  const { errorCode, errorMessage, stack, module } = await request.json();
  const level = errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND' ? 'CRITICAL' : 
                errorMessage.includes('timeout') ? 'WARNING' : 'API';

  // Save to database
  const res = await query(
    `INSERT INTO error_logs (error_code, error_message, stack, module) VALUES ($1,$2,$3,$4) RETURNING *`,
    [level, errorMessage, stack, module]
  );
  const error = res.rows[0];

  // AI Diagnosis (async)
  if (level === 'CRITICAL' || level === 'WARNING') {
    getAIDiagnosis(level, errorMessage, stack).then(async (diagnosis) => {
      if (diagnosis) {
        await query('UPDATE error_logs SET diagnosis = $1 WHERE id = $2', [JSON.stringify(diagnosis), error.id]);
      }
    }).catch(() => {});

    // Telegram alert for critical
    if (level === 'CRITICAL') {
      sendCriticalAlert(error).catch(() => {});
    }
  }

  return Response.json({ message: 'Error logged' }, { status: 201 });
}

// PATCH: Run auto-heal on an error
export async function PATCH(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const { errorId, action } = await request.json();
  const error = await query('SELECT * FROM error_logs WHERE id = $1', [errorId]);
  if (error.rows.length === 0) return Response.json({ error: 'Not found' }, { status: 404 });

  const err = error.rows[0];
  let actionTaken = '';

  if (err.error_message.includes('ECONNREFUSED') || err.error_message.includes('timeout')) {
    const { execSync } = await import('child_process');
    try { execSync('pm2 restart thaesu'); actionTaken = 'Restarted thaesu server'; } catch { actionTaken = 'Restart failed'; }
  } else if (err.error_message.includes('Memory') || err.error_message.includes('cache')) {
    const { execSync } = await import('child_process');
    try { execSync('rm -rf .next node_modules/.cache'); actionTaken = 'Cleared cache'; } catch { actionTaken = 'Cache clear failed'; }
  } else {
    actionTaken = 'No automatic action available';
  }

  await query('UPDATE error_logs SET action_taken = $1 WHERE id = $2', [actionTaken, err.id]);
  return Response.json({ message: actionTaken });
}
