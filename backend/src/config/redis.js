import { createClient } from 'redis';
import { env } from './env.js';

export const redis = createClient({ url: env.redisUrl });

export async function connectRedis() {
  await redis.connect();
}
