// src/services/fixtures/fixtureService.ts
import { SportsDbApi, SportsDbEvent, SportsDbTeam } from '../api/sportsDbApi';
import type { FeaturedFixtureWithImportance } from '../../types';

interface TeamWithForm {
  id: string;
  name: string;
  shortName: string; // Changed from optional to required
  logo?: string;
  colors: { primary?: string; secondary?: string }; // Fixed to match Team interface
  form?: ('W'|'D'|'L')[];
}

interface Competition {
  id: string;
  name: string;
  logo?: string;
}

export class FixtureService {
  private sportsDbApi: SportsDbApi;
  private teamCache: Map<string, SportsDbTeam> = new Map();
  private formCache: Map<string, ('W'|'D'|'L')[]> = new Map();

  constructor() {
    this.sportsDbApi = SportsDbApi.getInstance();
  }

  // FIXED: Get team details with proper short name handling
  private async getTeamDetails(teamId: string, teamName: string): Promise<TeamWithForm> {
    try {
      // Check cache first
      let teamData = this.teamCache.get(teamId);
      
      // If not in cache, fetch it
      if (!teamData) {
        const fetchedTeam = await this.sportsDbApi.getTeamById(teamId);
        if (fetchedTeam) {
          teamData = fetchedTeam;
          this.teamCache.set(teamId, fetchedTeam);
        }
      }

      // Get form data
      let form = this.formCache.get(teamId);
      if (!form) {
        form = await this.sportsDbApi.getTeamForm(teamId, teamName); // Pass team name too
        this.formCache.set(teamId, form);
      }

      return {
        id: teamId,
        name: teamName,
        shortName: teamData?.strTeamShort || teamName, // Provide fallback to satisfy type
        logo: teamData?.strTeamBadge,
        colors: {}, // Fixed to match Team interface
        form: form
      };
    } catch (error) {
      console.error(`Error getting team details for ${teamId}:`, error);
      return {
        id: teamId,
        name: teamName,
        shortName: teamName, // Use team name as fallback
        logo: undefined,
        colors: {}, // Fixed to match Team interface
        form: []
      };
    }
  }

  // Calculate importance based on various factors
  private calculateImportance(event: SportsDbEvent): number {
    let importance = 3; // Base importance

    // Factor 1: Round number (later rounds more important)
    const round = parseInt(event.intRound || '1');
    if (round >= 35) importance += 3; // Final stretch
    else if (round >= 25) importance += 2; // Business end
    else if (round >= 15) importance += 1; // Mid-season

    // Factor 2: Traditional "Big 6" teams
    const bigSixTeams = ['Arsenal', 'Chelsea', 'Liverpool', 'Manchester City', 'Manchester United', 'Tottenham'];
    const homeIsBigSix = bigSixTeams.includes(event.strHomeTeam);
    const awayIsBigSix = bigSixTeams.includes(event.strAwayTeam);
    
    if (homeIsBigSix && awayIsBigSix) importance += 3; // Big 6 clash
    else if (homeIsBigSix || awayIsBigSix) importance += 1; // Involves Big 6

    // Factor 3: Derby matches (add your own logic here)
    const isDerby = this.isDerbyMatch(event.strHomeTeam, event.strAwayTeam);
    if (isDerby) importance += 2;

    return Math.min(importance, 10); // Cap at 10
  }

  // Simple derby detection
  private isDerbyMatch(homeTeam: string, awayTeam: string): boolean {
    const derbies = [
      ['Arsenal', 'Tottenham'], // North London Derby
      ['Liverpool', 'Everton'], // Merseyside Derby
      ['Manchester United', 'Manchester City'], // Manchester Derby
      ['Chelsea', 'Arsenal'], // London Derby
      ['Chelsea', 'Tottenham'], // London Derby
    ];

    return derbies.some(derby => 
      (derby.includes(homeTeam) && derby.includes(awayTeam))
    );
  }

  // Generate match tags
  private generateTags(event: SportsDbEvent, importance: number): string[] {
    const tags: string[] = [];
    const round = parseInt(event.intRound || '1');

    if (round <= 5) tags.push('early-season');
    else if (round >= 35) tags.push('title-race', 'relegation-battle');
    else if (round >= 25) tags.push('business-end');

    if (importance >= 8) tags.push('big-match');
    if (this.isDerbyMatch(event.strHomeTeam, event.strAwayTeam)) tags.push('derby');

    // Add day-based tags
    const matchDate = new Date(SportsDbApi.combineDateTime(event.dateEvent, event.strTime, event.strTimestamp));
    if (!isNaN(matchDate.getTime())) {
      const dayOfWeek = matchDate.getDay();
      if (dayOfWeek === 0) tags.push('sunday-fixture');
      else if (dayOfWeek === 6) tags.push('saturday-fixture');
      else if (dayOfWeek === 1) tags.push('monday-night-football');
    }

    return tags;
  }

