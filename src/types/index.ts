// src/types/index.ts

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  colors: { primary: string; secondary: string };
  form: string[];
  position: number;
}

export interface Fixture {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  competition: { id: string; name: string; logo: string; country: string };
  dateTime: string;
  venue: string;
  status: string;
  homeScore: number;
  awayScore: number;
  aiInsight?: AIInsight;
}

export interface TeamStats {
  shotsOnTarget: number;
  totalShots: number;
  corners: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  possession: number;
  passAccuracy: number;
  offsides: number;
}

export interface MatchStats {
  fixtureId: string;
  homeTeamStats: TeamStats;
  awayTeamStats: TeamStats;
  leagueAverages: TeamStats;
  lastUpdated: string;
}

export interface AIInsight {
  id: string;
  title: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
  market: string;
  odds: string;
  supportingData?: string;
}

// Optional: other shared types like LeagueTableRow, Competition, etc.
export interface Competition {
  id: string;
  name: string;
  logo: string;
  country: string;
}

export interface LeagueTableRow {
  position: number;
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}
