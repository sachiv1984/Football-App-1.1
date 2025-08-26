// src/pages/FixtureDetail/FixtureDetail.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, BarChart3, Brain, Target } from 'lucide-react';
import { 
  MatchHeader, 
  TabNavigation, 
  StatsTable, 
  InsightsContainer,
  Button 
} from '@/components';
import { Tab } from '@/components/common/TabNavigation/TabNavigation.types';

// Mock data - will be replaced with API calls in Phase 5
const mockFixture: Fixture = {
  id: '1',
  homeTeam: {
    id: 'mu',
    name: 'Manchester United',
    shortName: 'MAN UTD',
    logo: '/api/placeholder/64/64',
    colors: { primary: '#DA020E', secondary: '#FBE122' },
    form: ['W', 'L', 'W', 'D', 'W'],
    position: 3
  },
  awayTeam: {
    id: 'lc',
    name: 'Leicester City',
    shortName: 'LEICESTER',
    logo: '/api/placeholder/64/64',
    colors: { primary: '#003090', secondary: '#FDBE11' },
    form: ['L', 'W', 'D', 'W', 'L'],
    position: 12
  },
  competition: {
    id: 'pl',
    name: 'Premier League',
    logo: '/api/placeholder/32/32',
    country: 'England'
  },
  dateTime: '2024-03-16T15:00:00Z',
  venue: 'Old Trafford',
  status: 'finished',
  homeScore: 2,
  awayScore: 1,
  aiInsight: {
    id: 'ai1',
    title: 'Over 2.5 Goals',
    description: 'Both teams have averaged over 2.5 goals in their last 5 matches, with United scoring 2.4 per game at home.',
    confidence: 'high',
    market: 'Total Goals Over 2.5',
    odds: '1.85',
    supportingData: 'Man Utd: 12 goals in last 5 home games, Leicester: 8 goals conceded in last 5 away games'
  }
};

const mockMatchStats: MatchStats = {
  fixtureId: '1',
  homeTeamStats: {
    shotsOnTarget: 8,
    totalShots: 16,
    corners: 7,
    fouls: 12,
    yellowCards: 2,
    redCards: 0,
    possession: 58,
    passAccuracy: 85,
    offsides: 3
  },
  awayTeamStats: {
    shotsOnTarget: 4,
    totalShots: 11,
    corners: 3,
    fouls: 15,
    yellowCards: 3,
    redCards: 1,
    possession: 42,
    passAccuracy: 78,
    offsides: 2
  },
  leagueAverages: {
    shotsOnTarget: 5.2,
    totalShots: 12.8,
    corners: 5.1,
    fouls: 11.3,
    yellowCards: 2.1,
    redCards: 0.2,
    possession: 50,
    passAccuracy: 82,
    offsides: 2.4
  },
  lastUpdated: new Date().toISOString()
};

const mockAIInsights: AIInsight[] = [
  {
    id: 'ai1',
    title: 'Both Teams to Score',
    description: 'Manchester United have scored in 8/10 home games this season, while Leicester have found the net in 7/10 away fixtures. Both defenses have shown vulnerabilities recently.',
    confidence: 'high',
    market: 'Both Teams to Score - Yes',
    odds: '1.75',
    supportingData: 'Home team: 24 goals scored, 8 conceded at home. Away team: 18 goals scored, 22 conceded away.'
  },
  {
    id: 'ai2',
    title: 'Over 9.5 Corners',
    description: 'These teams average 6.2 corners per game combined. Recent head-to-head matches have seen high corner counts due to both teams\' crossing-heavy tactics.',
    confidence: 'medium',
    market: 'Total Corners Over 9.5',
    odds: '2.10',
    supportingData: 'Last 3 meetings averaged 11.3 corners per game'
  },
  {
    id: 'ai3',
    title: 'Marcus Rashford 2+ Shots on Target',
    description: 'Rashford has registered 2 or more shots on target in 6 of his last 8 home appearances. Leicester\'s right-back position has been exploited recently.',
    confidence: 'medium',
    market: 'Player Shots on Target',
    odds: '2.25',
    supportingData: 'Player averages 2.8 shots on target per home game this season'
  }
];

