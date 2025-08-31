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
  // Add more as needed
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
