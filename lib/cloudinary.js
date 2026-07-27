import { v2 as cloudinary } from 'cloudinary';
import { query } from './db.js';
import crypto from 'crypto';

// ──────────────────────────────────────────────────
// 1. Account Loader with Environment Validation
// ──────────────────────────────────────────────────
function loadAccounts() {
  const accounts = [];
  for (let i = 1; i <= 10; i++) {
    const url = process.env[`CLOUDINARY_URL_${i}`];
    if (!url) continue;
    try {
      const parsed = new URL(url);
      accounts.push({
        cloud_name: parsed.host,
        api_key: parsed.username,
        api_secret: parsed.password,
        url: url  // keep original for reference
      });
    } catch (e) {
      console.error(`[Cloudinary] Invalid CLOUDINARY_URL_${i}:`, e.message);
    }
  }
  if (accounts.length === 0) {
    throw new Error('[Cloudinary] No valid accounts found. Set CLOUDINARY_URL_1 .. 10');
  }
  return accounts;
}

// ──────────────────────────────────────────────────
// 2. Atomic Round‑Robin Account Selector (PostgreSQL)
// ──────────────────────────────────────────────────
async function getNextAccountIndex(accountsCount) {
  const { rows } = await query(
    `UPDATE config
     SET value = jsonb_set(
       COALESCE(value, '{"current_index":0}'::jsonb),
       '{current_index}',
       to_jsonb((COALESCE((value->>'current_index')::int, 0) + 1) % $1)
     )
     WHERE key = 'media_rotation'
     RETURNING COALESCE((value->>'current_index')::int, 0) AS idx`,
    [accountsCount]
  );
  if (rows.length === 0) {
    // First time initialization
    await query(
      `INSERT INTO config (key, value)
       VALUES ('media_rotation', jsonb_build_object('current_index', 1 % $1))
       ON CONFLICT (key) DO UPDATE SET value = jsonb_build_object('current_index', 1 % $1)`,
      [accountsCount]
    );
    return 0;
  }
  return rows[0].idx;
}

