export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[API] API key present:', API_KEY ? 'YES' : 'NO');

  const testUrl = `https://api.the-odds-api.com/v4/sports/soccer_epl/odds?apiKey=${API_KEY}&regions=uk&markets=totals&oddsFormat=decimal`;

  try {
    const response = await fetch(testUrl);
    const text = await response.text();
    console.log('[API] Raw response:', text.slice(0, 200)); // first 200 chars
    res.status(200).json({ textSnippet: text.slice(0, 200) });
  } catch (err) {
    console.error('[API] Error:', err);
    res.status(500).json({ error: String(err) });
  }
}
