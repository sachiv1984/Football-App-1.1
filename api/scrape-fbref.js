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
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Debug logging
  console.log('Query params:', req.query);
  
  let { url } = req.query;
  console.log('Raw URL from query:', url);
  
  const fbrefUrl = Array.isArray(url) ? url[0] : url;
  console.log('Processed URL:', fbrefUrl);
  console.log('URL type:', typeof fbrefUrl);
  console.log('URL starts with https://fbref.com/:', fbrefUrl?.startsWith("https://fbref.com/"));

  if (!fbrefUrl || typeof fbrefUrl !== 'string') {
    console.log('URL validation failed: missing or not string');
    return res.status(400).json({ error: "Missing FBref URL" });
  }

  if (!fbrefUrl.startsWith("https://fbref.com/")) {
    console.log('URL validation failed: does not start with https://fbref.com/');
    return res.status(400).json({ 
      error: "Invalid FBref URL - must start with https://fbref.com/",
      received: fbrefUrl 
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

  try {
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
    });
  }
}