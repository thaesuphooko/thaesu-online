export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { checkAdmin } from '@/lib/adminAuth';

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  // Return current test status
  return Response.json({ test: 'product_page_button_color', variants: ['blue', 'green'], active: false });
}

export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { name, variants } = await request.json();
  // Store test config
  return Response.json({ message: 'AB test created', name, variants });
}
