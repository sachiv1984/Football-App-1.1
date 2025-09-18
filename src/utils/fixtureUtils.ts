import type { Game, FeaturedFixtureWithImportance, FeaturedFixture } from '../types';

/**
 * Converts a Game or partial FeaturedFixture into a full FeaturedFixtureWithImportance.
 * Fills missing properties with defaults to satisfy TypeScript.
 */
export function toFeaturedFixtureWithImportance(
  fixture: Game | FeaturedFixture | FeaturedFixtureWithImportance
): FeaturedFixtureWithImportance {
  // Already fully typed
  if ('importanceScore' in fixture && 'tags' in fixture && 'isBigMatch' in fixture) {
    return fixture;
  }

  return {
    ...fixture,
    importanceScore: 'importanceScore' in fixture ? fixture.importanceScore : 0,
    tags: 'tags' in fixture ? fixture.tags : [],
    isBigMatch: 'isBigMatch' in fixture ? fixture.isBigMatch : false,
    matchWeek: fixture.matchWeek ?? 1,
    importance: fixture.importance ?? 0,
  };
}
