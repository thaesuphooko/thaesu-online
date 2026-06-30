import { v2 as cloudinary } from 'cloudinary';
import { query } from './db.js';

let currentIndex = 0;
async function getNextAccount() {
  const accounts = [];
  for (let i = 1; i <= 10; i++) {
    const url = process.env[`CLOUDINARY_URL_${i}`];
    if (url) {
      const parsed = new URL(url);
      accounts.push({ cloud_name: parsed.host, api_key: parsed.username, api_secret: parsed.password });
    }
  }
  if (accounts.length === 0) throw new Error('No Cloudinary accounts');
  const config = await query("SELECT value FROM config WHERE key='media_rotation'");
  const idx = (config.rows[0]?.value?.current_index || 0) % accounts.length;
  await query("UPDATE config SET value = jsonb_set(value, '{current_index}', $1) WHERE key='media_rotation'", [idx + 1]);
  return accounts[idx];
}

export async function uploadToCloudinary(filePath) {
  const account = await getNextAccount();
  cloudinary.config(account);
  const result = await cloudinary.uploader.upload(filePath, { folder: 'thaesu_online' });
  return { public_id: result.public_id, url: result.secure_url, account: account.cloud_name };
}
