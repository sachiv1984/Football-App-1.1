// src/utils/logoUtils.ts

// Team name to logo filename mapping
const TEAM_LOGO_MAP: Record<string, string> = {
  // Premier League
  'Arsenal': 'arsenal',
  'Chelsea': 'chelsea', 
  'Liverpool': 'liverpool',
  'Manchester City': 'manchester_city',
  'Manchester United': 'manchester_united',
  'Tottenham Hotspur': 'tottenham',
  'Newcastle United': 'newcastle',
  'Brighton & Hove Albion': 'brighton',
  'Aston Villa': 'aston_villa',
  'West Ham United': 'west_ham',
  'Crystal Palace': 'crystal_palace',
  'Fulham': 'fulham',
  'Brentford': 'brentford',
  'Nottingham Forest': 'nottingham_forest',
  'Everton': 'everton',
  'Leicester City': 'leicester',
  'Wolverhampton Wanderers': 'wolves',
  'Bournemouth': 'bournemouth',
  'Sheffield United': 'sheffield_united',
  'Burnley': 'burnley',
  
  // Add more teams as needed
  // You can also add by team ID if you prefer
};

// Alternative mapping by team ID (if your IDs are consistent)
const TEAM_ID_LOGO_MAP: Record<string, string> = {
  '1': 'arsenal',
  '2': 'chelsea',
  '3': 'liverpool',
  // Add your team IDs here
};

/**
 * Get the logo path for a team
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
  let logoName = TEAM_LOGO_MAP[teamName];
  
  // Try team ID mapping
  if (!logoName && teamId) {
    logoName = TEAM_ID_LOGO_MAP[teamId];
  }
  
  // Try short name
  if (!logoName && shortName) {
    logoName = TEAM_LOGO_MAP[shortName];
  }
  
  // Try fuzzy matching (normalize names)
  if (!logoName) {
    const normalizedName = teamName.toLowerCase()
      .replace(/fc$|f\.c\.$/, '') // Remove FC suffix
      .replace(/united$/, 'utd') // Normalize United
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .trim();
    
    // Check if any mapped name matches our normalized name
    const foundKey = Object.keys(TEAM_LOGO_MAP).find(key => 
      key.toLowerCase().replace(/\s+/g, '_') === normalizedName
    );
    
    if (foundKey) {
      logoName = TEAM_LOGO_MAP[foundKey];
    }
  }
  
  return logoName ? `/src/Images/Club Logos/${logoName}.png` : null;
};

/**
 * Get fallback logo options to try multiple file extensions
 */
export const getTeamLogoWithFallbacks = (
  teamName: string, 
  teamId?: string, 
  shortName?: string
): string[] => {
  const basePath = getTeamLogoPath(teamName, teamId, shortName);
  if (!basePath) return [];
  
  const baseNameWithoutExt = basePath.replace('.png', '');
  
  return [
    `${baseNameWithoutExt}.png`,
    `${baseNameWithoutExt}.svg`,
    `${baseNameWithoutExt}.jpg`,
    `${baseNameWithoutExt}.webp`,
  ];
};

/**
 * Check if team logo exists (you can implement this if needed)
 */
export const checkLogoExists = async (logoPath: string): Promise<boolean> => {
  try {
    const response = await fetch(logoPath, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};