  // FIXED: Transform API event to internal format
  private async transformEvent(event: SportsDbEvent): Promise<FeaturedFixtureWithImportance> {
    // Get team details with form
    const [homeTeam, awayTeam] = await Promise.all([
      this.getTeamDetails(event.idHomeTeam, event.strHomeTeam),
      this.getTeamDetails(event.idAwayTeam, event.strAwayTeam)
    ]);

    const importance = this.calculateImportance(event);
    const tags = this.generateTags(event, importance);

    // FIXED: Properly combine date and time
    const dateTime = SportsDbApi.combineDateTime(event.dateEvent, event.strTime, event.strTimestamp);

    return {
      id: event.idEvent,
      dateTime, // This will now be properly formatted
      homeTeam,
      awayTeam,
      venue: event.strVenue || 'TBD',
      competition: {
        id: '4328',
        name: 'English Premier League',
        logo: 'https://r2.thesportsdb.com/images/media/league/logo/4c377s1535214890.png'
      } as Competition,
      matchWeek: parseInt(event.intRound || '1'),
      importance,
      importanceScore: importance,
      tags,
      isBigMatch: importance >= 8,
      status: event.strStatus === 'Not Started' ? 'upcoming' : 'finished' // Fixed to use valid status
    };
  }

  // Get featured fixtures with importance scoring
  async getFeaturedFixtures(limit: number = 8): Promise<FeaturedFixtureWithImportance[]> {
    try {
      // FIXED: Use current season fixtures and filter for upcoming games
      const events = await this.sportsDbApi.getCurrentSeasonFixtures();
      
      if (!events || events.length === 0) {
        return [];
      }

      // Filter for upcoming fixtures only (status = "Not Started")
      const upcomingEvents = events.filter(event => 
        event.strStatus === 'Not Started' || 
        event.strStatus === '' || 
        !event.strStatus
      );

      // Get current round to show games around current week
      const currentDate = new Date();
      const currentRoundEvents = this.getEventsAroundCurrentRound(upcomingEvents, currentDate);

      // Transform selected events
      const transformedFixtures = await Promise.all(
        currentRoundEvents.slice(0, 15).map(event => this.transformEvent(event))
      );

      // Sort by importance (descending) and take the most important ones
      return transformedFixtures
        .sort((a, b) => b.importance - a.importance)
        .slice(0, limit);

    } catch (error) {
      console.error('Error fetching featured fixtures:', error);
      throw new Error('Failed to fetch featured fixtures');
    }
  }

  // Helper function to get events around current round
  private getEventsAroundCurrentRound(events: SportsDbEvent[], currentDate: Date): SportsDbEvent[] {
    // Find the current round by looking at upcoming fixtures
    const upcomingWithDates = events
      .map(event => ({
        event,
        date: new Date(SportsDbApi.combineDateTime(event.dateEvent, event.strTime, event.strTimestamp))
      }))
      .filter(({ date }) => !isNaN(date.getTime()) && date >= currentDate)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (upcomingWithDates.length === 0) return events.slice(0, 10);

    // Get the round of the next upcoming fixture
    const nextFixture = upcomingWithDates[0];
    const currentRound = parseInt(nextFixture.event.intRound || '1');

    // Return fixtures from current round and next 2 rounds
    return events.filter(event => {
      const eventRound = parseInt(event.intRound || '1');
      return eventRound >= currentRound && eventRound <= currentRound + 2;
    });
  }

  // Get all upcoming fixtures
  async getAllUpcomingFixtures(): Promise<FeaturedFixtureWithImportance[]> {
    try {
      // FIXED: Use current season fixtures and filter for upcoming
      const events = await this.sportsDbApi.getCurrentSeasonFixtures();
      
      if (!events || events.length === 0) {
        return [];
      }

      // Filter for upcoming fixtures only
      const upcomingEvents = events.filter(event => 
        event.strStatus === 'Not Started' || 
        event.strStatus === '' || 
        !event.strStatus
      );

      // Transform all upcoming events
      const transformedFixtures = await Promise.all(
        upcomingEvents.map(event => this.transformEvent(event))
      );

      // Sort by date
      return transformedFixtures.sort((a, b) => 
        new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
      );

    } catch (error) {
      console.error('Error fetching all fixtures:', error);
      throw new Error('Failed to fetch fixtures');
    }
  }

  // Clear caches
  clearCache(): void {
    this.teamCache.clear();
    this.formCache.clear();
    this.sportsDbApi.clearCache();
  }
}
