// src/mocks/mockData.ts
import { FeaturedFixtureWithImportance, Team, Competition, AIInsight } from "../types";

// Competitions
export const premierLeague: Competition = { id: 1, name: "Premier League" };
export const championsLeague: Competition = { id: 2, name: "Champions League" };

// Teams
export const teamA: Team = {
  id: 101,
  name: "Manchester United",
  shortName: "Man Utd",
  colors: { primary: "#DA291C", secondary: "#FBE122" },
  position: 1,
  form: ["W", "D", "L", "W", "W"],
};

export const teamB: Team = {
  id: 102,
  name: "Liverpool",
  shortName: "LIV",
  colors: { primary: "#C8102E", secondary: "#00B2A9" },
  position: 2,
  form: ["W", "W", "D", "L", "W"],
};

// AI Insights
export const exampleAIInsight1: AIInsight = {
  id: 1,
  title: "Team A likely to win",
  description: "Based on recent form and position.",
  confidence: "high",
  probability: 0.85,
};

export const exampleAIInsight2: AIInsight = {
  id: 2,
  title: "Team B underperforming",
  description: "Has lost two away games recently.",
  confidence: "medium",
  probability: 0.65,
};

// Featured fixtures
export const featuredFixtures: FeaturedFixtureWithImportance[] = [
  {
    id: 1001,
    competition: premierLeague,
    homeTeam: teamA,
    awayTeam: teamB,
    dateTime: "2025-09-01T15:00:00Z",
    venue: "Old Trafford",
    importance: 10,
    importanceScore: 9, // required
    matchWeek: 5,
    isBigMatch: true,
    tags: ["top-of-the-table", "rivalry"], // string[]
    aiInsight: exampleAIInsight1,
  },
  {
    id: 1002,
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
