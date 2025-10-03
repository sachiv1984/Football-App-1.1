// scripts/check-usage.js
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkUsage() {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  console.log('📊 API Usage Report');
  console.log('═'.repeat(60));
  console.log(`Generated: ${now.toISOString()}`);
  console.log('═'.repeat(60));

  // Today's usage
  const { data: todayData } = await supabase
    .from('api_usage_log')
    .select('*')
    .gte('timestamp', today)
    .eq('cached', false);

  const todayCount = todayData?.length || 0;
  console.log(`\n📅 TODAY (${today})`);
  console.log(`   Requests: ${todayCount}/83 (${((todayCount/83)*100).toFixed(1)}%)`);
  console.log(`   Remaining: ${83 - todayCount}`);
  
  // Breakdown by type
  const fixtureRequests = todayData?.filter(r => r.request_type === 'fixtures').length || 0;
  const resultRequests = todayData?.filter(r => r.request_type === 'results').length || 0;
  console.log(`   - Fixtures: ${fixtureRequests}`);
  console.log(`   - Results: ${resultRequests}`);

  // This week's usage
  const { data: weekData } = await supabase
    .from('api_usage_log')
    .select('*')
    .gte('timestamp', weekAgo)
    .eq('cached', false);

  const weekCount = weekData?.length || 0;
  console.log(`\n📆 THIS WEEK`);
  console.log(`   Requests: ${weekCount}`);
  console.log(`   Daily average: ${(weekCount / 7).toFixed(1)}`);

  // This month's usage
  const { data: monthData } = await supabase
    .from('api_usage_log')
    .select('*')
    .gte('timestamp', monthStart)
    .eq('cached', false);

  const monthCount = monthData?.length || 0;
  const daysInMonth = now.getDate();
  const projectedMonth = Math.round((monthCount / daysInMonth) * 30);
  
  console.log(`\n📊 THIS MONTH`);
  console.log(`   Requests: ${monthCount}/2,500 (${((monthCount/2500)*100).toFixed(1)}%)`);
  console.log(`   Remaining: ${2500 - monthCount}`);
  console.log(`   Days elapsed: ${daysInMonth}`);
  console.log(`   Projected total: ${projectedMonth} (${((projectedMonth/2500)*100).toFixed(1)}%)`);

  // Daily breakdown (last 7 days)
  console.log(`\n📈 DAILY BREAKDOWN (Last 7 Days)`);
  console.log('   Date          | Fixtures | Results | Total');
  console.log('   ' + '─'.repeat(50));

  const { data: dailyStats } = await supabase
    .from('daily_api_usage')
    .select('*')
    .order('date', { ascending: false })
    .limit(7);

  if (dailyStats) {
    dailyStats.forEach(day => {
      const date = new Date(day.date).toISOString().split('T')[0];
      console.log(`   ${date} |    ${String(day.fixture_requests || 0).padStart(2)}    |    ${String(day.result_requests || 0).padStart(2)}   |  ${day.api_calls || 0}`);
    });
  }

  // League breakdown
  console.log(`\n🏆 LEAGUE BREAKDOWN (This Month)`);
  const { data: leagueStats } = await supabase
    .from('api_usage_log')
    .select('league')
    .gte('timestamp', monthStart)
    .eq('cached', false);

  if (leagueStats) {
    const leagueCounts = {};
    leagueStats.forEach(log => {
      const league = log.league || 'Unknown';
      leagueCounts[league] = (leagueCounts[league] || 0) + 1;
    });

    Object.entries(leagueCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([league, count]) => {
        console.log(`   ${league.padEnd(25)} : ${count} requests`);
      });
  }

  // Status indicator
  console.log('\n' + '═'.repeat(60));
  if (todayCount >= 75) {
    console.log('⚠️  WARNING: Approaching daily limit!');
  } else if (monthCount >= 2000) {
    console.log('⚠️  WARNING: Approaching monthly limit!');
  } else {
    console.log('✅ STATUS: Healthy - Usage well within limits');
  }

  if (projectedMonth >= 2000) {
    console.log('⚠️  PROJECTION: May exceed monthly limit at current rate');
  }

  console.log('═'.repeat(60));

  // Return today's count for GitHub Actions
  if (process.env.GITHUB_ACTIONS) {
    console.log(todayCount);
  }
}

checkUsage().catch(error => {
  console.error('Error checking usage:', error);
  process.exit(1);
});
