import type { FeaturedFixtureWithImportance, Game, FeaturedFixture } from '@/types';

export const toFeaturedFixtureWithImportance = (
  fixture: Game | FeaturedFixture
): FeaturedFixtureWithImportance => {
  const importanceScore =
    'importanceScore' in fixture && typeof fixture.importanceScore === 'number'
      ? fixture.importanceScore
      : 0;

  const tags = 'tags' in fixture && Array.isArray(fixture.tags) ? fixture.tags : [];
  const isBigMatch =
    'isBigMatch' in fixture && typeof fixture.isBigMatch === 'boolean'
      ? fixture.isBigMatch
      : false;

  const matchWeek =
    'matchWeek' in fixture && typeof fixture.matchWeek === 'number' ? fixture.matchWeek : 1;

  return {
    ...fixture,
    importanceScore,
    tags,
    isBigMatch,
    matchWeek,
    importance:
      'importance' in fixture && typeof fixture.importance === 'number' ? fixture.importance : 0,
  } as FeaturedFixtureWithImportance;
};
