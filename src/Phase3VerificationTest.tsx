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
    homeTeam: { name: 'Arsenal', logo: '🔴' },
    awayTeam: { name: 'Chelsea', logo: '🔵' },
    competition: 'Premier League',
    date: '2024-01-15',
    time: '15:00',
    status: 'upcoming' as const,
    venue: 'Emirates Stadium'
  },
  {
    id: '2',
    homeTeam: { name: 'Manchester City', logo: '🩵' },
    awayTeam: { name: 'Liverpool', logo: '🔴' },
    competition: 'Premier League',
    date: '2024-01-16',
    time: '17:30',
    status: 'finished' as const,
    homeScore: 2,
    awayScore: 1,
    venue: 'Etihad Stadium'
  },
  {
    id: '3',
    homeTeam: { name: 'Tottenham', logo: '⚪' },
    awayTeam: { name: 'Newcastle', logo: '⚫' },
    competition: 'Premier League',
    date: '2024-01-17',
    time: '20:00',
    status: 'live' as const,
    homeScore: 1,
    awayScore: 0,
    minute: 67,
    venue: 'Tottenham Hotspur Stadium'
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900">Components to Test:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• HeroSection - Football-themed landing section</li>
                  <li>• FixtureCard - Individual match display</li>
                  <li>• FixturesList - Collection of fixtures</li>
                  <li>• LeagueTable - Responsive league standings</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900">Verification Areas:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Component rendering and props</li>
                  <li>• Responsive design (mobile/desktop)</li>
                  <li>• Interactive functionality</li>
                  <li>• Design system consistency</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Test Results Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                {Object.entries(testResults).map(([test, result]) => (
                  <div key={test} className="flex items-center gap-2">
                    <span className={result ? 'text-green-600' : result === false ? 'text-red-600' : 'text-gray-500'}>
                      {result ? '✅' : result === false ? '❌' : '⏳'}
                    </span>
                    <span className="capitalize">{test.replace(/([A-Z])/g, ' $1')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>
    </div>
  );

  const renderHeroTest = () => (
    <TestSection title="🏆 Hero Section Component Test" testKey="heroSection">
      <div className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-1">
          <HeroSection 
            title="Football Fixtures & Stats"
            subtitle="Your ultimate destination for live scores, fixtures, and AI-powered betting insights"
            ctaText="Explore Fixtures"
            onCtaClick={() => runTest('heroSection', true)}
          />
        </div>
        
        <div className="space-y-2">
          <h4 className="font-semibold">Manual Verification Checklist:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" onChange={(e) => runTest('heroBackground', e.target.checked)} />
              Football-themed background/styling
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" onChange={(e) => runTest('heroResponsive', e.target.checked)} />
              Responsive design (try mobile width)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" onChange={(e) => runTest('heroTypography', e.target.checked)} />
              Typography uses design system fonts
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" onChange={(e) => runTest('heroCta', e.target.checked)} />
              CTA button uses brand colors
            </label>
          </div>
          
          <Button 
            variant="primary" 
            onClick={() => runTest('heroSection', true)}
            className="mt-4"
          >
            Click CTA Button to Test Functionality
          </Button>
        </div>
      </div>
    </TestSection>
  );

  const renderFixtureCardTest = () => (
    <TestSection title="⚽ Fixture Card Component Test" testKey="fixtureCard">
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {mockFixtures.map((fixture) => (
            <div key={fixture.id} className="border-2 border-dashed border-gray-300 rounded-lg p-2">
              <h5 className="text-sm font-semibold mb-2 capitalize">{fixture.status} Match:</h5>
              <FixtureCard 
                fixture={fixture}
                onClick={() => runTest(`fixtureCard${fixture.id}`, true)}
              />
            </div>
          ))}
        </div>
        
        <div className="space-y-2">
          <h4 className="font-semibold">Manual Verification Checklist:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" onChange={(e) => runTest('fixtureCardStatus', e.target.checked)} />
              Different status badges (upcoming/live/finished)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" onChange={(e) => runTest('fixtureCardScores', e.target.checked)} />
              Scores display for finished/live matches
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" onChange={(e) => runTest('fixtureCardHover', e.target.checked)} />
              Hover effects work correctly
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" onChange={(e) => runTest('fixtureCardResponsive', e.target.checked)} />
              Cards stack properly on mobile
            </label>
          </div>
          
          <Button 
            variant="secondary" 
            onClick={() => runTest('fixtureCard', true)}
            className="mt-4"
          >
            Mark Fixture Cards Test as Complete
          </Button>
        </div>
      </div>
    </TestSection>
  );

  const renderFixturesListTest = () => (
    <TestSection title="📅 Fixtures List Component Test" testKey="fixturesList">
      <div className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
          <FixturesList 
            fixtures={mockFixtures}
            title="Today's Fixtures"
            onFixtureClick={(fixture) => runTest(`fixturesList${fixture.id}`, true)}
          />
        </div>
        
        <div className="space-y-2">
          <h4 className="font-semibold">Manual Verification Checklist:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" onChange={(e) => runTest('fixturesListTitle', e.target.checked)} />
              Title displays correctly
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" onChange={(e) => runTest('fixturesListGrid', e.target.checked)} />
              Grid layout responsive
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" onChange={(e) => runTest('fixturesListEmpty', e.target.checked)} />
              Empty state handling (if applicable)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" onChange={(e) => runTest('fixturesListClick', e.target.checked)} />
              Click handling works (click on fixtures above)
            </label>
          </div>
          
          <Button 
            variant="outline" 
            onClick={() => runTest('fixturesList', true)}
            className="mt-4"
          >
            Mark Fixtures List Test as Complete
          </Button>
        </div>
      </div>
    </TestSection>
  );

  const renderLeagueTableTest = () => (
    <TestSection title="🏆 League Table Component Test" testKey="leagueTable">
      <div className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
          <LeagueTable 
            teams={mockLeagueData}
            title="Premier League Table"
          />
        </div>
        
        <div className="space-y-2">
          <h4 className="font-semibold">Manual Verification Checklist:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" onChange={(e) => runTest('leagueTablePositions', e.target.checked)} />
              Position-based colors (Champions/Europa/Relegation)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" onChange={(e) => runTest('leagueTableResponsive', e.target.checked)} />
              Mobile view shows cards instead of table
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" onChange={(e) => runTest('leagueTableSorting', e.target.checked)} />
              Column headers clickable for sorting
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" onChange={(e) => runTest('leagueTableForm', e.target.checked)} />
              Form indicators (W/D/L) display correctly
            </label>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
            <h5 className="font-semibold text-yellow-800 mb-2">Responsive Test Instructions:</h5>
            <p className="text-sm text-yellow-700">
              1. Open browser dev tools (F12)<br />
              2. Toggle device toolbar (mobile view)<br />
              3. Verify table switches to card layout on mobile<br />
              4. Test both portrait and landscape orientations
            </p>
          </div>
          
          <Button 
            variant="primary" 
            onClick={() => runTest('leagueTable', true)}
            className="mt-4"
          >
            Mark League Table Test as Complete
          </Button>
        </div>
      </div>
    </TestSection>
  );

  const renderIntegrationTest = () => (
    <TestSection title="🔗 Integration & Export System Test" testKey="integration">
      <div className="space-y-4">
        <div className="space-y-2">
          <h4 className="font-semibold">Import System Verification:</h4>
          <div className="bg-gray-50 p-3 rounded-lg text-sm">
            <code className="block mb-2">
              {`import { HeroSection, FixtureCard, FixturesList, LeagueTable } from './components';`}
            </code>
            <p className="text-gray-600">✅ All Phase 3 components imported successfully from central index</p>
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-semibold">Design System Consistency Test:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" onChange={(e) => runTest('designSystemColors', e.target.checked)} />
              Components use brand colors (#FFFF00, #003366)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" onChange={(e) => runTest('designSystemTypography', e.target.checked)} />
              Typography consistent (Poppins/Inter)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" onChange={(e) => runTest('designSystemSpacing', e.target.checked)} />
              Spacing follows design tokens
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" onChange={(e) => runTest('designSystemShadows', e.target.checked)} />
              Card shadows and hover effects consistent
            </label>
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-semibold">Football-Specific CSS Classes Test:</h4>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="space-y-2 text-sm">
              <div className="fixture-card p-2 bg-white rounded">
                <code>.fixture-card</code> - Styling applied ✅
              </div>
              <div className="flex gap-2">
                <span className="team-logo">🔴</span>
                <code>.team-logo</code> - Team logo sizing ✅
              </div>
              <div className="match-score font-mono font-bold">2-1</div>
              <code>.match-score</code> - Score styling ✅
              <div className="flex gap-1">
                <span className="form-indicator bg-green-500 text-white">W</span>
                <span className="form-indicator bg-yellow-500 text-white">D</span>
                <span className="form-indicator bg-red-500 text-white">L</span>
              </div>
              <code>.form-indicator</code> - Form indicators ✅
            </div>
          </div>
        </div>
        
        <Button 
          variant="primary" 
          onClick={() => runTest('integration', true)}
          className="mt-4"
        >
          Mark Integration Test as Complete
        </Button>
      </div>
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
