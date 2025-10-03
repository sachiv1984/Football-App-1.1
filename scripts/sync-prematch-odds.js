// scripts/sync-prematch-odds.js
import https from 'https';
import { createClient } from '@supabase/supabase-js'

// =====================================================
// CONFIGURATION
// =====================================================

const SGO_BASE_URL = 'https://api.sportsgameodds.com';
const SGO_API_KEY = process.env.SGO_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const LEAGUES = {
  'soccer_epl': 'Premier League',
};

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// =====================================================
// API HELPER FUNCTIONS
// =====================================================

/**
 * Make API request to SportsGameOdds
 */
function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SGO_BASE_URL,
      path: path,
      method: 'GET',
      headers: {
        'X-API-Key': SGO_API_KEY,
        'Accept': 'application/json'
      }
    };

    https.get(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse JSON: ${e.message}`));
          }
        } else {
          reject(new Error(`API returned ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Log API usage
 */
async function logApiUsage(endpoint, eventId, responseCode, requestType, league, cached = false, notes = null) {
  await supabase.from('api_usage_log').insert({
    timestamp: new Date().toISOString(),
    endpoint,
    event_id: eventId,
    response_code: responseCode,
    cached,
    request_type: requestType,
    league,
    notes
  });
}

// =====================================================
// ODDS EXTRACTION FUNCTIONS
// =====================================================

/**
 * Extract corners odds from bookmaker data
 */
function extractCornersOdds(bookmakers) {
  const cornersOdds = {};
  const bestOdds = {};

  for (const book of bookmakers) {
    const bookName = book.key;
    cornersOdds[bookName] = {};

    for (const market of book.markets) {
      // Team total corners
      if (market.key === 'alternate_team_corners_home' || market.key === 'team_corners_home') {
        for (const outcome of market.outcomes) {
          const line = outcome.point;
          const isOver = outcome.name.toLowerCase().includes('over');
          const key = `homeOver${line.toString().replace('.', '')}`;
          
          if (isOver) {
            cornersOdds[bookName][key] = outcome.price;
            
            // Track best odds
            if (!bestOdds[key] || outcome.price > bestOdds[key].odds) {
              bestOdds[key] = { bookmaker: bookName, odds: outcome.price };
            }
          } else {
            const underKey = `homeUnder${line.toString().replace('.', '')}`;
            cornersOdds[bookName][underKey] = outcome.price;
            
            if (!bestOdds[underKey] || outcome.price > bestOdds[underKey].odds) {
              bestOdds[underKey] = { bookmaker: bookName, odds: outcome.price };
            }
          }
        }
      }
      
      // Away team corners
      if (market.key === 'alternate_team_corners_away' || market.key === 'team_corners_away') {
        for (const outcome of market.outcomes) {
          const line = outcome.point;
          const isOver = outcome.name.toLowerCase().includes('over');
          const key = `awayOver${line.toString().replace('.', '')}`;
          
          if (isOver) {
            cornersOdds[bookName][key] = outcome.price;
            if (!bestOdds[key] || outcome.price > bestOdds[key].odds) {
              bestOdds[key] = { bookmaker: bookName, odds: outcome.price };
            }
          } else {
            const underKey = `awayUnder${line.toString().replace('.', '')}`;
            cornersOdds[bookName][underKey] = outcome.price;
            if (!bestOdds[underKey] || outcome.price > bestOdds[underKey].odds) {
              bestOdds[underKey] = { bookmaker: bookName, odds: outcome.price };
            }
          }
        }
      }

      // Match total corners
      if (market.key === 'alternate_total_corners' || market.key === 'totals_corners') {
        for (const outcome of market.outcomes) {
          const line = outcome.point;
          const isOver = outcome.name.toLowerCase().includes('over');
          const key = `matchOver${line.toString().replace('.', '')}`;
          
          if (isOver) {
            cornersOdds[bookName][key] = outcome.price;
            if (!bestOdds[key] || outcome.price > bestOdds[key].odds) {
              bestOdds[key] = { bookmaker: bookName, odds: outcome.price };
            }
          }
        }
      }
    }
  }

  cornersOdds.bestOdds = bestOdds;
  return Object.keys(cornersOdds).length > 1 ? cornersOdds : null;
}

/**
 * Extract cards odds from bookmaker data
 */
function extractCardsOdds(bookmakers) {
  const cardsOdds = {};
  const bestOdds = {};

  for (const book of bookmakers) {
    const bookName = book.key;
    cardsOdds[bookName] = {};

    for (const market of book.markets) {
      // Team total cards
      if (market.key === 'alternate_team_cards_home' || market.key === 'team_cards_home') {
        for (const outcome of market.outcomes) {
          const line = outcome.point;
          const isOver = outcome.name.toLowerCase().includes('over');
          const key = `homeOver${line.toString().replace('.', '')}`;
          
          if (isOver) {
            cardsOdds[bookName][key] = outcome.price;
            if (!bestOdds[key] || outcome.price > bestOdds[key].odds) {
              bestOdds[key] = { bookmaker: bookName, odds: outcome.price };
            }
          }
        }
      }
      
      if (market.key === 'alternate_team_cards_away' || market.key === 'team_cards_away') {
        for (const outcome of market.outcomes) {
          const line = outcome.point;
          const isOver = outcome.name.toLowerCase().includes('over');
          const key = `awayOver${line.toString().replace('.', '')}`;
          
          if (isOver) {
            cardsOdds[bookName][key] = outcome.price;
            if (!bestOdds[key] || outcome.price > bestOdds[key].odds) {
              bestOdds[key] = { bookmaker: bookName, odds: outcome.price };
            }
          }
        }
      }
    }
  }

  cardsOdds.bestOdds = bestOdds;
  return Object.keys(cardsOdds).length > 1 ? cardsOdds : null;
}

/**
 * Extract BTTS odds
 */
function extractBttsOdds(bookmakers) {
  const bttsOdds = {};
  let bestYes = null;
  let bestNo = null;

  for (const book of bookmakers) {
    const bookName = book.key;

    for (const market of book.markets) {
      if (market.key === 'btts' || market.key === 'both_teams_to_score') {
        for (const outcome of market.outcomes) {
          if (outcome.name.toLowerCase().includes('yes')) {
            bttsOdds[bookName] = { ...(bttsOdds[bookName] || {}), yes: outcome.price };
            if (!bestYes || outcome.price > bestYes.odds) {
              bestYes = { bookmaker: bookName, odds: outcome.price };
            }
          } else if (outcome.name.toLowerCase().includes('no')) {
            bttsOdds[bookName] = { ...(bttsOdds[bookName] || {}), no: outcome.price };
            if (!bestNo || outcome.price > bestNo.odds) {
              bestNo = { bookmaker: bookName, odds: outcome.price };
            }
          }
        }
      }
    }
  }

  if (bestYes || bestNo) {
    bttsOdds.bestOdds = { yes: bestYes, no: bestNo };
  }

  return Object.keys(bttsOdds).length > 1 ? bttsOdds : null;
}

/**
 * Extract match result odds
 */
function extractMatchOdds(bookmakers) {
  const matchOdds = {};

  for (const book of bookmakers) {
    const bookName = book.key;

    for (const market of book.markets) {
      if (market.key === 'h2h') {
        const homeOutcome = market.outcomes.find(o => o.name === book.home_team);
        const drawOutcome = market.outcomes.find(o => o.name.toLowerCase() === 'draw');
        const awayOutcome = market.outcomes.find(o => o.name === book.away_team);

        if (homeOutcome && awayOutcome) {
          matchOdds[bookName] = {
            home: homeOutcome.price,
            draw: drawOutcome?.price || null,
            away: awayOutcome.price
          };
        }
      }
    }
  }

  return Object.keys(matchOdds).length > 0 ? matchOdds : null;
}

/**
 * Extract over/under goals odds
 */
function extractOverUnderGoalsOdds(bookmakers) {
  const ouOdds = {};
  const bestOdds = {};

  for (const book of bookmakers) {
    const bookName = book.key;
    ouOdds[bookName] = {};

    for (const market of book.markets) {
      if (market.key === 'totals' || market.key === 'alternate_totals') {
        for (const outcome of market.outcomes) {
          const line = outcome.point;
          const isOver = outcome.name.toLowerCase().includes('over');
          const key = isOver ? `over${line.toString().replace('.', '')}` : `under${line.toString().replace('.', '')}`;
          
          ouOdds[bookName][key] = outcome.price;
          
          if (!bestOdds[key] || outcome.price > bestOdds[key].odds) {
            bestOdds[key] = { bookmaker: bookName, odds: outcome.price };
          }
        }
      }
    }
  }

  ouOdds.bestOdds = bestOdds;
  return Object.keys(ouOdds).length > 1 ? ouOdds : null;
}

// =====================================================
// MAIN SYNC LOGIC
// =====================================================

/**
 * Fetch and store odds for a specific league
 */
async function syncLeague(sportId, leagueName) {
  console.log(`\n📊 Fetching ${leagueName}...`);
  
  const today = new Date().toISOString().split('T')[0];
  const twoWeeksLater = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const path = `/v2/events?sportId=${sportId}&dateFrom=${today}&dateTo=${twoWeeksLater}&includeOdds=true`;
  
  try {
    const response = await makeRequest(path);
    await logApiUsage(path, null, 200, 'fixtures', leagueName, false);
    
    if (!response || !response.events || response.events.length === 0) {
      console.log(`   ℹ️  No upcoming matches found`);
      return { league: leagueName, synced: 0 };
    }
    
    console.log(`   Found ${response.events.length} upcoming matches`);
    
    const records = [];
    
    for (const event of response.events) {
      const record = {
        event_id: event.id,
        home_team: event.home_team,
        away_team: event.away_team,
        kickoff_time: event.commence_time,
        league: leagueName,
        season: getSeason(new Date(event.commence_time)),
        
        // Extract odds
        corners_odds: event.bookmakers ? extractCornersOdds(event.bookmakers) : null,
        cards_odds: event.bookmakers ? extractCardsOdds(event.bookmakers) : null,
        btts_odds: event.bookmakers ? extractBttsOdds(event.bookmakers) : null,
        match_odds: event.bookmakers ? extractMatchOdds(event.bookmakers) : null,
        over_under_goals_odds: event.bookmakers ? extractOverUnderGoalsOdds(event.bookmakers) : null,
        
        fetched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        odds_locked: false,
        match_completed: false,
        
        raw_data: event
      };
      
      records.push(record);
    }
    
    // Upsert to Supabase
    const { error } = await supabase
      .from('prematch_odds')
      .upsert(records, {
        onConflict: 'event_id',
        ignoreDuplicates: false
      });
    
    if (error) {
      console.error(`   ❌ Error upserting to Supabase:`, error);
      throw error;
    }
    
    console.log(`   ✅ Successfully synced ${records.length} matches`);
    
    return {
      league: leagueName,
      synced: records.length
    };
    
  } catch (error) {
    console.error(`   ❌ Error syncing ${leagueName}:`, error.message);
    await logApiUsage(path, null, error.statusCode || 500, 'fixtures', leagueName, false, error.message);
    
    return {
      league: leagueName,
      error: error.message
    };
  }
}

/**
 * Get season string from date
 */
function getSeason(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  
  // Season starts in August (month 7)
  if (month >= 7) {
    return `${year}-${(year + 1).toString().slice(2)}`;
  } else {
    return `${year - 1}-${year.toString().slice(2)}`;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Pre-Match Odds Sync');
  console.log(`   Timestamp: ${new Date().toISOString()}`);
  console.log(`   Leagues: ${Object.values(LEAGUES).join(', ')}`);
  console.log('━'.repeat(60));
  
  const results = [];
  
  // Sync each league
  for (const [sportId, leagueName] of Object.entries(LEAGUES)) {
    const result = await syncLeague(sportId, leagueName);
    results.push(result);
    
    // Small delay between leagues to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n' + '━'.repeat(60));
  console.log('📊 SYNC SUMMARY');
  console.log('━'.repeat(60));
  
  let totalSynced = 0;
  let totalErrors = 0;
  
  results.forEach(result => {
    if (result.error) {
      console.log(`❌ ${result.league}: ${result.error}`);
      totalErrors++;
    } else {
      console.log(`✅ ${result.league}: ${result.synced} matches`);
      totalSynced += result.synced;
    }
  });
  
  console.log('━'.repeat(60));
  console.log(`Total matches synced: ${totalSynced}`);
  console.log(`Errors: ${totalErrors}`);
  console.log('━'.repeat(60));
  
  // Check usage
  const { data: todayUsage } = await supabase
    .from('api_usage_log')
    .select('*', { count: 'exact' })
    .gte('timestamp', new Date().toISOString().split('T')[0])
    .eq('cached', false);
  
  console.log(`\n📈 API Usage Today: ${todayUsage?.length || 0} requests`);
  
  if (totalErrors > 0) {
    process.exit(1);
  }
}

// Run
main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
