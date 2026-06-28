export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const color = searchParams.get('color');
  const size = searchParams.get('size');
  const brand = searchParams.get('brand');
  let conditions = ['is_active = true'];
  let params = [];
  if (color) { conditions.push('color = $' + (params.length+1)); params.push(color); }
  if (size)  { conditions.push('size = $' + (params.length+1)); params.push(size); }
  if (brand) { conditions.push('brand = $' + (params.length+1)); params.push(brand); }
  const res = await query('SELECT * FROM products WHERE ' + conditions.join(' AND ') + ' LIMIT 20', params);
  return Response.json(res.rows);
}
