import { NextResponse } from 'next/server';
import { verifyAdminHash } from '@/lib/adminAuth';
import pool from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const productId = formData.get('productId');

    if (!file || !productId) {
      return NextResponse.json({ error: 'Missing file or productId' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF, AVIF' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Max 10MB' }, { status: 400 });
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${uuidv4()}.${ext}`;
    
    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
    await mkdir(uploadDir, { recursive: true });
    
    // Write file
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);
    
    // Construct URL
    const imageUrl = `/uploads/products/${filename}`;

    // Update product's media column (JSONB array)
    const { rows: existingProduct } = await pool.query(
      'SELECT media FROM products WHERE id = $1',
      [productId]
    );

    if (!existingProduct.length) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const existingMedia = existingProduct[0].media || [];
    const updatedMedia = [...existingMedia, { url: imageUrl, type: 'image', created_at: new Date().toISOString() }];

    await pool.query(
      'UPDATE products SET media = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(updatedMedia), productId]
    );

    return NextResponse.json({ 
      success: true, 
      url: imageUrl,
      media: updatedMedia 
    });
  } catch (error) {
    console.error('Image Upload Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
