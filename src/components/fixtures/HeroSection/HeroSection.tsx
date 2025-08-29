// HeroSection.tsx
import React from 'react';
import { Calendar, Clock, Trophy, TrendingUp, Users, MapPin } from 'lucide-react';
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
      id: 'ai-1', // ✅ added id
      title: 'High-Scoring Encounter Expected',
      description: 'Both teams average 2.3 goals per game. Over 2.5 goals has hit in 4/5 recent meetings.',
      confidence: 'high',
      probability: 0.78
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

  const renderFormIndicators = (form: ('W' | 'D' | 'L')[] = []) => (
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

  const isLive = fixture.status === 'live';

  return (
    <section className="bg-gradient-hero text-white py-16 lg:py-24">
      {/* ...rest of your JSX remains unchanged */}
    </section>
  );
};

export default HeroSection;
