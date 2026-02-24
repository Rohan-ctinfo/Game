import { redis } from '../config/redis.js';
import { redisKeyMatchmaking } from '../redis/keys.js';

export async function enqueuePlayer({ gameType, userId, elo = 1000, region = 'global' }) {
  const key = redisKeyMatchmaking(gameType, region);
  const score = elo * 10000000 + Date.now();
  await redis.zAdd(key, [{ score, value: String(userId) }]);
  return { queued: true };
}

export async function dequeuePlayer({ gameType, userId, region = 'global' }) {
  const key = redisKeyMatchmaking(gameType, region);
  await redis.zRem(key, String(userId));
  return { dequeued: true };
}
