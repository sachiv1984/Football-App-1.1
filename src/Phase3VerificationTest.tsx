// src/Phase3VerificationTest.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Badge from '../components/common/Badge/Badge';
import HeroSection from '../components/fixtures/HeroSection/HeroSection';
import LeagueTable from '../components/league/LeagueTable/LeagueTable';
import { featuredFixture, fixtures, leagueTableRows } from './test.data/Phase3VerificationTest.data';

// ---------------------------
// HeroSection Tests
// ---------------------------
describe('HeroSection Component', () => {
  it('renders featured fixture details', () => {
    render(<HeroSection featuredFixture={featuredFixture} />);

    // Team names
    expect(screen.getByText(featuredFixture.homeTeam.name)).toBeInTheDocument();
    expect(screen.getByText(featuredFixture.awayTeam.name)).toBeInTheDocument();

    // Venue
    expect(screen.getByText(featuredFixture.venue)).toBeInTheDocument();

    // AI insight
    expect(screen.getByText(featuredFixture.aiInsight.title)).toBeInTheDocument();

    // Buttons
    expect(screen.getByRole('button', { name: /View Match Stats/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /AI Betting Insights/i })).toBeInTheDocument();
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

// ---------------------------
// LeagueTable Tests
// ---------------------------
describe('LeagueTable Component', () => {
  it('renders league table with correct title and headers', () => {
    render(
      <LeagueTable
        rows={leagueTableRows}
        title="Premier League Standings"
        showForm
        showGoals
      />
    );

    // Title
    expect(screen.getByText(/Premier League Standings/i)).toBeInTheDocument();

    // Headers (match actual rendered text)
    expect(screen.getByText(/^Pos$/)).toBeInTheDocument(); // matches "Pos"
    expect(screen.getByText(/^Pts$/)).toBeInTheDocument(); // matches "Pts"
  });

  it('renders first team name and points correctly', () => {
    render(<LeagueTable rows={leagueTableRows} title="Premier League Standings" />);

    const firstTeam = leagueTableRows[0];
    expect(screen.getByText(firstTeam.team.name)).toBeInTheDocument();

    // Points are wrapped in div
    expect(screen.getByText(`${firstTeam.points}`)).toBeInTheDocument();
  });

  it('renders all rows', () => {
    render(<LeagueTable rows={leagueTableRows} title="Premier League Standings" />);

    leagueTableRows.forEach(row => {
      expect(screen.getByText(row.team.name)).toBeInTheDocument();
      expect(screen.getByText(`${row.points}`)).toBeInTheDocument();
    });
  });
});

// ---------------------------
// Badge Tests
// ---------------------------
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
