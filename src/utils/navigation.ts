// src/utils/navigation.ts
import type { Fixture } from '../types';

/**
 * Generate a unique match ID for routing
 */
export const generateMatchId = (fixture: Fixture): string => {
  // If fixture has an ID, use it
  if (fixture.id) {
    return fixture.id.toString();
  }

  // Otherwise, generate from team names and date
  const homeTeam = fixture.homeTeam.name || fixture.homeTeam.shortName || 'home';
  const awayTeam = fixture.awayTeam.name || fixture.awayTeam.shortName || 'away';
  const date = new Date(fixture.dateTime).toISOString().split('T')[0]; // YYYY-MM-DD format

  return `${homeTeam}-vs-${awayTeam}-${date}`
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
};

/**
 * Navigate to fixture stats page
 */
export const navigateToStats = (fixture: Fixture, navigate: (path: string) => void): void => {
  const matchId = generateMatchId(fixture);
  navigate(`/stats/${matchId}`);
};

/**
 * Get stats page URL for a fixture
 */
export const getStatsUrl = (fixture: Fixture): string => {
  const matchId = generateMatchId(fixture);
  return `/stats/${matchId}`;
};

/**
 * Parse match ID back to get basic match info (if needed)
 * This is a simple parser - you might want to enhance it based on your needs
 */
export const parseMatchId = (matchId: string) => {
  const parts = matchId.split('-vs-');
  if (parts.length === 2) {
    const [homeTeam, awayAndDate] = parts;
    const lastDashIndex = awayAndDate.lastIndexOf('-');
    if (lastDashIndex > 0) {
      const awayTeam = awayAndDate.substring(0, lastDashIndex);
      const date = awayAndDate.substring(lastDashIndex + 1);
      return {
        homeTeam: homeTeam.replace(/-/g, ' '),
        awayTeam: awayTeam.replace(/-/g, ' '),
        date
      };
    }
  }
  return null;
};
