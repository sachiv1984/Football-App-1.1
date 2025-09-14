// src/services/upstash/redis.ts - ENHANCED VERSION
import { Redis } from '@upstash/redis';

// Connection with timeout and retry configuration
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  retry: {
    retries: 3,
    backoff: (retryCount) => Math.min(1000 * Math.pow(2, retryCount), 5000)
  },
  automaticDeserialization: false // We'll handle JSON ourselves
});

// Circuit breaker pattern for Redis operations
class RedisCircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private readonly maxFailures = 5;
  private readonly recoveryTime = 30000; // 30 seconds

  isOpen(): boolean {
    if (this.failures >= this.maxFailures) {
      return Date.now() - this.lastFailureTime < this.recoveryTime;
    }
    return false;
  }

  onSuccess(): void {
    this.failures = 0;
  }

  onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
  }
}

const circuitBreaker = new RedisCircuitBreaker();

// Enhanced GET with comprehensive error handling
export const redisGet = async <T = any>(key: string): Promise<T | null> => {
  // Circuit breaker check
  if (circuitBreaker.isOpen()) {
    console.warn(`Redis circuit breaker is open, skipping GET for key: ${key}`);
    return null;
  }

  try {
    // Input validation
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid Redis key provided');
    }

    // Timeout wrapper
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Redis GET timeout')), 5000)
    );

    const getPromise = redis.get(key);
    const data = await Promise.race([getPromise, timeoutPromise]);

    // Handle different response types
    if (data === null || data === undefined) {
      return null;
    }

    // If it's already an object, return as-is (shouldn't happen with automaticDeserialization: false)
    if (typeof data === 'object') {
      circuitBreaker.onSuccess();
      return data as T;
    }

    // Parse JSON string
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        circuitBreaker.onSuccess();
        return parsed as T;
      } catch (parseError) {
        console.warn(`Failed to parse JSON for key ${key}:`, parseError);
        // Return the raw string if JSON parsing fails
        circuitBreaker.onSuccess();
        return data as unknown as T;
      }
    }

    // For other data types, return as-is
    circuitBreaker.onSuccess();
    return data as T;

  } catch (error) {
    circuitBreaker.onFailure();
    console.error(`Redis GET error for key ${key}:`, error);
    
    // Don't throw - return null to allow graceful fallback
    return null;
  }
};

// Enhanced SET with validation and error handling
export const redisSet = async (
  key: string, 
  value: any, 
  ttlSeconds?: number
): Promise<boolean> => {
  // Circuit breaker check
  if (circuitBreaker.isOpen()) {
    console.warn(`Redis circuit breaker is open, skipping SET for key: ${key}`);
    return false;
  }

  try {
    // Input validation
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid Redis key provided');
    }

    if (value === undefined) {
      console.warn(`Attempted to set undefined value for key: ${key}`);
      return false;
    }

    // Serialize value
    let serializedValue: string;
    try {
      serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
    } catch (serializeError) {
      console.error(`Failed to serialize value for key ${key}:`, serializeError);
      return false;
    }

    // Validate TTL
    if (ttlSeconds !== undefined) {
      if (typeof ttlSeconds !== 'number' || ttlSeconds <= 0 || !isFinite(ttlSeconds)) {
        console.warn(`Invalid TTL for key ${key}: ${ttlSeconds}, using no expiration`);
        ttlSeconds = undefined;
      }
    }

    // Timeout wrapper
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Redis SET timeout')), 10000)
    );

    let setPromise: Promise<any>;
    if (ttlSeconds) {
      setPromise = redis.set(key, serializedValue, { ex: Math.floor(ttlSeconds) });
    } else {
      setPromise = redis.set(key, serializedValue);
    }

    await Promise.race([setPromise, timeoutPromise]);
    
    circuitBreaker.onSuccess();
    return true;

  } catch (error) {
    circuitBreaker.onFailure();
    console.error(`Redis SET error for key ${key}:`, error);
    return false;
  }
};

// Enhanced DEL operation
export const redisDel = async (key: string): Promise<boolean> => {
  if (circuitBreaker.isOpen()) {
    console.warn(`Redis circuit breaker is open, skipping DEL for key: ${key}`);
    return false;
  }

  try {
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid Redis key provided');
    }

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Redis DEL timeout')), 5000)
    );

    const delPromise = redis.del(key);
    const result = await Promise.race([delPromise, timeoutPromise]);
    
    circuitBreaker.onSuccess();
    return result > 0;

  } catch (error) {
    circuitBreaker.onFailure();
    console.error(`Redis DEL error for key ${key}:`, error);
    return false;
  }
};

// Health check function
export const redisHealthCheck = async (): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
}> => {
  try {
    const start = Date.now();
    const testKey = `health:${Date.now()}`;
    const testValue = 'ping';

    // Test SET operation
    const setSuccess = await redisSet(testKey, testValue, 60);
    if (!setSuccess) {
      return { healthy: false, error: 'SET operation failed' };
    }

    // Test GET operation
    const getValue = await redisGet<string>(testKey);
    if (getValue !== testValue) {
      return { healthy: false, error: 'GET operation failed or value mismatch' };
    }

    // Test DEL operation
    const delSuccess = await redisDel(testKey);
    if (!delSuccess) {
      console.warn('DEL operation failed during health check');
    }

    const latency = Date.now() - start;
    return { healthy: true, latency };

  } catch (error) {
    return { 
      healthy: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// Batch operations for better performance
export const redisMultiGet = async <T = any>(keys: string[]): Promise<Array<T | null>> => {
  if (circuitBreaker.isOpen() || !keys.length) {
    return keys.map(() => null);
  }

  try {
    const validKeys = keys.filter(k => k && typeof k === 'string');
    if (validKeys.length !== keys.length) {
      console.warn('Some invalid keys provided to redisMultiGet');
    }

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Redis MGET timeout')), 10000)
    );

    const mgetPromise = redis.mget(...validKeys);
    const results = await Promise.race([mgetPromise, timeoutPromise]);

    circuitBreaker.onSuccess();

    return results.map((data, index) => {
      if (data === null || data === undefined) return null;
      
      try {
        return typeof data === 'string' ? JSON.parse(data) as T : data as T;
      } catch (parseError) {
        console.warn(`Failed to parse JSON for key ${validKeys[index]}:`, parseError);
        return data as unknown as T;
      }
    });

  } catch (error) {
    circuitBreaker.onFailure();
    console.error('Redis MGET error:', error);
    return keys.map(() => null);
  }
};

// Export circuit breaker status for monitoring
export const getRedisStatus = () => ({
  circuitBreakerOpen: circuitBreaker.isOpen(),
  failures: (circuitBreaker as any).failures,
  lastFailureTime: (circuitBreaker as any).lastFailureTime
});