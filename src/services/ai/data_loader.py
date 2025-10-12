l# data_loader.py

import os
import pandas as pd
from supabase import create_client, Client
from dotenv import load_dotenv
import logging

# --- Configuration and Setup ---

# Configure logging for clear output in GitHub Actions
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables from .env file (useful for local testing, ignored by GitHub Actions)
load_dotenv() 

# Get environment variables (GitHub Actions must inject these as secrets)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    logger.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables must be set.")
    # Exit script to fail the GitHub Action if credentials are missing
    exit(1)

# Initialize the Supabase Client
# The Service Role Key grants full access, bypassing Row Level Security (RLS)
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    logger.info("Supabase client initialized successfully with Service Role Key.")
except Exception as e:
    logger.error(f"Failed to initialize Supabase client: {e}")
    exit(1)

# --- Core Fetching Functions ---

def fetch_all_data_from_supabase(table_name: str, select_columns: str = "*", order_by_column: str = "match_date") -> pd.DataFrame:
    """
    Fetches all data from a specified Supabase table and converts it to a Pandas DataFrame.
    """
    logger.info(f"Fetching data from table: {table_name}")
    
    # Use the official Supabase-py v2+ client method
    response = supabase.from_(table_name).select(select_columns).order(order_by_column, desc=False).execute()
    
    # Supabase-py stores the result data in a tuple (data, count, error) or similar structure.
    # The actual data is usually accessed via response.data for a standard select()
    data = response.data
    
    if data is None:
        logger.error(f"Failed to fetch data from table {table_name}.")
        # logger.error(f"Supabase Error Details: {response.error}") # Uncomment for debugging
        return pd.DataFrame()
        
    if not data:
        logger.warning(f"No data found in table {table_name}.")
        return pd.DataFrame()

    df = pd.DataFrame(data)
    logger.info(f"Successfully fetched {len(df)} records from {table_name}.")
    return df

def load_data_for_backtest() -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Orchestrates the data loading for player and team defense metrics.
    """
    
    # --- 1. Player Stats (Source for P-Factors) ---
    player_cols = "player_id, team_name, opponent, match_date, summary_sot, summary_min, summary_sh, fixture_id, venue"
    df_player = fetch_all_data_from_supabase(
        table_name="player_match_stats", # <-- Use your actual player match stats table name
        select_columns=player_cols
    )

    if df_player.empty:
        return pd.DataFrame(), pd.DataFrame()

    # CRITICAL: Sort for rolling calculations
    df_player['match_date'] = pd.to_datetime(df_player['match_date'])
    df_player = df_player.sort_values(by=['match_date', 'fixture_id', 'player_id']).reset_index(drop=True)
    logger.info("Player data sorted chronologically.")


    # --- 2. Team Defense Stats (Source for O-Factors) ---
    team_def_cols = "fixture_id, team_name, match_date, tackles_att_3rd, opp_shots_on_target"
    df_team_def = fetch_all_data_from_supabase(
        table_name="team_misc_stats", # <-- Use your actual team misc/defense table name
        select_columns=team_def_cols
    ).rename(columns={'opp_shots_on_target': 'sot_conceded'}) # Rename for clarity

    if df_team_def.empty:
        return df_player, pd.DataFrame()

    # CRITICAL: Sort for merging and subsequent rolling calcs
    df_team_def['match_date'] = pd.to_datetime(df_team_def['match_date'])
    df_team_def = df_team_def.sort_values(by=['match_date', 'fixture_id']).reset_index(drop=True)
    logger.info("Team defense data sorted chronologically.")

    return df_player, df_team_def

# --- Execution and Saving ---

if __name__ == '__main__':
    logger.info("Starting data loading process...")
    
    try:
        df_player, df_team_def = load_data_for_backtest()
        
        if not df_player.empty:
            
            # Use Parquet (.parquet) for efficient disk saving and loading
            # This is key for passing data between sequential Python scripts in GitHub Actions
            
            # Player Data
            output_player_file = "player_data_raw.parquet"
            df_player.to_parquet(output_player_file, index=False)
            logger.info(f"✅ Player data saved to {output_player_file}")
            
            # Team Defense Data
            output_team_def_file = "team_def_data_raw.parquet"
            df_team_def.to_parquet(output_team_def_file, index=False)
            logger.info(f"✅ Team defense data saved to {output_team_def_file}")
            
            logger.info("--- Data loading complete. Ready for backtest_processor.py ---")
            
        else:
            logger.warning("No valid data loaded. Skipping file save.")
            
    except Exception as e:
        logger.critical(f"💥 Fatal error during data loading or saving: {e}")
        # The exit(1) will cause the GitHub Action step to fail, which is intended
        exit(1)
