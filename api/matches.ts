// pages/api/matches.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import FixtureService from '../../services/FixtureService';

const service = new FixtureService(true); // serverSide=true to call API directly

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const fixtures = await service.getAllFixtures();
    res.status(200).json(fixtures);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch matches' });
  }
}
