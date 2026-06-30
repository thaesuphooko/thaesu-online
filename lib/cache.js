// Redis cache disabled – using database directly
export async function cacheGet(key) { return null; }
export async function cacheSet(key, value, ttl) { /* no-op */ }
export async function cacheDel(key) { /* no-op */ }
