let inMemoryState = {
  playing: false,
  volume: 0.5,
  speed: 1.0,
  currentTime: 0,
  url: '',
  accentColor: '#a855f7',
  title: 'Thaesu Radio',
  enabled: true,
  visualizerType: 'Status Bar',
  visualizerAlign: 'left',
  visualizerOffsetY: 0,
  visualizerOffsetX: 0,
};

async function getRedisClient() {
  try {
    const { Redis } = await import('@upstash/redis');
    return new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  } catch (e) { return null; }
}

export async function getMusicState() {
  const redis = await getRedisClient();
  if (redis) {
    const s = await redis.get('music:state');
    if (s) return s;
  }
  return { ...inMemoryState };
}

export async function updateMusicState(newState) {
  inMemoryState = { ...inMemoryState, ...newState };
  const redis = await getRedisClient();
  if (redis) await redis.set('music:state', inMemoryState);
  return inMemoryState;
}
