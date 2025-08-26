import React, { useState } from 'react';

// ===== Types =====
type FormChar = 'W' | 'D' | 'L';

interface TeamColors {
  primary: string;
  secondary: string;
}

interface Team {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  form?: readonly FormChar[];
  colors?: TeamColors;
  position?: number;
}

interface Competition {
  id: string;
  name: string;
  shortName: string;
  logo: string;
}

type FixtureStatus = 'upcoming' | 'finished' | 'live';

interface Fixture {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  competition: Competition;
  dateTime: string;
  kickoffTime: string;
  venue: string;
  status: FixtureStatus;
  homeScore?: number;
  awayScore?: number;
  minute?: number;
}

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
  badge?: number;
}

interface TeamStats {
  shotsOnTarget: number;
  totalShots: number;
  corners: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  possession: number;
  passAccuracy: number;
  offsides: number;
}

interface MatchStats {
  fixtureId: string;
  homeTeamStats: TeamStats;
  awayTeamStats: TeamStats;
  leagueAverages: TeamStats;
  lastUpdated: string;
}

interface AIInsight {
  id: string;
  type: 'match_outcome' | 'goals' | 'cards' | 'corners';
  title: string;
  description: string;
  confidence: 'low' | 'medium' | 'high' | 'very_high';
  odds?: string;
  reasoning: string[];
}

// ===== UI Components =====
const Button: React.FC<{
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}> = ({ variant = 'primary', size = 'md', onClick, className = '', children }) => {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500',
    outline: 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 focus:ring-blue-500'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
};

