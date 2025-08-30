// src/mocks/mockData.ts
import { FeaturedFixtureWithImportance, Team, Competition, AIInsight } from "../types";

// Competitions - using string IDs
export const premierLeague: Competition = { id: "pl", name: "Premier League" };
export const championsLeague: Competition = { id: "ucl", name: "Champions League" };

// Teams - using string IDs
export const teamA: Team = {
  id: "man-utd",
  name: "Manchester United",
  shortName: "Man Utd",
  colors: { primary: "#DA291C", secondary: "#FBE122" },
  position: 1,
  form: ["W", "D", "L", "W", "W"],
};

export const teamB: Team = {
  id: "liverpool",
  name: "Liverpool",
  shortName: "LIV",
  colors: { primary: "#C8102E", secondary: "#00B2A9" },
  position: 2,
  form: ["W", "W", "D", "L", "W"],
};

// AI Insights - using string IDs
export const exampleAIInsight1: AIInsight = {
  id: "insight-1",
  title: "Team A likely to win",
  description: "Based on recent form and position.",
  confidence: "high",
  probability: 0.85,
};

export const exampleAIInsight2: AIInsight = {
  id: "insight-2",
  title: "Team B underperforming",
  description: "Has lost two away games recently.",
  confidence: "medium",
  probability: 0.65,
};

// Featured fixtures - using string IDs
export const featuredFixtures: FeaturedFixtureWithImportance[] = [
  {
    id: "fixture-1001",
    competition: premierLeague,
    homeTeam: teamA,
    awayTeam: teamB,
    dateTime: "2025-09-01T15:00:00Z",
    venue: "Old Trafford",
    importance: 10,
    importanceScore: 9,
    matchWeek: 5,
    isBigMatch: true,
    tags: ["top-of-the-table", "rivalry"],
    aiInsight: exampleAIInsight1,
  },
  {
    id: "fixture-1002",
    competition: premierLeague,
    homeTeam: teamB,
    awayTeam: teamA,
    dateTime: "2025-09-02T17:00:00Z",
    venue: "Anfield",
    importance: 8,
    importanceScore: 7,
    matchWeek: 5,
    isBigMatch: false,
    tags: ["weekend-fixture"],
    aiInsight: exampleAIInsight2,
  },
];