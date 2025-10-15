import pandas as pd
import os
from supabase import create_client, Client
from dotenv import load_dotenv
import logging

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def quick_duplicate_check():
    """Quick check for true duplicates vs false positives."""
    
    logger.info("=" * 80)
    logger.info("QUICK DUPLICATE CHECK")
    logger.info("=" * 80)
    
    # Fetch only the columns we need for duplicate detection
    logger.info("\nFetching player_match_stats (pagination enabled)...")
    
    all_data = []
    offset = 0
    limit = 1000
    
    # Only fetch columns needed for duplicate check
    columns = "player_id, player_name, team_name, match_datetime, home_team, away_team, summary_sot, summary_min"
    
    while True:
        response = supabase.from_("player_match_stats").select(columns).order("match_datetime", desc=False).range(offset, offset + limit - 1).execute()
        
        if not response.data:
            break
            
        all_data.extend(response.data)
        
        if len(response.data) < limit:
            break
            
        offset += limit
    
    df = pd.DataFrame(all_data)
    logger.info(f"✅ Fetched {len(df)} total records")
    
    # Convert to datetime
    df['match_datetime'] = pd.to_datetime(df['match_datetime'])
    
    # ============================================================================
    # THREE DUPLICATE CHECKS
    # ============================================================================
    
    logger.info("\n" + "=" * 80)
    logger.info("CHECK 1: Basic Duplicate Check (player + datetime)")
    logger.info("=" * 80)
    
    dup1 = df[df.duplicated(subset=['player_id', 'match_datetime'], keep=False)]
    logger.info(f"Records flagged: {len(dup1)}")
    
    if len(dup1) > 0:
        unique_players = dup1.groupby(['player_id', 'match_datetime']).size()
        logger.info(f"Unique player-datetime combinations: {len(unique_players)}")
    
    # ============================================================================
    
    logger.info("\n" + "=" * 80)
    logger.info("CHECK 2: TRUE Duplicate Check (player + datetime + team)")
    logger.info("=" * 80)
    
    dup2 = df[df.duplicated(subset=['player_id', 'match_datetime', 'team_name'], keep=False)]
    logger.info(f"Records flagged: {len(dup2)}")
    
    if len(dup2) > 0:
        logger.error("🔴 TRUE DUPLICATES FOUND!")
        logger.error("These are the same player, same match, same team appearing multiple times.")
        
        # Show details
        dup_summary = dup2.groupby(['player_id', 'player_name', 'match_datetime', 'team_name']).size().reset_index(name='count')
        dup_summary = dup_summary[dup_summary['count'] > 1]
        
        logger.error(f"\nPlayers with true duplicates: {len(dup_summary)}")
        for _, row in dup_summary.iterrows():
            logger.error(f"  {row['player_name']} ({row['team_name']}) on {row['match_datetime']}: {row['count']} records")
    else:
        logger.info("✅ NO TRUE DUPLICATES")
    
    # ============================================================================
    
    logger.info("\n" + "=" * 80)
    logger.info("CHECK 3: Most Accurate Check (player + fixture)")
    logger.info("=" * 80)
    
    dup3 = df[df.duplicated(subset=['player_id', 'match_datetime', 'home_team', 'away_team'], keep=False)]
    logger.info(f"Records flagged: {len(dup3)}")
    
    if len(dup3) > 0:
        logger.error("🔴 EXACT FIXTURE DUPLICATES!")
        
        dup_summary = dup3.groupby(['player_id', 'player_name', 'match_datetime', 'home_team', 'away_team']).size().reset_index(name='count')
        dup_summary = dup_summary[dup_summary['count'] > 1]
        
        logger.error(f"\nPlayers with exact duplicates: {len(dup_summary)}")
        for _, row in dup_summary.head(10).iterrows():
            logger.error(f"  {row['player_name']} - {row['home_team']} vs {row['away_team']} on {row['match_datetime']}: {row['count']} records")
    else:
        logger.info("✅ NO EXACT DUPLICATES")
    
    # ============================================================================
    # ANALYSIS: Why are there differences?
    # ============================================================================
    
    if len(dup1) > 0 and len(dup2) == 0:
        logger.info("\n" + "=" * 80)
        logger.info("ANALYSIS: False Positive Explanation")
        logger.info("=" * 80)
        
        logger.info("\n⚠️ CHECK 1 found 'duplicates' but CHECK 2 found none.")
        logger.info("This means: Same player, same datetime, but DIFFERENT teams/fixtures")
        logger.info("\nMost likely causes:")
        logger.info("  1. Multiple matches at same kickoff time (e.g., 3pm Saturday slots)")
        logger.info("  2. Player transferred between teams mid-season")
        logger.info("  3. Database contains records from multiple fixtures with same datetime")
        
        # Show examples
        logger.info("\nExamples of 'duplicate' records that are actually different matches:")
        
        # Get players who appear multiple times at same datetime
        player_datetime_groups = df.groupby(['player_id', 'match_datetime']).agg({
            'team_name': lambda x: list(x.unique()),
            'home_team': lambda x: list(x.unique()),
            'away_team': lambda x: list(x.unique())
        })
        
        multi_match = player_datetime_groups[player_datetime_groups['team_name'].apply(len) > 1]
        
        if len(multi_match) > 0:
            logger.info(f"\nFound {len(multi_match)} players at same datetime with different fixtures:")
            
            for idx, (player_id, match_dt) in enumerate(multi_match.head(3).index):
                player_name = df[df['player_id'] == player_id]['player_name'].iloc[0]
                records = df[(df['player_id'] == player_id) & (df['match_datetime'] == match_dt)]
                
                logger.info(f"\n  Example {idx + 1}: {player_name} on {match_dt}")
                for _, row in records.iterrows():
                    logger.info(f"    → {row['team_name']}: {row['home_team']} vs {row['away_team']}")
    
    # ============================================================================
    # FINAL VERDICT
    # ============================================================================
    
    logger.info("\n" + "=" * 80)
    logger.info("FINAL VERDICT")
    logger.info("=" * 80)
    
    if len(dup3) > 0:
        logger.error("\n🔴 YOU HAVE TRUE DUPLICATES!")
        logger.error(f"   {len(dup3)} records need to be fixed")
        logger.error("   Action: Run the fix_duplicates.sql script")
        return "DUPLICATES_FOUND"
    elif len(dup1) > 0 and len(dup2) == 0:
        logger.info("\n✅ NO TRUE DUPLICATES - FALSE POSITIVE")
        logger.info(f"   The validation flagged {len(dup1)} records")
        logger.info("   But these are different fixtures with same datetime")
        logger.info("   Action: Update validation logic to check player+datetime+fixture")
        return "FALSE_POSITIVE"
    else:
        logger.info("\n✅ NO DUPLICATES AT ALL")
        logger.info("   Your data is clean")
        return "CLEAN"

if __name__ == "__main__":
    result = quick_duplicate_check()
    
    logger.info("\n" + "=" * 80)
    logger.info(f"Result: {result}")
    logger.info("=" * 80)