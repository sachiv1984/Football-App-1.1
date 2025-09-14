import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

// Wrapper helpers
export const redisGet = async <T = any>(key: string): Promise<T | null> => {
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
};

export const redisSet = async (key: string, value: any, ttlSeconds?: number) => {
  const json = JSON.stringify(value);
  if (ttlSeconds) {
    await redis.setex(key, ttlSeconds, json);
  } else {
    await redis.set(key, json);
  }
};

export const redisDel = async (key: string) => {
  await redis.del(key);
};