// Tab content components
const MatchStatsTab: React.FC<{ fixture: Fixture; stats: MatchStats }> = ({ fixture, stats }) => (
  <div className="space-y-6">
    <StatsTable
      homeTeam={fixture.homeTeam}
      awayTeam={fixture.awayTeam}
      stats={stats}
    />
  </div>
);

const BetBuilderTab: React.FC = () => (
  <div className="card p-6 text-center">
    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
    <h3 className="text-lg font-semibold mb-2">Bet Builder Stats</h3>
    <p className="text-gray-600 mb-4">
      Advanced statistical combinations for building custom bets
    </p>
    <p className="text-sm text-gray-500">
      Coming in Phase 5 - Data Integration
    </p>
  </div>
);

const PlayerStatsTab: React.FC = () => (
  <div className="card p-6 text-center">
    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
    <h3 className="text-lg font-semibold mb-2">Player Statistics</h3>
    <p className="text-gray-600 mb-4">
      Individual player performance metrics and betting markets
    </p>
    <p className="text-sm text-gray-500">
      Coming in Phase 5 - Data Integration
    </p>
  </div>
);

const PredictionsTab: React.FC<{ insights: AIInsight[] }> = ({ insights }) => (
  <div className="space-y-6">
    <InsightsContainer 
      insights={insights}
      title="Match Predictions & AI Insights"
    />
  </div>
);

const FixtureDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [matchStats, setMatchStats] = useState<MatchStats | null>(null);
  const [aiInsights, setAIInsights] = useState<AIInsight[]>([]);
  const [activeTab, setActiveTab] = useState('match-stats');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate API loading
    setLoading(true);
    
    setTimeout(() => {
      if (id === '1') {
        setFixture(mockFixture);
        setMatchStats(mockMatchStats);
        setAIInsights(mockAIInsights);
        setError(null);
      } else {
        setError('Fixture not found');
      }
      setLoading(false);
    }, 1000);
  }, [id]);

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="w-32 h-6 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="card p-8 text-center">
          <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading fixture details...</p>
        </div>
      </div>
    );
  }

  if (error || !fixture) {
    return (
      <div className="container py-8">
        <Button
          onClick={() => navigate('/')}
          className="mb-6 btn-outline"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Fixtures
        </Button>
        <div className="card p-8 text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Fixture Not Found</h2>
          <p className="text-gray-600 mb-4">
            {error || 'The requested fixture could not be found.'}
          </p>
          <Button onClick={() => navigate('/')} className="btn-primary">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  const tabs: Tab[] = [
    {
      id: 'match-stats',
      label: 'Match Stats',
      content: matchStats ? (
        <MatchStatsTab fixture={fixture} stats={matchStats} />
      ) : (
        <div className="card p-6 text-center text-gray-500">
          No statistics available
        </div>
      )
    },
    {
      id: 'bet-builder',
      label: 'Bet Builder',
      content: <BetBuilderTab />,
      badge: 'Soon'
    },
    {
      id: 'player-stats',
      label: 'Player Stats',
      content: <PlayerStatsTab />,
      badge: 'Soon'
    },
    {
      id: 'predictions',
      label: 'AI Predictions',
      content: <PredictionsTab insights={aiInsights} />,
      badge: aiInsights.length
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container py-4">
          <Button
            onClick={() => navigate('/')}
            className="btn-ghost mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Fixtures
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-6">
        {/* Match Header */}
        <MatchHeader fixture={fixture} className="mb-6" />

        {/* Tab Navigation */}
        <TabNavigation
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>
    </div>
  );
};

export default FixtureDetail;
