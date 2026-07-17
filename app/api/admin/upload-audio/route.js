import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
export async function POST(req) {
  const fd = await req.formData();
  const file = fd.get('file');
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  const name = Date.now() + '-' + file.name.replace(/\s/g, '_');
  await writeFile(path.join(process.cwd(), 'public', 'audio', name), buf);
  return NextResponse.json({ audioUrl: '/audio/' + name });
}
