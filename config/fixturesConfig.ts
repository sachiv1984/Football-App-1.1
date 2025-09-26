// config/fixturesConfig.ts
/**
 * ===============================================================
 * Fixtures Configuration
 * 
 * Manages mapping between scraped data and Supabase database schema
 * ===============================================================
 */

export interface ScrapedFixture {
  date: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  matchStatus: string;
  score?: string | null;
  venue?: string;
  referee?: string;
}

export interface SupabaseFixture {
  id: string;
  datetime: string;  // ISO timestamp
  hometeam: string;
  awayteam: string;
  homescore: number | null;
  awayscore: number | null;
  status: string;
  venue: string | null;
  matchweek: number | null;
  matchurl: string | null;
}

export interface ColumnMapping {
  date: number;
  time: number;
  home: number;
  away: number;
  score: number;
  venue: number;
  referee: number;
}

export class FixturesConfig {
  // FBref column mappings for different table formats
  static readonly COLUMN_MAPPINGS = {
    // Standard fixtures table: Week | Day | Date | Time | Home | xG | Score | xG | Away | Attendance | Venue | Referee | Report | Notes
    STANDARD_14_COLUMN: {
      date: 2,
      time: 3,
      home: 4,
      score: 6,
      away: 8,
      venue: 10,
      referee: 11
    } as ColumnMapping,
    
    // Alternative 8-column format: Day | Date | Time | Home | Score | Away | Venue | Referee
    SIMPLE_8_COLUMN: {
      date: 1,
      time: 2,
      home: 3,
      score: 4,
      away: 5,
      venue: 6,
      referee: 7
    } as ColumnMapping
  };

  // Team name standardization mapping
  static readonly TEAM_NAME_MAPPING: Record<string, string> = {
    // Handle common FBref team name variations
    'Manchester Utd': 'Manchester United',
    'Manchester City': 'Manchester City',
    'Newcastle Utd': 'Newcastle United',
    'Tottenham': 'Tottenham Hotspur',
    'West Ham': 'West Ham United',
    'Brighton': 'Brighton & Hove Albion',
    'Nott\'m Forest': 'Nottingham Forest',
    'Sheffield Utd': 'Sheffield United',
    'Wolves': 'Wolverhampton Wanderers',
    'Leicester City': 'Leicester City',
    // Add more mappings as needed
  };

  // Valid status mappings from scraped status to database status
  static readonly STATUS_MAPPING: Record<string, string> = {
    'scheduled': 'scheduled',
    'completed': 'finished',
    'live': 'live',
    'postponed': 'postponed',
    'upcoming': 'upcoming'
  };

  // Scraping configuration
  static readonly SCRAPING_CONFIG = {
    BASE_URL: 'https://fbref.com',
    FIXTURES_URL: 'https://fbref.com/en/comps/9/schedule/Premier-League-Scores-and-Fixtures',
    USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    EXPECTED_FIXTURES_COUNT: 380,
    EXPECTED_TEAMS_COUNT: 20,
    GAMES_PER_TEAM: 38
  };

  /**
   * Standardize team name using the mapping
   */
  static standardizeTeamName(teamName: string): string {
    return this.TEAM_NAME_MAPPING[teamName] || teamName;
  }

  /**
   * Convert scraped status to database status
   */
  static mapStatus(scrapedStatus: string): string {
    return this.STATUS_MAPPING[scrapedStatus] || 'scheduled';
  }

  /**
   * Generate unique fixture ID
   */
  static generateFixtureId(homeTeam: string, awayTeam: string, date: string): string {
    const home = homeTeam.toLowerCase().replace(/[^a-z0-9]/g, '');
    const away = awayTeam.toLowerCase().replace(/[^a-z0-9]/g, '');
    const dateStr = date.replace(/[^0-9]/g, '');
    return `${home}-${away}-${dateStr}`;
  }

  /**
   * Parse score string into home and away scores
   */
  static parseScore(scoreText: string): { homescore: number | null; awayscore: number | null } {
    if (!scoreText || scoreText === '' || scoreText === 'TBD') {
      return { homescore: null, awayscore: null };
    }

    // Handle different score formats: "2–1", "2-1", "2 - 1", etc.
    const scoreRegex = /(\d+)[\s]*[-–—]\s*(\d+)/;
    const match = scoreText.match(scoreRegex);

    if (match) {
      return {
        homescore: parseInt(match[1], 10),
        awayscore: parseInt(match[2], 10)
      };
    }

    return { homescore: null, awayscore: null };
  }

