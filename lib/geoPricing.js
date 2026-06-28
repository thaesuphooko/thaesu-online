import { query } from './db.js';
export async function getProductPrice(productId, userIp) {
  const res = await query('SELECT price FROM products WHERE id = $1', [productId]);
  const basePrice = parseFloat(res.rows[0].price);
  if (userIp.startsWith('192.168') || userIp.startsWith('10.')) {
    return basePrice * 1.05;
  }
  return basePrice;
}
