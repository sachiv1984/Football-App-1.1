// src/Phase3VerificationTest.tsx
import React, { useState } from 'react';
import { 
  Header, 
  Footer, 
  Button, 
  Card, 
  Badge,
  HeroSection,
  FixtureCard,
  FixturesList,
  LeagueTable
} from './components';

// Mock data for testing Phase 3 components
const mockFixtures = [
  {
    id: '1',
    homeTeam: {
      id: 'team-arsenal',
      name: 'Arsenal',
      shortName: 'ARS',
      logo: '🔴',
      colors: { primary: '#EF0107', secondary: '#FFFFFF' },
      form: ['W', 'D', 'W', 'W', 'L'] as const
    },
    awayTeam: {
      id: 'team-chelsea',
      name: 'Chelsea',
      shortName: 'CHE',
      logo: '🔵',
      colors: { primary: '#034694', secondary: '#FFFFFF' },
      form: ['L', 'W', 'D', 'L', 'W'] as const
    },
    competition: {
      id: 'comp-premier-league',
      name: 'Premier League',
      shortName: 'PL',
      logo: '🏆',
      country: 'England'
    },
    dateTime: '2024-01-15T15:00:00',
    venue: 'Emirates Stadium',
    status: 'scheduled' as const
  },
  {
    id: '2',
    homeTeam: {
      id: 'team-mancity',
      name: 'Manchester City',
      shortName: 'MCI',
      logo: '🩵',
      colors: { primary: '#6CABDD', secondary: '#FFFFFF' },
      form: ['W', 'W', 'L', 'W', 'D'] as const
    },
    awayTeam: {
      id: 'team-liverpool',
      name: 'Liverpool',
      shortName: 'LIV',
      logo: '🔴',
      colors: { primary: '#C8102E', secondary: '#FFFFFF' },
      form: ['W', 'D', 'W', 'L', 'W'] as const
    },
    competition: {
      id: 'comp-premier-league',
      name: 'Premier League',
      shortName: 'PL',
      logo: '🏆',
      country: 'England'
    },
    dateTime: '2024-01-16T17:30:00',
    venue: 'Etihad Stadium',
    status: 'finished' as const,
    homeScore: 2,
    awayScore: 1
  },
  {
    id: '3',
    homeTeam: {
      id: 'team-tottenham',
      name: 'Tottenham',
      shortName: 'TOT',
      logo: '⚪',
      colors: { primary: '#132257', secondary: '#FFFFFF' },
      form: ['D', 'W', 'L', 'W', 'W'] as const
    },
    awayTeam: {
      id: 'team-newcastle',
      name: 'Newcastle',
      shortName: 'NEW',
      logo: '⚫',
      colors: { primary: '#241F20', secondary: '#FFFFFF' },
      form: ['L', 'D', 'W', 'L', 'D'] as const
    },
    competition: {
      id: 'comp-premier-league',
      name: 'Premier League',
      shortName: 'PL',
      logo: '🏆',
      country: 'England'
    },
    dateTime: '2024-01-17T20:00:00',
    venue: 'Tottenham Hotspur Stadium',
    status: 'live' as const,
    homeScore: 1,
    awayScore: 0
  }
];

