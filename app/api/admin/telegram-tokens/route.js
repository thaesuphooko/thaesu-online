export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const tokensStr = process.env.TELEGRAM_BOT_TOKENS || '';
  const tokenList = tokensStr.split(',').map(s => s.trim()).filter(Boolean);
  const tokens = tokenList.map(t => ({
    full: t,
    prefix: t.substring(0, 12),
  }));
  return Response.json({ tokens });
}
