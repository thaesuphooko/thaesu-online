import { query } from './db.js';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_1 || process.env.TELEGRAM_BOT_TOKENS?.split(',')[0];
const TELEGRAM_USER_ID = process.env.TELEGRAM_USER_ID;

async function sendAlert(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_USER_ID) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_USER_ID, text: message }),
  }).catch(() => {});
}

async function getAIFixSuggestion(errorCode, errorMessage, module) {
  if (!DEEPSEEK_API_KEY) return 'No AI key';
  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{
          role: 'user',
          content: `Given the following error from a Next.js marketplace website:\nCode: ${errorCode}\nMessage: ${errorMessage}\nModule: ${module}\n\nSuggest a safe, single command or action that can be performed to fix or mitigate this error. Reply with only the action text, no explanations. Examples: "Restart server", "Clear cache", "Check database connection", "Update environment variable X".`,
        }],
        max_tokens: 50,
      }),
    });
    const data = await response.json();
    return data.choices[0]?.message?.content || 'No suggestion';
  } catch (e) {
    return 'AI unavailable';
  }
}

async function run() {
  const newErrors = await query(
    "SELECT * FROM error_logs WHERE action_taken IS NULL AND created_at > NOW() - INTERVAL '5 minutes'"
  );
  for (const err of newErrors.rows) {
    const aiSuggestion = await getAIFixSuggestion(err.error_code, err.error_message, err.module);
    let action = `AI suggests: ${aiSuggestion}`;

    // Take automatic action based on AI suggestion or known patterns
    if (aiSuggestion.includes('Restart') || err.error_message.includes('ECONNREFUSED')) {
      const { execSync } = await import('child_process');
      try { execSync('pm2 restart thaesu'); action += ' | Restarted thaesu'; } catch {}
    } else if (aiSuggestion.includes('Clear cache') || err.error_message.includes('Memory')) {
      const { execSync } = await import('child_process');
      try { execSync('rm -rf .next node_modules/.cache'); action += ' | Cleared cache'; } catch {}
    }

    await query('UPDATE error_logs SET action_taken = $1 WHERE id = $2', [action, err.id]);
    await sendAlert(`🤖 Error Fixed\nCode: ${err.error_code}\n${action}`);
  }
}

run().catch(console.error).then(() => process.exit(0));
