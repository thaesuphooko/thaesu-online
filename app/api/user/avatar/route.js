import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function PUT(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.split(' ')[1];
  const user = verifyToken(token);
  if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('avatar');
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext = file.name.split('.').pop().toLowerCase();
  const filename = `avatar_${user.id}_${Date.now()}.${ext}`;
  const filePath = path.join(process.cwd(), 'public', 'avatars', filename);
  await writeFile(filePath, buffer);

  const avatarUrl = `/avatars/${filename}`;
  await query('UPDATE users SET avatar_url = $1 WHERE id = $2', [avatarUrl, user.id]);

  return NextResponse.json({ avatarUrl });
}
