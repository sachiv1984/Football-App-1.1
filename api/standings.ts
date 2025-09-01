// pages/api/standings.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import FixtureService from '../../services/FixtureService';

const service = new FixtureService(true);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const standings = await service.getStandings();
    res.status(200).json(standings);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch standings' });
  }
}
