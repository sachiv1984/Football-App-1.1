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

def investigate_duplicates():
    """Deep dive into duplicate detection logic."""
    
    logger.info("=" * 80)
    logger.info("DUPLICATE DETECTION INVESTIGATION")
    logger.info("=" * 80)
    
    # Fetch all player match stats
    logger.info("\nFetching all player_match_stats data...")
    response = supabase.from_("player_match_stats").select("*").execute()
    df = pd.DataFrame(response.data)
    
    logger.info(f"Total records fetched: {len(df)}")
    logger.info(f"Columns: {list(df.columns)}")
    
    # ============================================================================
    # KEY QUESTION: What defines a "duplicate"?
    # ============================================================================
    
    logger.info("\n" + "=" * 80)
    logger.info("DUPLICATE DEFINITION CHECK")
    logger.info("=" * 80)
    
    # The validation script checks: player_id + match_datetime
    # But maybe we should check: player_id + match_datetime + team_name?
    
    logger.info("\n1. Duplicates by: player_id + match_datetime (CURRENT METHOD)")
    logger.info("-" * 80)
    
    duplicates_method1 = df[df.duplicated(subset=['player_id', 'match_datetime'], keep=False)]
    dup_count_method1 = len(duplicates_method1)
    
    logger.info(f"Found {dup_count_method1} records that are duplicates by this method")
    
    if dup_count_method1 > 0:
        # Group to see which players/matches
        dup_summary1 = duplicates_method1.groupby(['player_id', 'player_name', 'match_datetime']).size().reset_index(name='count')
        dup_summary1 = dup_summary1[dup_summary1['count'] > 1].sort_values('count', ascending=False)
        
        logger.info(f"\nPlayers with duplicate records (showing all):")
        for _, row in dup_summary1.iterrows():
            logger.info(f"  {row['player_name']} on {row['match_datetime']}: {row['count']} records")
    
    # ============================================================================
    # Check the specific Wolves match mentioned
    # ============================================================================
    
    logger.info("\n" + "=" * 80)
    logger.info("WOLVES MATCH INVESTIGATION (2025-09-13)")
    logger.info("=" * 80)
    
    # Convert to datetime for filtering
    df['match_datetime'] = pd.to_datetime(df['match_datetime'])
    wolves_match = df[
        (df['team_name'] == 'Wolves') & 
        (df['match_datetime'].dt.date == pd.to_datetime('2025-09-13').date())
    ].copy()
    
    logger.info(f"\nWolves records on 2025-09-13: {len(wolves_match)}")
    
    if len(wolves_match) > 0:
        logger.info(f"\nPlayers in this match:")
        for _, row in wolves_match.iterrows():
            logger.info(f"  {row['player_name']} - {row['match_datetime']} - SOT: {row['summary_sot']}, Min: {row['summary_min']}")
        
        # Check for duplicates within this match
        wolves_dups = wolves_match[wolves_match.duplicated(subset=['player_id'], keep=False)]
        
        if len(wolves_dups) > 0:
            logger.info(f"\n🔴 Found {len(wolves_dups)} duplicate player entries in Wolves match:")
            dup_players = wolves_dups.groupby('player_id')['player_name'].first()
            for player_id, player_name in dup_players.items():
                player_records = wolves_match[wolves_match['player_id'] == player_id]
                logger.info(f"\n  {player_name} ({player_id}):")
                for idx, row in player_records.iterrows():
                    logger.info(f"    Record {idx}: SOT={row['summary_sot']}, Min={row['summary_min']}, DateTime={row['match_datetime']}")
        else:
            logger.info(f"\n✅ No duplicate players found in Wolves match")
    
    # ============================================================================
    # Deep dive into the specific players mentioned in validation
    # ============================================================================
    
    logger.info("\n" + "=" * 80)
    logger.info("INVESTIGATING SPECIFIC PLAYERS MENTIONED")
    logger.info("=" * 80)
    
    problem_players = [
        'Jean-Ricner Bellegarde',
        'Hwang Hee-chan', 
        'Yerson Mosquera'
    ]
    
    for player_name in problem_players:
        logger.info(f"\n{player_name}:")
        logger.info("-" * 60)
        
        player_records = df[df['player_name'] == player_name].copy()
        logger.info(f"  Total records: {len(player_records)}")
        
        if len(player_records) > 0:
            # Group by match_datetime to find duplicates
            match_counts = player_records.groupby('match_datetime').size()
            duplicates = match_counts[match_counts > 1]
            
            if len(duplicates) > 0:
                logger.info(f"  🔴 Matches with duplicates: {len(duplicates)}")
                for match_date, count in duplicates.items():
                    logger.info(f"\n    Match: {match_date} - {count} records")
                    match_records = player_records[player_records['match_datetime'] == match_date]
                    
                    for idx, row in match_records.iterrows():
                        logger.info(f"      Record: SOT={row['summary_sot']}, Min={row['summary_min']}, Team={row['team_name']}")
                        logger.info(f"              Home: {row.get('home_team', 'N/A')} vs Away: {row.get('away_team', 'N/A')}")
                        logger.info(f"              ID: {row.get('id', 'N/A')}")
            else:
                logger.info(f"  ✅ No duplicates found")
                logger.info(f"  All matches:")
                for _, row in player_records.iterrows():
                    logger.info(f"    {row['match_datetime']} - SOT={row['summary_sot']}, Min={row['summary_min']}")
    
    # ============================================================================
    # Check if duplicates might be due to timestamp precision
    # ============================================================================
    
    logger.info("\n" + "=" * 80)
    logger.info("TIMESTAMP PRECISION CHECK")
    logger.info("=" * 80)
    
    logger.info("\nChecking if 'duplicates' are actually different timestamps...")
    
    # Look at the exact datetime values for suspected duplicates
    if dup_count_method1 > 0:
        sample_dup = duplicates_method1.groupby(['player_id', 'match_datetime']).size().reset_index(name='count')
        sample_dup = sample_dup[sample_dup['count'] > 1].head(1)
        
        if len(sample_dup) > 0:
            sample_player_id = sample_dup.iloc[0]['player_id']
            sample_datetime = sample_dup.iloc[0]['match_datetime']
            
            logger.info(f"\nExample: Player ID {sample_player_id} on {sample_datetime}")
            
            exact_records = df[
                (df['player_id'] == sample_player_id) & 
                (df['match_datetime'] == sample_datetime)
            ]
            
            logger.info(f"Number of exact matches: {len(exact_records)}")
            
            for idx, row in exact_records.iterrows():
                logger.info(f"\n  Record {idx}:")
                logger.info(f"    DateTime (raw): {row['match_datetime']}")
                logger.info(f"    Player: {row['player_name']}")
                logger.info(f"    Team: {row['team_name']}")
                logger.info(f"    SOT: {row['summary_sot']}")
                logger.info(f"    Minutes: {row['summary_min']}")
                logger.info(f"    Home: {row.get('home_team', 'N/A')} vs Away: {row.get('away_team', 'N/A')}")
                if 'id' in row:
                    logger.info(f"    Database ID: {row['id']}")
    
    # ============================================================================
    # Alternative duplicate detection methods
    # ============================================================================
    
    logger.info("\n" + "=" * 80)
    logger.info("ALTERNATIVE DUPLICATE DETECTION METHODS")
    logger.info("=" * 80)
    
    # Method 2: Include team_name in duplicate check
    logger.info("\n2. Duplicates by: player_id + match_datetime + team_name")
    logger.info("-" * 80)
    
    duplicates_method2 = df[df.duplicated(subset=['player_id', 'match_datetime', 'team_name'], keep=False)]
    dup_count_method2 = len(duplicates_method2)
    
    logger.info(f"Found {dup_count_method2} records")
    
    if dup_count_method2 > 0:
        dup_summary2 = duplicates_method2.groupby(['player_id', 'player_name', 'match_datetime', 'team_name']).size().reset_index(name='count')
        dup_summary2 = dup_summary2[dup_summary2['count'] > 1]
        logger.info(f"Players with duplicates by this method: {len(dup_summary2)}")
    
    # Method 3: Check if same player, different teams (transfers mid-season)
    logger.info("\n3. Same player, same datetime, DIFFERENT teams (potential transfers)")
    logger.info("-" * 80)
    
    player_datetime_groups = df.groupby(['player_id', 'match_datetime'])['team_name'].nunique()
    multi_team_matches = player_datetime_groups[player_datetime_groups > 1]
    
    logger.info(f"Found {len(multi_team_matches)} player-match combinations with multiple teams")
    
    if len(multi_team_matches) > 0:
        logger.info("\nThese might NOT be duplicates but rather:")
        logger.info("  - Player transferred mid-match-day")
        logger.info("  - Data entry showing both old and new team")
        
        for (player_id, match_dt), team_count in multi_team_matches.head(5).items():
            player_name = df[df['player_id'] == player_id]['player_name'].iloc[0]
            teams = df[(df['player_id'] == player_id) & (df['match_datetime'] == match_dt)]['team_name'].unique()
            logger.info(f"\n  {player_name} on {match_dt}:")
            logger.info(f"    Teams: {', '.join(teams)}")
    
    # ============================================================================
    # Final recommendation
    # ============================================================================
    
    logger.info("\n" + "=" * 80)
    logger.info("RECOMMENDATION")
    logger.info("=" * 80)
    
    if dup_count_method1 > 0 and dup_count_method2 == 0 and len(multi_team_matches) > 0:
        logger.info("\n⚠️ LIKELY FALSE POSITIVE!")
        logger.info("\nThe 'duplicates' are probably:")
        logger.info("  1. Same player, same match datetime")
        logger.info("  2. But DIFFERENT teams (transfers)")
        logger.info("\nThese are NOT duplicates - they're legitimate records showing:")
        logger.info("  - Player played for Team A in early season")
        logger.info("  - Same datetime but different fixture")
        logger.info("\nAction: Update validation to check player_id + match_datetime + team_name")
    elif dup_count_method1 > 0 and dup_count_method2 > 0:
        logger.info("\n🔴 TRUE DUPLICATES FOUND!")
        logger.info("\nThese are genuine duplicates that need fixing:")
        logger.info(f"  - {dup_count_method2} records are exact duplicates")
        logger.info("\nAction: Use the SQL fix script to remove duplicates")
    else:
        logger.info("\n✅ NO DUPLICATES FOUND")
        logger.info("\nThe validation might have been a false positive.")
    
    return df, duplicates_method1, duplicates_method2, multi_team_matches

if __name__ == "__main__":
    df, dup1, dup2, multi_team = investigate_duplicates()
    
    logger.info("\n" + "=" * 80)
    logger.info("INVESTIGATION COMPLETE")
    logger.info("=" * 80)
    logger.info("\nSummary:")
    logger.info(f"  Total records: {len(df)}")
    logger.info(f"  Duplicates (player+datetime): {len(dup1)}")
    logger.info(f"  Duplicates (player+datetime+team): {len(dup2)}")
    logger.info(f"  Multi-team matches: {len(multi_team)}")