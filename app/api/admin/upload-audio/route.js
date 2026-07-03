import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(req) {
  const formData = await req.formData();
  const file = formData.get('file');
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filename = Date.now() + '-' + file.name;
  const filePath = path.join(process.cwd(), 'public', 'audio', filename);
  await writeFile(filePath, buffer);
  return NextResponse.json({ audioUrl: '/audio/' + filename });
}
