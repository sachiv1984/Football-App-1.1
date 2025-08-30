import React from 'react';
import { FeaturedFixture } from '../../../types';

interface HeroSectionProps {
  featuredFixture?: FeaturedFixture;
  onViewStats?: (fixtureId: string) => void;
  onViewInsights?: (fixtureId: string) => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ 
  featuredFixture,
  onViewStats = (id) => console.log(`View stats for ${id}`),
  onViewInsights = (id) => console.log(`View insights for ${id}`)
}) => {
  const defaultFixture: FeaturedFixture = {
    id: 'fixture-1',
    homeTeam: {
      id: 'man-utd',
      name: 'Manchester United',
      shortName: 'MUN',
      logo: 'https://via.placeholder.com/64x64/DC143C/FFFFFF?text=MUN',
      colors: { primary: '#DC143C', secondary: '#FFD700' },
      form: ['W', 'W', 'D', 'W', 'L'],
      position: 3
    },
    awayTeam: {
      id: 'chelsea',
      name: 'Chelsea FC',
      shortName: 'CHE',
      logo: 'https://via.placeholder.com/64x64/034694/FFFFFF?text=CHE',
      colors: { primary: '#034694', secondary: '#FFFFFF' },
      form: ['W', 'L', 'W', 'W', 'D'],
      position: 5
    },
    competition: {
      id: 'pl',
      name: 'Premier League',
      shortName: 'PL',
      logo: 'https://via.placeholder.com/32x32/37003C/FFFFFF?text=PL',
      country: 'England'
    },
    dateTime: '2024-03-10T15:00:00Z',
    venue: 'Old Trafford',
    status: 'scheduled',
    homeScore: 0,
    awayScore: 0,
    aiInsight: {
      id: 'insight-1', // Added missing id property
      title: 'High-Scoring Encounter Expected',
      description: 'Both teams average 2.3 goals per game. Over 2.5 goals has hit in 4/5 recent meetings.',
      confidence: 'high',
      probability: 0.78
    }
  };

  const fixture = featuredFixture || defaultFixture;

  // Handle potentially undefined form arrays
  const renderFormIndicators = (form?: ('W' | 'D' | 'L')[]) => {
    const formArray = form || [];
    return (
      <div className="flex space-x-1">
        {formArray.map((result, index) => (
          <span
            key={index}
            className={`form-indicator ${
              result === 'W' ? 'form-w' : 
              result === 'D' ? 'form-d' : 'form-l'
            }`}
          >
            {result}
          </span>
        ))}
      </div>
    );
  };

  return (
    <section className="bg-gradient-hero text-white py-16 lg:py-24">
      <div className="container">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 animate-fade-in">
            <h1 className="text-4xl lg:text-6xl font-bold mb-4">
              <span className="text-gradient">Big Match</span> Preview
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Don't miss the clash of titans with AI-powered insights and real-time statistics
            </p>
          </div>

          {/* Main Fixture Card */}
          <div className="card-elevated bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 mb-8 animate-slide-up">
            {/* Teams */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center mb-8">
              {/* Home Team */}
              <div className="text-center lg:text-right animate-slide-in-left">
                <div className="flex flex-col items-center lg:items-end">
                  <img 
                    src={fixture.homeTeam.logo} 
                    alt={fixture.homeTeam.name}
                    className="team-logo-lg w-20 h-20 mb-4 hover-lift"
                  />
                  <h2 className="text-2xl lg:text-3xl font-bold mb-2">
                    {fixture.homeTeam.name}
                  </h2>
                  <div className="flex items-center space-x-4 mb-3">
                    <span className="badge badge-secondary">
                      #{fixture.homeTeam.position ?? 'TBD'}
                    </span>
                    <span className="text-blue-100">League Position</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-blue-200 text-sm">Recent Form:</span>
                    {renderFormIndicators(fixture.homeTeam.form)}
                  </div>
                </div>
              </div>

              {/* VS Section */}
              <div className="text-center animate-scale-in">
                <div className="relative">
                  <div className="bg-gradient-primary rounded-full w-24 h-24 mx-auto flex items-center justify-center mb-4 shadow-lg hover-glow">
                    <span className="text-2xl font-bold text-gray-900">VS</span>
                  </div>
                </div>
              </div>

              {/* Away Team */}
              <div className="text-center lg:text-left animate-slide-in-right">
                <div className="flex flex-col items-center lg:items-start">
                  <img 
                    src={fixture.awayTeam.logo} 
                    alt={fixture.awayTeam.name}
                    className="team-logo-lg w-20 h-20 mb-4 hover-lift"
                  />
                  <h2 className="text-2xl lg:text-3xl font-bold mb-2">
                    {fixture.awayTeam.name}
                  </h2>
                  <div className="flex items-center space-x-4 mb-3">
                    <span className="badge badge-secondary">
                      #{fixture.awayTeam.position ?? 'TBD'}
                    </span>
                    <span className="text-blue-100">League Position</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-blue-200 text-sm">Recent Form:</span>
                    {renderFormIndicators(fixture.awayTeam.form)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Insight Card */}
          {fixture.aiInsight && (
            <div className="ai-insight-card border-teal-400 bg-white/95 text-gray-900 animate-fade-in">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center">
                    AI
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">
                    {fixture.aiInsight.title} - {Math.round(fixture.aiInsight.probability * 100)}% Confidence
                  </h3>
                  <p className="text-gray-700 mb-3">
                    {fixture.aiInsight.description}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;