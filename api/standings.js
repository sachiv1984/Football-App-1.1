// api/standings.js
import { redisGet, redisSet } from '../services/upstash/redis.ts';

// Safe async timing helper
async function measureTime(fn, fallback) {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    return { result, duration };
  } catch (error) {
    const duration = Date.now() - start;
    if (fallback !== undefined) {
      return { result: fallback, duration, error };
    }
    throw error;
  }
}

// Safe Redis operations
async function safeRedisGet(key) {
  try {
    return await redisGet(key);
  } catch (error) {
    console.warn(`Redis GET failed for key ${key}:`, error);
    return null;
  }
}

async function safeRedisSet(key, value, ttl) {
  try {
    await redisSet(key, value, ttl);
  } catch (error) {
    console.warn(`Redis SET failed for key ${key}:`, error);
  }
}

// Safe standings processing
function processStandings(rawData) {
  try {
    // Handle different possible response structures
    if (rawData?.standings?.[0]?.table && Array.isArray(rawData.standings[0].table)) {
      return rawData.standings[0].table;
    }
    
    if (rawData?.table && Array.isArray(rawData.table)) {
      return rawData.table;
    }
    
    if (Array.isArray(rawData)) {
      return rawData;
    }
    
    console.warn('Unexpected standings data structure:', Object.keys(rawData || {}));
    return [];
    
  } catch (error) {
    console.error('Error processing standings data:', error);
    return [];
  }
}

