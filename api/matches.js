// api/matches.js
module.exports = async function handler(req, res) {
  try {
    const API_TOKEN = process.env.FOOTBALL_DATA_TOKEN;
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

    // Forward upstream errors with correct status
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Football Data API error:', response.status, errorText);

      // Handle rate limiting explicitly
      if (response.status === 429) {
        return res.status(429).json({ error: 'Rate limit exceeded', details: errorText });
      }

      return res.status(response.status).json({
        error: 'Football Data API error',
        status: response.status,
        details: errorText
      });
    }

    const data = await response.json();

    // Normalize matches
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

    // Cache response to ease API load
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=300');
    res.status(200).json(matches);

  } catch (error) {
    console.error('Unhandled /api/matches error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
};
