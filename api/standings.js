// api/standings.js
let standingsCache = { data: null, timestamp: 0 };

module.exports = async function handler(req, res) {
  try {
    const API_TOKEN =
      process.env.FOOTBALL_DATA_TOKEN || process.env.REACT_APP_FOOTBALL_DATA_TOKEN;

    if (!API_TOKEN) {
      return res.status(500).json({ error: "API token not configured" });
    }

    const now = Date.now();

    // Smart TTL: standings change slowly
    let ttl = 12 * 60 * 60 * 1000; // default 12h
    if (standingsCache.data) {
      const hasLive = standingsCache.data.some((s) => s.form?.includes("W"));
      if (hasLive) ttl = 5 * 60 * 1000; // during games, refresh faster
      else {
        const today = new Date();
        if (today.getDay() >= 5 && today.getDay() <= 7) {
          ttl = 1 * 60 * 60 * 1000; // weekends -> 1h
        }
      }
    }

    // Serve from cache if valid
    if (standingsCache.data && now - standingsCache.timestamp < ttl) {
      res.setHeader("x-cache", "HIT");
      return res.status(200).json(standingsCache.data);
    }

    const url = "https://api.football-data.org/v4/competitions/PL/standings";
    const response = await fetch(url, {
      headers: {
        "X-Auth-Token": API_TOKEN,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 429 && standingsCache.data) {
        res.setHeader("x-cache", "STALE");
        return res.status(200).json(standingsCache.data);
      }
      return res
        .status(500)
        .json({ error: "Football Data API error", details: errorText });
    }

    const data = await response.json();
    const standings = data.standings?.[0]?.table || [];

    standingsCache = { data: standings, timestamp: now };

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=1800");
    res.setHeader("x-cache", "MISS");
    return res.status(200).json(standings);
  } catch (error) {
    if (standingsCache.data) {
      res.setHeader("x-cache", "ERROR-STALE");
      return res.status(200).json(standingsCache.data);
    }
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
};