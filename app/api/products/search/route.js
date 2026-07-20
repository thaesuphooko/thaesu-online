import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const result = await query('SELECT id, title, price, slug FROM products WHERE title ILIKE $1 LIMIT 10', [`%${q}%`]);
  return NextResponse.json({ products: result.rows });
}
