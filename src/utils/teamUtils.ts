// src/utils/teamUtils.ts
// Unified Team Utilities (Final Merged Version)

// ---------------------------
// Original Normalization Map (Your base list)
// ---------------------------
const TEAM_NORMALIZATION_MAP_BASE: Record<string, string> = {
  // Manchester clubs
  'Man Utd': 'Manchester United',
  'Manchester United FC': 'Manchester United',
  'Man United': 'Manchester United', // Duplicate, but harmless
  'Manchester Utd': 'Manchester United',

  'Man City': 'Manchester City', // Duplicate, but harmless
  'Manchester City FC': 'Manchester City',

  // Tottenham
  'Spurs': 'Tottenham Hotspur', // Duplicate, but harmless
  'Tottenham': 'Tottenham Hotspur', // Duplicate, but harmless
  'Tottenham Hotspur FC': 'Tottenham Hotspur',

  // Brighton
  'Brighton': 'Brighton & Hove Albion',
  'Brighton Hove Albion': 'Brighton & Hove Albion',

  // Sheffield
  'Sheffield Utd': 'Sheffield United',

  // Wolves
  'Wolves': 'Wolverhampton Wanderers', // Duplicate, but harmless
  'Wolverhampton Wanderers FC': 'Wolverhampton Wanderers',

  // Leicester
  'Leicester': 'Leicester City', // Duplicate, but harmless

  // Newcastle
  'Newcastle': 'Newcastle United', // Duplicate, but harmless
  'Newcastle United FC': 'Newcastle United',
  'Newcastle United': 'Newcastle United',
  'Newcastle Utd': 'Newcastle United',

  // Sunderland
  'Sunderland': 'Sunderland AFC',
  'Sunderland AFC': 'Sunderland AFC',

  // West Ham
  'West Ham': 'West Ham United', // Duplicate, but harmless

  // Palace
  'Crystal Palace FC': 'Crystal Palace', // Duplicate, but harmless
  'Palace': 'Crystal Palace',

  // Forest
  'Forest': 'Nottingham Forest',
  "Nott'm Forest": 'Nottingham Forest', // Duplicate, but harmless
  'Nottingham Forest FC': 'Nottingham Forest',
  "Nott'ham Forest": 'Nottingham Forest',

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
  'Bournemouth': 'AFC Bournemouth', // Duplicate, but harmless
  'AFC Bournemouth FC': 'AFC Bournemouth',

  // Luton
  'Luton': 'Luton Town',
  'Luton Town FC': 'Luton Town',

  // Burnley
  'Burnley FC': 'Burnley',
    
  // Leeds (from previous merge)
  'Leeds Utd': 'Leeds United',
  'Leeds United FC': 'Leeds United',
};


// ---------------------------
// Additional API Normalization Entries (The new code you provided)
// ---------------------------
const ADDITIONAL_API_NORMALIZATIONS: Record<string, string> = {
  // Common API variations
  'Brighton and Hove Albion': 'Brighton & Hove Albion', // NEW
  'Brighton & Hove Albion FC': 'Brighton & Hove Albion', // NEW
  'Tottenham': 'Tottenham Hotspur',
  'West Ham': 'West Ham United',
  'West Ham FC': 'West Ham United', // NEW
  'Sheffield United FC': 'Sheffield United', // NEW
  'Crystal Palace FC': 'Crystal Palace',
  'Nottingham Forest': 'Nottingham Forest', // NEW
  'Nott\'m Forest': 'Nottingham Forest',
  'AFC Bournemouth': 'AFC Bournemouth',
  'Bournemouth FC': 'AFC Bournemouth', // NEW
  
  // Handle potential API inconsistencies (mostly covered, but ensuring overwrite)
  'Man United': 'Manchester United',
  'Man City': 'Manchester City',
  'Newcastle': 'Newcastle United',
  'Leicester': 'Leicester City',
  'Wolves': 'Wolverhampton Wanderers',
  'Spurs': 'Tottenham Hotspur',
  
  // European competition variations (NEW TEAMS ADDED)
  'Atletico Madrid': 'Atletico Madrid', // NEW
  'Real Madrid': 'Real Madrid', // NEW
  'FC Barcelona': 'Barcelona', // NEW
  'Bayern Munich': 'Bayern Munich', // NEW
  'Paris Saint-Germain': 'Paris Saint-Germain', // NEW
  'PSG': 'Paris Saint-Germain', // NEW
};


// ---------------------------
// Final Merged Normalization Map
// ---------------------------
const TEAM_NORMALIZATION_MAP: Record<string, string> = {
  ...TEAM_NORMALIZATION_MAP_BASE,
  ...ADDITIONAL_API_NORMALIZATIONS
};

// Normalize team name → always returns canonical version
export const normalizeTeamName = (name: string): string => {
  const clean = name.trim();
  // Use the merged map
  return TEAM_NORMALIZATION_MAP[clean] || clean;
};


// ---------------------------
// Abbreviations for display (Using your existing list)
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
  'Leeds United': 'Leeds Utd',
};

// ---------------------------
// Logo Mapping (You MUST add new canonical names here if needed)
// ---------------------------
const TEAM_LOGO_MAP: Record<string, string> = {
  // Existing Premier League teams
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
  
  // 🎯 NEW European teams added from normalization map
  'Atletico Madrid': 'atletico-madrid',
  'Real Madrid': 'real-madrid',
  'Barcelona': 'fc-barcelona', // Using canonical form
  'Bayern Munich': 'bayern-munich',
  'Paris Saint-Germain': 'paris-saint-germain',
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
// Display helpers (UNCHANGED)
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
// Logo utilities (UNCHANGED)
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
// Helpers (UNCHANGED)
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
