// src/components/fixtures/MatchHeader/MatchHeader.types.ts
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
