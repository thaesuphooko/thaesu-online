import { NextResponse } from 'next/server';
import { verifyVendor } from '@/lib/vendorAuth';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary using existing environment variable
cloudinary.config({
  url: process.env.CLOUDINARY_URL_1, // or CLOUDINARY_URL_2 etc. – using the first one
});

export async function POST(request) {
  const vendor = await verifyVendor(request);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const productId = formData.get('productId');
    if (!file || !productId) return NextResponse.json({ error: 'Missing file or productId' }, { status: 400 });

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'vendor-products' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(buffer);
    });

    // Update product media using the shared pool
    const { default: pool } = await import('@/lib/db');
    await pool.query(
      'UPDATE products SET media = jsonb_set(COALESCE(media, \'[]\'), \'{0}\', $1) WHERE id = $2 AND vendor_id = $3',
      [JSON.stringify({ url: result.secure_url, type: 'image' }), productId, vendor.id]
    );

    return NextResponse.json({ url: result.secure_url });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
