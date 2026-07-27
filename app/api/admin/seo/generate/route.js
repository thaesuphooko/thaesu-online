import { requireAdmin } from '@/lib/api-wrapper';

export const POST = requireAdmin(async (req) => {
  const body = await req.json();
  if (!body.page || !body.content) {
    return Response.json({ error: 'page and content are required' }, { status: 400 });
  }

  // Placeholder for AI-based SEO generation (e.g., call OpenAI)
  const generated = {
    title: body.page.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' | Thaesu Online',
    description: body.content.slice(0, 160).replace(/<[^>]*>/g, ''),
    keywords: body.page.replace(/-/g, ', '),
  };

  return Response.json(generated);
});
