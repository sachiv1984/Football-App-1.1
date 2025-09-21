// scripts/debugTeamStats.ts
/**
 * Debug version - tests single team/stat combination
 * Use this to debug parsing issues before running full scraper
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

/* ------------------ Configuration ------------------ */
const FBREF_BASE_URL = 'https://fbref.com/en/squads';
const SEASON = '2025-2026';

// Available teams for testing
const AVAILABLE_TEAMS = [
  { id: 'arsenal', name: 'Arsenal', fbrefId: '18bb7c10' },
  { id: 'aston-villa', name: 'Aston Villa', fbrefId: '8602292d' },
  { id: 'bournemouth', name: 'Bournemouth', fbrefId: '4ba7cbea' },
  { id: 'brentford', name: 'Brentford', fbrefId: 'cd051869' },
  { id: 'brighton', name: 'Brighton & Hove Albion', fbrefId: 'd07537b9' },
  { id: 'burnley', name: 'Burnley', fbrefId: '943e8050' },
  { id: 'chelsea', name: 'Chelsea', fbrefId: 'cff3d9bb' },
  { id: 'crystal-palace', name: 'Crystal Palace', fbrefId: '47c64c55' },
  { id: 'everton', name: 'Everton', fbrefId: 'd3fd31cc' },
  { id: 'fulham', name: 'Fulham', fbrefId: 'fd962109' },
  { id: 'leeds-united', name: 'Leeds United', fbrefId: '5bfb9659' },
  { id: 'liverpool', name: 'Liverpool', fbrefId: '822bd0ba' },
  { id: 'manchester-city', name: 'Manchester City', fbrefId: 'b8fd03ef' },
  { id: 'manchester-united', name: 'Manchester United', fbrefId: '19538871' },
  { id: 'newcastle-united', name: 'Newcastle United', fbrefId: 'b2b47a98' },
  { id: 'nottingham-forest', name: "Nottingham Forest", fbrefId: 'e4a775cb' },
  { id: 'sunderland', name: 'Sunderland', fbrefId: '4a2215db' },
  { id: 'tottenham', name: 'Tottenham Hotspur', fbrefId: '361ca564' },
  { id: 'west-ham', name: 'West Ham United', fbrefId: '7c21e445' },
  { id: 'wolves', name: 'Wolverhampton Wanderers', fbrefId: '8cec06e1' }
];

const AVAILABLE_STATS = [
  { key: 'shooting', name: 'Shooting', tableName: 'team_shooting_stats' },
  { key: 'keeper', name: 'Goalkeeper', tableName: 'team_keeper_stats' },
  { key: 'passing', name: 'Passing', tableName: 'team_passing_stats' },
  { key: 'passing_types', name: 'Passing Types', tableName: 'team_passing_types_stats' },
  { key: 'gca', name: 'Goal and Shot Creation', tableName: 'team_gca_stats' },
  { key: 'defense', name: 'Defense', tableName: 'team_defense_stats' },
  { key: 'misc', name: 'Miscellaneous', tableName: 'team_misc_stats' }
];

// TEST CONFIGURATION - Change these to test different combinations
const TEST_TEAM_INDEX = 0;  // 0 = Arsenal, 1 = Aston Villa, etc.
const TEST_STAT_INDEX = 0;