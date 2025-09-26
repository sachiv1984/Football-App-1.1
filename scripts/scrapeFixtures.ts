// scripts/scrapeFixtures.ts
/**
 * ===============================================================
 * FBref Fixtures Scraper - Using Working React Component Logic
 *
 * This version uses the same successful approach as the React component
 * that extracts table data and then processes it for fixtures.
 * ===============================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

/* ------------------ Path Setup ------------------ */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE_NAME = 'Fixtures.json';

/* ------------------ Configuration ------------------ */
const FBREF_FIXTURES_URL = 'https://fbref.com/en/comps/9/schedule/Premier-League-Scores-and-Fixtures';

/* ------------------ Interfaces ------------------ */
interface CellData {
  text: string;
  link?: string;
}

interface TableData {
  id: string;
  caption: string;
  headers: string[];
  rows: (string | CellData)[][];
}

interface Fixture {
  date: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  matchStatus: string;
  score?: string | null;
  venue?: string;
  referee?: string;
}

/* ------------------ Scraper Class ------------------ */
class FixturesScraper {
  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  async scrape() {
    console.log('🚀 Starting fixture scraping...');

    try {
      const html = await this.fetchHtml(FBREF_FIXTURES_URL);
      console.log('✅ HTML fetched successfully');

      const $ = cheerio.load(html);
      const pageTitle = $('title').text();
      console.log(`📄 Page title: "${pageTitle}"`);

      // Extract all tables using the same logic as the React component
      const tables = this.extractTables($);
      console.log(`📊 Found ${tables.length} tables on page`);

      // Find the fixtures table
      const fixturesTable = this.findFixturesTable(tables);
      
      if (!fixturesTable) {
        console.warn('❌ No fixtures table found');
        this.debugTables(tables);
        return;
      }

      console.log(`✅ Found fixtures table: "${fixturesTable.caption}"`);
      console.log(`📈 Table has ${fixturesTable.rows.length} rows and ${fixturesTable.headers.length} columns`);

      // Convert table data to fixtures
      const fixtures = this.convertTableToFixtures(fixturesTable);
      
      console.log(`\n📊 SCRAPING RESULTS:`);
      console.log(`  - Extracted fixtures: ${fixtures.length}`);
      
      if (fixtures.length === 0) {
        console.error('❌ No fixtures extracted - aborting save');
        console.log('\n🔧 DEBUG: Table structure:');
        console.log(`  - Headers: ${fixturesTable.headers.join(' | ')}`);
        console.log(`  - First 3 rows:`);
        fixturesTable.rows.slice(0, 3).forEach((row, i) => {
          console.log(`    Row ${i}: ${row.map(cell => typeof cell === 'object' ? cell.text : cell).join(' | ')}`);
        });
        return;
      }
      
      this.validateFixtureCount(fixtures);
      this.saveFixtures(fixtures);
      
      console.log(`\n🎉 FINAL SUCCESS SUMMARY:`);
      console.log(`  - Scraped: ${fixtures.length} fixtures`);
      console.log(`  - Source: ${FBREF_FIXTURES_URL}`);
      console.log(`  - Table: ${fixturesTable.caption}`);
      console.log(`  - File: ${FILE_NAME}`);
      console.log(`✅ Scraping completed successfully!`);

    } catch (error) {
      console.error(`❌ Scraping failed: ${error}`);
    }
  }

