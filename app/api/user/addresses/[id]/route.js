import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/socialAuth';
import { query } from '@/lib/db';

export async function PUT(req, { params }) {
  const user = await authenticate(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  try {
    const body = await req.json();
    const {
      label, full_name, phone, region, district, township, ward,
      manual_address, is_default, latitude, longitude
    } = body;

    if (is_default) {
      await query('UPDATE addresses SET is_default = false WHERE user_id = $1', [user.id]);
    }

    const streetValue = manual_address || '';
    const cityValue = township || '';

    const { rows } = await query(
      `UPDATE addresses SET
        label=$1, full_name=$2, phone=$3, street=$4, city=$5,
        region=$6, district=$7, township=$8, ward=$9,
        manual_address=$10, is_default=$11, latitude=$12, longitude=$13
       WHERE id=$14 AND user_id=$15 RETURNING *`,
      [
        label, full_name, phone, streetValue, cityValue,
        region || null, district || null, township || null, ward || null,
        manual_address || '', is_default || false,
        latitude || null, longitude || null,
        id, user.id
      ]
    );
    return NextResponse.json({ address: rows[0] });
  } catch (error) {
    console.error('Address PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const user = await authenticate(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  try {
    await query('DELETE FROM addresses WHERE id=$1 AND user_id=$2', [id, user.id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Address DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
