// scripts/sync-results.js
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

// =====================================================
// CONFIGURATION
// =====================================================

const SGO_BASE_URL = 'api.sportsgameodds.com';
const SGO_API_KEY = process.env.SGO_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

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
// RESULT EXTRACTION FUNCTIONS
// =====================================================

/**
 * Calculate market results based on actual outcomes
 */
function calculateMarketResults(stats) {
  const results = {};
  
  // Corners markets
  if (stats.home_corners !== null && stats.away_corners !== null) {
    // Home team corners
    results.homeOver35Corners = stats.home_corners > 3.5;
    results.homeOver45Corners = stats.home_corners > 4.5;
    results.homeOver55Corners = stats.home_corners > 5.5;
    results.homeUnder45Corners = stats.home_corners < 4.5;
    results.homeUnder55Corners = stats.home_corners < 5.5;
    
    // Away team corners
    results.awayOver35Corners = stats.away_corners > 3.5;
    results.awayOver45Corners = stats.away_corners > 4.5;
    results.awayOver55Corners = stats.away_corners > 5.5;
    results.awayUnder45Corners = stats.away_corners < 4.5;
    results.awayUnder55Corners = stats.away_corners < 5.5;
    
    // Match total corners
    const totalCorners = stats.home_corners + stats.away_corners;
    results.matchOver85Corners = totalCorners > 8.5;
    results.matchOver95Corners = totalCorners > 9.5;
    results.matchOver105Corners = totalCorners > 10.5;
    results.matchOver115Corners = totalCorners > 11.5;
  }
  
  // Cards markets
  if (stats.home_cards !== null && stats.away_cards !== null) {
    results.homeOver05Cards = stats.home_cards > 0.5;
    results.homeOver15Cards = stats.home_cards > 1.5;
    results.homeOver25Cards = stats.home_cards > 2.5;
    results.homeOver35Cards = stats.home_cards > 3.5;
    
    results.awayOver05Cards = stats.away_cards > 0.5;
    results.awayOver15Cards = stats.away_cards > 1.5;
    results.awayOver25Cards = stats.away_cards > 2.5;
    results.awayOver35Cards = stats.away_cards > 3.5;
    
    const totalCards = stats.home_cards + stats.away_cards;
    results.matchOver25Cards = totalCards > 2.5;
    results.matchOver35Cards = totalCards > 3.5;
    results.matchOver45Cards = totalCards > 4.5;
  }
  
  // Goals markets
  if (stats.home_score !== null && stats.away_score !== null) {
    const totalGoals = stats.home_score + stats.away_score;
    results.over05Goals = totalGoals > 0.5;
    results.over15Goals = totalGoals > 1.5;
    results.over25Goals = totalGoals > 2.5;
    results.over35Goals = totalGoals > 3.5;
    results.over45Goals = totalGoals > 4.5;
    
    results.under15Goals = totalGoals < 1.5;
    results.under25Goals = totalGoals < 2.5;
    results.under35Goals = totalGoals < 3.5;
    
    // BTTS
    results.btts = stats.home_score > 0 && stats.away_score > 0;
    results.bttsNo = !(stats.home_score > 0 && stats.away_score > 0);
  }
  
  // Shots on target markets
  if (stats.home_shots_on_target !== null && stats.away_shots_on_target !== null) {
    results.homeOver25ShotsOnTarget = stats.home_shots_on_target > 2.5;
    results.homeOver35ShotsOnTarget = stats.home_shots_on_target > 3.5;
    results.homeOver45ShotsOnTarget = stats.home_shots_on_target > 4.5;
    
    results.awayOver25ShotsOnTarget = stats.away_shots_on_target > 2.5;
    results.awayOver35ShotsOnTarget = stats.away_shots_on_target > 3.5;
    results.awayOver45ShotsOnTarget = stats.away_shots_on_target > 4.5;
  }
  
  return results;
}

/**
 * Extract statistics from event data
 */
function extractStats(event) {
  const stats = {
    home_score: null,
    away_score: null,
    home_corners: null,
    away_corners: null,
    total_corners: null,
    home_cards: null,
    away_cards: null,
    total_cards: null,
    home_yellow_cards: null,
    away_yellow_cards: null,
    home_red_cards: null,
    away_red_cards: null,
    home_fouls: null,
    away_fouls: null,
    total_fouls: null,
    home_shots: null,
    away_shots: null,
    home_shots_on_target: null,
    away_shots_on_target: null,
    btts: null,
    total_goals: null
  };
  
  // Extract scores
  if (event.scores) {
    stats.home_score = event.scores.home || 0;
    stats.away_score = event.scores.away || 0;
    stats.total_goals = stats.home_score + stats.away_score;
    stats.btts = stats.home_score > 0 && stats.away_score > 0;
  }
  
  // Extract statistics from the event
  if (event.statistics) {
    const homeStats = event.statistics.home || {};
    const awayStats = event.statistics.away || {};
    
    stats.home_corners = homeStats.corners || null;
    stats.away_corners = awayStats.corners || null;
    if (stats.home_corners !== null && stats.away_corners !== null) {
      stats.total_corners = stats.home_corners + stats.away_corners;
    }
    
    stats.home_yellow_cards = homeStats.yellow_cards || null;
    stats.away_yellow_cards = awayStats.yellow_cards || null;
    stats.home_red_cards = homeStats.red_cards || null;
    stats.away_red_cards = awayStats.red_cards || null;
    
    if (stats.home_yellow_cards !== null && stats.home_red_cards !== null) {
      stats.home_cards = stats.home_yellow_cards + stats.home_red_cards;
    }
    if (stats.away_yellow_cards !== null && stats.away_red_cards !== null) {
      stats.away_cards = stats.away_yellow_cards + stats.away_red_cards;
    }
    if (stats.home_cards !== null && stats.away_cards !== null) {
      stats.total_cards = stats.home_cards + stats.away_cards;
    }
    
    stats.home_fouls = homeStats.fouls || null;
    stats.away_fouls = awayStats.fouls || null;
    if (stats.home_fouls !== null && stats.away_fouls !== null) {
      stats.total_fouls = stats.home_fouls + stats.away_fouls;
    }
    
    stats.home_shots = homeStats.shots || null;
    stats.away_shots = awayStats.shots || null;
    stats.home_shots_on_target = homeStats.shots_on_target || null;
    stats.away_shots_on_target = awayStats.shots_on_target || null;
  }
  
  return stats;
}

