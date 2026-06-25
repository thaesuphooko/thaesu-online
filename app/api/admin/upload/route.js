import { checkAdmin } from '@/lib/adminAuth';
import { uploadToCloudinary } from '@/lib/cloudinary';

export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) return Response.json({ error: 'No file uploaded' }, { status: 400 });

    // Save temporarily (Termux /tmp)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const tempPath = `/tmp/upload_${Date.now()}.jpg`;
    require('fs').writeFileSync(tempPath, buffer);

    const result = await uploadToCloudinary(tempPath);
    require('fs').unlinkSync(tempPath);

    return Response.json({ message: 'Upload successful', ...result });
  } catch (err) {
    console.error('Upload error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
