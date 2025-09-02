// src/utils/teamUtils.ts
// Consolidated Team & Logo Utilities (Enhanced with full PL 2025/26 teams + variants)

export const TEAM_ABBREVIATIONS: Record<string, string> = {
  'Arsenal FC': 'Arsenal',
  'Arsenal': 'Arsenal',
  'Aston Villa': 'Villa',
  'AFC Bournemouth': 'Bournemouth',
  'Brentford FC': 'Brentford',
  'Brentford': 'Brentford',
  'Brighton & Hove Albion': 'Brighton',
  'Brighton': 'Brighton',
  'Burnley FC': 'Burnley',
  'Burnley': 'Burnley',
  'Chelsea FC': 'Chelsea',
  'Chelsea': 'Chelsea',
  'Crystal Palace': 'Crystal Palace',
  'Everton FC': 'Everton',
  'Everton': 'Everton',
  'Fulham FC': 'Fulham',
  'Fulham': 'Fulham',
  'Leeds United': 'Leeds',
  'Leeds': 'Leeds',
  'Leicester City': 'Leicester',
  'Liverpool FC': 'Liverpool',
  'Liverpool': 'Liverpool',
  'Manchester City': 'Man City',
  'Man City': 'Man City',
  'Manchester United': 'Man Utd',
  'Man Utd': 'Man Utd',
  'Newcastle United': 'Newcastle',
  'Nottingham Forest': "Nott'm Forest",
  "Nott'm Forest": "Nott'm Forest",
  'Southampton FC': 'Southampton',
  'Southampton': 'Southampton',
  'Tottenham Hotspur': 'Tottenham',
  'Spurs': 'Tottenham',
  'West Ham United': 'West Ham',
  'West Ham': 'West Ham',
  'Wolverhampton Wanderers': 'Wolves',
  'Wolverhampton Wanderers FC': 'Wolves',
  'Wolves': 'Wolves',
  // Add more if necessary
};

// Mapping to local logo slugs
const TEAM_LOGO_MAP: Record<string, string> = {
  "Arsenal FC": "arsenal-fc",
  "Arsenal": "arsenal-fc",
  "Aston Villa": "aston-villa",
  "AFC Bournemouth": "afc-bournemouth",
  "Bournemouth": "afc-bournemouth",
  "Brentford FC": "brentford-fc",
  "Brentford": "brentford-fc",
  "Brighton & Hove Albion": "brighton-and-hove-albion",
  "Brighton": "brighton-and-hove-albion",
  "Burnley FC": "burnley-fc",
  "Burnley": "burnley-fc",
  "Chelsea FC": "chelsea-fc",
  "Chelsea": "chelsea-fc",
  "Crystal Palace": "crystal-palace",
  "Everton FC": "everton-fc",
  "Everton": "everton-fc",
  "Fulham FC": "fulham-fc",
  "Fulham": "fulham-fc",
  "Leeds United": "leeds-united",
  "Leeds": "leeds-united",
  "Leicester City": "leicester-city",
  "Liverpool FC": "liverpool-fc",
  "Liverpool": "liverpool-fc",
  "Manchester City": "manchester-city",
  "Man City": "manchester-city",
  "Manchester United": "manchester-united",
  "Man Utd": "manchester-united",
  "Newcastle United": "newcastle-united",
  "Nottingham Forest": "nottingham-forest",
  "Nott'm Forest": "nottingham-forest",
  "Southampton FC": "southampton-fc",
  "Southampton": "southampton-fc",
  "Tottenham Hotspur": "tottenham-hotspur",
  "Spurs": "tottenham-hotspur",
  "West Ham United": "west-ham-united",
  "West Ham": "west-ham-united",
  "Wolverhampton Wanderers": "wolverhampton-wanderers",
  "Wolverhampton Wanderers FC": "wolverhampton-wanderers",
  "Wolves": "wolverhampton-wanderers",
};

// Competition logos
const COMPETITION_LOGOS: Record<string, string> = {
  'English Premier League': 'english-premier-league',
  'Premier League': 'english-premier-league',
  'FA Cup': 'fa-cup',
  'EFL Cup': 'efl-cup',
  'Carabao Cup': 'efl-cup',
  'UEFA Champions League': 'champions-league',
  'Champions League': 'champions-league',
  'Europa League': 'europa-league',
};

// Display name utility
export const getDisplayTeamName = (
  fullName: string,
  apiShortName?: string,
  maxLength = 12
): string => {
  if (TEAM_ABBREVIATIONS[fullName]) return TEAM_ABBREVIATIONS[fullName];
  if (apiShortName && apiShortName !== 'Unknown' && apiShortName.length <= maxLength)
    return apiShortName;
  if (fullName.length <= maxLength) return fullName;
  return `${fullName.substring(0, maxLength - 3)}...`;
};

// Team Logo Result interface
export interface TeamLogoResult {
  logoPath: string | null;
  fallbackInitial: string;
  fallbackName: string;
  displayName: string;
}

// Get team logo path
export const getTeamLogoPath = (
  teamName: string,
  shortName?: string,
  apiBadgeUrl?: string
): string | null => {
  const slug = TEAM_LOGO_MAP[teamName] || (shortName && TEAM_LOGO_MAP[shortName]) || null;
  if (slug) {
    const isProduction = process.env.NODE_ENV === 'production';
    const basePath = isProduction ? '/Football-App-1.1' : '';
    return `${basePath}/Images/Club%20Logos/${slug}.png`;
  }
  if (!apiBadgeUrl) {
    console.warn(`Logo not found for team: "${teamName}" (shortName: "${shortName}")`);
  }
  return apiBadgeUrl || null;
};

// Get full team logo object
export const getTeamLogo = (team: { name: string; shortName?: string; badge?: string }): TeamLogoResult => {
  const logoPath = getTeamLogoPath(team.name, team.shortName, team.badge);
  const displayName = getDisplayTeamName(team.name, team.shortName);
  return {
    logoPath,
    fallbackInitial: displayName.split(' ').map(w => w[0]).join('').substring(0,3).toUpperCase(),
    fallbackName: displayName,
    displayName,
  };
};

// Competition logo
export const getCompetitionLogo = (competitionName: string, apiLogoUrl?: string): string | null => {
  const slug = COMPETITION_LOGOS[competitionName];
  if (slug) {
    const isProduction = process.env.NODE_ENV === 'production';
    const basePath = isProduction ? '/Football-App-1.1' : '';
    return `${basePath}/Images/competition/${slug}.png`;
  }
  return apiLogoUrl || null;
};

// Validate logo URL
export const validateLogoUrl = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};

// Preload logos
export const preloadTeamLogos = (teams: Array<{ name: string; shortName?: string; badge?: string }>) => {
  teams.forEach(team => {
    const { logoPath } = getTeamLogo(team);
    if (logoPath) {
      const img = new Image();
      img.src = logoPath;
    }
  });
};
