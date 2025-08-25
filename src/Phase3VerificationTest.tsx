// src/Phase3VerificationTest.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Badge from './components/common/Badge/Badge';
import HeroSection from './components/fixtures/HeroSection/HeroSection';
import { LeagueTable } from './components/league/LeagueTable/// src/Phase3VerificationTest.tsx
import { featuredFixture, fixtures, leagueTableRows } from './test-data/Phase3VerificationTest.data';
import { LeagueTableRow } from './components/league/LeagueTable/LeagueTable.types';
import { Fixture } from './components/fixtures/HeroSection/HeroSection.types';

// ✅ Phase 3 Preview Component (manual UI check)
const Phase3VerificationTest: React.FC = () => {
  const handleViewStats = (fixtureId: string) => {
    console.log('View stats for fixture:', fixtureId);
  };

  const handleViewInsights = (fixtureId: string) => {
    console.log('View AI insights for fixture:', fixtureId);
  };

  const handleRemoveBadge = () => {
    console.log('Badge removed');
  };

  return (
    <div className="p-4 space-y-8">
      {/* --- Hero Section with Featured Fixture --- */}
      <section>
        <h2 className="text-xl font-bold mb-2">Featured Fixture</h2>
        <HeroSection
          featuredFixture={featuredFixture}
          onViewStats={handleViewStats}
          onViewInsights={handleViewInsights}
          className="w-full"
        />
      </section>

      {/* --- Fixtures List --- */}
      <section>
        <h2 className="text-xl font-bold mb-2">Upcoming Fixtures</h2>
        <div className="space-y-2">
          {fixtures.map((fixture: Fixture) => (
            <div key={fixture.id} className="p-2 border rounded">
              <div className="flex justify-between items-center">
                <div>
                  {fixture.homeTeam.name} vs {fixture.awayTeam.name}
                </div>
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

      {/* --- League Table --- */}
      <section>
        <h2 className="text-xl font-bold mb-2">League Table</h2>
        <LeagueTable
          rows={leagueTableRows as LeagueTableRow[]}
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

/* ===========================
   ✅ TESTS
   =========================== */

// ✅ HeroSection Tests
describe('HeroSection Component', () => {
  it('renders featured fixture details', () => {
    render(<HeroSection featuredFixture={featuredFixture} />);

    expect(screen.getByText(/Featured Match/i)).toBeInTheDocument();

    // Flexible matcher for text split across elements
    expect(
      screen.getByText((content, element) => content.includes('Big Match Preview'))
    ).toBeInTheDocument();

    expect(screen.getByText(/Manchester United/i)).toBeInTheDocument();
    expect(screen.getByText(/Chelsea FC/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /View Match Stats/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /AI Betting Insights/i })).toBeInTheDocument();
    expect(screen.getByText(/High-Scoring Encounter Expected/i)).toBeInTheDocument();
  });

  it('calls callback functions on button clicks', () => {
    const mockStats = jest.fn();
    const mockInsights = jest.fn();

    render(
      <HeroSection
        featuredFixture={featuredFixture}
        onViewStats={mockStats}
        onViewInsights={mockInsights}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /View Match Stats/i }));
    fireEvent.click(screen.getByRole('button', { name: /AI Betting Insights/i }));

    expect(mockStats).toHaveBeenCalledTimes(1);
    expect(mockInsights).toHaveBeenCalledTimes(1);
  });
});

// ✅ LeagueTable Tests
describe('LeagueTable Component', () => {
  it('renders league table with correct title', () => {
    render(
      <LeagueTable
        rows={leagueTableRows as LeagueTableRow[]}
        title="Premier League Standings"
        showForm
        showGoals
      />
    );

    expect(screen.getByText(/Premier League Standings/i)).toBeInTheDocument();
    expect(screen.getByText(/Position/i)).toBeInTheDocument();
    expect(screen.getByText(/Points/i)).toBeInTheDocument();
  });

  it('renders first team name from rows', () => {
    render(
      <LeagueTable
        rows={leagueTableRows as LeagueTableRow[]}
        title="Premier League Standings"
      />
    );

    expect(screen.getByText(leagueTableRows[0].team.name)).toBeInTheDocument();
  });
});

// ✅ Badge Component Tests
describe('Badge Component', () => {
  it('renders badge with correct text and variant', () => {
    render(<Badge variant="success">Test Badge</Badge>);

    expect(screen.getByText(/Test Badge/i)).toBeInTheDocument();
  });

  it('calls onRemove when removable badge is clicked', () => {
    const mockRemove = jest.fn();

    render(
      <Badge variant="error" removable onRemove={mockRemove}>
        Removable Badge
      </Badge>
    );

    fireEvent.click(screen.getByRole('button'));
    expect(mockRemove).toHaveBeenCalledTimes(1);
  });
});
