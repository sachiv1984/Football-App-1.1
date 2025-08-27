// src/types/index.ts
export interface Team {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  colors: { primary: string; secondary: string };
  form: ('W' | 'D' | 'L')[];
  position: number;
}

export interface Competition {
  id: string;
  name: string;
  shortName: string; // Added this missing property
  logo: string;
  country: string;
}

export interface AIInsight {
  id: string;
  title: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
  probability: number; // Added this missing property
  market: string;
  odds: string;
  supportingData?: string;
}

export interface Fixture {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  competition: Competition; // Now uses the full Competition interface
  dateTime: string;
  venue: string;
  status: string;
  homeScore: number;
  awayScore: number;
  aiInsight?: AIInsight;
}

export interface FeaturedFixture {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  competition: Competition;
  dateTime: string;
  venue: string;
  status: string;
  homeScore: number;
  awayScore: number;
  aiInsight?: {
    title: string;
    description: string;
    confidence: 'high' | 'medium' | 'low';
    probability: number;
  };
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
  form: ('W' | 'D' | 'L')[]; // Added missing property
  lastUpdated: string; // Added missing property
}
