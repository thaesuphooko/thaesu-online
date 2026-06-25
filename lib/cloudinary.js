import { query } from './db.js';
import { v2 as cloudinary } from 'cloudinary';

// Get media rotation config
async function getMediaConfig() {
  const res = await query("SELECT value FROM config WHERE key = 'media_rotation'");
  return res.rows[0]?.value || { enabled: false, current_index: 0 };
}

// Update rotation index in DB
async function updateRotationIndex(newIndex) {
  await query(
    `UPDATE config SET value = jsonb_set(value, '{current_index}', $1), updated_at = NOW() WHERE key = 'media_rotation'`,
    [newIndex]
  );
}

// Select next Cloudinary account in round-robin
async function getNextCloudinaryAccount() {
  const accounts = [];
  for (let i = 1; i <= 10; i++) {
    const url = process.env[`CLOUDINARY_URL_${i}`];
    if (url) accounts.push(url);
  }
  if (accounts.length === 0) throw new Error('No Cloudinary accounts configured');

  const config = await getMediaConfig();
  const index = config.current_index % accounts.length;
  const accountURL = accounts[index];
  await updateRotationIndex(index + 1);
  return accountURL;
}

// Upload file using round-robin Cloudinary account
export async function uploadToCloudinary(filePath) {
  const config = await getMediaConfig();
  if (!config.enabled) throw new Error('Media rotation is disabled');

  const accountURL = await getNextCloudinaryAccount();
  // Parse Cloudinary URL (format: cloudinary://api_key:api_secret@cloud_name)
  const parsed = new URL(accountURL);
  const cloudName = parsed.host;
  const apiKey = parsed.username;
  const apiSecret = parsed.password;

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  const result = await cloudinary.uploader.upload(filePath, {
    folder: 'thaesu_online',
  });
  return { public_id: result.public_id, url: result.secure_url, account: cloudName };
}
