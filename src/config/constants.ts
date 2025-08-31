// src/config/constants.ts
export const API_CONFIG = {
  SPORTS_DB_BASE_URL: 'https://www.thesportsdb.com/api/v1/json/3',
  PREMIER_LEAGUE_ID: '4328',
  CACHE_TIMEOUT: 5 * 60 * 1000, // 5 minutes
  DEFAULT_FEATURED_FIXTURES_COUNT: 8,
  MAX_TEAM_NAME_LENGTH: 12,
} as const;

export const REFRESH_INTERVALS = {
  FEATURED_FIXTURES: 2 * 60 * 1000, // 2 minutes
  ALL_FIXTURES: 5 * 60 * 1000, // 5 minutes
} as const;
