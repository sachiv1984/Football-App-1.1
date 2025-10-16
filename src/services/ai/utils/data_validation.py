import pandas as pd
import numpy as np
import os
from supabase import create_client, Client
from dotenv import load_dotenv
import logging
import sys

# ✅ Ensure project root is on Python path (fix for GitHub runner)
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../..")))

from src.services.ai.utils.supabase_utils import fetch_with_deduplication


# ---------------------------------------------------------------
# Logging Configuration
# ---------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format='[%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('data_validation_report.txt', mode='w')
    ]
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------
# Supabase Client Setup
# ---------------------------------------------------------------
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("Environment variables not set")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ---------------------------------------------------------------
# Utility Functions
# ---------------------------------------------------------------
def print_section(title):
    """Print formatted section header."""
    logger.info("\n" + "=" * 80)
    logger.info(f"  {title}")
    logger.info("=" * 80)

# ---------------------------------------------------------------
# 1. Player Match Stats Validation
# ---------------------------------------------------------------
def validate_player_match_stats():
    """Validate player_match_stats table - the primary data source."""
    print_section("1. PLAYER MATCH STATS VALIDATION")

    df = fetch_with_deduplication(
        supabase,
        "player_match_stats",
        "player_id, player_name, team_name, summary_sot, summary_min, home_team, away_team, team_side, match_datetime"
    )

    if df.empty:
        logger.error("❌ No data found in player_match_stats table!")
        return None, []

    issues = []

    # --- Basic Stats ---
    logger.info(f"\n📊 Dataset Overview:")
    logger.info(f"  Total records: {len(df)}")
    logger.info(f"  Unique players: {df['player_id'].nunique()}")
    logger.info(f"  Unique teams: {df['team_name'].nunique()}")
    logger.info(f"  Date range: {df['match_datetime'].min()} to {df['match_datetime'].max()}")

    # --- Missing Values ---
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

    # --- Minutes Validation ---
    logger.info(f"\n⚠️ MINUTES DATA VALIDATION:")
    df['summary_min'] = pd.to_numeric(df['summary_min'], errors='coerce')
    max_valid_minutes = 120
    invalid_minutes = df[df['summary_min'] > max_valid_minutes]

    if len(invalid_minutes) > 0:
        logger.error(f"  🔴 {len(invalid_minutes)} records with minutes > {max_valid_minutes}")
        issues.append(f"Invalid minutes data: {len(invalid_minutes)} records > {max_valid_minutes}")
        invalid_minutes.to_csv('invalid_minutes_records.csv', index=False)
        logger.error(f"  💾 Saved problematic records to 'invalid_minutes_records.csv'")
    else:
        logger.info(f"  ✅ All minutes values are realistic (≤ {max_valid_minutes})")

    zero_or_negative = df[df['summary_min'] <= 0]
    if len(zero_or_negative) > 0:
        logger.warning(f"  ⚠️ {len(zero_or_negative)} records with minutes ≤ 0")
        issues.append(f"Zero/negative minutes: {len(zero_or_negative)} records")

    # --- SOT Validation ---
    logger.info(f"\n⚽ SHOTS ON TARGET VALIDATION:")
    df['summary_sot'] = pd.to_numeric(df['summary_sot'], errors='coerce')
    max_reasonable_sot = 15
    high_sot = df[df['summary_sot'] > max_reasonable_sot]

    if len(high_sot) > 0:
        logger.warning(f"  ⚠️ {len(high_sot)} records with SOT > {max_reasonable_sot}")
    else:
        logger.info(f"  ✅ All SOT values are reasonable (≤ {max_reasonable_sot})")

    negative_sot = df[df['summary_sot'] < 0]
    if len(negative_sot) > 0:
        logger.error(f"  🔴 {len(negative_sot)} records with negative SOT")
        issues.append(f"Negative SOT: {len(negative_sot)} records")

    # --- Duplicate Records ---
    logger.info(f"\n🔁 DUPLICATE RECORDS CHECK:")
    duplicates_strict = df[df.duplicated(subset=['player_id', 'match_datetime', 'team_name'], keep=False)]
    if len(duplicates_strict) > 0:
        logger.error(f"  🔴 {len(duplicates_strict)} duplicate player-match records found!")
        issues.append(f"True duplicate records: {len(duplicates_strict)} rows")
    else:
        logger.info(f"  ✅ No duplicate records found")

    return df, issues

