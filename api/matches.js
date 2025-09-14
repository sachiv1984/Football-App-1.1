// api/matches.js
let matchesCache = { data: null, timestamp: 0 };
let matchesEtag = null; // Store latest ETag from upstream
const teamVenueCache = new Map(); // teamId -> { venue, ts }

// --------------------------
// Timing helper
// --------------------------
function measureTime(label) {
  const start = Date.now();
  return {
    end: () => {
      const duration = Date.now() - start;
      console.log(`${label} took ${duration}ms`);
      return duration;
    }
  };
}

// helper: fetch & cache venue from /teams endpoint
async function getTeamVenue(teamId, API_TOKEN) {
  const cached = teamVenueCache.get(teamId);
  const week = 7 * 24 * 60 * 60 * 1000; // 7 days
  if (cached && Date.now() - cached.ts < week) {
    return cached.venue;
  }

  try {
    const r = await fetch(`https://api.football-data.org/v4/teams/${teamId}`, {
      headers: {
        "X-Auth-Token": API_TOKEN,
        "Content-Type": "application/json",
      },
    });

    if (!r.ok) {
      console.warn(`Failed to fetch venue for team ${teamId}: ${r.status}`);
      return "";
    }

    const t = await r.json();
    const venue = t.venue || "";
    teamVenueCache.set(teamId, { venue, ts: Date.now() });
    return venue;
  } catch (err) {
    console.error("Error fetching team venue:", err);
    return "";
  }
}

module.exports = async function handler(req, res) {
  try {
    const API_TOKEN =
      process.env.FOOTBALL_DATA_TOKEN ||
      process.env.REACT_APP_FOOTBALL_DATA_TOKEN;

    if (!API_TOKEN) {
      return res.status(500).json({ error: "API token not configured" });
    }

    const now = Date.now();

    // --------------------------
    // Cache TTL logic (smart)
    // --------------------------
    let ttl = 60 * 60 * 1000; // default 1h
    if (matchesCache.data) {
      const hasLive = matchesCache.data.some((m) =>
        ["LIVE", "IN_PLAY", "PAUSED"].includes(m.status)
      );
      if (hasLive) ttl = 30 * 1000; // live games -> 30s
      else {
        const today = new Date();
        const hasTodayMatch = matchesCache.data.some((m) => {
          const d = new Date(m.utcDate);
          return d.toDateString() === today.toDateString();
        });
        if (hasTodayMatch) ttl = 15 * 60 * 1000; // matchday -> 15min
      }
    }

    // Serve from cache if still valid
    if (matchesCache.data && now - matchesCache.timestamp < ttl) {
      res.setHeader("x-cache", "HIT");
      res.setHeader("ETag", matchesEtag || "");
      return res.status(200).json(matchesCache.data);
    }

    // --------------------------
    // Fetch fresh with timing
    // --------------------------
    const fetchTimer = measureTime("Fetch matches");
    const headers = {
      "X-Auth-Token": API_TOKEN,
      "Content-Type": "application/json",
      ...(matchesEtag ? { "If-None-Match": matchesEtag } : {}),
    };
    const url = "https://api.football-data.org/v4/competitions/PL/matches";
    const response = await fetch(url, { headers });
    const fetchDuration = fetchTimer.end();

    // Handle 304 Not Modified
    if (response.status === 304 && matchesCache.data) {
      matchesCache.timestamp = Date.now();
      res.setHeader("x-cache", "ETAG-NOTMODIFIED");
      res.setHeader("ETag", matchesEtag);
      res.setHeader("x-timings-fetch", fetchDuration);
      return res.status(200).json(matchesCache.data);
    }

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 429 && matchesCache.data) {
        res.setHeader("x-cache", "STALE");
        res.setHeader("ETag", matchesEtag || "");
        res.setHeader("x-timings-fetch", fetchDuration);
        return res.status(200).json(matchesCache.data);
      }
      return res
        .status(500)
        .json({ error: "Football Data API error", details: errorText });
    }

    // Update ETag if returned
    matchesEtag = response.headers.get("etag") || matchesEtag;
    const data = await response.json();

    // --------------------------
    // Smart venue enrichment with timing
    // --------------------------
    const venueTimer = measureTime("Fetch team venues");

    const teamsToFetch = new Set();
    (data.matches || []).forEach(match => {
      if (!match.venue && match.homeTeam?.id) {
        teamsToFetch.add(match.homeTeam.id);
      }
    });

    const fetchedVenues = {};
    await Promise.all(
      Array.from(teamsToFetch).map(async (teamId) => {
        fetchedVenues[teamId] = await getTeamVenue(teamId, API_TOKEN);
      })
    );
    const venueDuration = venueTimer.end();

    const enrichTimer = measureTime("Enrich matches");
    const matches = (data.matches || []).map(match => {
      let venue = match.venue || "";
      if (!venue && match.homeTeam?.id) {
        venue = fetchedVenues[match.homeTeam.id] || "";
      }
      return {
        id: match.id,
        utcDate: match.utcDate,
        status: match.status,
        matchday: match.matchday,
        stage: match.stage || "REGULAR_SEASON",
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        venue,
        score: match.score || null,
        competition: match.competition || {},
      };
    });
    const enrichDuration = enrichTimer.end();

    // Save to cache
    matchesCache = { data: matches, timestamp: now };

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=600");
    res.setHeader("x-cache", "MISS");
    res.setHeader("ETag", matchesEtag);
    res.setHeader("x-timings-fetch", fetchDuration);
    res.setHeader("x-timings-venues", venueDuration);
    res.setHeader("x-timings-enrich", enrichDuration);

    return res.status(200).json(matches);
  } catch (error) {
    if (matchesCache.data) {
      res.setHeader("x-cache", "ERROR-STALE");
      res.setHeader("ETag", matchesEtag || "");
      return res.status(200).json(matchesCache.data);
    }
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
};