const mockLeagueData = [
  {
    position: 1,
    team: { name: 'Arsenal', logo: '🔴' },
    played: 20,
    won: 15,
    drawn: 3,
    lost: 2,
    goalsFor: 42,
    goalsAgainst: 18,
    goalDifference: 24,
    points: 48,
    form: ['W', 'W', 'D', 'W', 'W'] as const
  },
  {
    position: 2,
    team: { name: 'Manchester City', logo: '🩵' },
    played: 20,
    won: 14,
    drawn: 4,
    lost: 2,
    goalsFor: 45,
    goalsAgainst: 20,
    goalDifference: 25,
    points: 46,
    form: ['W', 'L', 'W', 'W', 'D'] as const
  },
  {
    position: 3,
    team: { name: 'Liverpool', logo: '🔴' },
    played: 20,
    won: 13,
    drawn: 5,
    lost: 2,
    goalsFor: 40,
    goalsAgainst: 22,
    goalDifference: 18,
    points: 44,
    form: ['D', 'W', 'W', 'L', 'W'] as const
  },
  {
    position: 18,
    team: { name: 'Sheffield United', logo: '🔴' },
    played: 20,
    won: 3,
    drawn: 4,
    lost: 13,
    goalsFor: 15,
    goalsAgainst: 42,
    goalDifference: -27,
    points: 13,
    form: ['L', 'L', 'D', 'L', 'L'] as const
  },
  {
    position: 19,
    team: { name: 'Burnley', logo: '🟤' },
    played: 20,
    won: 2,
    drawn: 5,
    lost: 13,
    goalsFor: 12,
    goalsAgainst: 38,
    goalDifference: -26,
    points: 11,
    form: ['L', 'D', 'L', 'L', 'D'] as const
  },
  {
    position: 20,
    team: { name: 'Luton Town', logo: '🟠' },
    played: 20,
    won: 2,
    drawn: 3,
    lost: 15,
    goalsFor: 14,
    goalsAgainst: 45,
    goalDifference: -31,
    points: 9,
    form: ['L', 'L', 'L', 'D', 'L'] as const
  }
];

const Phase3VerificationTest: React.FC = () => {
  const [activeTest, setActiveTest] = useState<string>('overview');
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  const runTest = (testName: string, condition: boolean) => {
    setTestResults(prev => ({ ...prev, [testName]: condition }));
    return condition;
  };

  const TestSection: React.FC<{ title: string; children: React.ReactNode; testKey: string }> = ({ 
    title, 
    children, 
    testKey 
  }) => (
    <Card className="mb-6">
      <Card.Header 
        title={title}
        action={
          <div className="flex items-center gap-2">
            <Badge 
              variant={testResults[testKey] === true ? 'success' : testResults[testKey] === false ? 'danger' : 'secondary'}
            >
              {testResults[testKey] === true ? '✅ PASS' : testResults[testKey] === false ? '❌ FAIL' : '⏳ PENDING'}
            </Badge>
          </div>
        }
      />
      <Card.Body>{children}</Card.Body>
    </Card>
  );

  // --- Render Functions (Overview, Hero, FixtureCard, FixturesList, LeagueTable, Integration) ---
  // These remain the same as your previous version. You just need to pass the updated `mockFixtures` and `mockLeagueData` to FixtureCard, FixturesList, LeagueTable components.

  const navigationButtons = [
    { key: 'overview', label: '📋 Overview', icon: '📋' },
    { key: 'hero', label: '🏆 Hero Section', icon: '🏆' },
    { key: 'fixtureCard', label: '⚽ Fixture Card', icon: '⚽' },
    { key: 'fixturesList', label: '📅 Fixtures List', icon: '📅' },
    { key: 'leagueTable', label: '🏆 League Table', icon: '🏆' },
    { key: 'integration', label: '🔗 Integration', icon: '🔗' }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Navigation */}
          <Card className="mb-6">
            <Card.Body>
              <div className="flex flex-wrap gap-2">
                {navigationButtons.map(({ key, label, icon }) => (
                  <Button
                    key={key}
                    variant={activeTest === key ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTest(key)}
                    className="flex items-center gap-2"
                  >
                    <span>{icon}</span>
                    {label}
                  </Button>
                ))}
              </div>
            </Card.Body>
          </Card>

          {/* Test Content */}
          {activeTest === 'overview' && <div>Overview Content Here</div>}
          {activeTest === 'hero' && <div>Hero Test Content Here</div>}
          {activeTest === 'fixtureCard' && <div>FixtureCard Test Content Here</div>}
          {activeTest === 'fixturesList' && <div>FixturesList Test Content Here</div>}
          {activeTest === 'leagueTable' && <div>LeagueTable Test Content Here</div>}
          {activeTest === 'integration' && <div>Integration Test Content Here</div>}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Phase3VerificationTest;

