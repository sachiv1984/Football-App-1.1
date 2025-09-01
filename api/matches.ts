// src/pages/api/matches.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { FixtureService } from '../../services/fixtures/fixtureService';
import { FootballDataApi } from '../../services/api/footballDataApi';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Use server-side FixtureService that calls FootballDataApi directly
    const footballApi = FootballDataApi.getInstance();
    const matches = await footballApi.getCurrentSeasonMatches();

    // Transform matches if needed (optional)
    const fixtureService = new FixtureService(); // only uses transform, colors, importance, etc.
    const transformed = await Promise.all(matches.map(m => fixtureService['transformMatch'](m).catch(e => {
      console.error('Transform error for match:', m.id, e);
      return null;
    })));

    // Filter out any failed transforms
    const fixtures = transformed.filter(f => f !== null);

    res.status(200).json(fixtures);
  } catch (error: unknown) {
    console.error('API /matches error:', error);

    const errorMessage =
      error instanceof Error ? error.message :
      typeof error === 'string' ? error :
      'Unknown server error';

    res.status(500).json({
      success: false,
      error: errorMessage,
      note: 'Check FootballDataApi token and network connectivity.'
    });
  }
}
