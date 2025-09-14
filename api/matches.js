// api/matches.js
import { redisGet, redisSet } from '../services/upstash/redis.js';

// Memory management for venue cache
const MAX_VENUE_CACHE_SIZE = 100;
let teamVenueCache = new Map();

// Clean up venue cache when it gets too large
function cleanupVenueCache() {
  if (teamVenueCache.size > MAX_VENUE_CACHE_SIZE) {
    const entries = Array.from(teamVenueCache.entries());
    // Keep only the most recent half
    const sorted = entries.sort(([,a], [,b]) => b.ts - a.ts);
    teamVenueCache = new Map(sorted.slice(0, Math.floor(MAX_VENUE_CACHE_SIZE / 2)));
  }
}

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

// Safe Redis operations with fallbacks
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
    // Don't throw - continue without caching
  }
}

// Safer venue fetching with timeout and error handling
async function getTeamVenue(teamId, API_TOKEN) {
  try {
    const cached = teamVenueCache.get(teamId);
    const week = 7 * 24 * 60 * 60 * 1000;
    if (cached && Date.now() - cached.ts < week) return cached.venue;

    // Timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const res = await fetch(`https://api.football-data.org/v4/teams/${teamId}`, {
      headers: { 
        'X-Auth-Token': API_TOKEN, 
        'Content-Type': 'application/json' 
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`Failed to fetch venue for team ${teamId}: ${res.status}`);
      return '';
    }

    const data = await res.json();
    const venue = data?.venue || '';
    
    // Cache the result
    teamVenueCache.set(teamId, { venue, ts: Date.now() });
    cleanupVenueCache(); // Prevent memory leaks
    
    return venue;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`Venue fetch timeout for team ${teamId}`);
    } else {
      console.warn(`Error fetching venue for team ${teamId}:`, error);
    }
    return '';
  }
}

