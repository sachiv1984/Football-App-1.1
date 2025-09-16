// api/scrape-fbref.js

// Try different import approaches for Vercel compatibility
let cheerio;
try {
  cheerio = require('cheerio');
} catch (e) {
  try {
    const cheerioModule = await import('cheerio');
    cheerio = cheerioModule;
  } catch (e2) {
    console.error('Failed to import cheerio:', e, e2);
  }
}

// In-memory rate limiting
const requestLog = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const windowStart = now - 60000;
  
  if (!requestLog.has(ip)) {
    requestLog.set(ip, []);
  }
  
  const requests = requestLog.get(ip).filter(t => t > windowStart);
  requestLog.set(ip, requests);
  
  return requests.length >= 10;
}

function logRequest(ip) {
  if (!requestLog.has(ip)) {
    requestLog.set(ip, []);
  }
  requestLog.get(ip).push(Date.now());
}

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Check if cheerio loaded
    if (!cheerio || !cheerio.load) {
      console.error('Cheerio not available');
      return res.status(500).json({ 
        error: "Server configuration error - missing dependencies" 
      });
    }

    console.log('=== API ROUTE DEBUG ===');
    console.log('Query params:', req.query);
    
    let { url } = req.query;
    console.log('Raw URL:', url, typeof url);
    
    const fbrefUrl = Array.isArray(url) ? url[0] : url;
    console.log('Processed URL:', fbrefUrl);

    if (!fbrefUrl || typeof fbrefUrl !== 'string') {
      return res.status(400).json({ 
        error: "Missing or invalid URL parameter",
        received: fbrefUrl,
        type: typeof fbrefUrl
      });
    }

    if (!fbrefUrl.startsWith("https://fbref.com/")) {
      return res.status(400).json({ 
        error: "Invalid FBref URL - must start with https://fbref.com/",
        received: fbrefUrl.substring(0, 50)
      });
    }

    const clientIP = req.headers["x-forwarded-for"] || req.connection?.remoteAddress || "unknown";

    if (isRateLimited(clientIP)) {
      return res.status(429).json({
        error: "Rate limit exceeded. Max 10 requests per minute.",
        retryAfter: 60,
      });
    }

    logRequest(clientIP);
    console.log('Fetching URL:', fbrefUrl);

    const response = await fetch(fbrefUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DataScraper/1.0)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    console.log('Fetch status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    console.log('HTML received, length:', html.length);
    
    const $ = cheerio.load(html);
    const pageTitle = $("title").text().trim();
    console.log('Page title:', pageTitle);
    
    const extractedData = [];

    $("table.stats_table").each((index, element) => {
      const $table = $(element);
      
      const tableData = {
        id: $table.attr("id") || `table-${index}`,
        caption: $table.find("caption").text().trim() || `Table ${index + 1}`,
        headers: [],
        rows: [],
      };

      // Get headers
      const $headerRow = $table.find("thead tr").last();
      $headerRow.find("th").each((_, th) => {
        tableData.headers.push($(th).text().trim());
      });

      // Get rows
      $table.find("tbody tr").each((_, tr) => {
        const $row = $(tr);
        const rowData = [];

        $row.find("td, th").each((_, cell) => {
          const $cell = $(cell);
          let cellText = $cell.text().trim();

          const link = $cell.find("a").first().attr("href");
          if (link && link.startsWith("/")) {
            cellText = {
              text: cellText,
              link: `https://fbref.com${link}`,
            };
          }

          rowData.push(cellText);
        });

        if (rowData.length > 0) {
          tableData.rows.push(rowData);
        }
      });

      if (tableData.headers.length > 0 && tableData.rows.length > 0) {
        extractedData.push(tableData);
      }
    });

    console.log('Tables extracted:', extractedData.length);

    if (extractedData.length === 0) {
      return res.status(404).json({ 
        error: "No data tables found on the page",
        pageTitle 
      });
    }

    return res.status(200).json({
      success: true,
      url: fbrefUrl,
      pageTitle,
      scraped_at: new Date().toISOString(),
      tables: extractedData,
      total_tables: extractedData.length,
    });

  } catch (error) {
    console.error("Scraping error:", error);
    return res.status(500).json({
      error: "Failed to scrape data",
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
}
