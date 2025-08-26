import React from 'react';
import Header from '../components/common/Header/Header';
import Footer from '../components/common/Footer/Footer';
import HeroSection from '../components/fixtures/HeroSection/HeroSection';
import TabNavigation from '../components/common/TabNavigation/TabNavigation';
import FixturesList from '../components/fixtures/FixturesList/FixturesList';
import LeagueTable from '../components/league/LeagueTable/LeagueTable';
import InsightsContainer from '../components/insights/AIInsightCard/InsightsContainer';
import designTokens from '../styles/designTokens';

const HomePage = () => {
  return (
    <div style={{ background: designTokens.colors.background, color: designTokens.colors.text }}>
      <Header />

      {/* Hero Section for Premier League */}
      <HeroSection
        title="Premier League"
        subtitle="Matchday 3"
        backgroundImage="/images/premier-league-banner.jpg"
      />

      {/* Tab Navigation */}
      <TabNavigation
        tabs={[
          { label: 'Fixtures', value: 'fixtures' },
          { label: 'Standings', value: 'standings' },
          { label: 'Insights', value: 'insights' }
        ]}
        defaultActive="fixtures"
      />

      <main style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Fixtures List */}
        <section id="fixtures">
          <h2>Upcoming Fixtures</h2>
          <FixturesList fixtures={[
            {
              id: 1,
              homeTeam: 'Manchester United',
              awayTeam: 'Chelsea',
              date: '26 Aug 2025',
              time: '20:00',
              venue: 'Old Trafford'
            },
            {
              id: 2,
              homeTeam: 'Arsenal',
              awayTeam: 'Liverpool',
              date: '27 Aug 2025',
              time: '18:00',
              venue: 'Emirates Stadium'
            }
          ]} />
        </section>

        {/* Insights Section */}
        <section id="insights" style={{ marginTop: '2rem' }}>
          <h2>AI Betting Insights</h2>
          <InsightsContainer insights={[
            {
              title: 'Over 2.5 Goals Likely',
              confidence: 'High',
              detail: 'Both teams average 3+ goals combined in last 5 matches.'
            },
            {
              title: 'High Corner Count',
              confidence: 'Medium',
              detail: 'Home team averages 6 corners per game.'
            }
          ]} />
        </section>

        {/* League Table */}
        <section id="standings" style={{ marginTop: '2rem' }}>
          <h2>League Standings</h2>
          <LeagueTable standings={[
            { position: 1, team: 'Arsenal', points: 9 },
            { position: 2, team: 'Liverpool', points: 7 },
            { position: 3, team: 'Chelsea', points: 6 }
          ]} />
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;
