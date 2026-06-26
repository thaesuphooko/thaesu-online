export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { checkAdmin } from '@/lib/adminAuth';

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  // Return list of campaigns (simplified)
  return Response.json([{ id: 1, name: 'Welcome Email', status: 'active' }]);
}

export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { template, subject, segment } = await request.json();
  // In a real app, send emails via Resend/SendGrid. Here we simulate.
  return Response.json({ message: 'Campaign launched', recipients: 0 });
}
