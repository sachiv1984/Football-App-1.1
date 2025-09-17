// src/utils/teamUtils.ts
// Unified Team Utilities (Updated)

// ---------------------------
// Normalization Map
// ---------------------------
// All names map to a canonical form (must exist in TEAM_LOGO_MAP)
const TEAM_NORMALIZATION_MAP: Record<string, string> = {
  // Manchester clubs
  'Man Utd': 'Manchester United',
  'Manchester United FC': 'Manchester United',
  'Man United': 'Manchester United',
  'Manchester Utd': 'Manchester United',

  'Man City': 'Manchester City',
  'Manchester City FC': 'Manchester City',

  // Tottenham
  'Spurs': 'Tottenham Hotspur',
  'Tottenham': 'Tottenham Hotspur',
  'Tottenham Hotspur FC': 'Tottenham Hotspur',

  // Brighton
  'Brighton': 'Brighton & Hove Albion',
  'Brighton Hove Albion': 'Brighton & Hove Albion',

  // Sheffield
  'Sheffield Utd': 'Sheffield United',

  // Wolves
  'Wolves': 'Wolverhampton Wanderers',
  'Wolverhampton Wanderers FC': 'Wolverhampton Wanderers',

  // Leicester
  'Leicester': 'Leicester City',

  // Newcastle
  'Newcastle': 'Newcastle United',
  'Newcastle United FC': 'Newcastle United',
  'Newcastle United': 'Newcastle United',
  'Newcastle Utd': 'Newcastle United',

  // Sunderland
  'Sunderland': 'Sunderland AFC',
  'Sunderland AFC': 'Sunderland AFC',

  // West Ham
  'West Ham': 'West Ham United',

  // Palace
  'Crystal Palace FC': 'Crystal Palace',
  'Palace': 'Crystal Palace',

  // Forest
  'Forest': 'Nottingham Forest',
  "Nott'm Forest": 'Nottingham Forest',
  'Nottingham Forest FC': 'Nottingham Forest',
  'Nott'ham Forest: 'Nottingham Forest',

  // Villa
  'Villa': 'Aston Villa',
  'Aston Villa FC': 'Aston Villa',

  // Fulham
  'Fulham FC': 'Fulham',

  // Brentford
  'Brentford FC': 'Brentford',

  // Everton
  'Everton FC': 'Everton',

  // Liverpool
  'Liverpool FC': 'Liverpool',

  // Arsenal
  'Arsenal FC': 'Arsenal',

  // Chelsea
  'Chelsea FC': 'Chelsea',

  // Bournemouth
  'Bournemouth': 'AFC Bournemouth',
  'AFC Bournemouth FC': 'AFC Bournemouth',

  // Luton
  'Luton': 'Luton Town',
  'Luton Town FC': 'Luton Town',

  // Burnley
  'Burnley FC': 'Burnley',
};

// Normalize team name → always returns canonical version
export const normalizeTeamName = (name: string): string => {
  const clean = name.trim();
  return TEAM_NORMALIZATION_MAP[clean] || clean;
};

// ---------------------------
// Abbreviations for display
// ---------------------------
const TEAM_ABBREVIATIONS: Record<string, string> = {
  'Manchester United': 'Man Utd',
  'Manchester City': 'Man City',
  'Tottenham Hotspur': 'Tottenham',
  'Brighton & Hove Albion': 'Brighton',
  'Sheffield United': 'Sheff Utd',
  'West Ham United': 'West Ham',
  'Newcastle United': 'Newcastle',
  'Sunderland AFC': 'Sunderland',
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
  'Burnley': 'Burnley',
};

