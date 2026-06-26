import { Redis } from '@upstash/redis';

let redis;

function getRedis() {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_URL,
      token: process.env.UPSTASH_REDIS_TOKEN,
    });
  }
  return redis;
}

export async function cacheGet(key) {
  try {
    const client = getRedis();
    return await client.get(key);
  } catch (err) {
    console.warn('Redis get error:', err.message);
    return null;
  }
}

export async function cacheSet(key, value, ttlSeconds = 60) {
  try {
    const client = getRedis();
    if (ttlSeconds > 0) {
      await client.set(key, value, { ex: ttlSeconds });
    } else {
      await client.set(key, value);
    }
  } catch (err) {
    console.warn('Redis set error:', err.message);
  }
}

export async function cacheDel(key) {
  try {
    const client = getRedis();
    await client.del(key);
  } catch (err) {
    console.warn('Redis del error:', err.message);
  }
}
