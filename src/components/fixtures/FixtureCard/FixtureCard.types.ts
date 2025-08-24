// src/components/fixtures/FixtureCard/FixtureCard.types.ts

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  colors: { 
    primary: string; 
    secondary: string; 
  };
  form: ('W' | 'D' | 'L')[];
  position?: number;
}

export interface Competition {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  country: string;
}

export interface AIInsight {
  id: string;
  title: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
  market: string;
  odds?: string;
}

export interface Fixture {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  competition: Competition;
  dateTime: string;
  venue: string;
  status: 'scheduled' | 'live' | 'finished' | 'postponed';
  homeScore?: number;
  awayScore?: number;
  aiInsight?: AIInsight;
  kickoffTime?: string;
}

export interface FixtureCardProps {
  fixture: Fixture;
  size?: 'sm' | 'md' | 'lg';
  showAIInsight?: boolean;
  showCompetition?: boolean;
  showVenue?: boolean;
  onClick?: (fixture: Fixture) => void;
  className?: string;
}

export interface FixtureStatusProps {
  status: Fixture['status'];
  kickoffTime?: string;
  homeScore?: number;
  awayScore?: number;
}

export interface TeamFormProps {
  form: ('W' | 'D' | 'L')[];
  maxItems?: number;
}
