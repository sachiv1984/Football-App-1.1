// src/components/fixtures/MatchHeader/MatchHeader.types.ts
import type { Fixture, Team } from '@/types';  // ✅ Add this import

export interface MatchHeaderProps {
  fixture: Fixture;
  className?: string;
}

export interface TeamMatchupProps {
  team: Team;
  score?: number;
  isHome?: boolean;
  className?: string;
}
