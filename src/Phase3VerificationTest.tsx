// src/Phase3VerificationTest.tsx
import React from 'react';
import { render } from '@testing-library/react';
import Badge from './components/common/Badge/Badge';
import { HeroSection } from './components/fixtures/HeroSection/HeroSection';
import { LeagueTable } from './components/league/LeagueTable/LeagueTable';
import { featuredFixture, fixtures, leagueTableRows } from './__tests__/Phase3VerificationTest.data';
import { LeagueTableRow } from './components/league/LeagueTable/LeagueTable.types';
import { Fixture, FeaturedFixture } from './components/fixtures/HeroSection/HeroSection.types';

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
