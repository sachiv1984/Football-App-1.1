import { load } from "cheerio";

// In-memory rate limiting (per server instance)
const requestLog = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const windowStart = now - 60000; // 1 min window

  if (!requestLog.has(ip)) {
    requestLog.set(ip, []);
  }

  const requests = requestLog.get(ip).filter((t) => t > windowStart);
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Debug logging
    console.log('Full request URL:', req.url);
    console.log('Query params:', req.query);
    
    let { url } = req.query;
    console.log('Raw URL from query:', url);
    
    // Handle both string and array cases more safely
    let fbrefUrl;
    if (Array.isArray(url)) {
      fbrefUrl = url[0];
    } else if (typeof url === 'string') {
      fbrefUrl = url;
    } else {
      console.log('URL is neither string nor array:', typeof url, url);
      return res.status(400).json({ 
        error: "Invalid URL parameter",
        received: url,
        type: typeof url
      });
    }
    
    console.log('Processed URL:', fbrefUrl);
    console.log('URL type:', typeof fbrefUrl);
    
    // Additional URL cleaning
    if (fbrefUrl) {
      fbrefUrl = fbrefUrl.trim();
      console.log('Trimmed URL:', fbrefUrl);
    }
    
    console.log('URL starts with https://fbref.com/:', fbrefUrl?.startsWith("https://fbref.com/"));

    if (!fbrefUrl || typeof fbrefUrl !== 'string') {
      console.log('URL validation failed: missing or not string');
      return res.status(400).json({ 
        error: "Missing or invalid FBref URL",
        received: fbrefUrl,
        type: typeof fbrefUrl
      });
    }

    if (!fbrefUrl.startsWith("https://fbref.com/")) {
      console.log('URL validation failed: does not start with https://fbref.com/');
      console.log('First 20 chars:', fbrefUrl.substring(0, 20));
      return res.status(400).json({ 
        error: "Invalid FBref URL - must start with https://fbref.com/",
        received: fbrefUrl,
        firstChars: fbrefUrl.substring(0, 20)
      });
    }

    const clientIP =
      req.headers["x-forwarded-for"] ||
      req.socket?.remoteAddress ||
      "unknown";

    if (isRateLimited(clientIP)) {
      return res.status(429).json({
        error: "Rate limit exceeded. Max 10 requests per minute.",
        retryAfter: 60,
      });
    }

    logRequest(clientIP);
    console.log('Attempting to fetch URL:', fbrefUrl);

    const response = await fetch(fbrefUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; DataScraper/1.0; Educational purpose)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    console.log('Fetch response status:', response.status);
    console.log('Fetch response ok:', response.ok);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    console.log('HTML length:', html.length);
    
    const $ = load(html);

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

      const $headerRow = $table.find("thead tr").last();
      $headerRow.find("th").each((_, th) => {
        tableData.headers.push($(th).text().trim());
      });

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

    console.log('Tables found:', extractedData.length);

    if (extractedData.length === 0) {
      return res
        .status(404)
        .json({ error: "No data tables found on the page" });
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
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}