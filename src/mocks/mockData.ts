import { FeaturedFixtureWithImportance } from '../components/fixtures/FeaturedGamesCarousel/FeaturedGamesCarousel.types';

export const mockFeaturedFixture: FeaturedFixtureWithImportance = {
  id: 1,
  homeTeam: {
    id: 101,
    name: "Team A",
    position: 2,
    form: ["W", "D", "W", "L", "W"],
  },
  awayTeam: {
    id: 102,
    name: "Team B",
    position: 5,
    form: ["L", "W", "D", "D", "W"],
  },
  dateTime: "2025-08-30T18:00:00Z",
  venue: "Stadium Name",
  importance: 3,
  importanceScore: 5, // required
  matchWeek: 5,
  isBigMatch: true,
  tags: ["derby", "top-six"],
  competition: "Premier League", // required
};
