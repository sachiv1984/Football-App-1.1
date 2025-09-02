// src/api/matches.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { FootballDataApi } from '../../services/api/footballDataApi';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('Starting /api/matches handler');
    
    // Check if API token is available
    const API_TOKEN = process.env.FOOTBALL_DATA_TOKEN || process.env.REACT_APP_FOOTBALL_DATA_TOKEN;
    if (!API_TOKEN) {
      console.error('❌ API token is missing');
      return res.status(500).json({
        success: false,
        error: 'API token is not configured',
        note: 'Please set FOOTBALL_DATA_TOKEN in your environment variables.'
      });
    }

    console.log('API token found, initializing FootballDataApi');
    
    // Use server-side FootballDataApi directly
    const footballApi = FootballDataApi.getInstance();
    
    console.log('Fetching matches from Football Data API');
    const matches = await footballApi.getCurrentSeasonMatches();
    
    console.log(`Fetched ${matches.length} matches`);

    // Simple transformation without private method access
    const fixtures = matches.map(match => ({
      id: match.id,
      date: match.utcDate,
      status: match.status,
      matchday: match.matchday,
      stage: match.stage,
      homeTeam: {
        id: match.homeTeam.id,
        name: match.homeTeam.name,
        shortName: match.homeTeam.shortName,
        tla: match.homeTeam.tla,
        crest: match.homeTeam.crest
      },
      awayTeam: {
        id: match.awayTeam.id,
        name: match.awayTeam.name,
        shortName: match.awayTeam.shortName,
        tla: match.awayTeam.tla,
        crest: match.awayTeam.crest
      },
      score: match.score,
      venue: match.venue,
      competition: match.competition,
      // Add any additional fields your frontend expects
      importance: 1, // Default importance
      colors: {
        home: '#000000',
        away: '#FFFFFF'
      }
    }));

    console.log(`Transformed ${fixtures.length} fixtures, sending response`);
    res.status(200).json(fixtures);
    
  } catch (error: unknown) {
    console.error('❌ API /matches error:', error);

    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    const errorMessage =
      error instanceof Error ? error.message :
      typeof error === 'string' ? error :
      'Unknown server error';

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      } : error,
      note: 'Check FootballDataApi token and network connectivity.'
    });
  }
}
