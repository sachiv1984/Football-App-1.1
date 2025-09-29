// api/odds.js (TEST VERSION - NO EXTERNAL IMPORTS)

// Vercel's Node.js environment recognizes CommonJS syntax best for handlers,
// so we'll structure this to avoid static ESM imports altogether.

// Vercel only provides the types in the @vercel/node package; the file can be pure JS.
// You can keep the .js extension, but if you change to .cjs (as suggested previously)
// it would be even more robust. We'll stick to .js for this test.

// --- 1. Configuration (Copied from your service file) ---
const API_KEY = process.env.ODDS_API_KEY;
const BASE_URL = 'https://api.the-odds-api.com/v4';
const SPORT_KEY = 'soccer_epl';
const BOOKMAKER_KEY = 'draftkings'; // Example bookmaker

// --- 2. Minimal Utility Function (Copied from teamUtils.ts) ---
// We only need the simple normalization for URL matching.
function normalizeTeamName(name) {
    // This is the simplest canonical form. If the full map is needed, copy it here.
    return name ? name.trim().toLowerCase().replace(/[^a-z0-9]/g, '') : '';
}

// --- 3. Core API Logic Function ---
async function fetchOddsFromAPI(homeTeam, awayTeam) {
    if (!API_KEY) {
        console.error("ODDS_API_KEY is missing.");
        return null;
    }

    const markets = ['totals', 'btts'].join(',');
    // Note: regions=uk is assumed based on previous context.
    const url = `${BASE_URL}/sports/${SPORT_KEY}/odds?apiKey=${API_KEY}&regions=uk&markets=${markets}&oddsFormat=decimal`;

    let data = [];
    try {
        const res = await fetch(url);
        const text = await res.text();
        data = JSON.parse(text);

    } catch (err) {
        console.error('API or Network error during fetch:', err);
        return null;
    }

    const targetHome = normalizeTeamName(homeTeam);
    const targetAway = normalizeTeamName(awayTeam);

    // Find the matching match data
    const match = data.find(m => {
        const apiHome = normalizeTeamName(m.home_team);
        const apiAway = normalizeTeamName(m.away_team);
        // Match regardless of order (A vs B or B vs A)
        return (apiHome === targetHome && apiAway === targetAway) || (apiHome === targetAway && apiAway === targetHome);
    });
    
    if (!match) return null;

    // Extract odds from the preferred bookmaker
    const bookmaker = match.bookmakers.find(b => b.key === BOOKMAKER_KEY) || match.bookmakers[0];
    
    if (!bookmaker) return null;

    // Return simple success object to confirm functionality
    return {
        success: true,
        match: `${match.home_team} vs ${match.away_team}`,
        bookmakersFound: match.bookmakers.length,
        selectedBookmaker: bookmaker.title,
    };
}


// --- 4. The Vercel Handler Export ---
module.exports = async function handler(req, res) {
    try {
        const { home, away } = req.query;
        if (!home || !away) return res.status(400).json({ error: 'Missing home or away team query parameters.' });

        // Call the self-contained logic
        const result = await fetchOddsFromAPI(String(home), String(away));

        if (!result) return res.status(404).json({ error: 'No matching odds found or API key missing.' });

        res.status(200).json(result);
    } catch (err) {
        console.error('[API] Fatal Handler Error:', err);
        res.status(500).json({ error: err.message || 'Internal server error during processing.' });
    }
};
