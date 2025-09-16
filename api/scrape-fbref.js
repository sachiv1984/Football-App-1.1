import { load } from 'cheerio';

// Rate limiting storage (in production, use Redis or database)
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute window
  
  if (!requestLog.has(ip)) {
    requestLog.set(ip, []);
  }
  
  const requests = requestLog.get(ip)!.filter(time => time > windowStart);
  requestLog.set(ip, requests);
  
  return requests.length >= 10; // Max 10 requests per minute
}

function logRequest(ip: string): void {
  if (!requestLog.has(ip)) {
    requestLog.set(ip, []);
  }
  requestLog.get(ip)!.push(Date.now());
}

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { url } = req.query;
  const clientIP = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';

  // Handle case where url might be an array
  const fbrefUrl = Array.isArray(url) ? url[0] : url;

  // Validate URL
  if (!fbrefUrl || !fbrefUrl.startsWith('https://fbref.com/')) {
    return res.status(400).json({ error: 'Invalid or missing FBref URL' });
  }

  // Check rate limiting
  if (isRateLimited(clientIP)) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded. Max 10 requests per minute.',
      retryAfter: 60
    });
  }

  try {
    logRequest(clientIP);

    console.log('Scraping URL:', fbrefUrl);
    
    const response = await fetch(fbrefUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DataScraper/1.0; Educational purpose)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      // @ts-ignore - Node fetch doesn't have timeout param by default
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);

    // Extract page title
    const pageTitle = $('title').text().trim();

    // Extract data from tables
    const extractedData: any[] = [];
    
    $('table.stats_table').each((index, element) => {
      const $table = $(element);
      
      const tableData = {
        id: $table.attr('id') || `table-${index}`,
        caption: $table.find('caption').text().trim() || `Table ${index + 1}`,
        headers: [] as string[],
        rows: [] as (string | { text: string; link?: string })[][]
      };
      
      // Extract headers (use the last header row to get the most specific headers)
      const $headerRow = $table.find('thead tr').last();
      $headerRow.find('th').each((i, th) => {
        tableData.headers.push($(th).text().trim());
      });
      
      // Extract data rows
      $table.find('tbody tr').each((i, tr) => {
        const $row = $(tr);
        const rowData: (string | { text: string; link?: string })[] = [];
        
        $row.find('td, th').each((j, cell) => {
          const $cell = $(cell);
          let cellText: string | { text: string; link?: string } = $cell.text().trim();
          
          // Also extract href if it's a link
          const link = $cell.find('a').first().attr('href');
          if (link && link.startsWith('/')) {
            cellText = {
              text: $cell.text().trim(),
              link: `https://fbref.com${link}`
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

    if (extractedData.length === 0) {
      return res.status(404).json({ error: 'No data tables found on the page' });
    }

    res.status(200).json({
      success: true,
      url: fbrefUrl,
      pageTitle,
      scraped_at: new Date().toISOString(),
      tables: extractedData,
      total_tables: extractedData.length
    });

  } catch (error: any) {
    console.error('Scraping error:', error);
    res.status(500).json({ 
      error: 'Failed to scrape data',
      message: error.message 
    });
  }
}
