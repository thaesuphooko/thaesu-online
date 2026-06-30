import { v2 as cloudinary } from 'cloudinary';
import { query } from './db.js';
import axios from 'axios';

// Get all available Cloudinary accounts from settings
async function getCloudinaryAccounts() {
  const res = await query("SELECT key, value FROM global_settings WHERE key LIKE 'CLOUDINARY_URL_%'");
  const accounts = [];
  for (let i = 1; i <= 10; i++) {
    const account = res.rows.find(r => r.key === `CLOUDINARY_URL_${i}`);
    if (account && account.value && account.value.startsWith('cloudinary://')) {
      const parsed = new URL(account.value);
      accounts.push({
        index: i,
        cloud_name: parsed.host,
        api_key: parsed.username,
        api_secret: parsed.password,
        url: account.value,
      });
    }
  }
  return accounts;
}

// Attempt upload with fallback to next account
export async function uploadImageToCloudinary(imageUrl) {
  const accounts = await getCloudinaryAccounts();
  if (accounts.length === 0) throw new Error('No Cloudinary accounts configured');

  // Download image first
  const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 });
  const buffer = Buffer.from(response.data);

  let lastError;
  for (const account of accounts) {
    try {
      cloudinary.config({
        cloud_name: account.cloud_name,
        api_key: account.api_key,
        api_secret: account.api_secret,
      });
      const result = await cloudinary.uploader.upload(
        `data:image/jpeg;base64,${buffer.toString('base64')}`,
        { folder: 'thaesu_products' }
      );
      return {
        public_id: result.public_id,
        secure_url: result.secure_url,
        account: account.cloud_name,
      };
    } catch (err) {
      lastError = err;
      // Continue to next account
      console.warn(`Cloudinary account ${account.index} failed, trying next...`);
    }
  }
  throw lastError || new Error('All Cloudinary accounts failed');
}
