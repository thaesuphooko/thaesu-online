import { NextResponse } from 'next/server';
import { readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';
import { requireAdmin } from '@/lib/api-wrapper';

// Helper to extract data from HTML report
function parseReportHtml(html) {
  const metrics = {};
  // Extract duration
  const durationMatch = html.match(/Duration<\/div><div class="metric-value"[^>]*>(\d+)ms/);
  if (durationMatch) metrics.durationMs = parseInt(durationMatch[1]);

  // Extract inactive users / cancelled orders count
  const countMatch = html.match(/Inactive Users<\/div><div class="metric-value"[^>]*>(\d+)/) ||
                     html.match(/Orders Cancelled<\/div><div class="metric-value"[^>]*>(\d+)/);
  if (countMatch) metrics.count = parseInt(countMatch[1]);

  // Detect success/failure
  const success = !html.includes('❌ Failed') && !html.includes('class="error"');

  return { success, metrics };
}

export const GET = requireAdmin(async (req) => {
  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = (page - 1) * limit;

    const reportDir = join(process.cwd(), 'cron-reports');
    let files = [];
    try {
      files = readdirSync(reportDir).filter(f => f.endsWith('.html'));
    } catch (e) {
      // If directory doesn't exist, return empty list
      return NextResponse.json({ reports: [], total: 0, page, limit, totalPages: 0 });
    }

    const allReports = files.map(f => {
      const filePath = join(reportDir, f);
      const stats = statSync(filePath);
      const type = f.includes('engage') ? 'engage' : 'order';
      let success = true;
      let metrics = {};

      try {
        const html = readFileSync(filePath, 'utf8');
        const parsed = parseReportHtml(html);
        success = parsed.success;
        metrics = parsed.metrics;
      } catch (e) {
        success = false;
      }

      return {
        filename: f,
        timestamp: stats.mtime.toISOString(),
        size: stats.size,
        type,
        success,
        metrics,
      };
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const total = allReports.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedReports = allReports.slice(offset, offset + limit);

    return NextResponse.json(
      {
        reports: paginatedReports,
        total,
        page,
        limit,
        totalPages,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('Cron reports API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
