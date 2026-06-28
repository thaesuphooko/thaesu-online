export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
export async function POST(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.split(' ')[1];
  const user = verifyToken(token);
  const formData = await request.formData();
  const product_id = formData.get('product_id');
  const rating = formData.get('rating');
  const comment = formData.get('comment');
  const imageFile = formData.get('image');
  let imageUrl = null;
  if (imageFile) {
    // upload to Cloudinary or store locally (simplified)
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    // Mock save to /tmp
    const fs = require('fs');
    const path = '/tmp/review_' + Date.now() + '.jpg';
    fs.writeFileSync(path, buffer);
    imageUrl = path; // in production, upload to Cloudinary
  }
  await query('INSERT INTO reviews (product_id, user_id, rating, comment, image_url) VALUES ($1, $2, $3, $4, $5)', [product_id, user.id, rating, comment, imageUrl]);
  return Response.json({ message: 'Review saved' }, { status: 201 });
}
