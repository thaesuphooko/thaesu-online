import { requireAdmin } from '@/lib/api-wrapper';
import { streamUploadCloudinary, validateMimeType, ALLOWED_AUDIO_TYPES } from '@/lib/upload-stream';

export const POST = requireAdmin(async (req) => {
  const contentType = req.headers.get('content-type') || '';
  
  if (!contentType.includes('multipart/form-data')) {
    return Response.json({ error: 'Unsupported Media Type. Use multipart/form-data.' }, { status: 415 });
  }
  
  try {
    const form = await req.formData();
    const file = form.get('audio');
    
    if (!file) {
      return Response.json({ error: 'No audio file uploaded' }, { status: 400 });
    }
    
    if (!validateMimeType(file.type, ALLOWED_AUDIO_TYPES)) {
      return Response.json({ error: 'Invalid audio type. Allowed: MP3, WAV, OGG, MP4' }, { status: 400 });
    }
    
    if (file.size > 50 * 1024 * 1024) {
      return Response.json({ error: 'File too large. Max 50MB.' }, { status: 400 });
    }
    
    // Stream to Cloudinary
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url, public_id } = await streamUploadCloudinary(buffer, {
      folder: 'thaesu-uploads/audio',
      resource_type: 'video'
    });
    
    return Response.json({ url, public_id }, { status: 201 });
  } catch (error) {
    console.error('Audio upload error:', error);
    return Response.json({ error: 'Upload failed' }, { status: 500 });
  }
});
