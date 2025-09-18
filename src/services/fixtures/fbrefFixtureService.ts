// Add this method to your fbrefFixtureService.ts class

/**
 * Get match URLs for completed matches that should have corner data
 */
async getCompletedMatchUrls(): Promise<string[]> {
  if (!this.isCacheValid()) await this.refreshCache();
  
  // Get all fixtures that are completed and have match URLs
  const completedMatches = this.fixturesCache
    .filter(fixture => 
      fixture.status === 'finished' && // Only finished matches have full stats
      // We need to access the internal matchUrl somehow
      // Since the ParsedFixture interface has matchUrl but FeaturedFixtureWithImportance doesn't,
      // we need a different approach
    );
  
  console.log(`[FixtureService] Found ${completedMatches.length} completed matches`);
  
  // Since we can't directly access matchUrl from the transformed fixtures,
  // let's get them from the raw parsed data
  return await this.getMatchUrlsFromRawData();
}

/**
 * Get match URLs by re-parsing the fixtures data
 */
private async getMatchUrlsFromRawData(): Promise<string[]> {
  try {
    console.log('[FixtureService] Getting match URLs from raw fixtures data...');
    const scrapedData = await this.scrapeFixtures();
    
    const fixturesTables = scrapedData.tables.filter(table =>
      table.caption.toLowerCase().includes('fixtures') ||
      table.caption.toLowerCase().includes('schedule') ||
      table.caption.toLowerCase().includes('scores') ||
      table.id.toLowerCase().includes('schedule') ||
      table.id.toLowerCase().includes('fixture')
    );

    const matchUrls: string[] = [];

    fixturesTables.forEach(table => {
      const headers = table.headers.map(h => h.toLowerCase());
      const homeIndex = headers.findIndex(h => h.includes('home'));
      const awayIndex = headers.findIndex(h => h.includes('away'));
      const scoreIndex = headers.findIndex(h => h.includes('score') || h.includes('result'));
      
      // Look for a column that might contain match links
      const linkIndex = headers.findIndex(h => 
        h.includes('match') || 
        h.includes('url') || 
        h.includes('boxscore') ||
        h.includes('report')
      );

      table.rows.forEach(row => {
        if (row.length < 4) return;

        // Check if the match is completed (has a score)
        const scoreStr = scoreIndex >= 0 ? 
          (typeof row[scoreIndex] === 'object' ? row[scoreIndex].text : row[scoreIndex]) : '';
        
        // Only get URLs for completed matches (those with actual scores)
        if (scoreStr && scoreStr.includes('–')) {
          // Try to find match URL in the dedicated link column
          if (linkIndex >= 0 && typeof row[linkIndex] === 'object' && row[linkIndex].link) {
            let url = row[linkIndex].link;
            if (!url.startsWith('https://fbref.com')) {
              url = `https://fbref.com${url}`;
            }
            if (url.includes('/matches/') && !url.endsWith('/matches/')) {
              matchUrls.push(url);
            }
          } else {
            // Fallback: look for any cell in the row that contains a match link
            row.forEach(cell => {
              if (typeof cell === 'object' && cell.link) {
                let url = cell.link;
                if (!url.startsWith('https://fbref.com')) {
                  url = `https://fbref.com${url}`;
                }
                if (url.includes('/matches/') && !url.endsWith('/matches/')) {
                  matchUrls.push(url);
                }
              }
            });
          }
        }
      });
    });

    // Remove duplicates
    const uniqueUrls = [...new Set(matchUrls)];
    console.log(`[FixtureService] Found ${uniqueUrls.length} unique match URLs`);
    
    // Log some examples for debugging
    if (uniqueUrls.length > 0) {
      console.log('[FixtureService] Example match URLs:', uniqueUrls.slice(0, 3));
    }
    
    return uniqueUrls;
  } catch (error) {
    console.error('[FixtureService] Error getting match URLs from raw data:', error);
    return [];
  }
}
