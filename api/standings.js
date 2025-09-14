// api/standings.js
let standingsCache = { data: null, timestamp: 0 };
let standingsEtag = null; // store latest ETag

// Shared performance stats object (can be extended for Step 5)
const perfStats = {
  standings: [],
};

// Helper: measure time of async function
async function measureTime(fn) {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  return { result, duration };
}

module.exports = async function handler(req, res) {
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

    const headers = {
      "X-Auth-Token": API_TOKEN,
      "Content-Type": "application/json",
      ...(standingsEtag ? { "If-None-Match": standingsEtag } : {}),
    };

    const url = "https://api.football-data.org/v4/competitions/PL/standings";

    // --------------------------
    // Fetch standings with timing
    // --------------------------
    const { result: response, duration: fetchTime } = await measureTime(() =>
      fetch(url, { headers })
    );

    // Handle 304 Not Modified
    if (response.status === 304 && standingsCache.data) {
      standingsCache.timestamp = Date.now();
      res.setHeader("x-cache", "ETAG-NOTMODIFIED");
      res.setHeader("ETag", standingsEtag);
      res.setHeader("x-timings-fetch", fetchTime.toString());
      return res.status(200).json(standingsCache.data);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Standings fetch error:", { status: response.status, errorText });
      if (response.status === 429 && standingsCache.data) {
        res.setHeader("x-cache", "STALE");
        res.setHeader("ETag", standingsEtag || "");
        res.setHeader("x-timings-fetch", fetchTime.toString());
        return res.status(200).json(standingsCache.data);
      }
      return res
        .status(500)
        .json({ error: "Football Data API error", details: errorText });
    }

    // Update ETag if returned
    standingsEtag = response.headers.get("etag") || standingsEtag;

    // Parse JSON with timing
    const { result: data, duration: parseTime } = await measureTime(() => response.json());
    const standings = data.standings?.[0]?.table || [];

    // Save to cache
    standingsCache = { data: standings, timestamp: now };

    // Update perfStats
    perfStats.standings.push({ fetchTime, parseTime, timestamp: now });
    if (perfStats.standings.length > 50) perfStats.standings.shift(); // keep last 50

    // Response headers
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=1800");
    res.setHeader("x-cache", "MISS");
    res.setHeader("ETag", standingsEtag);
    res.setHeader("x-timings-fetch", fetchTime.toString());
    res.setHeader("x-timings-parse", parseTime.toString());

    return res.status(200).json(standings);
  } catch (error) {
    console.error("Standings handler error:", error);
    if (standingsCache.data) {
      res.setHeader("x-cache", "ERROR-STALE");
      res.setHeader("ETag", standingsEtag || "");
      return res.status(200).json(standingsCache.data);
    }
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
};