export default async function handler(req, res) {
  const startTime = Date.now();
  
  try {
    // Input validation
    const API_TOKEN = process.env.FOOTBALL_DATA_TOKEN || process.env.REACT_APP_FOOTBALL_DATA_TOKEN;
    if (!API_TOKEN) {
      return res.status(500).json({ 
        error: 'API token not configured',
        timestamp: new Date().toISOString()
      });
    }

    // Safe cache retrieval
    const cacheKey = 'standings:pl';
    let cached = null;
    
    try {
      cached = await safeRedisGet(cacheKey);
    } catch (error) {
      console.warn('Cache retrieval failed:', error);
    }

    const now = Date.now();
    let ttl = 12 * 60 * 60 * 1000; // default 12h

    // Smart TTL with safe access
    if (cached?.data && Array.isArray(cached.data)) {
      try {
        // Check if any team has form data (indicating recent activity)
        const hasRecentActivity = cached.data.some((s) => 
          s && typeof s.form === 'string' && s.form.length > 0
        );
        
        if (hasRecentActivity) {
          ttl = 5 * 60 * 1000; // refresh faster during games
        } else {
          const today = new Date();
          const dayOfWeek = today.getDay();
          // Weekend (Friday-Sunday): refresh more frequently
          if (dayOfWeek >= 5 || dayOfWeek === 0) {
            ttl = 1 * 60 * 60 * 1000; // 1h on weekends
          }
        }
      } catch (error) {
        console.warn('TTL calculation failed, using default:', error);
      }

      // Serve from cache if valid
      if (now - cached.timestamp < ttl) {
        res.setHeader('x-cache', 'HIT');
        res.setHeader('ETag', cached.etag || '');
        res.setHeader('x-response-time', `${Date.now() - startTime}ms`);
        return res.status(200).json(cached.data);
      }
    }

    // Prepare request headers
    const headers = {
      'X-Auth-Token': API_TOKEN,
      'Content-Type': 'application/json',
    };

    if (cached?.etag) {
      headers['If-None-Match'] = cached.etag;
    }

    // External API call with timeout and error handling
    const url = 'https://api.football-data.org/v4/competitions/PL/standings';
    
    const { result: response, duration: fetchTime, error: fetchError } = await measureTime(
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        try {
          const resp = await fetch(url, { 
            headers,
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          return resp;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      }
    );

    // Handle fetch errors
    if (fetchError) {
      console.error('Standings API fetch failed:', fetchError);
      
      // Fallback to cached data
      if (cached?.data) {
        res.setHeader('x-cache', 'ERROR-STALE');
        res.setHeader('ETag', cached.etag || '');
        res.setHeader('x-error', 'fetch-failed');
        res.setHeader('x-response-time', `${Date.now() - startTime}ms`);
        return res.status(200).json(cached.data);
      }
      
      return res.status(503).json({
        error: 'External API unavailable',
        details: fetchError.message,
        timestamp: new Date().toISOString()
      });
    }

    // Handle 304 Not Modified
    if (response.status === 304 && cached) {
      cached.timestamp = Date.now();
      await safeRedisSet(cacheKey, cached, Math.floor(ttl / 1000));
      
      res.setHeader('x-cache', 'ETAG-NOTMODIFIED');
      res.setHeader('ETag', cached.etag);
      res.setHeader('x-timings-fetch', fetchTime.toString());
      res.setHeader('x-response-time', `${Date.now() - startTime}ms`);
      return res.status(200).json(cached.data);
    }

    // Handle HTTP errors
    if (!response.ok) {
      let errorText = 'Unknown error';
      try {
        errorText = await response.text();
      } catch {
        errorText = `HTTP ${response.status}`;
      }

      // Rate limit fallback
      if (response.status === 429 && cached?.data) {
        res.setHeader('x-cache', 'RATE-LIMITED-STALE');
        res.setHeader('ETag', cached.etag || '');
        res.setHeader('x-timings-fetch', fetchTime.toString());
        res.setHeader('x-response-time', `${Date.now() - startTime}ms`);
        return res.status(200).json(cached.data);
      }

      return res.status(response.status >= 500 ? 503 : response.status).json({
        error: 'Football Data API error',
        details: errorText,
        status: response.status,
        timestamp: new Date().toISOString()
      });
    }

    // Safe JSON parsing and data processing
    const etag = response.headers.get('etag') || '';
    
    const { result: data, duration: parseTime, error: parseError } = await measureTime(
      async () => {
        const rawJson = await response.json();
        return processStandings(rawJson);
      },
      [] // Fallback to empty array
    );

    if (parseError) {
      console.error('Failed to parse standings response:', parseError);
      
      // Fallback to cached data
      if (cached?.data) {
        res.setHeader('x-cache', 'PARSE-ERROR-STALE');
        res.setHeader('x-error', 'parse-failed');
        res.setHeader('x-response-time', `${Date.now() - startTime}ms`);
        return res.status(200).json(cached.data);
      }
      
      return res.status(502).json({
        error: 'Invalid API response format',
        timestamp: new Date().toISOString()
      });
    }

    // Validate processed data
    if (!Array.isArray(data)) {
      console.error('Processed standings data is not an array:', typeof data);
      
      if (cached?.data) {
        res.setHeader('x-cache', 'INVALID-DATA-STALE');
        res.setHeader('x-response-time', `${Date.now() - startTime}ms`);
        return res.status(200).json(cached.data);
      }
      
      return res.status(502).json({
        error: 'Invalid standings data structure',
        timestamp: new Date().toISOString()
      });
    }

    // Update cache (don't fail if cache update fails)
    const cacheData = { data, etag, timestamp: now };
    await safeRedisSet(cacheKey, cacheData, Math.floor(ttl / 1000));

    // Success response with performance headers
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=1800');
    res.setHeader('x-cache', 'MISS');
    res.setHeader('ETag', etag);
    res.setHeader('x-timings-fetch', fetchTime.toString());
    res.setHeader('x-timings-parse', parseTime.toString());
    res.setHeader('x-response-time', `${Date.now() - startTime}ms`);
    res.setHeader('x-standings-count', data.length.toString());

    return res.status(200).json(data);

  } catch (error) {
    console.error('Critical standings API error:', error);
    
    // Final fallback attempt
    try {
      const cached = await safeRedisGet('standings:pl');
      if (cached?.data) {
        res.setHeader('x-cache', 'CRITICAL-ERROR-STALE');
        res.setHeader('ETag', cached.etag || '');
        res.setHeader('x-error', 'critical-fallback');
        res.setHeader('x-response-time', `${Date.now() - startTime}ms`);
        return res.status(200).json(cached.data);
      }
    } catch {
      // Final cache attempt also failed
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown critical error',
      timestamp: new Date().toISOString(),
      requestId: Math.random().toString(36).substring(7)
    });
  }
}