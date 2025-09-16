// api/scrape-fbref.js
// Working version with cheerio added back

// Import cheerio using dynamic import to avoid Vercel issues
async function loadCheerio() {
  try {
    const cheerio = await import('cheerio');
    return cheerio.load || cheerio.default?.load || cheerio;
  } catch (error) {
    console.error('Failed to load cheerio:', error);
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  console.log('=== SCRAPE API TEST ===');
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

    console.log('Loading cheerio...');
    const load = await loadCheerio();
    
    if (!load) {
      return res.status(500).json({ 
        error: "Failed to load HTML parser" 
      });
    }
    
    console.log('Cheerio loaded successfully');

    console.log('Fetching URL:', fbrefUrl);
    const response = await fetch(fbrefUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DataScraper/1.0)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });

    console.log('Fetch response:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    console.log('HTML received, length:', html.length);
    
    console.log('Loading HTML with cheerio...');
    const $ = load(html);
    console.log('HTML parsed successfully');
    
    const pageTitle = $("title").text().trim();
    console.log('Page title:', pageTitle);
    
    const extractedData = [];
    console.log('Looking for tables...');

    $("table.stats_table").each((index, element) => {
      console.log(`Processing table ${index}`);
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

      // Get rows (limit to first 5 for testing)
      $table.find("tbody tr").slice(0, 5).each((_, tr) => {
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
        console.log(`Table ${index} processed: ${tableData.rows.length} rows`);
      }
    });

    console.log('Total tables extracted:', extractedData.length);

    if (extractedData.length === 0) {
      return res.status(404).json({ 
        error: "No data tables found on the page",
        pageTitle,
        htmlPreview: html.substring(0, 500)
      });
    }

    return res.status(200).json({
      success: true,
      url: fbrefUrl,
      pageTitle,
      scraped_at: new Date().toISOString(),
      tables: extractedData,
      total_tables: extractedData.length,
      note: "Limited to 5 rows per table for testing"
    });

  } catch (error) {
    console.error("Scraping error:", error);
    return res.status(500).json({
      error: "Failed to scrape data",
      message: error.message,
      stack: error.stack
    });
  }
}
