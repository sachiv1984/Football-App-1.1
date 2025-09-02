// api/standings.js
module.exports = async function handler(req, res) {
  try {
    const API_TOKEN = process.env.FOOTBALL_DATA_TOKEN;
    if (!API_TOKEN) {
      return res.status(500).json({ error: 'API token not configured' });
    }

    const url = 'https://api.football-data.org/v4/competitions/PL/standings';
    const response = await fetch(url, {
      headers: {
        'X-Auth-Token': API_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Football Data API error (standings):', response.status, errorText);

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

    // Extract the first table only (Premier League main table)
    const standings = data.standings?.[0]?.table || [];

    // Cache to reduce API calls
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=300');
    res.status(200).json(standings);

  } catch (error) {
    console.error('Unhandled /api/standings error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
};
