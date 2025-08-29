// src/mocks/mockData.ts
import { FeaturedFixtureWithImportance, Team, Competition, AIInsight } from "../types";

// Example competitions
export const premierLeague: Competition = { id: 1, name: "Premier League" };
export const championsLeague: Competition = { id: 2, name: "Champions League" };

// Example teams
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

export const teamC: Team = {
  id: 103,
  name: "Chelsea",
  shortName: "CHE",
  colors: { primary: "#034694", secondary: "#FFFFFF" },
  position: 3,
  form: ["L", "D", "W", "W", "L"],
};

export const teamD: Team = {
  id: 104,
  name: "Arsenal",
  shortName: "ARS",
  colors: { primary: "#EF0107", secondary: "#FFCD00" },
  position: 4,
  form: ["W", "W", "W", "D", "L"],
};

// Example AI insights
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

// Mock featured fixtures
export const featuredFixtures: FeaturedFixtureWithImportance[] = [
  {
    id: 1001,
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
    id: 1002,
    competition: premierLeague,
    homeTeam: teamC,
    awayTeam: teamD,
    dateTime: "2025-09-02T17:00:00Z",
    venue: "Stamford Bridge",
    importance: 8,
    importanceScore: 7,
    matchWeek: 5,
    isBigMatch: false,
    tags: ["weekend-fixture"],
    aiInsight: exampleAIInsight2,
  },
];
