// src/utils/logoUtils.ts

// Team name to exact logo filename mapping (matching your file structure)
const TEAM_LOGO_MAP: Record<string, string> = {
  // Premier League - exact matches to your filenames
  'AFC Bournemouth': 'AFC Bournemouth',
  'Bournemouth': 'AFC Bournemouth',
  'Arsenal': 'Arsenal FC',
  'Arsenal FC': 'Arsenal FC',
  'Aston Villa': 'Aston Villa',
  'Brentford': 'Brentford FC',
  'Brentford FC': 'Brentford FC',
  'Brighton & Hove Albion': 'Brighton & Hove Albion',
  'Brighton': 'Brighton & Hove Albion',
  'Burnley': 'Burnley FC',
  'Burnley FC': 'Burnley FC',
  'Chelsea': 'Chelsea FC',
  'Chelsea FC': 'Chelsea FC',
  'Crystal Palace': 'Crystal Palace',
  'Everton': 'Everton FC',
  'Everton FC': 'Everton FC',
  'Fulham': 'Fulham FC',
  'Fulham FC': 'Fulham FC',
  'Leeds United': 'Leeds United',
  'Leeds': 'Leeds United',
  'Liverpool': 'Liverpool FC',
  'Liverpool FC': 'Liverpool FC',
  'Manchester City': 'Manchester City',
  'Man City': 'Manchester City',
  'Manchester United': 'Manchester United',
  'Man United': 'Manchester United',
  'Man Utd': 'Manchester United',
  'Newcastle United': 'Newcastle United',
  'Newcastle': 'Newcastle United',
  'Nottingham Forest': 'Nottingham Forest',
  'Nott\'m Forest': 'Nottingham Forest',
  'Sunderland': 'Sunderland AFC',
  'Sunderland AFC': 'Sunderland AFC',
  'Tottenham Hotspur': 'Tottenham Hotspur',
  'Tottenham': 'Tottenham Hotspur',
  'Spurs': 'Tottenham Hotspur',
  'West Ham United': 'West Ham United',
  'West Ham': 'West Ham United',
  'Wolverhampton Wanderers': 'Wolverhampton Wanderers',
  'Wolves': 'Wolverhampton Wanderers',
};

/**
 * Get the logo path for a team based on your exact file structure
 * @param teamName - Full team name
 * @param teamId - Team ID (optional)
 * @param shortName - Team short name (optional)
 * @returns Logo path or null if not found
 */
export const getTeamLogoPath = (
  teamName: string, 
  teamId?: string, 
  shortName?: string
): string | null => {
  // Try exact team name match first
  let logoFileName = TEAM_LOGO_MAP[teamName];
  
  // Try short name
  if (!logoFileName && shortName) {
    logoFileName = TEAM_LOGO_MAP[shortName];
  }
  
  // Try fuzzy matching - remove common suffixes and normalize
  if (!logoFileName) {
    const normalizedName = teamName
      .replace(/\s+(FC|AFC)$/i, '') // Remove FC/AFC suffix
      .replace(/\s+United$/i, '') // Try without United
      .trim();
    
    // Check direct match
    logoFileName = TEAM_LOGO_MAP[normalizedName];
    
    // Try adding FC
    if (!logoFileName) {
      logoFileName = TEAM_LOGO_MAP[`${normalizedName} FC`];
    }
    
    // Try adding AFC
    if (!logoFileName) {
      logoFileName = TEAM_LOGO_MAP[`AFC ${normalizedName}`];
    }
  }
  
  return logoFileName ? `/src/Images/Club Logos/${logoFileName}.png` : null;
};

/**
 * Get team logo with fallback to initials
 * @param team - Team object
 * @returns Object with logo path and fallback info
 */
export const getTeamLogo = (team: { name: string; shortName?: string; id?: string }) => {
  const logoPath = getTeamLogoPath(team.name, team.id, team.shortName);
  
  return {
    logoPath,
    fallbackInitial: team.shortName?.charAt(0) || team.name.charAt(0),
    fallbackName: team.shortName || team.name
  };
};
