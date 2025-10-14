import pandas as pd
import numpy as np
import os
from supabase import create_client, Client
from dotenv import load_dotenv
import logging
import sys

logging.basicConfig(
    level=logging.INFO, 
    format='[%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('data_validation_report.txt', mode='w')
    ]
)
logger = logging.getLogger(__name__)

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("Environment variables not set")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def print_section(title):
    """Print formatted section header."""
    logger.info("\n" + "=" * 80)
    logger.info(f"  {title}")
    logger.info("=" * 80)

def fetch_with_pagination(table_name, select_columns="*", order_by="match_datetime"):
    """Fetch all data from a table with pagination."""
    logger.info(f"\nFetching data from {table_name}...")
    all_data = []
    offset = 0
    limit = 1000
    
    # Use appropriate order_by column for different tables
    # Team stats tables use 'match_date', player stats use 'match_datetime'
    if table_name in ['team_shooting_stats', 'team_defense_stats']:
        order_by = 'match_date'
    
    while True:
        response = supabase.from_(table_name).select(select_columns).order(order_by, desc=False).range(offset, offset + limit - 1).execute()
        
        if not response.data:
            break
            
        all_data.extend(response.data)
        
        if len(response.data) < limit:
            break
            
        offset += limit
    
    df = pd.DataFrame(all_data)
    logger.info(f"  Fetched {len(df)} rows")
    return df

