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

// Mapping to local logo slugs (should match filenames exactly)
const TEAM_LOGO_MAP: Record<string, string> = {
  "AFC Bournemouth": "afc-bournemouth",
  "Arsenal": "arsenal-fc",
  "Arsenal FC": "arsenal-fc",
  "Aston Villa": "aston-villa",
  "Brentford": "brentford-fc",
  "Brentford FC": "brentford-fc",
  "Brighton & Hove Albion": "brighton-and-hove-albion",
  "Burnley": "burnley-fc",
  "Burnley FC": "burnley-fc",
  "Chelsea": "chelsea-fc",
  "Chelsea FC": "chelsea-fc",
  "Crystal Palace": "crystal-palace",
  "Everton": "everton-fc",
  "Everton FC": "everton-fc",
  "Fulham": "fulham-fc",
  "Fulham FC": "fulham-fc",
  "Leeds": "leeds-united",
  "Leeds United": "leeds-united",
  "Liverpool": "liverpool-fc",
  "Liverpool FC": "liverpool-fc",
  "Manchester City": "manchester-city",
  "Man City": "manchester-city",
  "Manchester United": "manchester-united",
  "Man Utd": "manchester-united",
  "Newcastle United": "newcastle-united",
  "Newcastle": "newcastle-united",
  "Nottingham Forest": "nottingham-forest",
  "Nott'm Forest": "nottingham-forest",
  "Sunderland": "sunderland-afc",
  "Sunderland AFC": "sunderland-afc",
  "Tottenham Hotspur": "tottenham-hotspur",
  "Spurs": "tottenham-hotspur",
  "West Ham United": "west-ham-united",
  "West Ham": "west-ham-united",
  "Wolverhampton Wanderers": "wolverhampton-wanderers",
  "Wolves": "wolverhampton-wanderers",
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

// Helper to normalize team names for matching
const normalizeTeamName = (name: string) => name.trim().replace(/\s+FC$/, '').replace(/\s+AFC$/, '').replace(/\./g, '').toLowerCase();

// Get team logo path
export const getTeamLogoPath = (
  teamName: string,
  shortName?: string,
  apiBadgeUrl?: string
): string | null => {
  let slug = TEAM_LOGO_MAP[teamName] || (shortName && TEAM_LOGO_MAP[shortName]) || null;

  // Fallback: normalize names
  if (!slug) {
    const normalized = normalizeTeamName(teamName);
    for (const key in TEAM_LOGO_MAP) {
      if (normalizeTeamName(key) === normalized) {
        slug = TEAM_LOGO_MAP[key];
        break;
      }
    }
  }

  if (!slug && apiBadgeUrl) {
    console.warn(`Logo not found for team: "${teamName}" (shortName: "${shortName}") — using API badge`);
    return apiBadgeUrl;
  }

  if (!slug) {
    console.warn(`Logo not found for team: "${teamName}" (shortName: "${shortName}"), no badge available`);
    return null;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const basePath = isProduction ? '/Football-App-1.1' : '';
  return `${basePath}/Images/Club%20Logos/${slug}.png`;
};

// Get full team logo object
export const getTeamLogo = (team: { name: string; shortName?: string; badge?: string }): TeamLogoResult => {
  const logoPath = getTeamLogoPath(team.name, team.shortName, team.badge);
  const displayName = getDisplayTeamName(team.name, team.shortName);
  return {
    logoPath,
    fallbackInitial: displayName.split(' ').map(w => w[0]).join('').substring(0, 3).toUpperCase(),
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
