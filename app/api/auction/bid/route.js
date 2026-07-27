import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticate } from '@/lib/socialAuth';

export async function POST(req) {
  const user = await authenticate(req);
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { product_id, bid_amount } = await req.json();
  if (!product_id || !bid_amount) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  try {
    const product = await query(
      'SELECT id, auction_current_bid, auction_end_time, auction_start_price FROM products WHERE id = $1 AND is_auction = true',
      [product_id]
    );
    if (product.rows.length === 0) return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    const p = product.rows[0];
    if (new Date(p.auction_end_time) < new Date()) return NextResponse.json({ error: 'Auction ended' }, { status: 400 });
    const minBid = Math.max(p.auction_current_bid || p.auction_start_price, p.auction_start_price);
    if (bid_amount <= minBid) return NextResponse.json({ error: 'Bid must be higher than current bid' }, { status: 400 });

    // Record bid and update product
    await query('INSERT INTO auction_bids (product_id, user_id, bid_amount) VALUES ($1,$2,$3)', [product_id, user.id, bid_amount]);
    await query('UPDATE products SET auction_current_bid = $1, auction_bidder_id = $2 WHERE id = $3', [bid_amount, user.id, product_id]);

    return NextResponse.json({ success: true, current_bid: bid_amount });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