def validate_player_match_stats():
    """Validate player_match_stats table - the primary data source."""
    print_section("1. PLAYER MATCH STATS VALIDATION")
    
    df = fetch_with_pagination("player_match_stats", 
                                "player_id, player_name, team_name, summary_sot, summary_min, home_team, away_team, team_side, match_datetime")
    
    if df.empty:
        logger.error("❌ No data found in player_match_stats table!")
        return None
    
    issues = []
    
    # --- Basic Statistics ---
    logger.info(f"\n📊 Dataset Overview:")
    logger.info(f"  Total records: {len(df)}")
    logger.info(f"  Unique players: {df['player_id'].nunique()}")
    logger.info(f"  Unique teams: {df['team_name'].nunique()}")
    logger.info(f"  Date range: {df['match_datetime'].min()} to {df['match_datetime'].max()}")
    
    # --- Check for Missing Values ---
    logger.info(f"\n🔍 Missing Values Check:")
    missing = df.isnull().sum()
    critical_columns = ['player_id', 'player_name', 'team_name', 'summary_sot', 'summary_min', 'match_datetime']
    
    for col in critical_columns:
        missing_count = missing[col]
        if missing_count > 0:
            pct = (missing_count / len(df)) * 100
            logger.warning(f"  ⚠️ {col}: {missing_count} missing ({pct:.1f}%)")
            issues.append(f"Missing values in {col}: {missing_count} rows")
        else:
            logger.info(f"  ✅ {col}: No missing values")
    
    # --- Validate Minutes (CRITICAL ISSUE FROM LOGS) ---
    logger.info(f"\n⚠️ MINUTES DATA VALIDATION (Critical Issue Detected):")
    
    df['summary_min'] = pd.to_numeric(df['summary_min'], errors='coerce')
    
    # Check for unrealistic values
    max_valid_minutes = 120  # No match goes beyond 120 minutes
    invalid_minutes = df[df['summary_min'] > max_valid_minutes]
    
    if len(invalid_minutes) > 0:
        logger.error(f"  🔴 {len(invalid_minutes)} records with minutes > {max_valid_minutes}")
        logger.error(f"     Examples:")
        for _, row in invalid_minutes.head(5).iterrows():
            logger.error(f"       {row['player_name']}: {row['summary_min']} minutes (should be ≤ 120)")
        issues.append(f"Invalid minutes data: {len(invalid_minutes)} records > {max_valid_minutes}")
        
        # Show distribution of invalid values
        logger.error(f"\n  Invalid Minutes Distribution:")
        logger.error(f"    Min: {invalid_minutes['summary_min'].min()}")
        logger.error(f"    Max: {invalid_minutes['summary_min'].max()}")
        logger.error(f"    Mean: {invalid_minutes['summary_min'].mean():.0f}")
        
        # Save problematic records
        invalid_minutes.to_csv('invalid_minutes_records.csv', index=False)
        logger.error(f"  💾 Saved problematic records to 'invalid_minutes_records.csv'")
    else:
        logger.info(f"  ✅ All minutes values are realistic (≤ {max_valid_minutes})")
    
    # Check for negative or zero minutes
    zero_or_negative = df[df['summary_min'] <= 0]
    if len(zero_or_negative) > 0:
        logger.warning(f"  ⚠️ {len(zero_or_negative)} records with minutes ≤ 0")
        logger.warning(f"     These players didn't play but have match records")
        issues.append(f"Zero/negative minutes: {len(zero_or_negative)} records")
    
    # Minutes distribution
    valid_minutes = df[(df['summary_min'] > 0) & (df['summary_min'] <= max_valid_minutes)]
    logger.info(f"\n  Valid Minutes Statistics:")
    logger.info(f"    Min: {valid_minutes['summary_min'].min():.0f}")
    logger.info(f"    Max: {valid_minutes['summary_min'].max():.0f}")
    logger.info(f"    Mean: {valid_minutes['summary_min'].mean():.1f}")
    logger.info(f"    Median: {valid_minutes['summary_min'].median():.0f}")
    
    # --- Validate SOT (Shots on Target) ---
    logger.info(f"\n⚽ SHOTS ON TARGET VALIDATION:")
    
    df['summary_sot'] = pd.to_numeric(df['summary_sot'], errors='coerce')
    
    # Check for unrealistic values
    max_reasonable_sot = 15  # Very rare for a player to have > 15 SOT in one match
    high_sot = df[df['summary_sot'] > max_reasonable_sot]
    
    if len(high_sot) > 0:
        logger.warning(f"  ⚠️ {len(high_sot)} records with SOT > {max_reasonable_sot} (unusual but possible)")
        for _, row in high_sot.head(3).iterrows():
            logger.warning(f"     {row['player_name']}: {row['summary_sot']} SOT")
    else:
        logger.info(f"  ✅ All SOT values are reasonable (≤ {max_reasonable_sot})")
    
    # Check for negative SOT
    negative_sot = df[df['summary_sot'] < 0]
    if len(negative_sot) > 0:
        logger.error(f"  🔴 {len(negative_sot)} records with negative SOT (impossible!)")
        issues.append(f"Negative SOT: {len(negative_sot)} records")
    
    # SOT distribution
    logger.info(f"\n  SOT Distribution:")
    sot_dist = df['summary_sot'].value_counts().sort_index()
    for sot, count in sot_dist.head(10).items():
        pct = (count / len(df)) * 100
        logger.info(f"    {int(sot)} SOT: {count} records ({pct:.1f}%)")
    
    # --- Check Match Count per Player ---
    logger.info(f"\n👥 PLAYER MATCH COUNT ANALYSIS:")
    
    match_counts = df.groupby('player_id').size()
    logger.info(f"  Match count distribution:")
    logger.info(f"    Min: {match_counts.min()}")
    logger.info(f"    Max: {match_counts.max()}")
    logger.info(f"    Mean: {match_counts.mean():.1f}")
    logger.info(f"    Median: {match_counts.median():.0f}")
    
    # Players with < 3 matches (won't qualify for predictions)
    low_match_players = match_counts[match_counts < 3]
    logger.info(f"\n  Players with < 3 matches: {len(low_match_players)} ({len(low_match_players)/len(match_counts)*100:.1f}%)")
    logger.info(f"  Players with ≥ 3 matches: {len(match_counts[match_counts >= 3])} ({len(match_counts[match_counts >= 3])/len(match_counts)*100:.1f}%)")
    logger.info(f"  Players with ≥ 5 matches: {len(match_counts[match_counts >= 5])} ({len(match_counts[match_counts >= 5])/len(match_counts)*100:.1f}%)")
    
    # --- Check for Duplicate Records ---
    logger.info(f"\n🔁 DUPLICATE RECORDS CHECK:")
    
    duplicates = df[df.duplicated(subset=['player_id', 'match_datetime'], keep=False)]
    if len(duplicates) > 0:
        logger.error(f"  🔴 {len(duplicates)} duplicate player-match records found!")
        logger.error(f"     Same player appearing multiple times in the same match")
        issues.append(f"Duplicate records: {len(duplicates)} rows")
        
        # Show examples
        sample_dup = duplicates.groupby(['player_id', 'match_datetime']).size().reset_index(name='count')
        sample_dup = sample_dup[sample_dup['count'] > 1].head(3)
        for _, row in sample_dup.iterrows():
            player_name = df[df['player_id'] == row['player_id']]['player_name'].iloc[0]
            logger.error(f"       {player_name} on {row['match_datetime']}: {row['count']} records")
    else:
        logger.info(f"  ✅ No duplicate records found")
    
    # --- Check Team Consistency ---
    logger.info(f"\n🏟️ TEAM CONSISTENCY CHECK:")
    
    # Check if players have changed teams
    player_teams = df.groupby('player_id')['team_name'].nunique()
    transferred_players = player_teams[player_teams > 1]
    
    if len(transferred_players) > 0:
        logger.info(f"  ℹ️ {len(transferred_players)} players have played for multiple teams (transfers)")
        # Show a few examples
        for player_id in transferred_players.head(3).index:
            player_name = df[df['player_id'] == player_id]['player_name'].iloc[0]
            teams = df[df['player_id'] == player_id]['team_name'].unique()
            logger.info(f"     {player_name}: {', '.join(teams)}")
    else:
        logger.info(f"  ✅ No player transfers detected")
    
    # --- Validate Home/Away Logic ---
    logger.info(f"\n🏠 HOME/AWAY LOGIC VALIDATION:")
    
    # Check if team_side matches home_team/away_team
    home_logic = df[df['team_side'] == 'home']
    home_mismatch = home_logic[home_logic['team_name'] != home_logic['home_team']]
    
    away_logic = df[df['team_side'] == 'away']
    away_mismatch = away_logic[away_logic['team_name'] != away_logic['away_team']]
    
    total_mismatches = len(home_mismatch) + len(away_mismatch)
    
    if total_mismatches > 0:
        logger.error(f"  🔴 {total_mismatches} records with incorrect home/away logic")
        issues.append(f"Home/away logic errors: {total_mismatches} records")
    else:
        logger.info(f"  ✅ All home/away logic is consistent")
    
    return df, issues