  private async fetchHtml(url: string): Promise<string> {
    console.log(`🔍 Fetching: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    return response.text();
  }

  private extractTables($: cheerio.CheerioAPI): TableData[] {
    const tables: TableData[] = [];

    $('table').each((_, tableElement) => {
      const $table = $(tableElement);
      const id = $table.attr('id') || `table-${tables.length}`;
      
      // Get table caption/title
      let caption = $table.find('caption').text().trim();
      if (!caption) {
        caption = $table.prev('h2').text().trim() || 
                 $table.closest('div').find('h2, h3').first().text().trim() || 
                 `Table ${tables.length + 1}`;
      }

      // Extract headers
      const headers: string[] = [];
      $table.find('thead th, thead td').each((_, headerElement) => {
        const headerText = $(headerElement).text().trim();
        headers.push(headerText);
      });

      // If no thead, try first row
      if (headers.length === 0) {
        $table.find('tbody tr:first th, tbody tr:first td').each((_, headerElement) => {
          const headerText = $(headerElement).text().trim();
          headers.push(headerText);
        });
      }

      // Extract rows
      const rows: (string | CellData)[][] = [];
      const selector = headers.length === 0 ? 'tbody tr, tr' : 'tbody tr:not(:first), tr:not(:first)';
      
      $table.find(selector).each((_, rowElement) => {
        const $row = $(rowElement);
        const rowData: (string | CellData)[] = [];
        
        $row.find('td, th').each((_, cellElement) => {
          const $cell = $(cellElement);
          const text = $cell.text().trim();
          const link = $cell.find('a').attr('href');
          
          if (link && link.startsWith('/')) {
            rowData.push({ text, link: `https://fbref.com${link}` });
          } else if (link && link.startsWith('http')) {
            rowData.push({ text, link });
          } else {
            rowData.push(text);
          }
        });

        if (rowData.length > 0) {
          rows.push(rowData);
        }
      });

      // Only include tables with meaningful data
      if (headers.length > 0 && rows.length > 0) {
        tables.push({ id, caption, headers, rows });
      }
    });

    return tables;
  }

  private findFixturesTable(tables: TableData[]): TableData | null {
    // Look for tables that contain fixture data
    for (const table of tables) {
      const caption = table.caption.toLowerCase();
      const headers = table.headers.map(h => h.toLowerCase()).join(' ');
      
      // Check if this looks like a fixtures table
      const hasFixtureIndicators = (
        caption.includes('fixture') ||
        caption.includes('schedule') ||
        caption.includes('scores') ||
        headers.includes('date') ||
        headers.includes('time') ||
        headers.includes('home') ||
        headers.includes('away')
      );

      if (hasFixtureIndicators && table.rows.length > 50) {
        console.log(`🎯 Found potential fixtures table: "${table.caption}"`);
        console.log(`   Headers: ${table.headers.join(', ')}`);
        console.log(`   Rows: ${table.rows.length}`);
        return table;
      }
    }

    return null;
  }

  private convertTableToFixtures(table: TableData): Fixture[] {
    const fixtures: Fixture[] = [];
    const seenFixtures = new Set<string>();

    console.log(`\n🔄 Converting table to fixtures...`);
    console.log(`📋 Headers: ${table.headers.join(' | ')}`);

    // Try to identify column indices
    const columnMap = this.identifyColumns(table.headers);
    console.log(`🗺️ Column mapping:`, columnMap);

    let validCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < table.rows.length; i++) {
      const row = table.rows[i];
      
      if (i < 5) {
        console.log(`\n--- Row ${i} ---`);
        row.forEach((cell, idx) => {
          const cellText = typeof cell === 'object' ? cell.text : cell;
          console.log(`  [${idx}]: "${cellText}"`);
        });
      }

      const fixture = this.extractFixtureFromRow(row, columnMap);
      
      if (fixture) {
        const fixtureKey = `${fixture.date}-${fixture.homeTeam}-${fixture.awayTeam}`;
        
        if (!seenFixtures.has(fixtureKey)) {
          seenFixtures.add(fixtureKey);
          fixtures.push(fixture);
          validCount++;
          
          if (validCount <= 5) {
            console.log(`✅ Valid fixture: ${fixture.homeTeam} vs ${fixture.awayTeam} on ${fixture.date}`);
          }
        }
      } else {
        skippedCount++;
      }
    }

    console.log(`\n📈 Conversion summary:`);
    console.log(`  - Total rows: ${table.rows.length}`);
    console.log(`  - Valid fixtures: ${validCount}`);
    console.log(`  - Skipped rows: ${skippedCount}`);

    return fixtures;
  }

  private identifyColumns(headers: string[]): Record<string, number> {
    const columnMap: Record<string, number> = {};
    
    headers.forEach((header, index) => {
      const lowerHeader = header.toLowerCase();
      
      if (lowerHeader.includes('date')) columnMap.date = index;
      if (lowerHeader.includes('time')) columnMap.time = index;
      if (lowerHeader.includes('home')) columnMap.home = index;
      if (lowerHeader.includes('away')) columnMap.away = index;
      if (lowerHeader.includes('score') || lowerHeader === 'score') columnMap.score = index;
      if (lowerHeader.includes('venue')) columnMap.venue = index;
      if (lowerHeader.includes('referee')) columnMap.referee = index;
    });

    // If no explicit headers found, use common FBref patterns
    if (Object.keys(columnMap).length < 3) {
      console.log('🔍 No clear headers found, using positional mapping...');
      // Common pattern: Day | Date | Time | Home | xG | Score | xG | Away | ...
      if (headers.length >= 8) {
        columnMap.date = 1;
        columnMap.time = 2;
        columnMap.home = 3;
        columnMap.score = 5;
        columnMap.away = 7;
        if (headers.length > 9) columnMap.venue = 9;
        if (headers.length > 10) columnMap.referee = 10;
      }
    }

    return columnMap;
  }

  private extractFixtureFromRow(row: (string | CellData)[], columnMap: Record<string, number>): Fixture | null {
    const getCellText = (index: number): string => {
      if (index < 0 || index >= row.length) return '';
      const cell = row[index];
      return typeof cell === 'object' ? cell.text : cell;
    };

    const date = getCellText(columnMap.date || 1).trim();
    const time = getCellText(columnMap.time || 2).trim();
    const homeTeam = getCellText(columnMap.home || 3).trim();
    const awayTeam = getCellText(columnMap.away || 7).trim();
    const score = getCellText(columnMap.score || 5).trim();
    const venue = getCellText(columnMap.venue || 9).trim();
    const referee = getCellText(columnMap.referee || 10).trim();

    // Validate required fields
    if (!date || !homeTeam || !awayTeam) {
      return null;
    }

    // Skip obviously invalid data
    if (homeTeam.length < 3 || awayTeam.length < 3) {
      return null;
    }

    if (homeTeam.toLowerCase().includes('squad') || awayTeam.toLowerCase().includes('squad')) {
      return null;
    }

    return {
      date,
      time: time || 'TBD',
      homeTeam,
      awayTeam,
      matchStatus: this.determineMatchStatus(score),
      score: score || null,
      venue: venue || undefined,
      referee: referee || undefined
    };
  }

  private determineMatchStatus(scoreText: string): string {
    if (!scoreText || scoreText === '' || scoreText === 'TBD') {
      return 'scheduled';
    } else if (scoreText.includes('–') || scoreText.includes('-') || /\d+.*\d+/.test(scoreText)) {
      return 'completed';
    } else {
      return 'scheduled';
    }
  }

  private validateFixtureCount(fixtures: Fixture[]) {
    if (fixtures.length !== 380) {
      console.warn(`⚠️ Warning: Expected 380 fixtures, but found ${fixtures.length}`);
      
      // Analyze team distribution
      const teamCounts = new Map<string, number>();
      fixtures.forEach(fixture => {
        teamCounts.set(fixture.homeTeam, (teamCounts.get(fixture.homeTeam) || 0) + 1);
        teamCounts.set(fixture.awayTeam, (teamCounts.get(fixture.awayTeam) || 0) + 1);
      });

      console.log(`📊 Analysis:`);
      console.log(`  - Unique teams: ${teamCounts.size}`);
      console.log(`  - Expected teams: 20`);
      
      if (teamCounts.size > 0) {
        const avgGamesPerTeam = Array.from(teamCounts.values()).reduce((a, b) => a + b, 0) / teamCounts.size;
        console.log(`  - Average games per team: ${avgGamesPerTeam.toFixed(1)} (expected: 38)`);
      }
    } else {
      console.log('✅ Fixture count looks correct (380 fixtures)');
    }
  }

  private debugTables(tables: TableData[]) {
    console.log('\n🔧 Available tables:');
    tables.forEach((table, index) => {
      console.log(`  ${index + 1}. "${table.caption}" (${table.rows.length} rows, ${table.headers.length} cols)`);
      console.log(`     Headers: ${table.headers.slice(0, 5).join(', ')}${table.headers.length > 5 ? '...' : ''}`);
    });
  }

  private saveFixtures(fixtures: Fixture[]) {
    console.log(`\n💾 STARTING SAVE PROCESS:`);
    console.log(`  - Current working directory: ${process.cwd()}`);
    console.log(`  - Script directory: ${__dirname}`);
    console.log(`  - Target data directory: ${DATA_DIR}`);
    console.log(`  - Target file path: ${path.join(DATA_DIR, FILE_NAME)}`);
    console.log(`  - Fixtures to save: ${fixtures.length}`);

    this.ensureDataDir();
    
    // Verify data directory was created
    console.log(`  - Data directory exists: ${fs.existsSync(DATA_DIR)}`);
    if (fs.existsSync(DATA_DIR)) {
      const dirStats = fs.statSync(DATA_DIR);
      console.log(`  - Data directory is writable: ${dirStats.isDirectory()}`);
    }

    const filePath = path.join(DATA_DIR, FILE_NAME);
    
    try {
      console.log(`📝 Preparing JSON data...`);
      const jsonData = JSON.stringify(fixtures, null, 2);
      console.log(`  - JSON data size: ${jsonData.length} characters`);
      
      console.log(`💾 Writing file to: ${filePath}`);
      fs.writeFileSync(filePath, jsonData, 'utf8');
      
      // Verify file was written
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`✅ SUCCESS: File saved successfully!`);
        console.log(`  - File path: ${filePath}`);
        console.log(`  - File size: ${stats.size} bytes`);
        console.log(`  - File modified: ${stats.mtime}`);
        
        // Verify file content
        const savedContent = fs.readFileSync(filePath, 'utf8');
        const parsedContent = JSON.parse(savedContent);
        console.log(`  - Verified fixtures in file: ${parsedContent.length}`);
        
        // Preview first few fixtures
        console.log(`\n🔍 Preview (first 3 fixtures):`);
        fixtures.slice(0, 3).forEach((fixture, i) => {
          console.log(`  ${i + 1}. ${fixture.date} ${fixture.time} - ${fixture.homeTeam} vs ${fixture.awayTeam}`);
        });
        
      } else {
        console.error(`❌ ERROR: File was not created at ${filePath}`);
        throw new Error('File was not created');
      }
      
    } catch (error) {
      console.error(`❌ Primary save failed: ${error}`);
      console.error(`Stack trace: ${(error as Error).stack}`);
      
      // Try multiple alternative locations
      const alternativeLocations = [
        path.join(process.cwd(), 'data', FILE_NAME),
        path.join(process.cwd(), FILE_NAME),
        path.join(__dirname, FILE_NAME),
        path.join(__dirname, '..', FILE_NAME)
      ];
      
      console.log(`🔄 Trying alternative locations...`);
      
      for (const altPath of alternativeLocations) {
        try {
          console.log(`  Trying: ${altPath}`);
          
          // Ensure directory exists
          const altDir = path.dirname(altPath);
          if (!fs.existsSync(altDir)) {
            fs.mkdirSync(altDir, { recursive: true });
          }
          
          fs.writeFileSync(altPath, JSON.stringify(fixtures, null, 2), 'utf8');
          
          if (fs.existsSync(altPath)) {
            const stats = fs.statSync(altPath);
            console.log(`✅ SUCCESS: Alternative save worked!`);
            console.log(`  - File path: ${altPath}`);
            console.log(`  - File size: ${stats.size} bytes`);
            return; // Exit on success
          }
        } catch (altError) {
          console.log(`  ❌ Failed: ${altError.message}`);
        }
      }
      
      console.error(`❌ ALL SAVE ATTEMPTS FAILED!`);
      process.exit(1);
    }
  }
}

/* ------------------ Main Execution ------------------ */
async function main() {
  const scraper = new FixturesScraper();
  await scraper.scrape();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
