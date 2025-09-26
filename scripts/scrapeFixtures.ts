// scripts/scrapeFixtures.ts
/**
 * ===============================================================
 * FBref Fixtures Scraper with Supabase Integration
 *
 * Scrapes Premier League fixtures from FBref and upserts to Supabase
 * Uses configuration file for mapping and standardization
 * ===============================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import { FixturesConfig, type ScrapedFixture, type SupabaseFixture, type ColumnMapping } from '../config/fixturesConfig.js';

/* ------------------ Path Setup ------------------ */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = process.cwd();
const DATA_DIR = path.join(PROJECT_ROOT, 'data');
const FILE_NAME = 'Fixtures.json';

/* ------------------ Supabase Setup ------------------ */
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

/* ------------------ Scraper Class ------------------ */
class SupabaseFixturesScraper {
  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  async scrape() {
    console.log('🚀 Starting Premier League fixtures scraping...');
    console.log(`📡 Supabase URL: ${SUPABASE_URL ? 'Connected' : 'Missing'}`);
    console.log(`🔑 Service Key: ${SUPABASE_SERVICE_ROLE_KEY ? 'Present' : 'Missing'}`);

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase credentials. Please check environment variables.');
      return;
    }

    try {
      const html = await this.fetchHtml(FixturesConfig.SCRAPING_CONFIG.FIXTURES_URL);
      console.log('✅ HTML fetched successfully');

      const $ = cheerio.load(html);
      const pageTitle = $('title').text();
      console.log(`📄 Page title: "${pageTitle}"`);

      // Extract all tables
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
      const scrapedFixtures = this.convertTableToFixtures(fixturesTable);
      
      if (scrapedFixtures.length === 0) {
        console.warn('⚠️ No valid fixtures extracted from table');
        return;
      }

      console.log(`📊 Scraped ${scrapedFixtures.length} fixtures`);

      // Convert to Supabase format
      const supabaseFixtures = this.convertToSupabaseFormat(scrapedFixtures);
      console.log(`🔄 Converted ${supabaseFixtures.length} fixtures for database`);

      // Save to file (backup)
      await this.saveToFile(scrapedFixtures);

      // Upsert to Supabase
      await this.upsertToSupabase(supabaseFixtures);

      console.log(`\n🎉 SCRAPING COMPLETED SUCCESSFULLY!`);
      console.log(`  - Scraped: ${scrapedFixtures.length} fixtures`);
      console.log(`  - Database: Updated via upsert`);
      console.log(`  - Backup: Saved to ${FILE_NAME}`);

    } catch (error) {
      console.error(`❌ Scraping failed: ${error}`);
      if (error instanceof Error) {
        console.error(`Stack trace: ${error.stack}`);
      }
    }
  }

  private async fetchHtml(url: string): Promise<string> {
    console.log(`🔍 Fetching: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': FixturesConfig.SCRAPING_CONFIG.USER_AGENT
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
            rowData.push({ text, link: `${FixturesConfig.SCRAPING_CONFIG.BASE_URL}${link}` });
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

  private convertTableToFixtures(table: TableData): ScrapedFixture[] {
    const fixtures: ScrapedFixture[] = [];
    const seenFixtures = new Set<string>();

    console.log(`\n🔄 Converting table to fixtures...`);
    console.log(`📋 Headers: ${table.headers.join(' | ')}`);

    // Use config to detect column mapping
    const columnMap = FixturesConfig.detectColumnMapping(table.headers, table.rows.length);
    console.log(`🗺️ Column mapping:`, columnMap);

    let validCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < Math.min(table.rows.length, 5); i++) {
      const row = table.rows[i];
      console.log(`\n--- Sample Row ${i} ---`);
      row.forEach((cell, idx) => {
        const cellText = typeof cell === 'object' ? cell.text : cell;
        console.log(`  [${idx}]: "${cellText}"`);
      });
    }

    for (let i = 0; i < table.rows.length; i++) {
      const row = table.rows[i];
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

  private extractFixtureFromRow(row: (string | CellData)[], columnMap: ColumnMapping): ScrapedFixture | null {
    const getCellText = (index: number): string => {
      if (index < 0 || index >= row.length) return '';
      const cell = row[index];
      return typeof cell === 'object' ? cell.text : cell;
    };

    const getCellLink = (index: number): string | undefined => {
      if (index < 0 || index >= row.length) return undefined;
      const cell = row[index];
      return typeof cell === 'object' ? cell.link : undefined;
    };

    const date = getCellText(columnMap.date).trim();
    const time = getCellText(columnMap.time).trim();
    const homeTeam = getCellText(columnMap.home).trim();
    const awayTeam = getCellText(columnMap.away).trim();
    const score = getCellText(columnMap.score).trim();
    const venue = getCellText(columnMap.venue).trim();
    const referee = getCellText(columnMap.referee).trim();

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

  private convertToSupabaseFormat(scrapedFixtures: ScrapedFixture[]): SupabaseFixture[] {
    console.log(`\n🔄 Converting ${scrapedFixtures.length} fixtures to Supabase format...`);
    
    const supabaseFixtures: SupabaseFixture[] = [];
    let validCount = 0;
    let invalidCount = 0;

    for (const scraped of scrapedFixtures) {
      try {
        const converted = FixturesConfig.convertToSupabaseFormat(scraped);
        const validation = FixturesConfig.validateFixture(converted);

        if (validation.valid) {
          supabaseFixtures.push(converted);
          validCount++;

          if (validCount <= 3) {
            console.log(`✅ Converted: ${converted.hometeam} vs ${converted.awayteam} (${converted.datetime})`);
          }
        } else {
          console.warn(`❌ Invalid fixture: ${scraped.homeTeam} vs ${scraped.awayTeam}`);
          console.warn(`   Errors: ${validation.errors.join(', ')}`);
          invalidCount++;
        }
      } catch (error) {
        console.error(`❌ Conversion failed for: ${scraped.homeTeam} vs ${scraped.awayTeam}`, error);
        invalidCount++;
      }
    }

    console.log(`📊 Conversion results: ${validCount} valid, ${invalidCount} invalid`);
    this.validateFixtureCount(supabaseFixtures);

    return supabaseFixtures;
  }

  private async upsertToSupabase(fixtures: SupabaseFixture[]): Promise<void> {
    console.log(`\n📡 Upserting ${fixtures.length} fixtures to Supabase...`);

    try {
      // Test connection first
      const { data: testData, error: testError } = await supabase
        .from('fixtures')
        .select('count')
        .limit(1);

      if (testError) {
        throw new Error(`Supabase connection test failed: ${testError.message}`);
      }

      console.log('✅ Supabase connection verified');

      // Batch upsert fixtures (Supabase has a limit, so we'll do chunks of 100)
      const batchSize = 100;
      let upsertedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < fixtures.length; i += batchSize) {
        const batch = fixtures.slice(i, i + batchSize);
        
        console.log(`📦 Upserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(fixtures.length / batchSize)} (${batch.length} fixtures)...`);

        const { data, error } = await supabase
          .from('fixtures')
          .upsert(batch, {
            onConflict: 'id',
            ignoreDuplicates: false
          });

        if (error) {
          console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, error.message);
          errorCount += batch.length;
        } else {
          console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} completed successfully`);
          upsertedCount += batch.length;
        }
      }

      console.log(`\n📊 Upsert summary:`);
      console.log(`  - Successfully upserted: ${upsertedCount}`);
      console.log(`  - Failed: ${errorCount}`);
      console.log(`  - Total processed: ${fixtures.length}`);

      if (errorCount > 0) {
        console.warn(`⚠️ ${errorCount} fixtures failed to upsert`);
      } else {
        console.log('🎉 All fixtures upserted successfully!');
      }

    } catch (error) {
      console.error(`❌ Supabase upsert failed: ${error}`);
      if (error instanceof Error) {
        console.error(`Details: ${error.message}`);
      }
      throw error;
    }
  }

  private validateFixtureCount(fixtures: SupabaseFixture[]) {
    const expectedCount = FixturesConfig.SCRAPING_CONFIG.EXPECTED_FIXTURES_COUNT;
    
    if (fixtures.length !== expectedCount) {
      console.warn(`⚠️ Warning: Expected ${expectedCount} fixtures, but got ${fixtures.length}`);
      
      // Analyze team distribution
      const teamCounts = new Map<string, number>();
      fixtures.forEach(fixture => {
        teamCounts.set(fixture.hometeam, (teamCounts.get(fixture.hometeam) || 0) + 1);
        teamCounts.set(fixture.awayteam, (teamCounts.get(fixture.awayteam) || 0) + 1);
      });

      console.log(`📊 Analysis:`);
      console.log(`  - Unique teams: ${teamCounts.size} (expected: ${FixturesConfig.SCRAPING_CONFIG.EXPECTED_TEAMS_COUNT})`);
      
      if (teamCounts.size > 0) {
        const avgGamesPerTeam = Array.from(teamCounts.values()).reduce((a, b) => a + b, 0) / teamCounts.size;
        console.log(`  - Average games per team: ${avgGamesPerTeam.toFixed(1)} (expected: ${FixturesConfig.SCRAPING_CONFIG.GAMES_PER_TEAM})`);
      }
    } else {
      console.log(`✅ Fixture count looks correct (${expectedCount} fixtures)`);
    }
  }

  private debugTables(tables: TableData[]) {
    console.log('\n🔧 Available tables:');
    tables.forEach((table, index) => {
      console.log(`  ${index + 1}. "${table.caption}" (${table.rows.length} rows, ${table.headers.length} cols)`);
      console.log(`     Headers: ${table.headers.slice(0, 5).join(', ')}${table.headers.length > 5 ? '...' : ''}`);
    });
  }

  private async saveToFile(fixtures: ScrapedFixture[]) {
    console.log(`\n💾 Saving backup to file...`);
    this.ensureDataDir();
    
    const filePath = path.join(DATA_DIR, FILE_NAME);
    
    try {
      const jsonData = JSON.stringify(fixtures, null, 2);
      fs.writeFileSync(filePath, jsonData, 'utf8');
      
      const stats = fs.statSync(filePath);
      console.log(`✅ Backup saved: ${filePath} (${stats.size} bytes)`);
      
    } catch (error) {
      console.error(`❌ Failed to save backup file: ${error}`);
      // Don't throw - backup failure shouldn't stop the process
    }
  }
}

/* ------------------ Main Execution ------------------ */
async function main() {
  const scraper = new SupabaseFixturesScraper();
  await scraper.scrape();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