// =====================================================
// MAIN SYNC LOGIC
// =====================================================

/**
 * Fetch results for completed matches
 */
async function syncResults() {
  console.log('🔄 Fetching completed matches needing results...');
  
  // Get matches that have passed but don't have results yet
  const { data: matchesNeedingResults, error: fetchError } = await supabase
    .from('prematch_odds')
    .select('event_id, home_team, away_team, kickoff_time, league')
    .lt('kickoff_time', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // At least 2 hours ago
    .eq('match_completed', false)
    .order('kickoff_time', { ascending: false })
    .limit(50); // Process max 50 at a time
  
  if (fetchError) {
    console.error('❌ Error fetching matches:', fetchError);
    throw fetchError;
  }
  
  if (!matchesNeedingResults || matchesNeedingResults.length === 0) {
    console.log('✅ No matches need results fetching');
    return { synced: 0 };
  }
  
  console.log(`   Found ${matchesNeedingResults.length} matches to update`);
  
  const results = [];
  let successCount = 0;
  let errorCount = 0;
  
  for (const match of matchesNeedingResults) {
    console.log(`\n   Processing: ${match.home_team} vs ${match.away_team}`);
    
    try {
      // Fetch event details with stats
      const path = `/v2/events/${match.event_id}?includeStats=true`;
      const event = await makeRequest(path);
      
      await logApiUsage(path, match.event_id, 200, 'results', match.league, false);
      
      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!event || !event.completed) {
        console.log(`   ⏳ Match not completed yet, skipping...`);
        continue;
      }
      
      // Extract statistics
      const stats = extractStats(event);
      
      // Calculate market results
      const marketResults = calculateMarketResults(stats);
      
      // Prepare outcome record
      const outcome = {
        event_id: match.event_id,
        home_team: match.home_team,
        away_team: match.away_team,
        match_date: match.kickoff_time,
        
        home_score: stats.home_score,
        away_score: stats.away_score,
        
        home_corners: stats.home_corners,
        away_corners: stats.away_corners,
        total_corners: stats.total_corners,
        
        home_cards: stats.home_cards,
        away_cards: stats.away_cards,
        total_cards: stats.total_cards,
        
        home_yellow_cards: stats.home_yellow_cards,
        away_yellow_cards: stats.away_yellow_cards,
        home_red_cards: stats.home_red_cards,
        away_red_cards: stats.away_red_cards,
        
        home_fouls: stats.home_fouls,
        away_fouls: stats.away_fouls,
        total_fouls: stats.total_fouls,
        
        home_shots: stats.home_shots,
        away_shots: stats.away_shots,
        home_shots_on_target: stats.home_shots_on_target,
        away_shots_on_target: stats.away_shots_on_target,
        
        btts: stats.btts,
        total_goals: stats.total_goals,
        
        market_results: marketResults,
        raw_data: event,
        
        fetched_at: new Date().toISOString()
      };
      
      // Insert outcome
      const { error: insertError } = await supabase
        .from('match_outcomes')
        .upsert(outcome, {
          onConflict: 'event_id',
          ignoreDuplicates: false
        });
      
      if (insertError) {
        console.error(`   ❌ Error inserting outcome:`, insertError);
        errorCount++;
        continue;
      }
      
      // Mark match as completed in prematch_odds
      const { error: updateError } = await supabase
        .from('prematch_odds')
        .update({ match_completed: true, updated_at: new Date().toISOString() })
        .eq('event_id', match.event_id);
      
      if (updateError) {
        console.error(`   ⚠️  Error marking match as completed:`, updateError);
      }
      
      console.log(`   ✅ Synced: ${stats.home_score}-${stats.away_score} | Corners: ${stats.total_corners} | Cards: ${stats.total_cards}`);
      successCount++;
      
    } catch (error) {
      console.error(`   ❌ Error processing match:`, error.message);
      await logApiUsage(`/v2/events/${match.event_id}`, match.event_id, 500, 'results', match.league, false, error.message);
      errorCount++;
    }
  }
  
  return {
    synced: successCount,
    errors: errorCount,
    total: matchesNeedingResults.length
  };
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Match Results Sync');
  console.log(`   Timestamp: ${new Date().toISOString()}`);
  console.log('━'.repeat(60));
  
  const result = await syncResults();
  
  console.log('\n' + '━'.repeat(60));
  console.log('📊 RESULTS SYNC SUMMARY');
  console.log('━'.repeat(60));
  console.log(`✅ Successfully synced: ${result.synced} matches`);
  console.log(`❌ Errors: ${result.errors} matches`);
  console.log(`📋 Total processed: ${result.total} matches`);
  console.log('━'.repeat(60));
  
  // Check today's API usage
  const { data: todayUsage } = await supabase
    .from('api_usage_log')
    .select('*', { count: 'exact' })
    .gte('timestamp', new Date().toISOString().split('T')[0])
    .eq('cached', false);
  
  console.log(`\n📈 API Usage Today: ${todayUsage?.length || 0} requests`);
  
  if (result.errors > 0) {
    process.exit(1);
  }
}

// Run
main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