def validate_team_defense_stats():
    """Validate team defense stats tables."""
    print_section("2. TEAM DEFENSE STATS VALIDATION")
    
    # Fetch both tables
    df_shooting = fetch_with_pagination("team_shooting_stats", "match_date, team_name, opp_shots_on_target")
    df_defense = fetch_with_pagination("team_defense_stats", "match_date, team_name, team_tackles_att_3rd")
    
    if df_shooting.empty or df_defense.empty:
        logger.error("❌ Missing team defense data!")
        return None, None, []
    
    issues = []
    
    # --- Check Coverage ---
    logger.info(f"\n📊 Team Defense Data Coverage:")
    logger.info(f"  Shooting stats records: {len(df_shooting)}")
    logger.info(f"  Defense stats records: {len(df_defense)}")
    logger.info(f"  Unique teams (shooting): {df_shooting['team_name'].nunique()}")
    logger.info(f"  Unique teams (defense): {df_defense['team_name'].nunique()}")
    
    # --- Merge Check ---
    logger.info(f"\n🔗 MERGE COMPATIBILITY:")
    
    merged = pd.merge(df_shooting, df_defense, on=['match_date', 'team_name'], how='inner')
    logger.info(f"  Successfully merged: {len(merged)} records")
    
    if len(merged) < len(df_shooting):
        missing = len(df_shooting) - len(merged)
        logger.warning(f"  ⚠️ {missing} shooting records have no matching defense record")
        issues.append(f"Unmatched shooting records: {missing}")
    
    if len(merged) < len(df_defense):
        missing = len(df_defense) - len(merged)
        logger.warning(f"  ⚠️ {missing} defense records have no matching shooting record")
        issues.append(f"Unmatched defense records: {missing}")
    
    # --- Validate SOT Conceded ---
    logger.info(f"\n⚽ SOT CONCEDED VALIDATION:")
    
    df_shooting['opp_shots_on_target'] = pd.to_numeric(df_shooting['opp_shots_on_target'], errors='coerce')
    
    logger.info(f"  Distribution:")
    logger.info(f"    Min: {df_shooting['opp_shots_on_target'].min():.0f}")
    logger.info(f"    Max: {df_shooting['opp_shots_on_target'].max():.0f}")
    logger.info(f"    Mean: {df_shooting['opp_shots_on_target'].mean():.1f}")
    logger.info(f"    Median: {df_shooting['opp_shots_on_target'].median():.0f}")
    
    # Check for unrealistic values
    high_sot_conceded = df_shooting[df_shooting['opp_shots_on_target'] > 15]
    if len(high_sot_conceded) > 0:
        logger.warning(f"  ⚠️ {len(high_sot_conceded)} teams conceded > 15 SOT (unusual but possible)")
    
    # --- Validate Tackles ---
    logger.info(f"\n🦵 TACKLES IN ATTACKING THIRD VALIDATION:")
    
    df_defense['team_tackles_att_3rd'] = pd.to_numeric(df_defense['team_tackles_att_3rd'], errors='coerce')
    
    logger.info(f"  Distribution:")
    logger.info(f"    Min: {df_defense['team_tackles_att_3rd'].min():.0f}")
    logger.info(f"    Max: {df_defense['team_tackles_att_3rd'].max():.0f}")
    logger.info(f"    Mean: {df_defense['team_tackles_att_3rd'].mean():.1f}")
    logger.info(f"    Median: {df_defense['team_tackles_att_3rd'].median():.0f}")
    
    return df_shooting, df_defense, issues

