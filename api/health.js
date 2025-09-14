// api/health.js - Health Check Endpoint
import { redisHealthCheck, getRedisStatus } from '../services/upstash/redis.ts';

// Test external API connectivity
async function checkExternalAPI() {
  try {
    const API_TOKEN = process.env.FOOTBALL_DATA_TOKEN || process.env.REACT_APP_FOOTBALL_DATA_TOKEN;
    if (!API_TOKEN) {
      return { healthy: false, error: 'API token not configured' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const start = Date.now();
    
    try {
      const response = await fetch('https://api.football-data.org/v4/competitions/PL', {
        headers: {
          'X-Auth-Token': API_TOKEN,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - start;

      if (response.ok) {
        return { healthy: true, latency };
      } else {
        return { 
          healthy: false, 
          error: `HTTP ${response.status}`,
          latency 
        };
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }

  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { healthy: false, error: 'Timeout after 5s' };
      }
      return { healthy: false, error: error.message };
    }
    return { healthy: false, error: 'Unknown error' };
  }
}

// Analyze memory usage
function checkMemoryHealth() {
  const usage = process.memoryUsage();
  
  // Calculate health score based on heap usage (0-100)
  const heapUsedMB = usage.heapUsed / 1024 / 1024;
  const heapTotalMB = usage.heapTotal / 1024 / 1024;
  const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100;
  
  let healthScore = 100;
  
  // Deduct points for high memory usage
  if (heapUsagePercent > 90) healthScore -= 40;
  else if (heapUsagePercent > 75) healthScore -= 25;
  else if (heapUsagePercent > 60) healthScore -= 10;
  
  // Deduct points for high absolute usage (over 512MB)
  if (heapUsedMB > 512) healthScore -= 20;
  else if (heapUsedMB > 256) healthScore -= 10;
  
  return {
    usage: {
      ...usage,
      heapUsedMB: Math.round(heapUsedMB * 100) / 100,
      heapTotalMB: Math.round(heapTotalMB * 100) / 100,
      heapUsagePercent: Math.round(heapUsagePercent * 100) / 100
    },
    healthScore: Math.max(0, healthScore)
  };
}

export default async function handler(req, res) {
  const startTime = Date.now();
  
  try {
    // Run all health checks in parallel
    const [redisHealth, externalAPIHealth, memoryHealth] = await Promise.allSettled([
      redisHealthCheck(),
      checkExternalAPI(),
      Promise.resolve(checkMemoryHealth())
    ]);

    // Extract results with fallbacks
    const redisResult = redisHealth.status === 'fulfilled' 
      ? redisHealth.value 
      : { healthy: false, error: 'Health check failed' };

    const apiResult = externalAPIHealth.status === 'fulfilled'
      ? externalAPIHealth.value
      : { healthy: false, error: 'Health check failed' };

    const memoryResult = memoryHealth.status === 'fulfilled'
      ? memoryHealth.value
      : { usage: process.memoryUsage(), healthScore: 0 };

    // Get Redis circuit breaker status
    const redisStatus = getRedisStatus();

    // Determine overall health status
    let overallStatus = 'healthy';
    
    if (!redisResult.healthy || !apiResult.healthy) {
      overallStatus = 'unhealthy';
    } else if (
      redisStatus.circuitBreakerOpen || 
      memoryResult.healthScore < 50 ||
      (redisResult.latency && redisResult.latency > 2000) ||
      (apiResult.latency && apiResult.latency > 5000)
    ) {
      overallStatus = 'degraded';
    }

    const result = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        redis: {
          ...redisResult,
          circuitBreakerOpen: redisStatus.circuitBreakerOpen
        },
        externalAPI: apiResult,
        memory: memoryResult
      },
      version: process.env.npm_package_version || 'unknown',
      environment: process.env.NODE_ENV || 'unknown'
    };

    // Set appropriate HTTP status
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;

    // Cache headers for health checks
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('x-health-check-duration', `${Date.now() - startTime}ms`);
    
    return res.status(httpStatus).json(result);

  } catch (error) {
    console.error('Health check error:', error);
    
    const errorResult = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        redis: { 
          healthy: false, 
          error: 'Health check failed',
          circuitBreakerOpen: false
        },
        externalAPI: { 
          healthy: false, 
          error: 'Health check failed' 
        },
        memory: {
          usage: process.memoryUsage(),
          healthScore: 0
        }
      },
      version: 'unknown',
      environment: process.env.NODE_ENV || 'unknown'
    };

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('x-health-check-duration', `${Date.now() - startTime}ms`);
    
    return res.status(500).json(errorResult);
  }
}