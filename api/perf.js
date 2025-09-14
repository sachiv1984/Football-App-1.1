// api/perf.js

// Import the shared perfStats objects
// Note: in a real app you might move these to a separate module so both endpoints can import them
const { perfStats } = require('./matches');   // matches.js
const { perfStats: standingsPerfStats } = require('./standings'); // standings.js

function average(arr) {
  if (!arr.length) return 0;
  return arr.reduce((sum, v) => sum + v, 0) / arr.length;
}

module.exports = async function handler(req, res) {
  try {
    // Matches stats
    const matchTimes = perfStats.matches || [];
    const avgFetch = average(matchTimes.map(m => m.fetchTime));
    const avgParse = average(matchTimes.map(m => m.parseTime));
    const avgEnrich = average(matchTimes.map(m => m.enrichTime));

    // Standings stats
    const standingTimes = standingsPerfStats.standings || [];
    const avgStandingsFetch = average(standingTimes.map(m => m.fetchTime));
    const avgStandingsParse = average(standingTimes.map(m => m.parseTime));

    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
    return res.status(200).json({
      matches: {
        last: matchTimes[matchTimes.length - 1] || null,
        average: {
          fetchTime: avgFetch,
          parseTime: avgParse,
          enrichTime: avgEnrich,
        }
      },
      standings: {
        last: standingTimes[standingTimes.length - 1] || null,
        average: {
          fetchTime: avgStandingsFetch,
          parseTime: avgStandingsParse,
        }
      }
    });
  } catch (err) {
    console.error("Perf API error:", err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
};
