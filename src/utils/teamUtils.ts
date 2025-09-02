// src/utils/teamUtils.ts
// Consolidated Team & Logo Utilities

export const TEAM_ABBREVIATIONS: Record<string, string> = {
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

// Mapping to local logo slugs
const TEAM_LOGO_MAP: Record<string, string> = {
  "AFC Bournemouth": "afc-bournemouth",
  "Arsenal FC": "arsenal-fc",
  "Arsenal": "arsenal-fc",
  "Aston Villa": "aston-villa",
  "Brentford FC": "brentford-fc",
  "Brentford": "brentford-fc",
  "Brighton & Hove Albion": "brighton-and-hove-albion",
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
  "Liverpool FC": "liverpool-fc",
  "Liverpool": "liverpool-fc",
  "Manchester City": "manchester-city",
  "Manchester United": "manchester-united",
  "Newcastle United": "newcastle-united",
  "Nottingham Forest": "nottingham-forest",
  "Sunderland AFC": "sunderland-afc",
  "Sunderland": "sunderland-afc",
  "Tottenham Hotspur": "tottenham-hotspur",
  "West Ham United": "west-ham-united",
  "Wolverhampton Wanderers": "wolverhampton-wanderers",
  "Man Utd": "manchester-united",
  "Man United": "manchester-united",
  "Spurs": "tottenham-hotspur",
  "Man City": "manchester-city",
  "Nott'm Forest": "nottingham-forest",
  "Wolves": "wolverhampton-wanderers",
  "Brighton": "brighton-and-hove-albion",
  "Leeds": "leeds-united",
  "West Ham": "west-ham-united",
  "Bournemouth": "afc-bournemouth",
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
