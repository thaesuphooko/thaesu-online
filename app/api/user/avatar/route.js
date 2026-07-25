import { NextResponse } from 'next/server';
import { authenticateSync } from '@/lib/socialAuth';
import { query } from '@/lib/db';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({ url: process.env.CLOUDINARY_URL_1 });

export async function PUT(req) {
  const user = authenticateSync(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('avatar');
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'avatars', transformation: [{ width: 200, height: 200, crop: 'thumb', gravity: 'face' }] },
        (err, result) => err ? reject(err) : resolve(result)
      ).end(buffer);
    });

    await query('UPDATE users SET avatar_url = $1 WHERE id = $2', [result.secure_url, user.id]);
    return NextResponse.json({ avatarUrl: result.secure_url });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
