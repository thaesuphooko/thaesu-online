import { requireAdmin } from '@/lib/api-wrapper';
import { streamUploadCloudinary, validateMimeType, ALLOWED_IMAGE_TYPES } from '@/lib/upload-stream';

export const POST = requireAdmin(async (req) => {
  const contentType = req.headers.get('content-type') || '';
  
  if (!contentType.includes('multipart/form-data')) {
    return Response.json({ error: 'Unsupported Media Type. Use multipart/form-data.' }, { status: 415 });
  }
  
  try {
    const form = await req.formData();
    const file = form.get('file');
    
    if (!file || !file.name) {
      return Response.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    if (!validateMimeType(file.type, ALLOWED_IMAGE_TYPES)) {
      return Response.json({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' }, { status: 400 });
    }
    
    if (file.size > 10 * 1024 * 1024) {
      return Response.json({ error: 'File too large. Max 10MB.' }, { status: 400 });
    }
    
    // Stream the file buffer to Cloudinary (prevents memory buffering)
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url, public_id } = await streamUploadCloudinary(buffer, {
      folder: 'thaesu-uploads/images',
      resource_type: 'image'
    });
    
    return Response.json({ url, public_id }, { status: 201 });
  } catch (error) {
    console.error('Upload error:', error);
    return Response.json({ error: 'Upload failed' }, { status: 500 });
  }
});