  /**
   * Parse date and time into ISO timestamp
   */
  static parseDateTime(dateStr: string, timeStr: string): string {
    try {
      // Handle date format: "2025-08-16" or "Sat Aug 16"
      let parsedDate: Date;

      if (dateStr.includes('-')) {
        // ISO format: "2025-08-16"
        parsedDate = new Date(dateStr);
      } else {
        // Other formats - let Date constructor handle it
        parsedDate = new Date(dateStr);
      }

      // Handle time format: "15:00", "3:00 PM", etc.
      let hours = 15; // Default time if parsing fails
      let minutes = 0;

      if (timeStr && timeStr !== 'TBD') {
        const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) {
          hours = parseInt(timeMatch[1], 10);
          minutes = parseInt(timeMatch[2], 10);
        }
      }

      parsedDate.setHours(hours, minutes, 0, 0);

      return parsedDate.toISOString();
    } catch (error) {
      console.warn(`Failed to parse date/time: ${dateStr} ${timeStr}`, error);
      // Return a default date if parsing fails
      return new Date().toISOString();
    }
  }

  /**
   * Calculate match week based on date
   */
  static calculateMatchweek(datetime: string): number {
    // Premier League typically starts in mid-August
    // This is a simple calculation - you might want to make it more sophisticated
    const matchDate = new Date(datetime);
    const seasonStart = new Date(matchDate.getFullYear(), 7, 15); // August 15th
    
    const daysDiff = Math.floor((matchDate.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24));
    const week = Math.floor(daysDiff / 7) + 1;
    
    return Math.max(1, Math.min(38, week)); // Clamp between 1-38
  }

  /**
   * Convert scraped fixture to Supabase format
   */
  static convertToSupabaseFormat(scraped: ScrapedFixture): SupabaseFixture {
    const homeTeam = this.standardizeTeamName(scraped.homeTeam);
    const awayTeam = this.standardizeTeamName(scraped.awayTeam);
    const datetime = this.parseDateTime(scraped.date, scraped.time);
    const { homescore, awayscore } = this.parseScore(scraped.score || '');

    return {
      id: this.generateFixtureId(homeTeam, awayTeam, scraped.date),
      datetime,
      hometeam: homeTeam,
      awayteam: awayTeam,
      homescore,
      awayscore,
      status: this.mapStatus(scraped.matchStatus),
      venue: scraped.venue || null,
      matchweek: this.calculateMatchweek(datetime),
      matchurl: null // Will be populated if we can extract match URLs
    };
  }

  /**
   * Determine column mapping based on table structure
   */
  static detectColumnMapping(headers: string[], rowCount: number): ColumnMapping {
    // Try to detect based on headers first
    const columnMap: Partial<ColumnMapping> = {};
    
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

    // If we have enough mappings, return them
    if (Object.keys(columnMap).length >= 4) {
      return columnMap as ColumnMapping;
    }

    // Otherwise, use positional mapping based on column count
    if (headers.length >= 12) {
      return this.COLUMN_MAPPINGS.STANDARD_14_COLUMN;
    } else if (headers.length >= 7) {
      return this.COLUMN_MAPPINGS.SIMPLE_8_COLUMN;
    }

    // Fallback to standard mapping
    return this.COLUMN_MAPPINGS.STANDARD_14_COLUMN;
  }

  /**
   * Validate fixture data before database insertion
   */
  static validateFixture(fixture: SupabaseFixture): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!fixture.id) errors.push('Missing fixture ID');
    if (!fixture.datetime) errors.push('Missing datetime');
    if (!fixture.hometeam) errors.push('Missing home team');
    if (!fixture.awayteam) errors.push('Missing away team');
    if (fixture.hometeam === fixture.awayteam) errors.push('Home and away teams cannot be the same');
    
    // Validate status
    const validStatuses = ['scheduled', 'live', 'finished', 'postponed', 'upcoming'];
    if (!validStatuses.includes(fixture.status)) {
      errors.push(`Invalid status: ${fixture.status}`);
    }

    // Validate matchweek
    if (fixture.matchweek && (fixture.matchweek < 1 || fixture.matchweek > 38)) {
      errors.push(`Invalid matchweek: ${fixture.matchweek}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
