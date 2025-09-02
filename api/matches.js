// api/matches.js
module.exports = async function handler(req, res) {
  try {
    const API_TOKEN = process.env.FOOTBALL_DATA_TOKEN || process.env.REACT_APP_FOOTBALL_DATA_TOKEN;
    if (!API_TOKEN) {
      return res.status(500).json({ error: 'API token not configured' });
    }

    const url = 'https://api.football-data.org/v4/competitions/PL/matches';
    const response = await fetch(url, {
      headers: {
        'X-Auth-Token': API_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(500).json({ error: 'Football Data API error', details: errorText });
    }

    const data = await response.json();
    // Return raw matches only, normalize minimal fields
    const matches = (data.matches || []).map(match => ({
      id: match.id,
      utcDate: match.utcDate,
      status: match.status,
      matchday: match.matchday,
      stage: match.stage || 'REGULAR_SEASON',
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      venue: match.venue || '',
      competition: match.competition || {}
    }));

    // Cache headers for client-side requests
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=300');
    res.status(200).json(matches);

  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
};
