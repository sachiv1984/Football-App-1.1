// src/components/fixtures/FixturesList/FixturesList.tsx
import React from 'react';
import FixtureCard from '@/components/fixtures/FixtureCard/FixtureCard';
import { 
  FixturesListProps, 
  FixtureGroup,
  FixtureGroupProps 
} from './FixturesList.types';
import { FeaturedFixtureWithImportance } from '@/types'; 
import { toFeaturedFixtureWithImportance } from '@/utils/fixtureUtils';

// -------------------------
// Header Component
// -------------------------
const FixturesListHeader: React.FC<{ title?: string; totalFixtures: number }> = ({ 
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

// -------------------------
// Fixture Group Section
// -------------------------
const FixtureGroupSection: React.FC<FixtureGroupProps> = ({
  group,
  cardSize,
  showAIInsights,
  showCompetition,
  showVenue,
  onFixtureClick
}) => (
  <div className="mb-8">
    <div className="flex items-center mb-4">
      <h3 className="text-lg font-semibold text-gray-900">{group.label}</h3>
      <div className="ml-3 px-2 py-1 bg-gray-100 rounded-full">
        <span className="text-xs font-medium text-gray-600">{group.fixtures.length}</span>
      </div>
    </div>
    
    <div className={`
      grid gap-4
      ${cardSize === 'sm' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' :
        cardSize === 'lg' ? 'grid-cols-1 lg:grid-cols-2' :
        'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      }
    `}>
      {group.fixtures.map(fixture => (
        <FixtureCard
          key={fixture.id}
          fixture={toFeaturedFixtureWithImportance(fixture)} // ✅ mapped to correct type
          size={cardSize}
          showCompetition={showCompetition}
          showVenue={showVenue}
          onClick={onFixtureClick}
        />
      ))}
    </div>
  </div>
);

// -------------------------
// Loading Skeleton
// -------------------------
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
        <div key={index} className={`
            card animate-pulse
            ${cardSize === 'sm' ? 'p-3' : cardSize === 'lg' ? 'p-6' : 'p-4'}
          `}>
          {/* Skeleton content omitted for brevity */}
        </div>
      ))}
    </div>
  );
};

// -------------------------
// Group Fixtures Utility
// -------------------------
const groupFixtures = (fixtures: Fixture[], groupBy: 'date' | 'competition' | 'none'): FixtureGroup[] => {
  if (groupBy === 'none') return [{ key: 'all', label: 'All Fixtures', fixtures }];

  const groups = new Map<string, Fixture[]>();

  fixtures.forEach(fixture => {
    const key = groupBy === 'date' 
      ? new Date(fixture.dateTime).toISOString().split('T')[0] 
      : fixture.competition.id;

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(fixture);
  });

  return Array.from(groups.entries()).map(([key, fixtures]) => {
    const label = groupBy === 'date' 
      ? (key === new Date().toISOString().split('T')[0] ? 'Today' :
         key === new Date(Date.now() + 86400000).toISOString().split('T')[0] ? 'Tomorrow' :
         new Date(key).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }))
      : fixtures[0].competition.name;

    return {
      key,
      label,
      fixtures: fixtures.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
    };
  }).sort((a, b) => groupBy === 'date' 
    ? new Date(a.key).getTime() - new Date(b.key).getTime() 
    : a.label.localeCompare(b.label)
  );
};

// -------------------------
// FixturesList Component
// -------------------------
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
  const displayFixtures = maxItems ? fixtures.slice(0, maxItems) : fixtures;

  if (loading) {
    return (
      <div className={className}>
        <FixturesListHeader title={title} totalFixtures={0} />
        <LoadingSkeleton cardSize={cardSize} />
      </div>
    );
  }

  if (!displayFixtures.length) {
    return (
      <div className={className}>
        <FixturesListHeader title={title} totalFixtures={0} />
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="text-6xl mb-4">⚽</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{emptyMessage}</h3>
            <p className="text-gray-600">Check back later for upcoming fixtures and matches.</p>
          </div>
        </div>
      </div>
    );
  }

  const groups = groupFixtures(displayFixtures, groupBy);

  return (
    <div className={className}>
      <FixturesListHeader title={title} totalFixtures={displayFixtures.length} />
      {groups.map(group => (
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
