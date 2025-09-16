// api/scrape-fbref.js
// Minimal version to test if basic functionality works

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  console.log('=== MINIMAL API TEST ===');
  console.log('Method:', req.method);
  console.log('Query:', req.query);
  
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { url } = req.query;
    const fbrefUrl = Array.isArray(url) ? url[0] : url;
    
    console.log('URL received:', fbrefUrl);

    if (!fbrefUrl || !fbrefUrl.startsWith("https://fbref.com/")) {
      return res.status(400).json({ 
        error: "Invalid FBref URL",
        received: fbrefUrl
      });
    }

    // Test if we can at least fetch the page
    console.log('Attempting to fetch:', fbrefUrl);
    
    const response = await fetch(fbrefUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DataScraper/1.0)",
        "Accept": "text/html",
      },
    });

    console.log('Fetch response:', response.status, response.ok);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    console.log('HTML received, length:', html.length);
    console.log('HTML preview:', html.substring(0, 200));

    // For now, just return basic info without parsing
    return res.status(200).json({
      success: true,
      message: "Successfully fetched page (parsing disabled for testing)",
      url: fbrefUrl,
      htmlLength: html.length,
      htmlPreview: html.substring(0, 200),
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Error in minimal test:", error);
    return res.status(500).json({
      error: "Minimal test failed",
      message: error.message,
      stack: error.stack
    });
  }
}