const Badge: React.FC<{
  variant?: 'success' | 'danger' | 'secondary' | 'warning' | 'primary';
  className?: string;
  children: React.ReactNode;
}> = ({ variant = 'secondary', className = '', children }) => {
  const variants = {
    primary: 'bg-yellow-400 text-gray-900',
    success: 'bg-green-100 text-green-800',
    danger: 'bg-red-100 text-red-800',
    secondary: 'bg-gray-100 text-gray-800',
    warning: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

const Card = ({ className = '', children }: { className?: string; children: React.ReactNode }) => (
  <div className={`bg-white rounded-lg shadow-md border ${className}`}>{children}</div>
);

Card.Header = ({ title, action }: { title: string; action?: React.ReactNode }) => (
  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
    {action}
  </div>
);

Card.Body = ({ children }: { children: React.ReactNode }) => (
  <div className="p-6">{children}</div>
);

// ===== MatchHeader =====
const MatchHeader: React.FC<{ fixture: Fixture; className?: string }> = ({ fixture, className = '' }) => {
  const FormIndicators: React.FC<{ form: readonly FormChar[] }> = ({ form }) => (
    <div className="flex space-x-1">
      {form.slice(-5).map((result, index) => (
        <span
          key={index}
          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
            result === 'W' ? 'bg-green-500' : result === 'D' ? 'bg-yellow-500' : 'bg-red-500'
          }`}
        >
          {result}
        </span>
      ))}
    </div>
  );

  const getStatusDisplay = () => {
    switch (fixture.status) {
      case 'live':
        return (
          <div className="text-center">
            <Badge variant="danger" className="animate-pulse mb-2">LIVE {fixture.minute}'</Badge>
            <div className="text-3xl font-bold text-gray-900">{fixture.homeScore} - {fixture.awayScore}</div>
          </div>
        );
      case 'finished':
        return (
          <div className="text-center">
            <Badge variant="secondary" className="mb-2">FULL TIME</Badge>
            <div className="text-3xl font-bold text-gray-900">{fixture.homeScore} - {fixture.awayScore}</div>
          </div>
        );
      case 'upcoming':
        return (
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-2">{new Date(fixture.dateTime).toLocaleDateString()}</div>
            <div className="text-2xl font-bold text-blue-600">{fixture.kickoffTime}</div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md border p-6 ${className}`}>
      <div className="flex items-center justify-center mb-6">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{fixture.competition.logo}</span>
          <Badge variant="primary">{fixture.competition.name}</Badge>
        </div>
      </div>

      <div className="hidden md:grid md:grid-cols-5 gap-6 items-center">
        <div className="col-span-2 text-center">
          <div
            className="p-4 rounded-lg border-l-4 mb-4"
            style={{
              borderLeftColor: fixture.homeTeam.colors?.primary || '#3B82F6',
              backgroundColor: `${fixture.homeTeam.colors?.primary || '#3B82F6'}10`,
            }}
          >
            <div className="text-4xl mb-2">{fixture.homeTeam.logo}</div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">{fixture.homeTeam.name}</h3>
            {fixture.homeTeam.position && (
              <p className="text-sm text-gray-600 mb-2">#{fixture.homeTeam.position} in league</p>
            )}
            {fixture.homeTeam.form && <FormIndicators form={fixture.homeTeam.form} />}
          </div>
        </div>

        <div className="col-span-1 text-center">{getStatusDisplay()}</div>

        <div className="col-span-2 text-center">
          <div
            className="p-4 rounded-lg border-l-4 mb-4"
            style={{
              borderLeftColor: fixture.awayTeam.colors?.primary || '#EF4444',
              backgroundColor: `${fixture.awayTeam.colors?.primary || '#EF4444'}10`,
            }}
          >
            <div className="text-4xl mb-2">{fixture.awayTeam.logo}</div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">{fixture.awayTeam.name}</h3>
            {fixture.awayTeam.position && (
              <p className="text-sm text-gray-600 mb-2">#{fixture.awayTeam.position} in league</p>
            )}
            {fixture.awayTeam.form && <FormIndicators form={fixture.awayTeam.form} />}
          </div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">📍 {fixture.venue}</p>
      </div>
    </div>
  );
};

// ===== TabNavigation =====
const TabNavigation: React.FC<{
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}> = ({ tabs, activeTab, onTabChange, className = '' }) => {
  return (
    <div className={`bg-white rounded-lg shadow-md border ${className}`}>
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex space-x-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && onTabChange(tab.id)}
              disabled={tab.disabled}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-yellow-400 text-gray-900'
                  : tab.disabled
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <Badge variant={activeTab === tab.id ? 'secondary' : 'primary'}>{tab.badge}</Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">{tabs.find((t) => t.id === activeTab)?.content}</div>
    </div>
  );
};

// ===== StatsTable =====
const StatsTable: React.FC<{ matchStats: MatchStats }> = ({ matchStats }) => {
  const rows: { label: string; home: number; away: number; leagueAvg: number }[] = [
    { label: 'Shots On Target', home: matchStats.homeTeamStats.shotsOnTarget, away: matchStats.awayTeamStats.shotsOnTarget, leagueAvg: matchStats.leagueAverages.shotsOnTarget },
    { label: 'Total Shots', home: matchStats.homeTeamStats.totalShots, away: matchStats.awayTeamStats.totalShots, leagueAvg: matchStats.leagueAverages.totalShots },
    { label: 'Corners', home: matchStats.homeTeamStats.corners, away: matchStats.awayTeamStats.corners, leagueAvg: matchStats.leagueAverages.corners },
    { label: 'Fouls', home: matchStats.homeTeamStats.fouls, away: matchStats.awayTeamStats.fouls, leagueAvg: matchStats.leagueAverages.fouls },
    { label: 'Yellow Cards', home: matchStats.homeTeamStats.yellowCards, away: matchStats.awayTeamStats.yellowCards, leagueAvg: matchStats.leagueAverages.yellowCards },
    { label: 'Red Cards', home: matchStats.homeTeamStats.redCards, away: matchStats.awayTeamStats.redCards, leagueAvg: matchStats.leagueAverages.redCards },
    { label: 'Possession %', home: matchStats.homeTeamStats.possession, away: matchStats.awayTeamStats.possession, leagueAvg: matchStats.leagueAverages.possession },
    { label: 'Pass Accuracy %', home: matchStats.homeTeamStats.passAccuracy, away: matchStats.awayTeamStats.passAccuracy, leagueAvg: matchStats.leagueAverages.passAccuracy },
    { label: 'Offsides', home: matchStats.homeTeamStats.offsides, away: matchStats.awayTeamStats.offsides, leagueAvg: matchStats.leagueAverages.offsides },
  ];

  return (
    <table className="w-full table-auto border-collapse border border-gray-200 text-left text-sm">
      <thead className="bg-gray-100">
        <tr>
          <th className="border p-2"></th>
          <th className="border p-2">Home</th>
          <th className="border p-2">League Avg</th>
          <th className="border p-2">Away</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, idx) => (
          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
            <td className="border p-2 font-medium">{r.label}</td>
            <td className="border p-2">{r.home}</td>
            <td className="border p-2">{r.leagueAvg}</td>
            <td className="border p-2">{r.away}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// ===== ConfidenceIndicator =====
const ConfidenceIndicator: React.FC<{ confidence: 'low' | 'medium' | 'high' | 'very_high' }> = ({ confidence }) => {
  const colors = {
    low: 'bg-red-200 text-red-800',
    medium: 'bg-yellow-200 text-yellow-800',
    high: 'bg-green-200 text-green-800',
    very_high: 'bg-blue-200 text-blue-800',
  };
  return <Badge variant="secondary" className={colors[confidence]}>{confidence.toUpperCase()}</Badge>;
};

// ===== AIInsightCard =====
const AIInsightCard: React.FC<{ insight: AIInsight }> = ({ insight }) => {
  return (
    <Card className="mb-4">
      <Card.Header title={insight.title} action={<ConfidenceIndicator confidence={insight.confidence} />} />
      <Card.Body>
        <p className="mb-2">{insight.description}</p>
        <ul className="list-disc pl-5">
          {insight.reasoning.map((r, idx) => <li key={idx}>{r}</li>)}
        </ul>
      </Card.Body>
    </Card>
  );
};

// ===== Phase4VerificationTest Component =====
const Phase4VerificationTest: React.FC = () => {
  const [activeTest, setActiveTest] = useState<string>('overview');

  // === Mock Data ===
  const fixture: Fixture = {
    id: '1',
    homeTeam: { id: 'h', name: 'Home FC', shortName: 'HFC', logo: '🏠', colors: { primary: '#3B82F6', secondary: '#60A5FA' }, position: 1, form: ['W', 'D', 'W', 'L', 'W'] },
    awayTeam: { id: 'a', name: 'Away FC', shortName: 'AFC', logo: '✈️', colors: { primary: '#EF4444', secondary: '#F87171' }, position: 2, form: ['L', 'W', 'D', 'W', 'L'] },
    competition: { id: 'c1', name: 'Premier League', shortName: 'EPL', logo: '⚽' },
    dateTime: new Date().toISOString(),
    kickoffTime: '15:00',
    venue: 'Stadium',
    status: 'upcoming',
  };

  const matchStats: MatchStats = {
    fixtureId: fixture.id,
    homeTeamStats: { shotsOnTarget: 5, totalShots: 10, corners: 3, fouls: 12, yellowCards: 1, redCards: 0, possession: 55, passAccuracy: 82, offsides: 2 },
    awayTeamStats: { shotsOnTarget: 4, totalShots: 8, corners: 5, fouls: 10, yellowCards: 2, redCards: 0, possession: 45, passAccuracy: 78, offsides: 1 },
    leagueAverages: { shotsOnTarget: 4, totalShots: 9, corners: 4, fouls: 11, yellowCards: 1, redCards: 0, possession: 50, passAccuracy: 80, offsides: 2 },
    lastUpdated: new Date().toISOString()
  };

  const aiInsights: AIInsight[] = [
    { id: 'i1', type: 'match_outcome', title: 'Home Team Likely to Win', description: 'Based on recent form and league stats.', confidence: 'high', reasoning: ['Home team 4W-1D last 5', 'Away team 1W-2D-2L last 5'] },
    { id: 'i2', type: 'goals', title: 'Over 2.5 Goals Expected', description: 'Both teams scoring frequently.', confidence: 'medium', reasoning: ['Home avg 2.1 goals', 'Away avg 1.8 goals'] }
  ];

  const renderOverview = () => <p>Phase 4 Overview Test - select a tab above to run tests.</p>;

  const renderMatchHeaderTest = () => <MatchHeader fixture={fixture} />;

  const renderTabNavigationTest = () => (
    <TabNavigation
      tabs={[
        { id: 'match-stats', label: 'Match Stats', content: <StatsTable matchStats={matchStats} /> },
        { id: 'ai-insights', label: 'AI Insights', content: <div>AI insights tab content</div> },
      ]}
      activeTab="match-stats"
      onTabChange={() => {}}
    />
  );

  const renderStatsTableTest = () => <StatsTable matchStats={matchStats} />;

  const renderAIInsightsTest = () => aiInsights.map(i => <AIInsightCard key={i.id} insight={i} />);

  const renderIntegrationTest = () => (
    <>
      {renderMatchHeaderTest()}
      <div className="mt-6">{renderTabNavigationTest()}</div>
      <div className="mt-6">{renderAIInsightsTest()}</div>
    </>
  );

  const navigationButtons = [
    { key: 'overview', label: 'Overview' },
    { key: 'matchHeader', label: 'Match Header' },
    { key: 'tabNavigation', label: 'Tab Navigation' },
    { key: 'statsTable', label: 'Stats Table' },
    { key: 'aiInsights', label: 'AI Insights' },
    { key: 'integration', label: 'Integration' }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-blue-900 text-white p-4">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">Phase 4 Verification - Fixture Detail Pages</h1>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <Card className="mb-6">
            <Card.Body>
              <div className="flex flex-wrap gap-2">
                {navigationButtons.map(({ key, label }) => (
                  <Button
                    key={key}
                    variant={activeTest === key ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTest(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </Card.Body>
          </Card>

          {activeTest === 'overview' && renderOverview()}
          {activeTest === 'matchHeader' && renderMatchHeaderTest()}
          {activeTest === 'tabNavigation' && renderTabNavigationTest()}
          {activeTest === 'statsTable' && renderStatsTableTest()}
          {activeTest === 'aiInsights' && renderAIInsightsTest()}
          {activeTest === 'integration' && renderIntegrationTest()}
        </div>
      </main>

      <footer className="bg-gray-800 text-white p-4 mt-8">
        <div className="container mx-auto text-center">
          <p>2025 Football App - Phase 4 Verification Suite</p>
        </div>
      </footer>
    </div>
  );
};

export default Phase4VerificationTest;
