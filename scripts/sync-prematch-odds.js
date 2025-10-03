// scripts/sync-prematch-odds.js

import https from 'https';
import { createClient } from '@supabase/supabase-js';

// =====================================================
// CONFIGURATION
// =====================================================

const SGO_BASE_URL = 'api.sportsgameodds.com';
const SGO_API_KEY = process.env.SGO_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

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
          // IMPORTANT: Capture the specific API error message in the rejection
          // Use 'cause' to store the status code for easy retrieval later
          reject(new Error(`API returned ${res.statusCode}: ${data}`, { cause: res.statusCode }));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Log API usage
 */
async function logApiUsage(endpoint, eventId, responseCode, requestType, league, cached = false, notes = null) {
  try {
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
  } catch (logError) {
    console.error("   ⚠️ Failed to log API usage to Supabase:", logError.message);
  }
}

// =====================================================
// ODDS EXTRACTION FUNCTIONS (UNCHANGED)
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
          const key = isOver ? `homeOver${line.toString().replace('.', '')}` : `homeUnder${line.toString().replace('.', '')}`;
          
          cornersOdds[bookName][key] = outcome.price;
          if (!bestOdds[key] || outcome.price > bestOdds[key].odds) {
              bestOdds[key] = { bookmaker: bookName, odds: outcome.price };
          }
        }
      }
      
      // Away team corners
      if (market.key === 'alternate_team_corners_away' || market.key === 'team_corners_away') {
        for (const outcome of market.outcomes) {
          const line = outcome.point;
          const isOver = outcome.name.toLowerCase().includes('over');
          const key = isOver ? `awayOver${line.toString().replace('.', '')}` : `awayUnder${line.toString().replace('.', '')}`;
          
          cornersOdds[bookName][key] = outcome.price;
          if (!bestOdds[key] || outcome.price > bestOdds[key].odds) {
            bestOdds[key] = { bookmaker: bookName, odds: outcome.price };
          }
        }
      }

      // Match total corners
      if (market.key === 'alternate_total_corners' || market.key === 'totals_corners') {
        for (const outcome of market.outcomes) {
          const line = outcome.point;
          const isOver = outcome.name.toLowerCase().includes('over');
          const key = isOver ? `matchOver${line.toString().replace('.', '')}` : `matchUnder${line.toString().replace('.', '')}`;
          
          cornersOdds[bookName][key] = outcome.price;
          if (!bestOdds[key] || outcome.price > bestOdds[key].odds) {
            bestOdds[key] = { bookmaker: bookName, odds: outcome.price };
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
          const key = isOver ? `homeOver${line.toString().replace('.', '')}` : `homeUnder${line.toString().replace('.', '')}`;
          
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
          const key = isOver ? `awayOver${line.toString().replace('.', '')}` : `awayUnder${line.toString().replace('.', '')}`;
          
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
        const homeTeam = book.home_team;
        const awayTeam = book.away_team;

        const homeOutcome = market.outcomes.find(o => o.name === homeTeam);
        const drawOutcome = market.outcomes.find(o => o.name.toLowerCase() === 'draw');
        const awayOutcome = market.outcomes.find(o => o.name === awayTeam);

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
// RATE-LIMITED FETCH LOGIC (STEP 2)
// =====================================================

/**
 * Fetch full odds for a list of events one by one, with a 6-second delay.
 * This is the premium, rate-limited step.
 */
async function fetchOddsForEvents(events, leagueName) {
    const records = [];
    let processedCount = 0;
    
    console.log(`   Starting individual odds fetch for ${events.length} matches...`);
    
    for (const event of events) {
        // 🚨 RATE LIMIT DELAY: 6 seconds per request (60s / 10 reqs = 6s)
        // Only apply delay AFTER the first request in the loop
        if (processedCount > 0) {
            await new Promise(resolve => setTimeout(resolve, 6000));
        }
        
        // 💡 PREMIUM REQUEST: Fetch full odds for this single event ID
        const oddsPath = `/v2/events/${event.id}/odds`; 
        
        try {
            const oddsResponse = await makeRequest(oddsPath);
            await logApiUsage(oddsPath, event.id, 200, 'odds_detail', leagueName, false);
            processedCount++;
            
            // Combine the initial fixture data with the new odds data
            const eventWithOdds = { ...event, bookmakers: oddsResponse.bookmakers, raw_data: oddsResponse };
            
            console.log(`      ✅ Fetched odds for ${eventWithOdds.home_team} vs ${eventWithOdds.away_team} (${processedCount}/${events.length})`);

            // Assemble the final database record
            const record = {
                event_id: eventWithOdds.id,
                home_team: eventWithOdds.home_team,
                away_team: eventWithOdds.away_team,
                kickoff_time: eventWithOdds.commence_time,
                league: leagueName,
                season: getSeason(new Date(eventWithOdds.commence_time)),
                
                // Extract odds
                corners_odds: eventWithOdds.bookmakers ? extractCornersOdds(eventWithOdds.bookmakers) : null,
                cards_odds: eventWithOdds.bookmakers ? extractCardsOdds(eventWithOdds.bookmakers) : null,
                btts_odds: eventWithOdds.bookmakers ? extractBttsOdds(eventWithOdds.bookmakers) : null,
                match_odds: eventWithOdds.bookmakers ? extractMatchOdds(eventWithOdds.bookmakers) : null,
                over_under_goals_odds: eventWithOdds.bookmakers ? extractOverUnderGoalsOdds(eventWithOdds.bookmakers) : null,
                
                fetched_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                odds_locked: false,
                match_completed: false,
                
                raw_data: eventWithOdds.raw_data
            };
            
            records.push(record);

        } catch (error) {
             const statusCode = error.cause || 500;
             console.error(`      ❌ Error fetching odds for event ${event.id} (${event.home_team} vs ${event.away_team}):`, error.message);
             // Log the failed request against the budget
             await logApiUsage(oddsPath, event.id, statusCode, 'odds_detail_fail', leagueName, false, error.message);
        }
    }
    return records;
}

// =====================================================
// MAIN SYNC LOGIC (STEP 1 - Fixture List)
// =====================================================

/**
 * Fetch and store odds for a specific league
 */
async function syncLeague(sportId, leagueName) {
  console.log(`\n📊 Fetching ${leagueName}...`);
  
  // Date variables are kept for context/logging but REMOVED from the API path.
  const today = new Date().toISOString().split('T')[0];
  const twoWeeksLater = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  // 🚨 FINAL FIX: Remove dateFrom and dateTo. This is the only configuration 
  // that typically bypasses the "advanced queries" tier restriction.
  // We rely on the API's default/short upcoming event window.
  const path = `/v2/events?leagueId=${sportId}`; 
  
  try {
    const response = await makeRequest(path);
    // Logging this initial request as a successful list fetch
    await logApiUsage(path, null, 200, 'fixtures_list', leagueName, false);
    
    if (!response || !response.events || response.events.length === 0) {
      console.log(`   ℹ️  No upcoming matches found (API returned default window)`);
      return { league: leagueName, synced: 0 };
    }
    
    console.log(`   Found ${response.events.length} upcoming matches (in API's default window)`);
    
    // STEP 2: Fetch odds for each event (PREMIUM/RATE-LIMITED STEP)
    const records = await fetchOddsForEvents(response.events, leagueName);
    
    if (records.length === 0) {
        console.log(`   ℹ️  No odds successfully fetched for matches.`);
        return { league: leagueName, synced: 0 };
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
    
    console.log(`   ✅ Successfully synced and updated ${records.length} matches in database.`);
    
    return {
      league: leagueName,
      synced: records.length
    };
    
  } catch (error) {
    const statusCode = error.cause || 500;
    console.error(`   ❌ Error fetching fixture list for ${leagueName}:`, error.message);
    // Log the failed list request
    await logApiUsage(path, null, statusCode, 'fixtures_list_fail', leagueName, false, error.message);
    
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
  console.log('🚨 Rate Limit: 10 requests/minute enforced by 6000ms delay per match.');
  console.log('━'.repeat(60));
  
  const results = [];
  
  // Sync each league
  for (const [sportId, leagueName] of Object.entries(LEAGUES)) {
    const result = await syncLeague(sportId, leagueName);
    results.push(result);
    
    // Small buffer delay between leagues
    await new Promise(resolve => setTimeout(resolve, 500)); 
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
      console.log(`✅ ${result.league}: ${result.synced} matches (successfully fetched odds)`);
      totalSynced += result.synced;
    }
  });
  
  console.log('━'.repeat(60));
  console.log(`Total matches synced (with odds): ${totalSynced}`);
  console.log(`Errors encountered: ${totalErrors}`);
  console.log('━'.repeat(60));
  
  // Check usage
  const { count: todayCount, error: usageError } = await supabase
    .from('api_usage_log')
    .select('*', { count: 'exact' })
    .gte('timestamp', new Date().toISOString().split('T')[0])
    .eq('cached', false);
  
  if (usageError) {
     console.error(`\n⚠️ Error fetching API Usage:`, usageError.message);
  } else {
     console.log(`\n📈 API Usage Today: ${todayCount || 0} premium requests made.`);
     if (todayCount > 2000) { 
         console.warn("   🚨 WARNING: Approaching monthly limit of 2,500 requests!");
     }
  }

  // Use the total errors in the process.exit code
  if (totalErrors > 0) {
    process.exit(1);
  }
}

// Run
main().catch(error => {
  console.error('💥 Fatal error in main execution:', error);
  process.exit(1);
});