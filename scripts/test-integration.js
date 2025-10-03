// scripts/test-integration.js
// Test script to verify the entire odds integration system

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runTests() {
  console.log('🧪 Testing Pre-Match Odds Integration System');
  console.log('═'.repeat(60));
  
  let passedTests = 0;
  let failedTests = 0;

  // Test 1: Database connection
  console.log('\n[Test 1] Database Connection...');
  try {
    const { data, error } = await supabase
      .from('prematch_odds')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    console.log('   ✅ PASSED - Connected to Supabase');
    passedTests++;
  } catch (error) {
    console.log('   ❌ FAILED - Database connection error:', error.message);
    failedTests++;
  }

  // Test 2: Check prematch_odds table structure
  console.log('\n[Test 2] Prematch Odds Table Structure...');
  try {
    const { data, error } = await supabase
      .from('prematch_odds')
      .select('*')
      .limit(1);
    
    if (error) throw error;
    
    const requiredColumns = ['event_id', 'home_team', 'away_team', 'kickoff_time', 
                             'corners_odds', 'cards_odds', 'btts_odds'];
    const hasAllColumns = requiredColumns.every(col => 
      data.length === 0 || col in (data[0] || {})
    );
    
    if (hasAllColumns) {
      console.log('   ✅ PASSED - All required columns exist');
      passedTests++;
    } else {
      console.log('   ❌ FAILED - Missing required columns');
      failedTests++;
    }
  } catch (error) {
    console.log('   ❌ FAILED - Table structure error:', error.message);
    failedTests++;
  }

  // Test 3: Check match_outcomes table
  console.log('\n[Test 3] Match Outcomes Table...');
  try {
    const { data, error } = await supabase
      .from('match_outcomes')
      .select('*')
      .limit(1);
    
    if (error) throw error;
    console.log('   ✅ PASSED - Match outcomes table accessible');
    passedTests++;
  } catch (error) {
    console.log('   ❌ FAILED - Match outcomes error:', error.message);
    failedTests++;
  }

  // Test 4: Check api_usage_log table
  console.log('\n[Test 4] API Usage Log Table...');
  try {
    const { data, error } = await supabase
      .from('api_usage_log')
      .select('*')
      .limit(1);
    
    if (error) throw error;
    console.log('   ✅ PASSED - API usage log accessible');
    passedTests++;
  } catch (error) {
    console.log('   ❌ FAILED - API usage log error:', error.message);
    failedTests++;
  }

  // Test 5: Check for data
  console.log('\n[Test 5] Data Availability...');
  try {
    const { data: upcomingMatches, error: oddsError } = await supabase
      .from('prematch_odds')
      .select('*')
      .gte('kickoff_time', new Date().toISOString())
      .order('kickoff_time', { ascending: true })
      .limit(5);
    
    if (oddsError) throw oddsError;
    
    console.log(`   ℹ️  Upcoming matches with odds: ${upcomingMatches?.length || 0}`);
    
    if (upcomingMatches && upcomingMatches.length > 0) {
      console.log('   ✅ PASSED - Found upcoming matches');
      passedTests++;
      
      // Show sample
      console.log('\n   Sample matches:');
      upcomingMatches.slice(0, 3).forEach(match => {
        const kickoff = new Date(match.kickoff_time);
        console.log(`   - ${match.home_team} vs ${match.away_team}`);
        console.log(`     Kickoff: ${kickoff.toLocaleString()}`);
        console.log(`     Has corners odds: ${match.corners_odds ? '✓' : '✗'}`);
        console.log(`     Has cards odds: ${match.cards_odds ? '✓' : '✗'}`);
        console.log(`     Has BTTS odds: ${match.btts_odds ? '✓' : '✗'}`);
      });
    } else {
      console.log('   ⚠️  WARNING - No upcoming matches found (run sync-prematch-odds.js)');
      failedTests++;
    }
  } catch (error) {
    console.log('   ❌ FAILED - Data availability error:', error.message);
    failedTests++;
  }

  // Test 6: Check for historical results
  console.log('\n[Test 6] Historical Results...');
  try {
    const { data: results, error } = await supabase
      .from('match_outcomes')
      .select('*')
      .order('match_date', { ascending: false })
      .limit(5);
    
    if (error) throw error;
    
    console.log(`   ℹ️  Historical results: ${results?.length || 0}`);
    
    if (results && results.length > 0) {
      console.log('   ✅ PASSED - Found historical results');
      passedTests++;
      
      console.log('\n   Sample results:');
      results.slice(0, 3).forEach(result => {
        console.log(`   - ${result.home_team} ${result.home_score}-${result.away_score} ${result.away_team}`);
        console.log(`     Corners: ${result.total_corners || 'N/A'} | Cards: ${result.total_cards || 'N/A'} | BTTS: ${result.btts ? 'Yes' : 'No'}`);
      });
    } else {
      console.log('   ⚠️  WARNING - No historical results (run sync-results.js after matches)');
      failedTests++;
    }
  } catch (error) {
    console.log('   ❌ FAILED - Historical results error:', error.message);
    failedTests++;
  }

  // Test 7: Check views
  console.log('\n[Test 7] Database Views...');
  try {
    const { data: upcomingView, error: viewError } = await supabase
      .from('upcoming_matches_with_odds')
      .select('*')
      .limit(1);
    
    if (viewError) throw viewError;
    console.log('   ✅ PASSED - Views are accessible');
    passedTests++;
  } catch (error) {
    console.log('   ❌ FAILED - Views error:', error.message);
    failedTests++;
  }

  // Test 8: API usage tracking
  console.log('\n[Test 8] API Usage Tracking...');
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data: todayUsage, error } = await supabase
      .from('api_usage_log')
      .select('*')
      .gte('timestamp', today);
    
    if (error) throw error;
    
    const totalToday = todayUsage?.length || 0;
    const apiCallsToday = todayUsage?.filter(u => !u.cached).length || 0;
    
    console.log(`   ℹ️  Today's requests: ${apiCallsToday}/83`);
    console.log(`   ℹ️  Cache hits: ${totalToday - apiCallsToday}`);
    
    console.log('   ✅ PASSED - Usage tracking working');
    passedTests++;
  } catch (error) {
    console.log('   ❌ FAILED - Usage tracking error:', error.message);
    failedTests++;
  }

  // Test 9: Odds data structure validation
  console.log('\n[Test 9] Odds Data Structure...');
  try {
    const { data: matchWithOdds, error } = await supabase
      .from('prematch_odds')
      .select('corners_odds, cards_odds, btts_odds')
      .not('corners_odds', 'is', null)
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    if (matchWithOdds && matchWithOdds.corners_odds) {
      const hasBookmakers = matchWithOdds.corners_odds.bet365 || 
                           matchWithOdds.corners_odds.pinnacle || 
                           matchWithOdds.corners_odds.williamhill;
      const hasBestOdds = matchWithOdds.corners_odds.bestOdds;
      
      if (hasBookmakers && hasBestOdds) {
        console.log('   ✅ PASSED - Odds structure is correct');
        console.log('   ℹ️  Sample structure:');
        console.log(`      Bookmakers available: ${Object.keys(matchWithOdds.corners_odds).filter(k => k !== 'bestOdds').length}`);
        console.log(`      Best odds entries: ${Object.keys(matchWithOdds.corners_odds.bestOdds || {}).length}`);
        passedTests++;
      } else {
        console.log('   ⚠️  WARNING - Odds structure incomplete');
        failedTests++;
      }
    } else {
      console.log('   ⚠️  WARNING - No matches with odds found (run sync first)');
      failedTests++;
    }
  } catch (error) {
    console.log('   ❌ FAILED - Odds structure validation error:', error.message);
    failedTests++;
  }

  // Test 10: Integration with betting insights (if available)
  console.log('\n[Test 10] Betting Insights Integration...');
  try {
    // Check if we can query for a value bet scenario
    const { data: matches, error } = await supabase
      .from('prematch_odds')
      .select('*')
      .gte('kickoff_time', new Date().toISOString())
      .not('corners_odds', 'is', null)
      .limit(1);
    
    if (error) throw error;
    
    if (matches && matches.length > 0) {
      const match = matches[0];
      console.log(`   ℹ️  Testing with: ${match.home_team} vs ${match.away_team}`);
      
      // Check if odds can be extracted
      const cornersOdds = match.corners_odds;
      const hasExtractableOdds = cornersOdds?.bestOdds?.homeOver45 || 
                                 cornersOdds?.bet365?.homeOver45 ||
                                 cornersOdds?.pinnacle?.homeOver45;
      
      if (hasExtractableOdds) {
        console.log('   ✅ PASSED - Odds are extractable for value calculation');
        passedTests++;
      } else {
        console.log('   ⚠️  WARNING - Odds format may need adjustment');
        failedTests++;
      }
    } else {
      console.log('   ⚠️  WARNING - No matches available for testing');
      failedTests++;
    }
  } catch (error) {
    console.log('   ❌ FAILED - Integration test error:', error.message);
    failedTests++;
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(60));
  console.log(`✅ Passed: ${passedTests}/10`);
  console.log(`❌ Failed: ${failedTests}/10`);
  
  if (failedTests === 0) {
    console.log('\n🎉 All tests passed! System is ready to use.');
  } else if (passedTests >= 7) {
    console.log('\n⚠️  Most tests passed. Review warnings above.');
  } else {
    console.log('\n❌ Several tests failed. Please review errors above.');
  }
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  
  if (failedTests > 0) {
    const { data: oddsCount } = await supabase
      .from('prematch_odds')
      .select('*', { count: 'exact', head: true });
    
    const { data: resultsCount } = await supabase
      .from('match_outcomes')
      .select('*', { count: 'exact', head: true });
    
    if (!oddsCount || oddsCount === 0) {
      console.log('   1. Run: node scripts/sync-prematch-odds.js');
    }
    
    if (!resultsCount || resultsCount === 0) {
      console.log('   2. Wait for matches to complete, then run: node scripts/sync-results.js');
    }
    
    console.log('   3. Check GitHub secrets are correctly set');
    console.log('   4. Verify Supabase RLS policies allow service role access');
  } else {
    console.log('   ✓ System is fully operational');
    console.log('   ✓ Ready to integrate with betting insights service');
    console.log('   ✓ GitHub Actions can be enabled');
  }
  
  console.log('\n' + '═'.repeat(60));
  
  process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
if (require.main === module) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables must be set');
    console.error('\nUsage:');
    console.error('  export SUPABASE_URL="your_url"');
    console.error('  export SUPABASE_SERVICE_KEY="your_key"');
    console.error('  node scripts/test-integration.js');
    process.exit(1);
  }
  
  runTests().catch(error => {
    console.error('\n💥 Fatal error during tests:', error);
    process.exit(1);
  });
}

module.exports = { runTests };
