// config/fixtureConfigs.ts
/**
 * Configuration file for Supabase table mappings
 * This file defines how scraped fixtures map to Supabase database tables
 */

export interface SupabaseTableConfig {
  tableName: string;
  fieldMappings: {
    // Common fields that exist in all tables
    common: Record<string, string>;
    // Team-specific stat fields (for fixtures this is empty)
    team?: Record<string, string>;
    // Opponent-specific stat fields (for fixtures this is empty)
    opponent?: Record<string, string>;
  };
}

export const SUPABASE_CONFIGS: Record<string, SupabaseTableConfig> = {
  fixtures: {
    tableName: 'fixtures',
    fieldMappings: {
      common: {
        'Date': 'match_date',        // YYYY-MM-DD
        'Time': 'match_time',        // HH:MM (optional)
        'HomeTeam': 'hometeam',
        'AwayTeam': 'awayteam',
        'Score': 'score',            // raw score string, e.g. "2–1"
        'HomeScore': 'homescore',    // numeric
        'AwayScore': 'awayscore',    // numeric
        'Venue': 'venue',
        'Matchweek': 'matchweek',
        'MatchURL': 'matchurl',
        'Status': 'status'           // scheduled, finished, etc.
      }
    }
  }
};
