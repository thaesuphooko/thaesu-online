export async function pingSearchEngines() {
  const baseUrl = process.env.VERCEL_URL || 'http://localhost:3000';
  const sitemapUrl = `${baseUrl}/api/sitemap`;
  await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`).catch(() => {});
  await fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`).catch(() => {});
}
