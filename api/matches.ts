// src/api/matches.ts
import type { NextApiRequest, NextApiResponse } from 'next';

// Simple test endpoint first
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('=== API /matches called ===');
    
    // Check environment variables
    const API_TOKEN = process.env.FOOTBALL_DATA_TOKEN || process.env.REACT_APP_FOOTBALL_DATA_TOKEN;
    console.log('API_TOKEN exists:', !!API_TOKEN);
    console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('FOOTBALL')));
    
    if (!API_TOKEN) {
      console.error('❌ No API token found');
      return res.status(500).json({
        success: false,
        error: 'API token is not configured',
        note: 'Please set FOOTBALL_DATA_TOKEN in environment variables',
        availableEnvVars: Object.keys(process.env).filter(k => k.includes('FOOTBALL'))
      });
    }

    // Test basic fetch first
    console.log('Testing direct API call...');
    const testUrl = 'https://api.football-data.org/v4/competitions/PL/matches';
    
    const response = await fetch(testUrl, {
      headers: {
        'X-Auth-Token': API_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    console.log('API Response status:', response.status);
    console.log('API Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error response:', errorText);
      
      return res.status(500).json({
        success: false,
        error: `Football Data API error: ${response.status} ${response.statusText}`,
        details: errorText,
        note: 'Check your API token and account limits'
      });
    }

    const data = await response.json();
    console.log('API Response data keys:', Object.keys(data));
    console.log('Matches count:', data.matches?.length || 0);

    // Return simplified match data
    const matches = (data.matches || []).slice(0, 10).map((match: any) => ({
      id: match.id,
      date: match.utcDate,
      status: match.status,
      homeTeam: {
        name: match.homeTeam.name,
        crest: match.homeTeam.crest
      },
      awayTeam: {
        name: match.awayTeam.name,
        crest: match.awayTeam.crest
      },
      score: match.score
    }));

    console.log('Sending response with', matches.length, 'matches');
    
    res.status(200).json({
      success: true,
      matches: matches,
      total: data.matches?.length || 0
    });
    
  } catch (error: unknown) {
    console.error('❌ Unexpected error in /api/matches:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown server error',
      type: error instanceof Error ? error.constructor.name : typeof error,
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    });
  }
}
