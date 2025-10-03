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
