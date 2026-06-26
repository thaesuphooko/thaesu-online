export const dynamic = 'force-dynamic';
export async function GET() {
  const robots = `User-agent: *
Allow: /
Sitemap: ${process.env.VERCEL_URL || 'http://localhost:3000'}/api/sitemap
`;
  return new Response(robots, { headers: { 'Content-Type': 'text/plain' } });
}
