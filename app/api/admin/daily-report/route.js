export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { generateDailyReport } from '@/lib/dailyReport';
export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const report = await generateDailyReport();
  return Response.json(report);
}
