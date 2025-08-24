// src/components/fixtures/FixturesList/FixturesList.tsx
import React from 'react';
import { FixtureCard } from '@/components';
import { 
  FixturesListProps, 
  FixtureGroup, 
  FixturesListHeaderProps,
  FixtureGroupProps 
} from './FixturesList.types';
import { Fixture } from '../FixtureCard/FixtureCard.types';

const FixturesListHeader: React.FC<FixturesListHeaderProps> = ({ 
  title, 
  totalFixtures 
}) => {
  if (!title) return null;

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-600 mt-1">
          {totalFixtures} fixture{totalFixtures !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
};

const FixtureGroupSection: React.FC<FixtureGroupProps> = ({
  group,
  cardSize,
  showAIInsights,
  showCompetition,
  showVenue,
  onFixtureClick
}) => {
  return (
    <div className="mb-8">
      <div className="flex items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {group.label}
        </h3>
        <div className="ml-3 px-2 py-1 bg-gray-100 rounded-full">
          <span className="text-xs font-medium text-gray-600">
            {group.fixtures.length}
          </span>
        </div>
      </div>
      
      <div className={`
        grid gap-4
        ${cardSize === 'sm' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' :
          cardSize === 'lg' ? 'grid-cols-1 lg:grid-cols-2' :
          'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        }
      `}>
        {group.fixtures.map((fixture) => (
          <FixtureCard
            key={fixture.id}
            fixture={fixture}
            size={cardSize}
            showAIInsight={showAIInsights}
            showCompetition={showCompetition}
            showVenue={showVenue}
            onClick={onFixtureClick}
          />
        ))}
      </div>
    </div>
  );
};

const LoadingSkeleton: React.FC<{ cardSize: 'sm' | 'md' | 'lg' }> = ({ cardSize }) => {
  const skeletonCount = cardSize === 'sm' ? 8 : cardSize === 'lg' ? 4 : 6;
  
  return (
    <div className={`
      grid gap-4
      ${cardSize === 'sm' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' :
        cardSize === 'lg' ? 'grid-cols-1 lg:grid-cols-2' :
        'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      }
    `}>
      {Array.from({ length: skeletonCount }).map((_, index) => (
        <div 
          key={index} 
          className={`
            card animate-pulse
            ${cardSize === 'sm' ? 'p-3' : cardSize === 'lg' ? 'p-6' : 'p-4'}
          `}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-300 rounded"></div>
              <div className="w-16 h-3 bg-gray-300 rounded"></div>
            </div>
            <div className="w-20 h-3 bg-gray-300 rounded"></div>
          </div>
          
          <div className="grid grid-cols-5 items-center gap-4">
            <div className="col-span-2 flex flex-col items-center">
              <div className={`${cardSize === 'sm' ? 'w-8 h-8' : 'w-12 h-12'} bg-gray-300 rounded mb-2`}></div>
              <div className="w-20 h-4 bg-gray-300 rounded mb-1"></div>
              {cardSize !== 'sm' && (
                <div className="flex space-x-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-6 h-6 bg-gray-300 rounded-full"></div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="col-span-1 flex justify-center">
              <div className="w-12 h-8 bg-gray-300 rounded"></div>
            </div>
            
            <div className="col-span-2 flex flex-col items-center">
              <div className={`${cardSize === 'sm' ? 'w-8 h-8' : 'w-12 h-12'} bg-gray-300 rounded mb-2`}></div>
              <div className="w-20 h-4 bg-gray-300 rounded mb-1"></div>
              {cardSize !== 'sm' && (
                <div className="flex space-x-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-6 h-6 bg-gray-300 rounded-full"></div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const groupFixtures = (fixtures: Fixture[], groupBy: 'date' | 'competition' | 'none'): FixtureGroup[] => {
  if (groupBy === 'none') {
    return [{
      key: 'all',
      label: 'All Fixtures',
      fixtures
    }];
  }

  const groups = new Map<string, Fixture[]>();

  fixtures.forEach(fixture => {
    let key: string;
    let label: string;

    if (groupBy === 'date') {
      const date = new Date(fixture.dateTime);
      key = date.toISOString().split('T')[0];
      
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      if (key === today.toISOString().split('T')[0]) {
        label = 'Today';
      } else if (key === tomorrow.toISOString().split('T')[0]) {
        label = 'Tomorrow';
      } else {
        label = date.toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        });
      }
    } else {
      key = fixture.competition.id;
      label = fixture.competition.name;
    }

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(fixture);
  });

  return Array.from(groups.entries()).map(([key, fixtures]) => ({
    key,
    label: groupBy === 'date' ? 
      (key === new Date().toISOString().split('T')[0] ? 'Today' :
       key === new Date(Date.now() + 86400000).toISOString().split('T')[0] ? 'Tomorrow' :
       new Date(key).toLocaleDateString('en-GB', {
         weekday: 'long',
         day: 'numeric',
         month: 'long'
       })) :
      fixtures[0].competition.name,
    fixtures: fixtures.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
  })).sort((a, b) => {
    if (groupBy === 'date') {
      return new Date(a.key).getTime() - new Date(b.key).getTime();
    }
    return a.label.localeCompare(b.label);
  });
};

const FixturesList: React.FC<FixturesListProps> = ({
  fixtures,
  title,
  groupBy = 'date',
  cardSize = 'md',
  showAIInsights = true,
  showCompetition = true,
  showVenue = false,
  maxItems,
  onFixtureClick,
  className = '',
  emptyMessage = 'No fixtures available',
  loading = false
}) => {
  // Apply maxItems limit if specified
  const displayFixtures = maxItems ? fixtures.slice(0, maxItems) : fixtures;
  
  if (loading) {
    return (
      <div className={`${className}`}>
        <FixturesListHeader title={title} totalFixtures={0} />
        <LoadingSkeleton cardSize={cardSize} />
      </div>
    );
  }

  if (!displayFixtures.length) {
    return (
      <div className={`${className}`}>
        <FixturesListHeader title={title} totalFixtures={0} />
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="text-6xl mb-4">⚽</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {emptyMessage}
            </h3>
            <p className="text-gray-600">
              Check back later for upcoming fixtures and matches.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const groups = groupFixtures(displayFixtures, groupBy);

  return (
    <div className={`${className}`}>
      <FixturesListHeader title={title} totalFixtures={displayFixtures.length} />
      
      {groups.map((group) => (
        <FixtureGroupSection
          key={group.key}
          group={group}
          cardSize={cardSize}
          showAIInsights={showAIInsights}
          showCompetition={showCompetition}
          showVenue={showVenue}
          onFixtureClick={onFixtureClick}
        />
      ))}
    </div>
  );
};

export default FixturesList;
