// api/perf.js

// Import perfStats from matches.js and standings.js
const { perfStats: matchesPerfStats } = require('./matches');
const { perfStats: standingsPerfStats } = require('./standings');

function average(arr) {
  if (!arr.length) return 0;
  return arr.reduce((sum, v) => sum + v, 0) / arr.length;
}

module.exports = async function handler(req, res) {
  try {
    // ----------------------
    // Matches stats
    // ----------------------
    const matchTimes = matchesPerfStats.matches || [];
    const avgFetch = average(matchTimes.map(m => m.fetchTime));
    const avgParse = average(matchTimes.map(m => m.parseTime));
    const avgEnrich = average(matchTimes.map(m => m.enrichTime || 0));
    const avgTotal = average(matchTimes.map(m => m.totalTime || 0));

    // ----------------------
    // Standings stats
    // ----------------------
    const standingTimes = standingsPerfStats.standings || [];
    const avgStandingsFetch = average(standingTimes.map(m => m.fetchTime));
    const avgStandingsParse = average(standingTimes.map(m => m.parseTime));
    const avgStandingsTotal = average(standingTimes.map(m => m.totalTime || 0));

    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
    return res.status(200).json({
      matches: {
        last: matchTimes[matchTimes.length - 1] || null,
        average: {
          fetchTime: avgFetch,
          parseTime: avgParse,
          enrichTime: avgEnrich,
          totalTime: avgTotal,
        }
      },
      standings: {
        last: standingTimes[standingTimes.length - 1] || null,
        average: {
          fetchTime: avgStandingsFetch,
          parseTime: avgStandingsParse,
          totalTime: avgStandingsTotal,
        }
      }
    });
  } catch (err) {
    console.error("Perf API error:", err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
};
