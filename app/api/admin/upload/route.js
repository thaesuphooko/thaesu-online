export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { uploadToCloudinary } from '@/lib/cloudinary';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) return Response.json({ error: 'No file uploaded' }, { status: 400 });

    // Use Termux home tmp directory (writable)
    const tmpDir = process.env.HOME + '/tmp';
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const tempPath = path.join(tmpDir, `upload_${Date.now()}.jpg`);
    fs.writeFileSync(tempPath, buffer);

    const result = await uploadToCloudinary(tempPath);
    fs.unlinkSync(tempPath); // clean up

    return Response.json({ message: 'Upload successful', ...result });
  } catch (err) {
    console.error('Upload error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
