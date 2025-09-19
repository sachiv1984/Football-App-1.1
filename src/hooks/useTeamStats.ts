// src/hooks/useTeamStats.ts
import { useState, useEffect } from 'react';
import { fbrefStatsService } from '../services/stats/fbrefStatsService';

interface TeamStatsData {
  recentForm: {
    homeResults: ('W' | 'D' | 'L')[];
    awayResults: ('W' | 'D' | 'L')[];
    homeStats: { matchesPlayed: number; won: number; drawn: number; lost: number };
    awayStats: { matchesPlayed: number; won: number; drawn: number; lost: number };
  };
  [key: string]: any;
}

export const useTeamStats = (homeTeam?: string, awayTeam?: string) => {
  const [stats, setStats] = useState<TeamStatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async (home: string, away: string) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Loading stats for ${home} vs ${away}`);
      const matchStats = await fbrefStatsService.getMatchStats(home, away);
      setStats(matchStats);
    } catch (err) {
      console.error('Error loading team stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load team stats');
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (homeTeam && awayTeam) {
      loadStats(homeTeam, awayTeam);
    }
  }, [homeTeam, awayTeam]);

  const refetch = async () => {
    if (homeTeam && awayTeam) {
      fbrefStatsService.clearCache();
      await loadStats(homeTeam, awayTeam);
    }
  };

  const switchLeague = async (league: 'premierLeague' | 'laLiga' | 'bundesliga' | 'serieA' | 'ligue1') => {
    if (homeTeam && awayTeam) {
      try {
        setLoading(true);
        setError(null);
        
        fbrefStatsService.setLeague(league);
        await loadStats(homeTeam, awayTeam);
      } catch (err) {
        console.error('Error switching league for stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to switch league');
        setLoading(false);
      }
    }
  };

  return {
    stats,
    loading,
    error,
    refetch,
    switchLeague,
    loadStats: (home: string, away: string) => loadStats(home, away)
  };
};