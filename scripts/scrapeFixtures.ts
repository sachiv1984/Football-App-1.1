// scripts/scrapeAndUpload.ts
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// List of FBref fixture URLs
const urls = [
  'https://fbref.com/en/comps/9/schedule/Premier-League-Scores-and-Fixtures',
  // add more URLs if needed
];

async function scrapePage(url: string) {
  const apiUrl = `http://localhost:3000/api/scrape-fbref?url=${encodeURIComponent(url)}`;
  const res = await fetch(apiUrl);
  if (!res.ok) throw new Error(`API call failed for ${url}: ${res.status}`);
  const data = await res.json();
  return data;
}

function cleanAndMapTable(table: any) {
  // Map each row to your schema
  return table.rows
    .filter((row: any[]) => {
      const wk = row[0];
      return wk && wk !== '-' && wk !== '';
    })
    .map((row: any[]) => {
      const dateCell = row[2]; // usually a CellData object
      const homeTeam = row[4];
      const awayTeam = row[8];
      const homeScore = parseInt(row[6]) || null;
      const awayScore = parseInt(row[7]) || null;
      const status = homeScore !== null && awayScore !== null ? 'FT' : 'NS';
      const venue = row[10] || '';
      const matchweek = parseInt(row[0]) || null;
      const matchurl = typeof dateCell === 'object' && dateCell.link ? dateCell.link : '';

      return {
        datetime: dateCell && typeof dateCell === 'object' ? dateCell.text : '',
        hometeam: homeTeam || '',
        awayteam: awayTeam || '',
        homescore: homeScore,
        awayscore: awayScore,
        status,
        venue,
        matchweek,
        matchurl,
      };
    });
}

async function main() {
  const allMatches: any[] = [];

  for (const url of urls) {
    try {
      console.log('Scraping:', url);
      const scraped = await scrapePage(url);

      if (scraped.success && scraped.tables) {
        scraped.tables.forEach((table: any) => {
          const mappedRows = cleanAndMapTable(table);
          allMatches.push(...mappedRows);
        });
      }
    } catch (err) {
      console.error('Error scraping page:', url, err);
    }
  }

  console.log(`Total matches after cleaning: ${allMatches.length}`);

  // Save local JSON backup
  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
  const filePath = path.join(dataDir, 'fixtures.json');
  fs.writeFileSync(filePath, JSON.stringify(allMatches, null, 2));
  console.log('Saved JSON backup to:', filePath);

  // Upload to Supabase
  // Clear existing data first (optional)
  const { error: delError } = await supabase.from('fixtures').delete().neq('matchweek', -1);
  if (delError) console.error('Error clearing existing fixtures:', delError);

  // Insert new data
  const { error: insertError } = await supabase.from('fixtures').insert(allMatches);
  if (insertError) {
    console.error('Supabase insert error:', insertError);
  } else {
    console.log('Fixtures uploaded successfully to Supabase');
  }
}

main().catch(console.error);
