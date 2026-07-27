import {
  uploadBufferToCloudinary,
  uploadStreamToCloudinary,
  uploadToCloudinary,  // fallback for local paths
  validateMimeType,
  validateFileSize,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_AUDIO_TYPES
} from '@/lib/cloudinary';

/**
 * Premium Ultra Pro Max Upload Handler
 * -------------------------------------
 * Automatically detects input type (Buffer, ReadableStream, or file path)
 * and routes to the appropriate Cloudinary upload function.
 *
 * Features:
 * - Automatic MIME detection & validation
 * - File size enforcement
 * - Atomic account rotation
 * - Exponential retry
 * - Admin Telegram notifications on critical failures
 */
export async function streamUploadCloudinary(input, options = {}) {
  // 1. Validate input
  if (!input) {
    throw new Error('[UploadStream] No input provided');
  }

  // 2. If it's a ReadableStream, use stream upload
  if (typeof input === 'object' && typeof input.pipe === 'function') {
    return uploadStreamToCloudinary(input, options);
  }

  // 3. If it's a Buffer or Uint8Array, use buffer upload
  if (Buffer.isBuffer(input) || input instanceof Uint8Array) {
    return uploadBufferToCloudinary(input, options);
  }

  // 4. If it's a string (likely a local file path), use legacy file upload
  if (typeof input === 'string') {
    return uploadToCloudinary(input, options);
  }

  throw new Error('[UploadStream] Unsupported input type. Expected Buffer, Stream, or file path.');
}

/**
 * Validate uploaded file before processing.
 * Checks MIME type and file size.
 */
export function validateUpload(file, maxSizeMB = 10) {
  if (!file) throw new Error('No file provided');

  // MIME check
  const contentType = file.type || '';
  const isImage = validateMimeType(contentType, ALLOWED_IMAGE_TYPES);
  const isAudio = validateMimeType(contentType, ALLOWED_AUDIO_TYPES);

  if (!isImage && !isAudio) {
    throw new Error(`Unsupported file type: ${contentType}. Allowed: images or audio files.`);
  }

  // Size check
  validateFileSize(file, maxSizeMB);

  return true;
}

export { validateMimeType, ALLOWED_IMAGE_TYPES, ALLOWED_AUDIO_TYPES };
