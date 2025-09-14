// src/services/upstash/redis.ts

import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Generic GET
export const redisGet = async <T = any>(key: string): Promise<T | null> => {
  const data = await redis.get(key);

  if (!data || typeof data !== 'string') return null;

  return JSON.parse(data) as T;
};

// SET with optional TTL in seconds
export const redisSet = async (key: string, value: any, ttlSeconds?: number) => {
  const str = JSON.stringify(value);
  if (ttlSeconds) {
    await redis.set(key, str, { ex: ttlSeconds });
  } else {
    await redis.set(key, str);
  }
};
