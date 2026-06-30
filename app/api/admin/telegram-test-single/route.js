export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';

export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { token, chat_id } = await request.json();
  if (!token || !chat_id) return Response.json({ error: 'Token and chat_id required' }, { status: 400 });
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat_id,
        text: '✅ Thaesu Premium Omnipotent System: ချိတ်ဆက်မှု အောင်မြင်ပါသည်။',
      }),
    });
    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    return Response.json({ ok: false, error: err.message });
  }
}
