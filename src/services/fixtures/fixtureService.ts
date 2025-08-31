// src/services/fixtures/fixtureService.ts
import { SportsDbApi, type SportsDbEvent } from '../api/sportsDbApi';
import type { FeaturedFixtureWithImportance } from '../../types';
import { PREMIER_LEAGUE_ID } from '../api/sportsDbApi';

export class FixtureService {
  private sportsDbApi: SportsDbApi;

  constructor() {
    this.sportsDbApi = SportsDbApi.getInstance();
  }

  // Calculate match importance (1-10 scale)
  private calculateImportance(homeTeam: string, awayTeam: string, round: number): number {
    const topSixTeams = [
      'Manchester United', 'Manchester City', 'Arsenal', 
      'Chelsea', 'Liverpool', 'Tottenham Hotspur'
    ];
    
    const bigSixTeams = [
      'Newcastle United', 'Brighton & Hove Albion', 
      'West Ham United', 'Aston Villa'
    ];

    let importance = 5; // Base importance

    // Both teams in top 6
    if (topSixTeams.includes(homeTeam) && topSixTeams.includes(awayTeam)) {
      importance = 9;
    }
    // One top 6, one big 6
    else if (
      (topSixTeams.includes(homeTeam) && bigSixTeams.includes(awayTeam)) ||
      (bigSixTeams.includes(homeTeam) && topSixTeams.includes(awayTeam))
    ) {
      importance = 7;
    }
    // One top 6 team
    else if (topSixTeams.includes(homeTeam) || topSixTeams.includes(awayTeam)) {
      importance = 6;
    }

    // Derby matches (add points)
    if (this.isDerby(homeTeam, awayTeam)) {
      importance += 2;
    }

    // Late season importance
    if (round > 30) importance += 1;

    return Math.min(10, Math.max(1, importance));
  }

  private isDerby(team1: string, team2: string): boolean {
    const derbies = [
      ['Manchester United', 'Manchester City'], // Manchester Derby
      ['Arsenal', 'Tottenham Hotspur'], // North London Derby
      ['Liverpool', 'Everton'], // Merseyside Derby
      ['Chelsea', 'Arsenal'], // London Derby
      ['Chelsea', 'Tottenham Hotspur'], // London Derby
    ];

    return derbies.some(derby => 
      (derby.includes(team1) && derby.includes(team2))
    );
  }

  private generateMatchTags(homeTeam: string, awayTeam: string, round: number): string[] {
    const tags: string[] = [];
    
    if (this.isDerby(homeTeam, awayTeam)) {
      tags.push('derby');
    }
    
    const topSix = ['Manchester United', 'Manchester City', 'Arsenal', 'Chelsea', 'Liverpool', 'Tottenham Hotspur'];
    if (topSix.includes(homeTeam) && topSix.includes(awayTeam)) {
      tags.push('top-six-clash');
    }
    
    if (round <= 5) tags.push('early-season');
    if (round >= 30) tags.push('title-race');
    if (round >= 35) tags.push('season-finale');
    
    return tags;
  }

  // Transform SportsDB event to your fixture format
private async transformEvent(event: SportsDbEvent): Promise<FeaturedFixtureWithImportance> {
  const validResults = ["W", "D", "L"];
  const homeForm = (await this.sportsDbApi.getTeamForm(event.idHomeTeam).catch(() => []))
    .filter(result => validResults.includes(result)) as ("W" | "D" | "L")[];
  const awayForm = (await this.sportsDbApi.getTeamForm(event.idAwayTeam).catch(() => []))
    .filter(result => validResults.includes(result)) as ("W" | "D" | "L")[];

  const importance = this.calculateImportance(
    event.strHomeTeam ?? 'Unknown Team',
    event.strAwayTeam ?? 'Unknown Team',
    parseInt(event.intRound ?? '0')
  );

  const leagueDetails = await this.sportsDbApi.getLeagueDetails().catch(() => null);

  return {
    id: event.idEvent ?? 'unknown-id',
    dateTime: `${event.strDate ?? '1970-01-01'}T${event.strTime ?? '00:00:00'}`,
    homeTeam: {
      id: event.idHomeTeam ?? 'unknown-id',
      name: event.strHomeTeam ?? 'Unknown Team',
      shortName: event.strHomeTeamShort ?? 'Unknown',
      logo: event.strHomeTeamBadge ?? '',
      colors: { primary: undefined, secondary: undefined }, // Default colors
      form: homeForm,
      position: undefined // Default position
    },
    awayTeam: {
      id: event.idAwayTeam ?? 'unknown-id',
      name: event.strAwayTeam ?? 'Unknown Team',
      shortName: event.strAwayTeamShort ?? 'Unknown',
      logo: event.strAwayTeamBadge ?? '',
      colors: { primary: undefined, secondary: undefined }, // Default colors
      form: awayForm,
      position: undefined // Default position
    },
    venue: event.strVenue ?? 'Unknown Venue',
    competition: {
      id: PREMIER_LEAGUE_ID,
      name: event.strLeague ?? 'Unknown League',
      logo: leagueDetails?.strLogo || leagueDetails?.strLeagueBadge || ''
    },
    matchWeek: parseInt(event.intRound ?? '0'),
    importance,
    tags: this.generateMatchTags(
      event.strHomeTeam ?? 'Unknown Team',
      event.strAwayTeam ?? 'Unknown Team',
      parseInt(event.intRound ?? '0')
    ),
    status: 'upcoming'
  };
}
  // Get featured fixtures (top 5-10 most important upcoming matches)
  async getFeaturedFixtures(limit: number = 8): Promise<FeaturedFixtureWithImportance[]> {
    try {
      const events = await this.sportsDbApi.getUpcomingFixtures();
      
      // Transform all events
      const fixtures = await Promise.all(
        events.slice(0, 20).map(event => this.transformEvent(event))
      );

      // Sort by importance and return top N
      return fixtures
        .sort((a, b) => b.importance - a.importance)
        .slice(0, limit);
        
    } catch (error) {
      console.error('Error fetching featured fixtures:', error);
      throw new Error('Failed to fetch featured fixtures');
    }
  }

  // Get all upcoming fixtures for the fixtures page
  async getAllUpcomingFixtures(): Promise<FeaturedFixtureWithImportance[]> {
    try {
      const events = await this.sportsDbApi.getUpcomingFixtures();
      return Promise.all(events.map(event => this.transformEvent(event)));
    } catch (error) {
      console.error('Error fetching all fixtures:', error);
      throw new Error('Failed to fetch fixtures');
    }
  }
}