// Enhanced match processing with better error handling
async function processMatches(rawMatches, API_TOKEN) {
  if (!Array.isArray(rawMatches)) return [];

  // Get unique teams that need venue lookup
  const teamsNeedingVenues = new Set();
  rawMatches.forEach((match) => {
    if (!match?.venue && match?.homeTeam?.id) {
      teamsNeedingVenues.add(match.homeTeam.id);
    }
  });

  // Batch venue fetching with controlled concurrency
  const venuePromises = Array.from(teamsNeedingVenues).map(async (teamId) => {
    const venue = await getTeamVenue(teamId, API_TOKEN);
    return [teamId, venue];
  });

  // Process in batches of 3 to respect rate limits
  const batchSize = 3;
  const venueResults = new Map();

  for (let i = 0; i < venuePromises.length; i += batchSize) {
    const batch = venuePromises.slice(i, i + batchSize);
    try {
      const results = await Promise.all(batch);
      results.forEach(([teamId, venue]) => venueResults.set(teamId, venue));
      
      // Rate limiting delay between batches
      if (i + batchSize < venuePromises.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.warn(`Batch venue fetch failed:`, error);
      // Continue processing other batches
    }
  }

  // Transform matches with safe property access
  return rawMatches.map((match) => {
    try {
      let venue = match?.venue || '';
      if (!venue && match?.homeTeam?.id) {
        venue = venueResults.get(match.homeTeam.id) || '';
      }

      return {
        id: match?.id || 0,
        utcDate: match?.utcDate || new Date().toISOString(),
        status: match?.status || 'UNKNOWN',
        matchday: match?.matchday || 0,
        stage: match?.stage || 'REGULAR_SEASON',
        homeTeam: {
          id: match?.homeTeam?.id || 0,
          name: match?.homeTeam?.name || 'Unknown Team',
          shortName: match?.homeTeam?.shortName || '',
          tla: match?.homeTeam?.tla || '',
          crest: match?.homeTeam?.crest || ''
        },
        awayTeam: {
          id: match?.awayTeam?.id || 0,
          name: match?.awayTeam?.name || 'Unknown Team',
          shortName: match?.awayTeam?.shortName || '',
          tla: match?.awayTeam?.tla || '',
          crest: match?.awayTeam?.crest || ''
        },
        venue,
        score: match?.score || null,
        competition: match?.competition || {}
      };
    } catch (error) {
      console.warn(`Error processing match ${match?.id}:`, error);
      return null;
    }
  }).filter(Boolean); // Remove any null entries
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

    // Check Redis cache with fallback
    const cacheKey = 'matches:pl';
    let cached = null;
    
    try {
      cached = await safeRedisGet(cacheKey);
    } catch (error) {
      console.warn('Redis cache check failed:', error);
    }

    const now = Date.now();
    let ttl = 60 * 60 * 1000; // default 1h

    // Smart TTL calculation with safe array access
    if (cached?.data && Array.isArray(cached.data)) {
      try {
        const hasLive = cached.data.some((m) => 
          m && typeof m.status === 'string' && ['LIVE', 'IN_PLAY', 'PAUSED'].includes(m.status)
        );
        
        if (hasLive) {
          ttl = 30 * 1000; // 30s for live games
        } else {
          const today = new Date();
          const hasTodayMatch = cached.data.some((m) => {
            try {
              return m?.utcDate && new Date(m.utcDate).toDateString() === today.toDateString();
            } catch {
              return false;
            }
          });
          if (hasTodayMatch) ttl = 15 * 60 * 1000; // 15min for match days
        }
      } catch (error) {
        console.warn('TTL calculation failed, using default:', error);
      }

      // Serve from cache if still valid
      if (now - cached.timestamp < ttl) {
        res.setHeader('x-cache', 'HIT');
        res.setHeader('ETag', cached.etag || '');
        res.setHeader('x-response-time', `${Date.now() - startTime}ms`);
        return res.status(200).json(cached.data);
      }
    }

    // Prepare headers for external API call
    const headers = {
      'X-Auth-Token': API_TOKEN,
      'Content-Type': 'application/json',
    };

    if (cached?.etag) {
      headers['If-None-Match'] = cached.etag;
    }

    // Fetch from external API with timeout
    const url = 'https://api.football-data.org/v4/competitions/PL/matches';
    
    const { result: response, duration: fetchTime, error: fetchError } = await measureTime(
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
        
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

    if (fetchError) {
      console.error('External API fetch failed:', fetchError);
      
      // Return stale cache if available
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

    // Parse response with error handling
    const etag = response.headers.get('etag') || '';
    let data;
    
    try {
      data = await response.json();
    } catch (error) {
      console.error('Failed to parse API response:', error);
      
      if (cached?.data) {
        res.setHeader('x-cache', 'PARSE-ERROR-STALE');
        res.setHeader('x-response-time', `${Date.now() - startTime}ms`);
        return res.status(200).json(cached.data);
      }
      
      return res.status(502).json({
        error: 'Invalid API response',
        timestamp: new Date().toISOString()
      });
    }

    // Process matches with comprehensive error handling
    const { result: matches, duration: enrichTime } = await measureTime(
      () => processMatches(data?.matches || [], API_TOKEN),
      [] // Fallback to empty array
    );

    // Update cache (don't fail request if cache update fails)
    const cacheData = { data: matches, etag, timestamp: now };
    await safeRedisSet(cacheKey, cacheData, Math.floor(ttl / 1000));

    // Send response with performance headers
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
    res.setHeader('x-cache', 'MISS');
    res.setHeader('ETag', etag);
    res.setHeader('x-timings-fetch', fetchTime.toString());
    res.setHeader('x-timings-enrich', enrichTime.toString());
    res.setHeader('x-response-time', `${Date.now() - startTime}ms`);
    res.setHeader('x-matches-count', matches.length.toString());

    return res.status(200).json(matches);

  } catch (error) {
    console.error('Unhandled matches API error:', error);
    
    // Final fallback to cache
    try {
      const cached = await safeRedisGet('matches:pl');
      if (cached?.data) {
        res.setHeader('x-cache', 'CRITICAL-ERROR-STALE');
        res.setHeader('ETag', cached.etag || '');
        res.setHeader('x-error', 'critical-fallback');
        res.setHeader('x-response-time', `${Date.now() - startTime}ms`);
        return res.status(200).json(cached.data);
      }
    } catch {
      // Cache also failed
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown critical error',
      timestamp: new Date().toISOString(),
      requestId: Math.random().toString(36).substring(7)
    });
  }
}