def validate_fixtures():
    """Validate fixtures table."""
    print_section("3. FIXTURES TABLE VALIDATION")
    
    df = fetch_with_pagination("fixtures", "datetime, hometeam, awayteam, matchweek, status", "datetime")
    
    if df.empty:
        logger.error("❌ No fixtures data found!")
        return None, []
    
    issues = []
    
    # --- Basic Stats ---
    logger.info(f"\n📊 Fixtures Overview:")
    logger.info(f"  Total fixtures: {len(df)}")
    logger.info(f"  Unique matchweeks: {df['matchweek'].nunique()}")
    
    # --- Status Distribution ---
    logger.info(f"\n📅 Fixture Status Distribution:")
    status_counts = df['status'].value_counts()
    for status, count in status_counts.items():
        logger.info(f"  {status}: {count} fixtures")
    
    # --- Check for Future Fixtures ---
    df['datetime'] = pd.to_datetime(df['datetime'], utc=True)
    now = pd.Timestamp.now(tz='UTC')
    
    future = df[df['datetime'] > now]
    past = df[df['datetime'] <= now]
    
    logger.info(f"\n🔮 Time-based Analysis:")
    logger.info(f"  Past fixtures (datetime ≤ now): {len(past)}")
    logger.info(f"  Future fixtures (datetime > now): {len(future)}")
    
    # Cross-check with status
    if 'status' in df.columns:
        finished_future = future[future['status'].str.lower() == 'finished']
        scheduled_past = past[past['status'].str.lower() == 'scheduled']
        
        if len(finished_future) > 0:
            logger.error(f"  🔴 {len(finished_future)} future fixtures marked as 'finished'")
            issues.append(f"Future fixtures marked finished: {len(finished_future)}")
        
        if len(scheduled_past) > 0:
            logger.warning(f"  ⚠️ {len(scheduled_past)} past fixtures still marked as 'scheduled'")
            issues.append(f"Past fixtures marked scheduled: {len(scheduled_past)}")
    
    return df, issues

