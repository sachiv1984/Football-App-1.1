import React from 'react';
import Header from '../components/common/Header/Header';
import Footer from '../components/common/Footer/Footer';
import HeroSection from '../components/fixtures/HeroSection/HeroSection';
import TabNavigation from '../components/common/TabNavigation/TabNavigation';
import FixturesList from '../components/fixtures/FixturesList/FixturesList';
import LeagueTable from '../components/league/LeagueTable/LeagueTable';
import InsightsContainer from '../components/insights/AIInsightCard/InsightsContainer';
import { designTokens } from '../styles/designTokens';
import { AIInsight, Fixture, Team, LeagueTableRow } from '../types';
import { FixtureCard as CardFixture} from'../components/fixtures/FixtureCard'
;

// Placeholder teams
const arsenal: Team = {
  id: 'arsenal',
  name: 'Arsenal',
  shortName: 'ARS',
  logo: '',
  colors: { primary: '#EF0000', secondary: '#FFFF00' },
  form: ['W', 'W', 'W', 'D', 'W'] as ('W' | 'D' | 'L')[],
  position: 1,
};

const liverpool: Team = {
  id: 'liverpool',
  name: 'Liverpool',
  shortName: 'LIV',
  logo: '',
  colors: { primary: '#C8102E', secondary: '#00B2A9' },
  form: ['W', 'D', 'W', 'L', 'W'] as ('W' | 'D' | 'L')[],
  position: 2,
};

const chelsea: Team = {
  id: 'chelsea',
  name: 'Chelsea',
  shortName: 'CHE',
  logo: '',
  colors: { primary: '#034694', secondary: '#FFFFFF' },
  form: ['L', 'W', 'D', 'W', 'L'] as ('W' | 'D' | 'L')[],
  position: 3,
};

const manCity: Team = {
  id: 'man-city',
  name: 'Manchester City',
  shortName: 'MCI',
  logo: '',
  colors: { primary: '#6CABDD', secondary: '#FFFFFF' },
  form: ['W', 'W', 'L', 'D', 'W'] as ('W' | 'D' | 'L')[],
  position: 4,
};

const manUtd: Team = {
  id: 'man-utd',
  name: 'Manchester United',
  shortName: 'MUN',
  logo: '',
  colors: { primary: '#DC143C', secondary: '#FFD700' },
  form: ['W', 'D', 'L', 'W', 'W'] as ('W' | 'D' | 'L')[],
  position: 5,
};

// Fixtures
const fixtures: CardFixture[] = [
  {
    id: 'fixture-1',
    homeTeam: manUtd,
    awayTeam: chelsea,
    competition: { id: 'pl', name: 'Premier League', logo: '', country: 'England' },
    dateTime: '2025-08-26T20:00:00Z',
    venue: 'Old Trafford',
    status: 'scheduled',
    homeScore: 0,
    awayScore: 0,
  },
  {
    id: 'fixture-2',
    homeTeam: arsenal,
    awayTeam: liverpool,
    competition: { id: 'pl', name: 'Premier League', logo: '', country: 'England' },
    dateTime: '2025-08-27T18:00:00Z',
    venue: 'Emirates Stadium',
    status: 'scheduled',
    homeScore: 0,
    awayScore: 0,
  },
];

// Featured Fixture for Hero
const featuredFixture = fixtures[0];

// AI Insights
const insights: AIInsight[] = [
  {
    id: 'insight-1',
    title: 'Over 2.5 Goals Likely',
    description: 'Both teams average 3+ goals combined in last 5 matches.',
    confidence: 'high',
    market: 'total_goals',
    odds: '1.8',
    supportingData: 'Recent meetings: 4/5 matches over 2.5 goals',
  },
  {
    id: 'insight-2',
    title: 'High Corner Count',
    description: 'Home team averages 6 corners per game.',
    confidence: 'medium',
    market: 'corners',
    odds: '2.0',
  },
  {
    id: 'insight-3',
    title: 'Clean Sheet Possible',
    description: 'Away team has kept a clean sheet in 2 of last 5 matches.',
    confidence: 'low',
    market: 'clean_sheet',
    odds: '2.5',
  },
];

// League Standings
const standings: LeagueTableRow[] = [
  { position: 1, team: arsenal, played: 3, won: 3, drawn: 0, lost: 0, goalsFor: 7, goalsAgainst: 2, goalDifference: 5, points: 9 },
  { position: 2, team: liverpool, played: 3, won: 2, drawn: 1, lost: 0, goalsFor: 6, goalsAgainst: 3, goalDifference: 3, points: 7 },
  { position: 3, team: chelsea, played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 5, goalsAgainst: 3, goalDifference: 2, points: 6 },
  { position: 4, team: manCity, played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 4, goalsAgainst: 3, goalDifference: 1, points: 6 },
  { position: 5, team: manUtd, played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 3, goalsAgainst: 4, goalDifference: -1, points: 4 },
];

const HomePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'fixtures' | 'standings' | 'insights'>('fixtures');

  return (
    <div style={{ background: designTokens.colors.neutral.background, color: designTokens.colors.neutral.darkGrey, minHeight: '100vh' }}>
      <Header />

      {/* Hero Section */}
      <HeroSection featuredFixture={featuredFixture} />

      {/* Tab Navigation */}
      <TabNavigation
        activeId={activeTab}
        onChange={setActiveTab} // lets the TabNavigation component control active tab
        tabs={[
          { label: 'Fixtures', id: 'fixtures' },
          { label: 'Standings', id: 'standings' },
          { label: 'Insights', id: 'insights' },
        ]}
      />

      <main style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
        {activeTab === 'fixtures' && (
          <section id="fixtures" style={{ marginBottom: '3rem' }}>
            <h2>Upcoming Fixtures</h2>
            <FixturesList fixtures={fixtures} />
          </section>
        )}

        {activeTab === 'standings' && (
          <section id="standings" style={{ marginBottom: '3rem' }}>
            <h2>League Standings</h2>
            <LeagueTable standings={standings} />
          </section>
        )}

        {activeTab === 'insights' && (
          <section id="insights" style={{ marginBottom: '3rem' }}>
            <h2>AI Betting Insights</h2>
            <InsightsContainer insights={insights} />
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;

