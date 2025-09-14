// api/debug.js - Debug Information Endpoint
import { redisGet, getRedisStatus } from '../services/upstash/redis.js';

// Capture recent console errors (simple in-memory store)
const recentErrors = [];
const originalConsoleError = console.error;

// Override console.error to capture errors
console.error = (...args) => {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  
  recentErrors.push({
    timestamp: new Date().toISOString(),
    message: message.substring(0, 500) // Limit length
  });
  
  // Keep only last 10 errors
  if (recentErrors.length > 10) {
    recentErrors.shift();
  }
  
  originalConsoleError(...args);
};

export default async function handler(req, res) {
  try {
    // Only allow in development or with special header
    const isDevelopment = process.env.NODE_ENV === 'development';
    const hasDebugHeader = req.headers['x-debug-key'] === process.env.DEBUG_KEY;
    
    if (!isDevelopment && !hasDebugHeader) {
      return res.status(403).json({ 
        error: 'Debug endpoint not available' 
      });
    }

    // Gather environment info
    const memory = process.memoryUsage();
    const heapUsedMB = memory.heapUsed / 1024 / 1024;
    const heapTotalMB = memory.heapTotal / 1024 / 1024;
    const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100;

    // Check configuration
    const configuration = {
      hasFootballToken: !!(process.env.FOOTBALL_DATA_TOKEN || process.env.REACT_APP_FOOTBALL_DATA_TOKEN),
      hasRedisUrl: !!process.env.UPSTASH_REDIS_REST_URL,
      hasRedisToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
      nodeEnv: process.env.NODE_ENV || 'unknown'
    };

    // Get Redis status and cache info
    const redisStatus = getRedisStatus();
    
    let cacheStats = {};
    try {
      const [matchesCache, standingsCache] = await Promise.all([
        redisGet('matches:pl'),
        redisGet('standings:pl')
      ]);
      
      cacheStats = {
        matches: matchesCache ? {
          hasData: !!matchesCache.data,
          dataLength: Array.isArray(matchesCache.data) ? matchesCache.data.length : 0,
          timestamp: matchesCache.timestamp,
          age: matchesCache.timestamp ? Date.now() - matchesCache.timestamp : null,
          etag: matchesCache.etag?.substring(0, 8) + '...'
        } : null,
        standings: standingsCache ? {
          hasData: !!standingsCache.data,
          dataLength: Array.isArray(standingsCache.data) ? standingsCache.data.length : 0,
          timestamp: standingsCache.timestamp,
          age: standingsCache.timestamp ? Date.now() - standingsCache.timestamp : null,
          etag: standingsCache.etag?.substring(0, 8) + '...'
        } : null
      };
    } catch (error) {
      cacheStats.error = error instanceof Error ? error.message : 'Unknown error';
    }

    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memory: {
          ...memory,
          heapUsedMB: Math.round(heapUsedMB * 100) / 100,
          heapTotalMB: Math.round(heapTotalMB * 100) / 100,
          heapUsagePercent: Math.round(heapUsagePercent * 100) / 100
        }
      },
      configuration,
      redis: {
        status: redisStatus,
        cacheStats
      },
      recentErrors: recentErrors.slice(-5) // Last 5 errors
    };

    // Set headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('x-debug-timestamp', new Date().toISOString());

    return res.status(200).json(debugInfo);

  } catch (error) {
    console.error('Debug endpoint error:', error);
    
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      error: 'Debug endpoint failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}