def cross_validate_data():
    """Cross-validate relationships between tables."""
    print_section("4. CROSS-TABLE VALIDATION")
    
    logger.info("\n🔗 Checking data consistency across tables...")
    
    # Re-fetch minimal data needed for cross-validation
    df_player = fetch_with_pagination("player_match_stats", "team_name, home_team, away_team, match_datetime")
    df_fixtures = fetch_with_pagination("fixtures", "datetime, hometeam, awayteam", "datetime")
    
    if df_player.empty or df_fixtures.empty:
        logger.error("❌ Cannot perform cross-validation - missing data")
        return []
    
    issues = []
    
    # Convert datetimes
    df_player['match_datetime'] = pd.to_datetime(df_player['match_datetime'], utc=True)
    df_player['match_date'] = df_player['match_datetime'].dt.date
    
    df_fixtures['datetime'] = pd.to_datetime(df_fixtures['datetime'], utc=True)
    df_fixtures['match_date'] = df_fixtures['datetime'].dt.date
    df_fixtures.rename(columns={'hometeam': 'home_team', 'awayteam': 'away_team'}, inplace=True)
    
    # --- Check if all player matches have corresponding fixtures ---
    logger.info(f"\n📋 Player Matches ↔ Fixtures Alignment:")
    
    player_matches = df_player[['match_date', 'home_team', 'away_team']].drop_duplicates()
    
    merged = pd.merge(
        player_matches,
        df_fixtures[['match_date', 'home_team', 'away_team']],
        on=['match_date', 'home_team', 'away_team'],
        how='left',
        indicator=True
    )
    
    orphaned_player_matches = merged[merged['_merge'] == 'left_only']
    
    if len(orphaned_player_matches) > 0:
        logger.warning(f"  ⚠️ {len(orphaned_player_matches)} player matches have no corresponding fixture")
        logger.warning(f"     This could cause issues when joining with fixture metadata")
        issues.append(f"Orphaned player matches: {len(orphaned_player_matches)}")
    else:
        logger.info(f"  ✅ All player matches have corresponding fixtures")
    
    return issues

def generate_summary_report(all_issues):
    """Generate final summary report."""
    print_section("5. VALIDATION SUMMARY")
    
    if not all_issues:
        logger.info("\n✅ ✅ ✅ ALL VALIDATION CHECKS PASSED! ✅ ✅ ✅")
        logger.info("\nYour data is ready for backtest training.")
        return True
    else:
        logger.error(f"\n❌ VALIDATION FAILED: {len(all_issues)} ISSUES FOUND")
        logger.error("\n⚠️ Issues that must be fixed before training:")
        for i, issue in enumerate(all_issues, 1):
            logger.error(f"  {i}. {issue}")
        
        logger.error("\n📋 Recommended Actions:")
        logger.error("  1. Review 'data_validation_report.txt' for full details")
        logger.error("  2. Check 'invalid_minutes_records.csv' if generated")
        logger.error("  3. Fix data issues in Supabase tables")
        logger.error("  4. Re-run this validation script")
        logger.error("  5. Only proceed to backtest training after all issues are resolved")
        
        return False

def main():
    logger.info("=" * 80)
    logger.info("  DATA VALIDATION & QUALITY CHECK")
    logger.info("  For: Player Expected SOT Model Backtest Training")
    logger.info("=" * 80)
    
    all_issues = []
    
    # 1. Validate player stats
    df_player, player_issues = validate_player_match_stats()
    if player_issues:
        all_issues.extend(player_issues)
    
    # 2. Validate team defense stats
    df_shooting, df_defense, defense_issues = validate_team_defense_stats()
    if defense_issues:
        all_issues.extend(defense_issues)
    
    # 3. Validate fixtures
    df_fixtures, fixture_issues = validate_fixtures()
    if fixture_issues:
        all_issues.extend(fixture_issues)
    
    # 4. Cross-validate
    cross_issues = cross_validate_data()
    if cross_issues:
        all_issues.extend(cross_issues)
    
    # 5. Generate summary
    validation_passed = generate_summary_report(all_issues)
    
    logger.info("\n" + "=" * 80)
    logger.info("  VALIDATION COMPLETE")
    logger.info("=" * 80)
    logger.info("\n📁 Full report saved to: data_validation_report.txt")
    
    # Exit with appropriate code
    if validation_passed:
        logger.info("\n✅ Proceed to backtest training")
        sys.exit(0)
    else:
        logger.error("\n❌ Fix issues before proceeding to backtest training")
        sys.exit(1)

if __name__ == "__main__":
    main()