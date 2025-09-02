// api/matches.js
let matchesCache = { data: null, timestamp: 0 };

module.exports = async function handler(req, res) {
  try {
    const API_TOKEN =
      process.env.FOOTBALL_DATA_TOKEN || process.env.REACT_APP_FOOTBALL_DATA_TOKEN;

    if (!API_TOKEN) {
      return res.status(500).json({ error: "API token not configured" });
    }

    const now = Date.now();

    // --------------------------
    // Cache TTL logic (smart)
    // --------------------------
    let ttl = 60 * 60 * 1000; // default 1h

    if (matchesCache.data) {
      const hasLive = matchesCache.data.some(
        (m) => ["LIVE", "IN_PLAY", "PAUSED"].includes(m.status)
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
      return res.status(200).json(matchesCache.data);
    }

    // Fetch fresh
    const url = "https://api.football-data.org/v4/competitions/PL/matches";
    const response = await fetch(url, {
      headers: {
        "X-Auth-Token": API_TOKEN,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      // If rate-limited, return stale cache
      if (response.status === 429 && matchesCache.data) {
        res.setHeader("x-cache", "STALE");
        return res.status(200).json(matchesCache.data);
      }
      return res
        .status(500)
        .json({ error: "Football Data API error", details: errorText });
    }

    const data = await response.json();
    const matches = (data.matches || []).map((match) => ({
      id: match.id,
      utcDate: match.utcDate,
      status: match.status,
      matchday: match.matchday,
      stage: match.stage || "REGULAR_SEASON",
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      venue: match.venue || "",
      competition: match.competition || {},
    }));

    // Save to cache
    matchesCache = { data: matches, timestamp: now };

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=600");
    res.setHeader("x-cache", "MISS");
    return res.status(200).json(matches);
  } catch (error) {
    if (matchesCache.data) {
      res.setHeader("x-cache", "ERROR-STALE");
      return res.status(200).json(matchesCache.data);
    }
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
};

