// src/Phase3VerificationTest.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Badge from './components/common/Badge/Badge';
import HeroSection from './components/fixtures/HeroSection/HeroSection';
import { LeagueTable } from './components/league/LeagueTable/LeagueTable';
import { LeagueTableRow } from './components/league/LeagueTable/LeagueTable.types';
import { Fixture } from './components/fixtures/HeroSection/HeroSection.types';

// --------------------
// Inline Mock Data
// --------------------

// Featured fixture for HeroSection
const mockFeaturedFixture = {
  id: 'fixture-1',
  homeTeam: {
    id: 'man-utd',
    name: 'Manchester United',
    shortName: 'MUN',
    logo: 'https://via.placeholder.com/64x64/DC143C/FFFFFF?text=MUN',
    colors: { primary: '#DC143C', secondary: '#FFD700' },
    form: ['W', 'W', 'D', 'W', 'L'],
    position: 3
  },
  awayTeam: {
    id: 'chelsea',
    name: 'Chelsea FC',
    shortName: 'CHE',
    logo: 'https://via.placeholder.com/64x64/034694/FFFFFF?text=CHE',
    colors: { primary: '#034694', secondary: '#FFFFFF' },
    form: ['W', 'L', 'W', 'W', 'D'],
    position: 5
  },
  competition: {
    name: 'Premier League',
    logo: 'https://via.placeholder.com/32x32/37003C/FFFFFF?text=PL'
  },
  dateTime: '2024-03-10T15:00:00Z',
  venue: 'Old Trafford',
  aiInsight: {
    title: 'High-Scoring Encounter Expected',
    description: 'Both teams average 2.3 goals per game. Over 2.5 goals has hit in 4/5 recent meetings.',
    confidence: 'high',
    probability: 78
  }
};

// Mock fixtures list
const mockFixtures: Fixture[] = [
  {
    id: 'fixture-1',
    homeTeam: mockFeaturedFixture.homeTeam,
    awayTeam: mockFeaturedFixture.awayTeam,
    competition: mockFeaturedFixture.competition,
    dateTime: mockFeaturedFixture.dateTime,
    venue: mockFeaturedFixture.venue
  },
  {
    id: 'fixture-2',
    homeTeam: {
      id: 'arsenal',
      name: 'Arsenal FC',
      shortName: 'ARS',
      logo: 'https://via.placeholder.com/64x64/EF0107/FFFFFF?text=ARS',
      colors: { primary: '#EF0107', secondary: '#FFFFFF' },
      form: ['W', 'W', 'W', 'D', 'L'],
      position: 2
    },
    awayTeam: {
      id: 'liverpool',
      name: 'Liverpool FC',
      shortName: 'LIV',
      logo: 'https://via.placeholder.com/64x64/C8102E/FFFFFF?text=LIV',
      colors: { primary: '#C8102E', secondary: '#FFFFFF' },
      form: ['L', 'W', 'D', 'W', 'W'],
      position: 4
    },
    competition: {
      name: 'Premier League',
      logo: 'https://via.placeholder.com/32x32/37003C/FFFFFF?text=PL'
    },
    dateTime: '2024-03-11T17:30:00Z',
    venue: 'Emirates Stadium'
  }
];

// Mock league table rows
const mockLeagueTableRows: LeagueTableRow[] = [
  { team: { name: 'Manchester United' }, position: 1, points: 72, played: 30, won: 22, drawn: 6, lost: 2, goalsFor: 68, goalsAgainst: 24, goalDifference: 44, form: ['W','D','W'] },
  { team: { name: 'Chelsea FC' }, position: 2, points: 68, played: 30, won: 21, drawn: 5, lost: 4, goalsFor: 63, goalsAgainst: 28, goalDifference: 35, form: ['W','L','W'] },
  { team: { name: 'Arsenal FC' }, position: 3, points: 65, played: 30, won: 20, drawn: 5, lost: 5, goalsFor: 60, goalsAgainst: 30, goalDifference: 30, form: ['W','W','W'] }
];

