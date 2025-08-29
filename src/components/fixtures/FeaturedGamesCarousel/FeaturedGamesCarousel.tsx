// src/components/fixtures/FeaturedGamesCarousel/FeaturedGamesCarousel.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import { FeaturedFixture } from '../../../types';

interface FeaturedGamesCarouselProps {
  fixtures?: FeaturedFixture[];
  onGameSelect?: (fixture: FeaturedFixture) => void;
  onViewStats?: (fixtureId: string) => void;
  autoRotate?: boolean;
  rotateInterval?: number;
  className?: string;
}

interface GameSelectionConfig {
  prioritizeLiveGames: boolean;
  includeNextWeekIfFew: boolean;
  minImportanceScore: number;
  maxGames: number;
}

const FeaturedGamesCarousel: React.FC<FeaturedGamesCarouselProps> = ({
  fixtures = [],
  onGameSelect = (fixture) => console.log('Selected fixture:', fixture.id),
  onViewStats = (id) => console.log('View stats for:', id),
  autoRotate = false,
  rotateInterval = 5000,
  className = ''
}) => {
  const [featuredGames, setFeaturedGames] = useState<FeaturedFixture[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoRotateRef = useRef<NodeJS.Timeout>();

  // Mock fixtures for demo - replace with your actual data
  const mockFixtures: FeaturedFixture[] = [
    {
      id: 'fixture-1',
      homeTeam: {
        id: 'liverpool',
        name: 'Liverpool',
        shortName: 'LIV',
        logo: 'https://via.placeholder.com/64x64/DC143C/FFFFFF?text=LIV',
        colors: { primary: '#DC143C', secondary: '#FFD700' },
        form: ['W', 'W', 'D', 'W', 'L'],
        position: 2
      },
      awayTeam: {
        id: 'man-city',
        name: 'Manchester City',
        shortName: 'MCI',
        logo: 'https://via.placeholder.com/64x64/6CABDD/FFFFFF?text=MCI',
        colors: { primary: '#6CABDD', secondary: '#FFFFFF' },
        form: ['W', 'W', 'W', 'D', 'W'],
        position: 1
      },
      competition: {
        id: 'pl',
        name: 'Premier League',
        shortName: 'PL',
        logo: 'https://via.placeholder.com/32x32/37003C/FFFFFF?text=PL',
        country: 'England'
      },
      dateTime: '2024-12-01T14:00:00Z',
      venue: 'Anfield',
      status: 'scheduled',
      homeScore: 0,
      awayScore: 0,
      aiInsight: {
        title: 'High-Scoring Encounter Expected',
        description: 'Both teams average 2.3 goals per game in recent meetings.',
        confidence: 'high',
        probability: 0.78
      }
    },
    {
      id: 'fixture-2',
      homeTeam: {
        id: 'arsenal',
        name: 'Arsenal',
        shortName: 'ARS',
        logo: 'https://via.placeholder.com/64x64/EF0107/FFFFFF?text=ARS',
        colors: { primary: '#EF0107', secondary: '#023474' },
        form: ['W', 'L', 'W', 'W', 'D'],
        position: 3
      },
      awayTeam: {
        id: 'chelsea',
        name: 'Chelsea',
        shortName: 'CHE',
        logo: 'https://via.placeholder.com/64x64/034694/FFFFFF?text=CHE',
        colors: { primary: '#034694', secondary: '#FFFFFF' },
        form: ['D', 'W', 'L', 'W', 'W'],
        position: 4
      },
      competition: {
        id: 'pl',
        name: 'Premier League',
        shortName: 'PL',
        logo: 'https://via.placeholder.com/32x32/37003C/FFFFFF?text=PL',
        country: 'England'
      },
      dateTime: '2024-12-01T16:30:00Z',
      venue: 'Emirates Stadium',
      status: 'live',
      homeScore: 1,
      awayScore: 1,
      aiInsight: {
        title: 'London Derby Intensity',
        description: 'Expect tactical battle with few clear chances.',
        confidence: 'medium',
        probability: 0.65
      }
    },
    {
      id: 'fixture-3',
      homeTeam: {
        id: 'man-utd',
        name: 'Manchester United',
        shortName: 'MUN',
        logo: 'https://via.placeholder.com/64x64/DA020E/FFFFFF?text=MUN',
        colors: { primary: '#DA020E', secondary: '#FBE122' },
        form: ['L', 'W', 'D', 'L', 'W'],
        position: 6
      },
      awayTeam: {
        id: 'tottenham',
        name: 'Tottenham',
        shortName: 'TOT',
        logo: 'https://via.placeholder.com/64x64/132257/FFFFFF?text=TOT',
        colors: { primary: '#132257', secondary: '#FFFFFF' },
        form: ['W', 'D', 'W', 'L', 'D'],
        position: 5
      },
      competition: {
        id: 'pl',
        name: 'Premier League',
        shortName: 'PL',
        logo: 'https://via.placeholder.com/32x32/37003C/FFFFFF?text=PL',
        country: 'England'
      },
      dateTime: '2024-12-02T17:00:00Z',
      venue: 'Old Trafford',
      status: 'scheduled',
      homeScore: 0,
      awayScore: 0,
      aiInsight: {
        title: 'Goals Expected',
        description: 'Both teams vulnerable defensively in recent matches.',
        confidence: 'high',
        probability: 0.82
      }
    }
  ];

  // Auto-selection logic for featured games
  const selectFeaturedGames = useCallback((allFixtures: FeaturedFixture[]): FeaturedFixture[] => {
    if (!allFixtures.length) return mockFixtures; // Fallback to mock data
    
    const config: GameSelectionConfig = {
      prioritizeLiveGames: true,
      includeNextWeekIfFew: true,
      minImportanceScore: 0,
      maxGames: 4
    };

    const currentWeek = getCurrentMatchWeek();
    const currentWeekGames = allFixtures.filter(game => getMatchWeek(game.dateTime) === currentWeek);
    const nextWeekGames = allFixtures.filter(game => getMatchWeek(game.dateTime) === currentWeek + 1);
    const liveGames = allFixtures.filter(game => game.status === 'live');
    
    let selected: FeaturedFixture[] = [];

    // Prioritize live games
    if (config.prioritizeLiveGames && liveGames.length > 0) {
      selected.push(...liveGames);
    }

    // Handle current week games
    if (currentWeekGames.length === 1) {
      // Add the single current week game if not already added
      const currentGame = currentWeekGames[0];
      if (!selected.find(g => g.id === currentGame.id)) {
        selected.unshift(currentGame);
      }
      
      // Fill with next week games
      const remainingSlots = config.maxGames - selected.length;
      const nextWeekSorted = nextWeekGames
        .filter(g => !selected.find(s => s.id === g.id))
        .sort((a, b) => calculateImportance(b) - calculateImportance(a))
        .slice(0, remainingSlots);
      
      selected.push(...nextWeekSorted);
    } else if (currentWeekGames.length > 1) {
      // Multiple games this week - select by importance
      const currentWeekSorted = currentWeekGames
        .filter(g => !selected.find(s => s.id === g.id))
        .sort((a, b) => calculateImportance(b) - calculateImportance(a));
      
      const remainingSlots = config.maxGames - selected.length;
      selected.push(...currentWeekSorted.slice(0, remainingSlots));
    }

    // Fill remaining slots with highest importance games
    while (selected.length < config.maxGames) {
      const remaining = allFixtures
        .filter(game => !selected.find(s => s.id === game.id))
        .sort((a, b) => calculateImportance(b) - calculateImportance(a));
      
      if (remaining.length === 0) break;
      selected.push(remaining[0]);
    }

    return selected.slice(0, config.maxGames);
  }, []);

  const getCurrentMatchWeek = (): number => {
    // Simple week calculation - replace with your actual logic
    const now = new Date();
    const startOfSeason = new Date('2024-08-01');
    const weeksSinceStart = Math.floor((now.getTime() - startOfSeason.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return Math.max(1, Math.min(38, weeksSinceStart + 1));
  };

  const getMatchWeek = (dateString: string): number => {
    const matchDate = new Date(dateString);
    const startOfSeason = new Date('2024-08-01');
    const weeksSinceStart = Math.floor((matchDate.getTime() - startOfSeason.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return Math.max(1, Math.min(38, weeksSinceStart + 1));
  };

  const calculateImportance = (fixture: FeaturedFixture): number => {
    let importance = 5; // Base importance

    // Live games get highest priority
    if (fixture.status === 'live') importance += 5;

    // Top 6 teams get bonus points
    const topTeams = ['liverpool', 'man-city', 'arsenal', 'chelsea', 'man-utd', 'tottenham'];
    if (topTeams.includes(fixture.homeTeam.id) || topTeams.includes(fixture.awayTeam.id)) {
      importance += 2;
    }

    // Both top 6 teams
    if (topTeams.includes(fixture.homeTeam.id) && topTeams.includes(fixture.awayTeam.id)) {
      importance += 3;
    }

    // Position-based importance
    const avgPosition = (fixture.homeTeam.position + fixture.awayTeam.position) / 2;
    if (avgPosition <= 3) importance += 3;
    else if (avgPosition <= 6) importance += 2;
    else if (avgPosition <= 10) importance += 1;

    // AI insight confidence bonus
    if (fixture.aiInsight?.confidence === 'high') importance += 1;

    return importance;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-GB', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short' 
      }),
      time: date.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  const renderFormIndicators = (form: ('W' | 'D' | 'L')[]) => (
    <div className="flex space-x-1">
      {form.slice(-3).map((result, index) => (
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

  const updateScrollButtons = useCallback(() => {
    if (!scrollRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    
    const cardWidth = 300; // Card width + gap
    const scrollAmount = direction === 'left' ? -cardWidth : cardWidth;
    
    scrollRef.current.scrollBy({
      left: scrollAmount,
      behavior: 'smooth'
    });

    // Update current index for auto-rotate
    if (direction === 'right') {
      setCurrentIndex(prev => Math.min(prev + 1, featuredGames.length - 1));
    } else {
      setCurrentIndex(prev => Math.max(prev - 1, 0));
    }
  };

  const scrollToIndex = (index: number) => {
    if (!scrollRef.current) return;
    
    const cardWidth = 300;
    const targetScroll = index * cardWidth;
    
    scrollRef.current.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
    
    setCurrentIndex(index);
  };

  // Auto-rotate functionality
  useEffect(() => {
    if (!autoRotate || featuredGames.length <= 1) return;

    const startAutoRotate = () => {
      autoRotateRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          const nextIndex = prev >= featuredGames.length - 1 ? 0 : prev + 1;
          scrollToIndex(nextIndex);
          return nextIndex;
        });
      }, rotateInterval);
    };

    startAutoRotate();

    return () => {
      if (autoRotateRef.current) {
        clearInterval(autoRotateRef.current);
      }
    };
  }, [autoRotate, featuredGames.length, rotateInterval]);

  // Initial data loading
  useEffect(() => {
    const loadFeaturedGames = async () => {
      setIsLoading(true);
      
      // Simulate API call
      setTimeout(() => {
        const selected = selectFeaturedGames(fixtures.length > 0 ? fixtures : []);
        setFeaturedGames(selected);
        setIsLoading(false);
      }, 1000);
    };

    loadFeaturedGames();
  }, [fixtures, selectFeaturedGames]);

  // Scroll event listener
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', updateScrollButtons);
      updateScrollButtons();
      
      return () => scrollContainer.removeEventListener('scroll', updateScrollButtons);
    }
  }, [featuredGames, updateScrollButtons]);

  if (isLoading) {
    return (
      <section className={`bg-gradient-hero text-white py-8 lg:py-12 ${className}`}>
        <div className="container">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Trophy className="w-6 h-6 text-electric-yellow mr-3" />
              <h2 className="text-2xl font-bold">Featured Games</h2>
            </div>
          </div>
          
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3].map(i => (
              <div key={i} className="min-w-[280px] h-48 bg-white/10 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`bg-gradient-hero text-white py-8 lg:py-12 ${className}`}>
      <div className="container">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Trophy className="w-6 h-6 text-electric-yellow mr-3" />
            <h2 className="text-2xl font-bold">Featured Games</h2>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Dot indicators for mobile */}
            <div className="flex gap-1 mr-4 lg:hidden">
              {featuredGames.map((_, index) => (
                <button
                  key={index}
                  onClick={() => scrollToIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentIndex ? 'bg-electric-yellow' : 'bg-white/30'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
            
            {/* Navigation arrows */}
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className={`btn btn-sm rounded-full transition-all ${
                canScrollLeft 
                  ? 'bg-white/20 hover:bg-white/30 text-white' 
                  : 'bg-white/5 text-white/30 cursor-not-allowed'
              }`}
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className={`btn btn-sm rounded-full transition-all ${
                canScrollRight 
                  ? 'bg-white/20 hover:bg-white/30 text-white' 
                  : 'bg-white/5 text-white/30 cursor-not-allowed'
              }`}
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {featuredGames.map((fixture) => {
            const { date, time } = formatDate(fixture.dateTime);
            const isLive = fixture.status === 'live';
            const matchWeek = getMatchWeek(fixture.dateTime);
            
            return (
              <div
                key={fixture.id}
                className="min-w-[280px] bg-white/95 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 cursor-pointer"
                style={{ scrollSnapAlign: 'start' }}
                onClick={() => onGameSelect(fixture)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onGameSelect(fixture)}
              >
                {/* Live indicator */}
                {isLive && (
                  <div className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-t-xl flex items-center">
                    <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></span>
                    LIVE
                  </div>
                )}
                
                <div className="p-5 text-gray-900">
                  {/* Competition header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <img 
                        src={fixture.competition.logo} 
                        alt={fixture.competition.name}
                        className="w-5 h-5 rounded mr-2"
                      />
                      <span className="text-sm font-medium text-gray-600">
                        {fixture.competition.shortName}
                      </span>
                    </div>
                    <span className="badge badge-sm badge-secondary">
                      Week {matchWeek}
                    </span>
                  </div>

                  {/* Teams */}
                  <div className="mb-4">
                    {/* Home team */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center flex-1">
                        <img 
                          src={fixture.homeTeam.logo} 
                          alt={fixture.homeTeam.name}
                          className="team-logo mr-3"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-sm truncate">
                            {fixture.homeTeam.shortName}
                          </div>
                          <div className="text-xs text-gray-500">
                            #{fixture.homeTeam.position}
                          </div>
                        </div>
                      </div>
                      {renderFormIndicators(fixture.homeTeam.form)}
                    </div>

                    {/* VS and score */}
                    <div className="flex items-center justify-center py-2">
                      {isLive ? (
                        <div className="text-2xl font-bold text-gray-900">
                          {fixture.homeScore} - {fixture.awayScore}
                        </div>
                      ) : (
                        <div className="px-3 py-1 bg-gray-100 rounded-full">
                          <span className="text-sm font-bold text-gray-600">VS</span>
                        </div>
                      )}
                    </div>

                    {/* Away team */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1">
                        <img 
                          src={fixture.awayTeam.logo} 
                          alt={fixture.awayTeam.name}
                          className="team-logo mr-3"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-sm truncate">
                            {fixture.awayTeam.shortName}
                          </div>
                          <div className="text-xs text-gray-500">
                            #{fixture.awayTeam.position}
                          </div>
                        </div>
                      </div>
                      {renderFormIndicators(fixture.awayTeam.form)}
                    </div>
                  </div>

                  {/* Match details */}
                  <div className="space-y-2 text-xs text-gray-600 mb-4">
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-2" />
                      <span>{date}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-2" />
                      <span>{time}</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-3 h-3 mr-2" />
                      <span className="truncate">{fixture.venue}</span>
                    </div>
                  </div>

                  {/* AI Insight */}
                  {fixture.aiInsight && (
                    <div className="bg-teal-50 border-l-4 border-teal-400 p-3 rounded-r-lg">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-semibold text-teal-900">
                          AI Insight
                        </h4>
                        <span className={`badge badge-sm ${
                          fixture.aiInsight.confidence === 'high' ? 'badge-success' :
                          fixture.aiInsight.confidence === 'medium' ? 'badge-warning' :
                          'badge-error'
                        }`}>
                          {Math.round(fixture.aiInsight.probability * 100)}%
                        </span>
                      </div>
                      <p className="text-xs text-teal-800">
                        {fixture.aiInsight.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {featuredGames.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <div className="text-white/60 mb-4">
              <Trophy className="w-12 h-12 mx-auto mb-2" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Featured Games</h3>
            <p className="text-white/70">Check back later for upcoming matches.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedGamesCarousel;
