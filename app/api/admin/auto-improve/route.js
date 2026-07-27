import { requireAdmin } from '@/lib/api-wrapper';

export const POST = requireAdmin(async (req) => {
  const body = await req.json();
  
  if (!body.text || typeof body.text !== 'string') {
    return Response.json({ error: 'Text field required' }, { status: 400 });
  }
  
  if (body.text.length > 5000) {
    return Response.json({ error: 'Text too long (max 5000 chars)' }, { status: 400 });
  }
  
  // In production, call OpenAI / Claude API here
  const improved = body.text
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500) + ' (AI-enhanced)';
  
  return Response.json({ original: body.text, improved });
});