// --------------------
// Phase 3 Verification Test Component
// --------------------
const Phase3VerificationTest: React.FC = () => {
  const handleViewStats = (fixtureId: string) => console.log('View stats for fixture:', fixtureId);
  const handleViewInsights = (fixtureId: string) => console.log('View AI insights for fixture:', fixtureId);
  const handleRemoveBadge = () => console.log('Badge removed');

  return (
    <div className="p-4 space-y-8">
      {/* Hero Section */}
      <section>
        <h2 className="text-xl font-bold mb-2">Featured Fixture</h2>
        <HeroSection
          featuredFixture={mockFeaturedFixture}
          onViewStats={handleViewStats}
          onViewInsights={handleViewInsights}
        />
      </section>

      {/* Fixtures List */}
      <section>
        <h2 className="text-xl font-bold mb-2">Upcoming Fixtures</h2>
        <div className="space-y-2">
          {mockFixtures.map(fixture => (
            <div key={fixture.id} className="p-2 border rounded">
              <div className="flex justify-between items-center">
                <div>{fixture.homeTeam.name} vs {fixture.awayTeam.name}</div>
                <div>{new Date(fixture.dateTime).toLocaleString()}</div>
              </div>
              <div className="flex gap-2 mt-1">
                <Badge variant="success" removable onRemove={handleRemoveBadge}>
                  Home Form: {fixture.homeTeam.form.join(',')}
                </Badge>
                <Badge variant="error" removable onRemove={handleRemoveBadge}>
                  Away Form: {fixture.awayTeam.form.join(',')}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* League Table */}
      <section>
        <h2 className="text-xl font-bold mb-2">League Table</h2>
        <LeagueTable
          rows={mockLeagueTableRows}
          title="Premier League Standings"
          showForm
          showGoals
          maxRows={5}
          sortable
        />
      </section>
    </div>
  );
};

export default Phase3VerificationTest;

// --------------------
// Tests
// --------------------
describe('HeroSection Component', () => {
  it('renders featured fixture details', () => {
    render(<HeroSection featuredFixture={mockFeaturedFixture} />);
    expect(screen.getByText(/Featured Match/i)).toBeInTheDocument();
    expect(screen.getByText(/Big Match Preview/i)).toBeInTheDocument();
    expect(screen.getByText(/Manchester United/i)).toBeInTheDocument();
    expect(screen.getByText(/Chelsea FC/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /View Match Stats/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /AI Betting Insights/i })).toBeInTheDocument();
    expect(screen.getByText(/High-Scoring Encounter Expected/i)).toBeInTheDocument();
  });

  it('calls callback functions on button clicks', () => {
    const mockStats = jest.fn();
    const mockInsights = jest.fn();
    render(<HeroSection featuredFixture={mockFeaturedFixture} onViewStats={mockStats} onViewInsights={mockInsights} />);
    fireEvent.click(screen.getByRole('button', { name: /View Match Stats/i }));
    fireEvent.click(screen.getByRole('button', { name: /AI Betting Insights/i }));
    expect(mockStats).toHaveBeenCalledTimes(1);
    expect(mockInsights).toHaveBeenCalledTimes(1);
  });
});

describe('LeagueTable Component', () => {
  it('renders league table with correct title', () => {
    render(<LeagueTable rows={mockLeagueTableRows} title="Premier League Standings" showForm showGoals />);
    expect(screen.getByText(/Premier League Standings/i)).toBeInTheDocument();
  });

  it('renders first team name from rows', () => {
    render(<LeagueTable rows={mockLeagueTableRows} title="Premier League Standings" />);
    expect(screen.getByText(mockLeagueTableRows[0].team.name)).toBeInTheDocument();
  });
});

describe('Badge Component', () => {
  it('renders badge with correct text and variant', () => {
    render(<Badge variant="success">Test Badge</Badge>);
    expect(screen.getByText(/Test Badge/i)).toBeInTheDocument();
  });

  it('calls onRemove when removable badge is clicked', () => {
    const mockRemove = jest.fn();
    render(<Badge variant="error" removable onRemove={mockRemove}>Removable Badge</Badge>);
    fireEvent.click(screen.getByRole('button'));
    expect(mockRemove).toHaveBeenCalledTimes(1);
  });
});
