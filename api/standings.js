// api/standings.js
let standingsCache = { data: null, timestamp: 0 };
let standingsEtag = null; // store latest ETag
const perfStats = { standings: [] }; // store timings

module.exports = async function handler(req, res) {
  const startTotal = Date.now();

  try {
    const API_TOKEN =
      process.env.FOOTBALL_DATA_TOKEN || process.env.REACT_APP_FOOTBALL_DATA_TOKEN;

    if (!API_TOKEN) {
      return res.status(500).json({ error: "API token not configured" });
    }

    const now = Date.now();

    // --------------------------
    // Smart TTL
    // --------------------------
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

    // Serve from cache if still valid
    if (standingsCache.data && now - standingsCache.timestamp < ttl) {
      res.setHeader("x-cache", "HIT");
      res.setHeader("ETag", standingsEtag || "");
      return res.status(200).json(standingsCache.data);
    }

    // --------------------------
    // Fetch fresh
    // --------------------------
    const startFetch = Date.now();
    const headers = {
      "X-Auth-Token": API_TOKEN,
      "Content-Type": "application/json",
      ...(standingsEtag ? { "If-None-Match": standingsEtag } : {}),
    };

    const url = "https://api.football-data.org/v4/competitions/PL/standings";
    const response = await fetch(url, { headers });
    const fetchTime = Date.now() - startFetch;

    // Handle 304 Not Modified
    if (response.status === 304 && standingsCache.data) {
      standingsCache.timestamp = Date.now();
      res.setHeader("x-cache", "ETAG-NOTMODIFIED");
      res.setHeader("ETag", standingsEtag);
      perfStats.standings.push({ fetchTime, parseTime: 0, totalTime: Date.now() - startTotal });
      return res.status(200).json(standingsCache.data);
    }

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 429 && standingsCache.data) {
        res.setHeader("x-cache", "STALE");
        res.setHeader("ETag", standingsEtag || "");
        perfStats.standings.push({ fetchTime, parseTime: 0, totalTime: Date.now() - startTotal });
        return res.status(200).json(standingsCache.data);
      }
      return res
        .status(500)
        .json({ error: "Football Data API error", details: errorText });
    }

    // --------------------------
    // Parse and cache
    // --------------------------
    const startParse = Date.now();
    const data = await response.json();
    const parseTime = Date.now() - startParse;

    const standings = data.standings?.[0]?.table || [];

    standingsCache = { data: standings, timestamp: now };
    standingsEtag = response.headers.get("etag") || standingsEtag;

    // Record performance
    const totalTime = Date.now() - startTotal;
    perfStats.standings.push({ fetchTime, parseTime, totalTime });

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=1800");
    res.setHeader("x-cache", "MISS");
    res.setHeader("ETag", standingsEtag);
    return res.status(200).json(standings);
  } catch (error) {
    if (standingsCache.data) {
      res.setHeader("x-cache", "ERROR-STALE");
      res.setHeader("ETag", standingsEtag || "");
      return res.status(200).json(standingsCache.data);
    }
    return res
      .status(500)
      .json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
};

// Export perfStats so /api/perf can access it
module.exports.perfStats = perfStats;
