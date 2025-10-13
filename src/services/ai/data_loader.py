# src/services/ai/data_loader.py

import os
import pandas as pd
from supabase import create_client, Client
from dotenv import load_dotenv
import logging
import numpy as np

# --- Configuration and Setup ---

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

load_dotenv() 

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    logger.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables must be set.")
    exit(1)

try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    logger.info("Supabase client initialized successfully with Service Role Key.")
except Exception as e:
    logger.error(f"Failed to initialize Supabase client: {e}")
    exit(1)

# --- Core Fetching Functions ---

def fetch_all_data_from_supabase(table_name: str, select_columns: str = "*", order_by_column: str = "match_datetime") -> pd.DataFrame:
    """Fetches all data from a specified Supabase table and converts it to a Pandas DataFrame."""
    logger.info(f"Fetching data from table: {table_name}")
    
    response = supabase.from_(table_name).select(select_columns).order(order_by_column, desc=False).execute()
    data = response.data
    
    if data is None:
        logger.error(f"Failed to fetch data from table {table_name}.")
        return pd.DataFrame()
        
    if not data:
        logger.warning(f"No data found in table {table_name}.")
        return pd.DataFrame()

    df = pd.DataFrame(data)
    logger.info(f"Successfully fetched {len(df)} records from {table_name}.")
    return df

def load_data_for_backtest() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Orchestrates the data loading for player and combined team defense metrics."""
    
    # --- 1. Player Stats (P-Factors Source) ---
    player_cols = "player_id, team_name, summary_sot, summary_min, home_team, away_team, venue, team_side, match_datetime"
    
    df_player = fetch_all_data_from_supabase(
        table_name="player_match_stats", 
        select_columns=player_cols,
        order_by_column="match_datetime" 
    )
    
    if df_player.empty:
        return pd.DataFrame(), pd.DataFrame()
    
    # Clean and standardize player data types
    df_player['summary_min'] = pd.to_numeric(df_player['summary_min'], errors='coerce')
    df_player['match_datetime'] = pd.to_datetime(df_player['match_datetime'])
    df_player['match_date'] = df_player['match_datetime'].dt.date 
    
    # CRITICAL: Sort for rolling calculations
    df_player = df_player.sort_values(by=['match_datetime', 'player_id']).reset_index(drop=True)
    logger.info(f"Player data (P-Factors) loaded: {df_player.shape}")


    # --------------------------------------------------------------------------
    # --- 2. Team Defense Stats (O-Factors Source) - Merging two required tables ---
    # --------------------------------------------------------------------------
    
    merge_keys = ['match_date', 'team_name']

    # 2a. Fetch Shooting Stats (opp_shots_on_target)
    logger.info("Fetching Team Shooting Stats (opp_shots_on_target) from team_shooting_stats...")
    df_shooting_def = fetch_all_data_from_supabase(
        table_name="team_shooting_stats", 
        select_columns="match_date, team_name, opp_shots_on_target",
        order_by_column="match_date"
    ).rename(columns={'opp_shots_on_target': 'sot_conceded'}) # Rename for consistency
    
    # 2b. Fetch Specific Defensive Stats (tackles_att_3rd)
    logger.info("Fetching Specific Defensive Stats (tackles_att_3rd) from team_defense_stats...")
    df_tackle_def = fetch_all_data_from_supabase(
        table_name="team_defense_stats", 
        select_columns="match_date, team_name, tackles_att_3rd",
        order_by_column="match_date"
    )
    
    # Check for empty data before attempting merge
    if df_shooting_def.empty or df_tackle_def.empty:
        logger.warning("One or both required team defense tables returned empty data. Skipping merge.")
        return df_player, pd.DataFrame()

    # 2c. Merge the two defense dataframes (Shooting and Tackles)
    df_team_def = pd.merge(
        df_shooting_def,
        df_tackle_def,
        on=merge_keys,
        how='inner' # Only keep records present in both tables
    )
    
    if df_team_def.empty:
        logger.warning("Merged team data is empty. Cannot proceed.")
        return df_player, pd.DataFrame()
        
    # Final cleanup and sort for team data
    df_team_def['match_date'] = pd.to_datetime(df_team_def['match_date'])
    df_team_def = df_team_def.sort_values(by=merge_keys).reset_index(drop=True)
    logger.info(f"Team defense data (O-Factors) successfully merged: {df_team_def.shape}")

    return df_player, df_team_def

# --- Execution and Saving ---

if __name__ == '__main__':
    logger.info("Starting data loading process...")
    
    try:
        df_player, df_team_def = load_data_for_backtest()
        
        if not df_player.empty and not df_team_def.empty:
            
            # Save files to be read by the next script
            df_player.to_parquet("player_data_raw.parquet", index=False)
            logger.info("✅ Player data saved to player_data_raw.parquet")
            
            df_team_def.to_parquet("team_def_data_raw.parquet", index=False)
            logger.info("✅ Team defense data saved to team_def_data_raw.parquet")
            
            logger.info("--- Data loading complete. Ready for backtest_processor.py ---")
            
        else:
            logger.warning("No valid data loaded. Skipping file save.")
            
    except Exception as e:
        logger.critical(f"💥 Fatal error during data loading or saving: {e}")
        exit(1)
