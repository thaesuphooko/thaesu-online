export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { testBotToken } from '@/lib/telegram';
export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { token, chat_id } = await request.json();
  if (!token || !chat_id) return Response.json({ error: 'token and chat_id required' }, { status: 400 });
  const result = await testBotToken(token, chat_id);
  return Response.json(result);
}
