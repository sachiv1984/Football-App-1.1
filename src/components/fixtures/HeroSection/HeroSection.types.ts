// src/components/fixtures/HeroSection/HeroSection.types.ts

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
  position: number;
}

export interface Competition {
  name: string;
  logo: string;
  id: string;
}

export interface AIInsight {
  title: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
  probability: number;
  category: 'goals' | 'corners' | 'cards' | 'fouls' | 'possession';
}

export interface FeaturedFixture {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  competition: Competition;
  dateTime: string;
  venue: string;
  isLive?: boolean;
  isUpcoming?: boolean;
  status: 'scheduled' | 'live' | 'finished' | 'postponed';
  aiInsight?: AIInsight;
}

export interface HeroSectionProps {
  featuredFixture?: FeaturedFixture;
  onViewStats?: (fixtureId: string) => void;
  onViewInsights?: (fixtureId: string) => void;
  className?: string;
}
