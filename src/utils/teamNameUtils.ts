// src/utils/teamNameUtils.ts
export const TEAM_ABBREVIATIONS: { [key: string]: string } = {
  'Manchester United': 'Man Utd',
  'Manchester City': 'Man City',
  'Tottenham Hotspur': 'Tottenham',
  'Brighton & Hove Albion': 'Brighton',
  'Sheffield United': 'Sheffield Utd',
  'West Ham United': 'West Ham',
  'Newcastle United': 'Newcastle',
  'Wolverhampton Wanderers': 'Wolves',
  'Leicester City': 'Leicester',
  'Crystal Palace': 'Crystal Palace',
  'Nottingham Forest': "Nott'm Forest",
  'AFC Bournemouth': 'Bournemouth',
  'Luton Town': 'Luton',
  'Aston Villa': 'Villa',
  'Fulham': 'Fulham',
  'Brentford': 'Brentford',
  'Everton': 'Everton',
  'Liverpool': 'Liverpool',
  'Arsenal': 'Arsenal',
  'Chelsea': 'Chelsea',
};

export const getDisplayTeamName = (
  fullName: string, 
  apiShortName?: string,
  maxLength: number = 12
): string => {
  // 1. Check predefined abbreviations first
  if (TEAM_ABBREVIATIONS[fullName]) {
    return TEAM_ABBREVIATIONS[fullName];
  }
  
  // 2. Use API short name if available and not too long
  if (apiShortName && apiShortName.length <= maxLength) {
    return apiShortName;
  }
  
  // 3. Use full name if it fits
  if (fullName.length <= maxLength) {
    return fullName;
  }
  
  // 4. Fallback: smart truncation
  return `${fullName.substring(0, maxLength - 3)}...`;
};

// Team classification utilities
export const TOP_SIX_TEAMS = [
  'Manchester United', 'Manchester City', 'Arsenal', 
  'Chelsea', 'Liverpool', 'Tottenham Hotspur'
];

export const BIG_SIX_TEAMS = [
  'Newcastle United', 'Brighton & Hove Albion', 
  'West Ham United', 'Aston Villa'
];

export const isTopSixTeam = (teamName: string): boolean => {
  return TOP_SIX_TEAMS.includes(teamName);
};

export const isBigSixTeam = (teamName: string): boolean => {
  return BIG_SIX_TEAMS.includes(teamName);
};
