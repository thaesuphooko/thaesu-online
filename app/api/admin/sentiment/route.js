export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { checkAdmin } from '@/lib/adminAuth';

function analyzeSentiment(text) {
  const positiveWords = ['good', 'great', 'excellent', 'love', 'best', 'awesome', 'perfect'];
  const negativeWords = ['bad', 'worst', 'terrible', 'poor', 'hate', 'awful', 'horrible'];
  let score = 0;
  const words = text.toLowerCase().split(/\s+/);
  words.forEach(w => {
    if (positiveWords.includes(w)) score++;
    if (negativeWords.includes(w)) score--;
  });
  return score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral';
}

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const reviews = await query('SELECT * FROM reviews ORDER BY created_at DESC LIMIT 50');
  const analyzed = reviews.rows.map(r => ({ ...r, sentiment: analyzeSentiment(r.comment) }));
  return Response.json(analyzed);
}
