// src/components/stats/StatsTable/StatsTable.types.ts
export interface StatRowProps {
  statName: string;
  homeValue: number;
  awayValue: number;
  leagueAverage?: number;
  unit?: string;
  reverseComparison?: boolean; // For stats where lower is better (e.g., fouls)
  className?: string;
}

export interface StatsTableProps {
  homeTeam: Team;
  awayTeam: Team;
  stats: MatchStats;
  className?: string;
}

export interface StatsComparisonProps {
  homeStats: TeamStats;
  awayStats: TeamStats;
  leagueAverages: TeamStats;
  homeTeam: Team;
  awayTeam: Team;
}