# ---------------------------------------------------------------
# 2. Team Defense Stats Validation
# ---------------------------------------------------------------
def validate_team_defense_stats():
    """Validate team defense stats tables."""
    print_section("2. TEAM DEFENSE STATS VALIDATION")

    df_shooting = fetch_with_deduplication(supabase, "team_shooting_stats", "match_date, team_name, opp_shots_on_target")
    df_defense = fetch_with_deduplication(supabase, "team_defense_stats", "match_date, team_name, team_tackles_att_3rd")

    if df_shooting.empty or df_defense.empty:
        logger.error("❌ Missing team defense data!")
        return None, None, []

    issues = []

    merged = pd.merge(df_shooting, df_defense, on=['match_date', 'team_name'], how='inner')
    if len(merged) < len(df_shooting):
        issues.append(f"Unmatched shooting records: {len(df_shooting) - len(merged)}")

    return df_shooting, df_defense, issues

# ---------------------------------------------------------------
# 3. Fixtures Validation
# ---------------------------------------------------------------
def validate_fixtures():
    """Validate fixtures table."""
    print_section("3. FIXTURES TABLE VALIDATION")

    df = fetch_with_deduplication(supabase, "fixtures", "datetime, hometeam, awayteam, matchweek, status", "datetime")

    if df.empty:
        logger.error("❌ No fixtures data found!")
        return None, []

    issues = []
    df['datetime'] = pd.to_datetime(df['datetime'], utc=True)
    now = pd.Timestamp.now(tz='UTC')

    future = df[df['datetime'] > now]
    finished_future = future[future['status'].str.lower() == 'finished']

    if len(finished_future) > 0:
        issues.append(f"Future fixtures marked finished: {len(finished_future)}")

    return df, issues

# ---------------------------------------------------------------
# 4. Cross-table Validation
# ---------------------------------------------------------------
def cross_validate_data():
    """Cross-validate relationships between tables."""
    print_section("4. CROSS-TABLE VALIDATION")

    df_player = fetch_with_deduplication(supabase, "player_match_stats", "team_name, home_team, away_team, match_datetime")
    df_fixtures = fetch_with_deduplication(supabase, "fixtures", "datetime, hometeam, awayteam", "datetime")

    if df_player.empty or df_fixtures.empty:
        logger.error("❌ Cannot perform cross-validation - missing data")
        return []

    df_player['match_datetime'] = pd.to_datetime(df_player['match_datetime'], utc=True)
    df_player['match_date'] = df_player['match_datetime'].dt.date
    df_fixtures['datetime'] = pd.to_datetime(df_fixtures['datetime'], utc=True)
    df_fixtures['match_date'] = df_fixtures['datetime'].dt.date
    df_fixtures.rename(columns={'hometeam': 'home_team', 'awayteam': 'away_team'}, inplace=True)

    merged = pd.merge(
        df_player[['match_date', 'home_team', 'away_team']].drop_duplicates(),
        df_fixtures[['match_date', 'home_team', 'away_team']],
        on=['match_date', 'home_team', 'away_team'],
        how='left',
        indicator=True
    )

    orphaned_player_matches = merged[merged['_merge'] == 'left_only']
    if len(orphaned_player_matches) > 0:
        return [f"Orphaned player matches: {len(orphaned_player_matches)}"]
    return []

# ---------------------------------------------------------------
# 5. Summary Report
# ---------------------------------------------------------------
def generate_summary_report(all_issues):
    """Generate final summary report."""
    print_section("5. VALIDATION SUMMARY")

    if not all_issues:
        logger.info("\n✅ ALL VALIDATION CHECKS PASSED!")
        return True
    else:
        logger.error(f"\n❌ VALIDATION FAILED: {len(all_issues)} ISSUES FOUND")
        for i, issue in enumerate(all_issues, 1):
            logger.error(f"  {i}. {issue}")
        return False

# ---------------------------------------------------------------
# Main Entry Point
# ---------------------------------------------------------------
def main():
    logger.info("=" * 80)
    logger.info("  DATA VALIDATION & QUALITY CHECK")
    logger.info("=" * 80)

    all_issues = []

    df_player, player_issues = validate_player_match_stats()
    if player_issues:
        all_issues.extend(player_issues)

    df_shooting, df_defense, defense_issues = validate_team_defense_stats()
    if defense_issues:
        all_issues.extend(defense_issues)

    df_fixtures, fixture_issues = validate_fixtures()
    if fixture_issues:
        all_issues.extend(fixture_issues)

    cross_issues = cross_validate_data()
    if cross_issues:
        all_issues.extend(cross_issues)

    validation_passed = generate_summary_report(all_issues)

    if validation_passed:
        logger.info("\n✅ Proceed to backtest training")
        sys.exit(0)
    else:
        logger.error("\n❌ Fix issues before proceeding to backtest training")
        sys.exit(1)

if __name__ == "__main__":
    main()
