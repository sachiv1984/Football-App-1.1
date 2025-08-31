// src/types/api.ts
export interface ApiFixture {
  id: string;
  dateTime: string;
  homeTeam: ApiTeam;
  awayTeam: ApiTeam;
  venue: string;
  competition: ApiCompetition;
  matchWeek: number;
  status: 'upcoming' | 'live' | 'finished';
}

export interface ApiTeam {
  id: string;
  name: string;
  shortName?: string;
  badge?: string;
  form?: string[];
}

export interface ApiCompetition {
  id: string;
  name: string;
  logo?: string;
}