// ──────────────────────────────────────────────────
// 3. Exponential Backoff with Jitter Retry
// ──────────────────────────────────────────────────
async function withRetry(fn, { maxRetries = 3, baseDelayMs = 500 } = {}) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = baseDelayMs * 2 ** (attempt - 1) + Math.random() * 300;
      console.warn(`[Cloudinary] Retry ${attempt}/${maxRetries} after ${delay.toFixed(0)}ms: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// ──────────────────────────────────────────────────
// 4. Telegram Notification (shared helper)
// ──────────────────────────────────────────────────
async function notifyAdmins(text) {
  try {
    const { rows: [config] } = await query('SELECT bot_token, chat_id FROM telegram_configs WHERE is_active = true ORDER BY created_at DESC LIMIT 1');
    if (!config) return;
    await fetch(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chat_id,
        text: text,
        parse_mode: 'HTML'
      })
    });
  } catch (e) {
    console.error('[Cloudinary] Telegram notification failed:', e.message);
  }
}

// ──────────────────────────────────────────────────
// 5. Core Upload Method (File Path)
// ──────────────────────────────────────────────────
export async function uploadToCloudinary(filePath, options = {}) {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('[Cloudinary] Invalid file path');
  }

  const accounts = loadAccounts();
  const idx = await getNextAccountIndex(accounts.length);
  const account = accounts[idx];

  // Configure SDK
  cloudinary.config({
    cloud_name: account.cloud_name,
    api_key: account.api_key,
    api_secret: account.api_secret,
    secure: true,
  });

  // Default transformations for images (auto quality, format)
  const defaults = {
    folder: 'thaesu_online',
    resource_type: 'auto',
    overwrite: false,
    unique_filename: true,
    ...options,
    // Auto optimization for images
    ...(options.resource_type !== 'video' && options.resource_type !== 'raw' ? {
      quality: 'auto',
      fetch_format: 'auto',
    } : {}),
  };

  const startTime = Date.now();
  try {
    const result = await withRetry(() => cloudinary.uploader.upload(filePath, defaults));
    const duration = Date.now() - startTime;

    // Notify on success (only for large files or important uploads)
    if (result.bytes > 1024 * 1024) {
      notifyAdmins(`✅ Upload success\n📁 ${result.public_id}\n☁️ ${account.cloud_name}\n⏱ ${duration}ms`);
    }

    return {
      public_id: result.public_id,
      url: result.secure_url,
      account: account.cloud_name,
      size: result.bytes,
      duration,
    };
  } catch (error) {
    notifyAdmins(`❌ Upload failed\n📄 ${filePath}\n☁️ ${account.cloud_name}\n⚠️ ${error.message}`);
    throw error;
  }
}

// ──────────────────────────────────────────────────
// 6. Buffer Upload (No Temp Files)
// ──────────────────────────────────────────────────
export async function uploadBufferToCloudinary(buffer, options = {}) {
  if (!Buffer.isBuffer(buffer) && !(buffer instanceof Uint8Array)) {
    throw new Error('[Cloudinary] Buffer or Uint8Array required');
  }

  const accounts = loadAccounts();
  const idx = await getNextAccountIndex(accounts.length);
  const account = accounts[idx];

  cloudinary.config({
    cloud_name: account.cloud_name,
    api_key: account.api_key,
    api_secret: account.api_secret,
    secure: true,
  });

  const defaults = {
    folder: 'thaesu_online',
    resource_type: 'auto',
    ...options,
    ...(options.resource_type !== 'video' && options.resource_type !== 'raw' ? {
      quality: 'auto',
      fetch_format: 'auto',
    } : {}),
  };

  const startTime = Date.now();
  try {
    const result = await withRetry(
      () =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(defaults, (error, result) => {
            if (error) return reject(error);
            resolve(result);
          });
          stream.end(Buffer.from(buffer));
        })
    );
    const duration = Date.now() - startTime;

    if (result.bytes > 1024 * 1024) {
      notifyAdmins(`✅ Buffer upload\n📁 ${result.public_id}\n☁️ ${account.cloud_name}\n⏱ ${duration}ms`);
    }

    return {
      public_id: result.public_id,
      url: result.secure_url,
      account: account.cloud_name,
      size: result.bytes,
      duration,
    };
  } catch (error) {
    notifyAdmins(`❌ Buffer upload failed\n☁️ ${account.cloud_name}\n⚠️ ${error.message}`);
    throw error;
  }
}

// ──────────────────────────────────────────────────
// 7. Stream Upload (Direct Pipe)
// ──────────────────────────────────────────────────
export async function uploadStreamToCloudinary(readableStream, options = {}) {
  if (!readableStream || typeof readableStream.pipe !== 'function') {
    throw new Error('[Cloudinary] Readable stream required');
  }

  const accounts = loadAccounts();
  const idx = await getNextAccountIndex(accounts.length);
  const account = accounts[idx];

  cloudinary.config({
    cloud_name: account.cloud_name,
    api_key: account.api_key,
    api_secret: account.api_secret,
    secure: true,
  });

  const defaults = {
    folder: 'thaesu_online',
    resource_type: 'auto',
    ...options,
    ...(options.resource_type !== 'video' && options.resource_type !== 'raw' ? {
      quality: 'auto',
      fetch_format: 'auto',
    } : {}),
  };

  const startTime = Date.now();
  try {
    const result = await withRetry(
      () =>
        new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(defaults, (error, result) => {
            if (error) return reject(error);
            resolve(result);
          });
          readableStream.pipe(uploadStream);
        })
    );
    const duration = Date.now() - startTime;

    if (result.bytes > 1024 * 1024) {
      notifyAdmins(`✅ Stream upload\n📁 ${result.public_id}\n☁️ ${account.cloud_name}\n⏱ ${duration}ms`);
    }

    return {
      public_id: result.public_id,
      url: result.secure_url,
      account: account.cloud_name,
      size: result.bytes,
      duration,
    };
  } catch (error) {
    notifyAdmins(`❌ Stream upload failed\n☁️ ${account.cloud_name}\n⚠️ ${error.message}`);
    throw error;
  }
}

// ──────────────────────────────────────────────────
// 8. MIME Type & File Validation Utilities
// ──────────────────────────────────────────────────
export function validateMimeType(contentType, allowedTypes = []) {
  if (!contentType) return false;
  return allowedTypes.some(type => contentType.toLowerCase().includes(type.toLowerCase()));
}

export function validateFileSize(file, maxSizeMB = 10) {
  const sizeMB = (file.size || 0) / (1024 * 1024);
  if (sizeMB > maxSizeMB) {
    throw new Error(`File too large (${sizeMB.toFixed(1)}MB). Maximum: ${maxSizeMB}MB.`);
  }
  return true;
}

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
export const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm'];
