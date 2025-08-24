import React from 'react';
import { Calendar, Clock, Trophy, TrendingUp, Users, MapPin } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  colors: {
    primary: string;
    secondary: string;
  };
  form: ('W' | 'D' | 'L')[];
  position: number;
}

interface FeaturedFixture {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  competition: {
    name: string;
    logo: string;
  };
  dateTime: string;
  venue: string;
  isLive?: boolean;
  aiInsight?: {
    title: string;
    description: string;
    confidence: 'high' | 'medium' | 'low';
    probability: number;
  };
}

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
  // Mock data for demonstration
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
      name: 'Premier League',
      logo: 'https://via.placeholder.com/32x32/37003C/FFFFFF?text=PL'
    },
    dateTime: '2024-03-10T15:00:00Z',
    venue: 'Old Trafford',
    aiInsight: {
      title: 'High-Scoring Encounter Expected',
      description: 'Both teams average 2.3 goals per game. Over 2.5 goals has hit in 4/5 recent meetings.',
      confidence: 'high',
      probability: 78
    }
  };

  const fixture = featuredFixture || defaultFixture;
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-GB', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
      }),
      time: date.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  const { date, time } = formatDate(fixture.dateTime);

  const renderFormIndicators = (form: ('W' | 'D' | 'L')[]) => (
    <div className="flex space-x-1">
      {form.map((result, index) => (
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

  return (
    <section className="bg-gradient-hero text-white py-16 lg:py-24">
      <div className="container">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 animate-fade-in">
            <div className="flex items-center justify-center mb-4">
              <Trophy className="w-8 h-8 text-yellow-400 mr-3" />
              <span className="text-yellow-400 font-semibold text-lg">Featured Match</span>
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold mb-4">
              <span className="text-gradient">Big Match</span> Preview
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Don't miss the clash of titans with AI-powered insights and real-time statistics
            </p>
          </div>

          {/* Main Fixture Card */}
          <div className="card-elevated bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 mb-8 animate-slide-up">
            {/* Competition and Date Info */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
              <div className="flex items-center mb-4 sm:mb-0">
                <img 
                  src={fixture.competition.logo} 
                  alt={fixture.competition.name}
                  className="w-8 h-8 rounded mr-3"
                />
                <span className="text-yellow-400 font-semibold text-lg">
                  {fixture.competition.name}
                </span>
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center text-blue-100 space-y-2 sm:space-y-0 sm:space-x-6">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>{date}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>{time}</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>{fixture.venue}</span>
                </div>
              </div>
            </div>

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
                      #{fixture.homeTeam.position}
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
                  <div className="absolute -top-2 -right-2">
                    {fixture.isLive && (
                      <span className="badge badge-error animate-pulse">LIVE</span>
                    )}
                  </div>
                </div>
                <p className="text-blue-100 text-sm font-medium">
                  Kick-off at {time}
                </p>
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
                      #{fixture.awayTeam.position}
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

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => onViewStats(fixture.id)}
                className="btn btn-primary btn-lg hover-lift flex items-center justify-center"
              >
                <Users className="w-5 h-5 mr-2" />
                View Match Stats
              </button>
              <button
                onClick={() => onViewInsights(fixture.id)}
                className="btn btn-outline btn-lg border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-gray-900 hover-lift flex items-center justify-center"
              >
                <TrendingUp className="w-5 h-5 mr-2" />
                AI Betting Insights
              </button>
            </div>
          </div>

          {/* AI Insight Card */}
          {fixture.aiInsight && (
            <div className="ai-insight-card border-teal-400 bg-white/95 text-gray-900 animate-fade-in">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">
                      {fixture.aiInsight.title}
                    </h3>
                    <span className={`badge badge-sm ${
                      fixture.aiInsight.confidence === 'high' ? 'badge-success' :
                      fixture.aiInsight.confidence === 'medium' ? 'badge-warning' :
                      'badge-error'
                    }`}>
                      {fixture.aiInsight.probability}% Confidence
                    </span>
                  </div>
                  <p className="text-gray-700 mb-3">
                    {fixture.aiInsight.description}
                  </p>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-2">💡</span>
                    <span>AI Analysis based on recent performance data</span>
                  </div>
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
