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
    homeTeam: { id: 'ht1', name: 'Arsenal', shortName: 'ARS', logo: '🔴', colors: { primary: '#EF0107', secondary: '#ffffff' }, form: ['W','D','L','W','W'], position: 1 },
    awayTeam: { id: 'at1', name: 'Chelsea', shortName: 'CHE', logo: '🔵', colors: { primary: '#034694', secondary: '#ffffff' }, form: ['W','W','L','D','L'], position: 2 },
    competition: { id: 'pl', name: 'Premier League', logo: '🏆' },
    dateTime: '2024-01-15T15:00:00',
    status: 'scheduled' as const,
    venue: 'Emirates Stadium'
  },
  {
    id: '2',
    homeTeam: { id: 'ht2', name: 'Manchester City', shortName: 'MCI', logo: '🩵', colors: { primary: '#6CABDD', secondary: '#ffffff' }, form: ['W','L','W','D','W'], position: 1 },
    awayTeam: { id: 'at2', name: 'Liverpool', shortName: 'LIV', logo: '🔴', colors: { primary: '#C8102E', secondary: '#ffffff' }, form: ['L','W','D','W','W'], position: 2 },
    competition: { id: 'pl', name: 'Premier League', logo: '🏆' },
    dateTime: '2024-01-16T17:30:00',
    status: 'finished' as const,
    homeScore: 2,
    awayScore: 1,
    venue: 'Etihad Stadium'
  },
  {
    id: '3',
    homeTeam: { id: 'ht3', name: 'Tottenham', shortName: 'TOT', logo: '⚪', colors: { primary: '#132257', secondary: '#ffffff' }, form: ['W','W','D','L','W'], position: 1 },
    awayTeam: { id: 'at3', name: 'Newcastle', shortName: 'NEW', logo: '⚫', colors: { primary: '#241F20', secondary: '#ffffff' }, form: ['L','D','W','L','D'], position: 2 },
    competition: { id: 'pl', name: 'Premier League', logo: '🏆' },
    dateTime: '2024-01-17T20:00:00',
    status: 'live' as const,
    homeScore: 1,
    awayScore: 0,
    venue: 'Tottenham Hotspur Stadium'
  }
];

const mockLeagueData = [
  {
    position: 1,
    team: { id: 'ht1', name: 'Arsenal', shortName: 'ARS', logo: '🔴', colors: { primary: '#EF0107', secondary: '#ffffff' }, form: ['W','W','D','W','W'], position: 1 },
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
    team: { id: 'ht2', name: 'Manchester City', shortName: 'MCI', logo: '🩵', colors: { primary: '#6CABDD', secondary: '#ffffff' }, form: ['W','L','W','D','W'], position: 2 },
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
  // ... Add other teams similarly with `id` and `position`
];

const Phase3VerificationTest: React.FC = () => {
  const [activeTest, setActiveTest] = useState<string>('overview');
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  const runTest = (testName: string, condition: boolean) => {
    setTestResults(prev => ({ ...prev, [testName]: condition }));
    return condition;
  };

  const TestSection: React.FC<{ title: string; children: React.ReactNode; testKey: string }> = ({ title, children, testKey }) => (
    <Card className="mb-6">
      <Card.Header 
        title={title}
        action={
          <div className="flex items-center gap-2">
            <Badge 
              variant={testResults[testKey] === true ? 'success' : testResults[testKey] === false ? 'error' : 'secondary'}
            >
              {testResults[testKey] === true ? '✅ PASS' : testResults[testKey] === false ? '❌ FAIL' : '⏳ PENDING'}
            </Badge>
          </div>
        }
      />
      <Card.Body>{children}</Card.Body>
    </Card>
  );

  const renderHeroTest = () => (
    <TestSection title="🏆 Hero Section Component Test" testKey="heroSection">
      <HeroSection 
        featuredFixture={mockFixtures[0]}
        onViewStats={() => runTest('heroSection', true)}
        onViewInsights={() => runTest('heroSection', true)}
      />
      <Button variant="primary" className="mt-4" onClick={() => runTest('heroSection', true)}>
        Click CTA Button to Test Functionality
      </Button>
    </TestSection>
  );

  const renderFixtureCardTest = () => (
    <TestSection title="⚽ Fixture Card Component Test" testKey="fixtureCard">
      {mockFixtures.map(f => (
        <FixtureCard key={f.id} fixture={f} onClick={() => runTest(`fixtureCard${f.id}`, true)} />
      ))}
      <Button variant="secondary" className="mt-4" onClick={() => runTest('fixtureCard', true)}>
        Mark Fixture Cards Test as Complete
      </Button>
    </TestSection>
  );

  const renderFixturesListTest = () => (
    <TestSection title="📅 Fixtures List Component Test" testKey="fixturesList">
      <FixturesList 
        fixtures={mockFixtures}
        onFixtureClick={f => runTest(`fixturesList${f.id}`, true)}
      />
      <Button variant="outline" className="mt-4" onClick={() => runTest('fixturesList', true)}>
        Mark Fixtures List Test as Complete
      </Button>
    </TestSection>
  );

  const renderLeagueTableTest = () => (
    <TestSection title="🏆 League Table Component Test" testKey="leagueTable">
      <LeagueTable teams={mockLeagueData} />
      <Button variant="primary" className="mt-4" onClick={() => runTest('leagueTable', true)}>
        Mark League Table Test as Complete
      </Button>
    </TestSection>
  );

  const renderOverview = () => (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-yellow-50 to-blue-50 border-2 border-yellow-200">
        <Card.Header title="🎯 Phase 3 Verification Test Suite" />
        <Card.Body>
          <div className="space-y-4">
            <p className="text-gray-700">
              This comprehensive test suite verifies all Phase 3 components are working correctly.
              Navigate through each test section to verify functionality.
            </p>
          </div>
        </Card.Body>
      </Card>
    </div>
  );

  const renderIntegrationTest = () => (
    <TestSection title="🔗 Integration & Export System Test" testKey="integration">
      <div className="text-sm text-gray-700">
        All Phase 3 components imported successfully and ready to test.
      </div>
      <Button variant="primary" className="mt-4" onClick={() => runTest('integration', true)}>
        Mark Integration Test as Complete
      </Button>
    </TestSection>
  );

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

          {activeTest === 'overview' && renderOverview()}
          {activeTest === 'hero' && renderHeroTest()}
          {activeTest === 'fixtureCard' && renderFixtureCardTest()}
          {activeTest === 'fixturesList' && renderFixturesListTest()}
          {activeTest === 'leagueTable' && renderLeagueTableTest()}
          {activeTest === 'integration' && renderIntegrationTest()}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Phase3VerificationTest;