// ---------------------------
// Logo Mapping
// ---------------------------
const TEAM_LOGO_MAP: Record<string, string> = {
  'AFC Bournemouth': 'afc-bournemouth',
  'Arsenal': 'arsenal-fc',
  'Aston Villa': 'aston-villa',
  'Brentford': 'brentford-fc',
  'Brighton & Hove Albion': 'brighton-and-hove-albion',
  'Burnley': 'burnley-fc',
  'Chelsea': 'chelsea-fc',
  'Crystal Palace': 'crystal-palace',
  'Everton': 'everton-fc',
  'Fulham': 'fulham-fc',
  'Leeds United': 'leeds-united',
  'Liverpool': 'liverpool-fc',
  'Manchester City': 'manchester-city',
  'Manchester United': 'manchester-united',
  'Newcastle United': 'newcastle-united',
  'Sunderland AFC': 'sunderland-afc',
  'Nottingham Forest': 'nottingham-forest',
  'Tottenham Hotspur': 'tottenham-hotspur',
  'West Ham United': 'west-ham-united',
  'Wolverhampton Wanderers': 'wolverhampton-wanderers',
  'Luton Town': 'luton-town',
  'Leicester City': 'leicester-city',
  'Sheffield United': 'sheffield-united',
};

// Competitions
const COMPETITION_LOGOS: Record<string, string> = {
  'English Premier League': 'english-premier-league',
  'Premier League': 'english-premier-league',
  'EPL': 'english-premier-league',
  'FA Cup': 'fa-cup',
  'EFL Cup': 'efl-cup',
  'Carabao Cup': 'efl-cup',
  'UEFA Champions League': 'champions-league',
  'Champions League': 'champions-league',
  'Europa League': 'europa-league',
};

// ---------------------------
// Display helpers
// ---------------------------
export const getDisplayTeamName = (
  fullName: string,
  apiShortName?: string,
  maxLength = 12
): string => {
  const normalized = normalizeTeamName(fullName);
  if (TEAM_ABBREVIATIONS[normalized]) return TEAM_ABBREVIATIONS[normalized];
  if (apiShortName && apiShortName !== 'Unknown' && apiShortName.length <= maxLength)
    return apiShortName;
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.substring(0, maxLength - 3)}...`;
};

// ---------------------------
// Logo utilities
// ---------------------------
export interface TeamLogoResult {
  logoPath?: string;
  fallbackInitial: string;
  fallbackName: string;
  displayName: string;
}

export const getTeamLogoPath = (
  teamName: string,
  shortName?: string,
  apiBadgeUrl?: string
): string | undefined => {
  const canonicalName = normalizeTeamName(teamName);
  const slug = TEAM_LOGO_MAP[canonicalName];

  if (slug) return `/Images/Club%20Logos/${slug}.png`;
  if (!apiBadgeUrl) console.warn(`Logo not found for team: "${teamName}" (shortName: "${shortName}")`);
  return apiBadgeUrl;
};

export const getTeamLogo = (team: { name: string; shortName?: string; badge?: string }): TeamLogoResult => {
  const canonicalName = normalizeTeamName(team.name);

  // 🔹 Debug: log any team that doesn't resolve to a known logo
  const slug = TEAM_LOGO_MAP[canonicalName];
  if (!slug) {
    console.warn('⚠️ Unmapped team detected:', {
      originalName: team.name,
      shortName: team.shortName,
      canonicalName,
      badgeUrl: team.badge,
    });
  }

  const logoPath = getTeamLogoPath(canonicalName, team.shortName, team.badge);
  const displayName = getDisplayTeamName(canonicalName, team.shortName);

  if (!logoPath) console.warn(`Missing logo for ${canonicalName}`);

  return {
    logoPath,
    fallbackInitial: displayName
      .split(' ')
      .map(w => w[0])
      .join('')
      .substring(0, 3)
      .toUpperCase(),
    fallbackName: displayName,
    displayName,
  };
};


// Competition logo
export const getCompetitionLogo = (competitionName: string, apiLogoUrl?: string): string | undefined => {
  const slug = COMPETITION_LOGOS[competitionName];
  if (slug) return `/Images/competition/${slug}.png`;
  return apiLogoUrl;
};

// ---------------------------
// Helpers
// ---------------------------
export const validateLogoUrl = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};

export const preloadTeamLogos = (teams: Array<{ name: string; shortName?: string; badge?: string }>) => {
  teams.forEach(team => {
    const { logoPath } = getTeamLogo(team);
    if (logoPath) {
      const img = new Image();
      img.src = logoPath;
    }
  });
};
