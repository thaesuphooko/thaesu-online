import { NextResponse } from 'next/server';
import { verifyVendor } from '@/lib/vendorAuth';
import pool from '@/lib/db';

// GET – list notifications
export async function GET(request) {
  const vendor = await verifyVendor(request);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const unreadOnly = searchParams.get('unread') === 'true';

    let query = 'SELECT id, message, type, read, created_at FROM vendor_notifications WHERE user_id = $1';
    const params = [vendor.id];
    if (unreadOnly) query += ' AND read = false';
    query += ' ORDER BY created_at DESC LIMIT $2';
    params.push(limit);

    const result = await pool.query(query, params);
    const unreadCount = await pool.query(
      'SELECT COUNT(*)::int FROM vendor_notifications WHERE user_id = $1 AND read = false',
      [vendor.id]
    );

    return NextResponse.json({
      notifications: result.rows,
      unread_count: unreadCount.rows[0].count
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH – mark one notification as read
export async function PATCH(request) {
  const vendor = await verifyVendor(request);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing notification id' }, { status: 400 });

    await pool.query(
      'UPDATE vendor_notifications SET read = true WHERE id = $1 AND user_id = $2',
      [id, vendor.id]
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT – mark all as read
export async function PUT(request) {
  const vendor = await verifyVendor(request);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await pool.query(
      'UPDATE vendor_notifications SET read = true WHERE user_id = $1 AND read = false',
      [vendor.id]
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE – delete one or clear all
export async function DELETE(request) {
  const vendor = await verifyVendor(request);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const { id, clearAll } = body;

    if (clearAll) {
      await pool.query('DELETE FROM vendor_notifications WHERE user_id = $1', [vendor.id]);
    } else if (id) {
      await pool.query('DELETE FROM vendor_notifications WHERE id = $1 AND user_id = $2', [id, vendor.id]);
    } else {
      return NextResponse.json({ error: 'Missing id or clearAll flag' }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
