import pandas as pd
import numpy as np
import pickle
import statsmodels.api as sm
import logging
import json
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# --- Configuration and Setup ---

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# Load .env file for credentials
load_dotenv() 

SUPABASE_URL = os.getenv("SUPABASE_URL")
# Using the SERVICE_ROLE_KEY as you did in your data_loader.py
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") 

# --- AI Artifacts and Model Configuration ---
MODEL_FILE = "poisson_model.pkl"
SCALER_STATS_FILE = "training_stats.json" 
PREDICTION_OUTPUT = "gameweek_sot_recommendations.csv"
MIN_PERIODS = 5

# Features the model expects (must match the training order, including '_scaled')
PREDICTOR_COLUMNS = [
    'sot_conceded_MA5_scaled',
    'tackles_att_3rd_MA5_scaled',
    'sot_MA5_scaled',
    'min_MA5_scaled',
    'summary_min' # This one remains unscaled (raw minutes for the upcoming game)
]
# Features used for MA5 calculation (stems)
MA5_METRICS = ['sot', 'min']
OPP_METRICS = ['sot_conceded', 'tackles_att_3rd']


# --- Supabase Initialization ---

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables must be set.")
    exit(1)

try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    logger.info("Supabase client initialized.")
except Exception as e:
    logger.error(f"Failed to initialize Supabase client: {e}")
    exit(1)

# ----------------------------------------------------------------------
# --- Core Data Pipeline Functions ---
# ----------------------------------------------------------------------

def fetch_all_data_from_supabase(table_name: str, select_columns: str = "*", order_by_column: str = "match_datetime") -> pd.DataFrame:
    """Fetches all data from a specified Supabase table."""
    logger.info(f"Fetching data from table: {table_name}")
    
    response = supabase.from_(table_name).select(select_columns).order(order_by_column, desc=False).execute()
    data = response.data
    
    if not data:
        logger.warning(f"No data found in table {table_name}.")
        return pd.DataFrame()

    df = pd.DataFrame(data)
    return df

def load_and_merge_raw_data() -> pd.DataFrame:
    """Fetches and merges all required player and team data from Supabase."""
    
    # 1. Player Stats (P-Factors Source) - Includes match metadata needed for filtering
    player_cols = "player_id, player_name, team_name, summary_sot, summary_min, home_team, away_team, team_side, match_datetime, matchweek, status"
    df_player = fetch_all_data_from_supabase(
        table_name="player_match_stats", 
        select_columns=player_cols,
        order_by_column="match_datetime" 
    )
    
    if df_player.empty:
        return pd.DataFrame()
    
    # Standardize types and create date column for joining
    df_player['summary_min'] = pd.to_numeric(df_player['summary_min'], errors='coerce')
    df_player['match_datetime'] = pd.to_datetime(df_player['match_datetime'])
    df_player['match_date'] = df_player['match_datetime'].dt.date 
    
    # 2. Team Defense Stats (O-Factors Source)
    merge_keys = ['match_date', 'team_name']

    # Note: Column names must match the final column names in the training set
    df_shooting_def = fetch_all_data_from_supabase(
        table_name="team_shooting_stats", 
        select_columns="match_date, team_name, opp_shots_on_target",
        order_by_column="match_date"
    ).rename(columns={'opp_shots_on_target': 'sot_conceded'})
    
    df_tackle_def = fetch_all_data_from_supabase(
        table_name="team_defense_stats", 
        # Correct column name based on your data_loader: 'team_tackles_att_3rd'
        select_columns="match_date, team_name, team_tackles_att_3rd",
        order_by_column="match_date"
    ).rename(columns={'team_tackles_att_3rd': 'tackles_att_3rd'})
    
    # Merge the two defense dataframes
    df_team_def = pd.merge(df_shooting_def, df_tackle_def, on=merge_keys, how='inner')
    df_team_def['match_date'] = pd.to_datetime(df_team_def['match_date']).dt.date

    # 3. Join Player Data with Team Defense Data
    df_combined = pd.merge(
        df_player,
        df_team_def,
        on=['match_date', 'team_name'],
        how='left' 
    )

    # CRITICAL: Sort for rolling calculations on the full historical dataset
    df_combined = df_combined.sort_values(by=['match_datetime', 'player_id']).reset_index(drop=True)
    
    return df_combined

def calculate_ma5_factors(df: pd.DataFrame) -> pd.DataFrame:
    """Calculates all Player (P-Factors) and Opponent (O-Factors) MA5 metrics."""
    df_processed = df.copy()
    
    # Rename for consistency with MA5 calculation
    df_processed.rename(columns={'summary_sot': 'sot', 'summary_min': 'min'}, inplace=True)
    
    # 1. P-Factors (Player Form)
    for col in MA5_METRICS: # ['sot', 'min']
        df_processed[f'{col}_MA5'] = (
            df_processed.groupby('player_id')[col]
            .transform(
                lambda x: x.rolling(window=MIN_PERIODS, min_periods=1, closed='left').mean()
            )
        )
        
    # 2. O-Factors (Opponent Defense)
    df_processed['opponent_team'] = np.where(
        df_processed['team_side'] == 'home', 
        df_processed['away_team'], 
        df_processed['home_team']
    )
    
    for col in OPP_METRICS: # ['sot_conceded', 'tackles_att_3rd']
        # MA5 is calculated based on the opponent's historical stats
        df_processed[f'{col}_MA5'] = (
            df_processed.groupby('opponent_team')[col]
            .transform(
                lambda x: x.rolling(window=MIN_PERIODS, min_periods=1, closed='left').mean()
            )
        )
        
    return df_processed

def get_live_gameweek_features(df_processed: pd.DataFrame) -> pd.DataFrame:
    """Filters the processed data to get the features for the next scheduled gameweek."""
    
    scheduled_games = df_processed[df_processed['status'] == 'scheduled']
    
    if scheduled_games.empty:
        logger.info("No upcoming fixtures found in Supabase.")
        return pd.DataFrame()
        
    # Find the next gameweek (the lowest matchweek number that has scheduled games)
    next_gameweek = scheduled_games['matchweek'].min()
    logger.info(f"Targeting predictions for Gameweek {next_gameweek}.")
    
    df_live = scheduled_games[df_processed['matchweek'] == next_gameweek].copy()
    
    REQUIRED_MA5_COLUMNS = [f'{col}_MA5' for col in MA5_METRICS + OPP_METRICS]
    
    initial_rows = len(df_live)
    # Drop rows where MA5 factors are NaN (usually players with < 5 historical games)
    df_live.dropna(subset=REQUIRED_MA5_COLUMNS, inplace=True)
    
    logger.info(f"Dropped {initial_rows - len(df_live)} players with insufficient historical data.")
    
    # Rename 'min' (raw minutes) back to 'summary_min' for the model input
    df_live.rename(columns={'min': 'summary_min'}, inplace=True)

    return df_live

# ----------------------------------------------------------------------
# --- Prediction Execution Functions ---
# ----------------------------------------------------------------------

def load_artifacts():
    """Loads the trained model and the required scaling statistics."""
    logger.info("Loading model and scaling statistics...")
    
    # Load Model (poisson_model.pkl)
    with open(MODEL_FILE, 'rb') as f:
        model = pickle.load(f)
    
    # Load Scaling Stats (training_stats.json)
    with open(SCALER_STATS_FILE, 'r') as f:
        stats_dict = json.load(f)
        
    scaler_data = pd.DataFrame(stats_dict).T
    return model, scaler_data

def scale_live_data(df_raw, scaler_data):
    """Standardizes the live MA5 feature data using training stats."""
    df_features = df_raw.copy()
    
    scaled_feature_stems = [col for col in scaler_data.index if col != 'summary_min']

    for feature_stem in scaled_feature_stems:
        raw_col = feature_stem
        scaled_col = f'{feature_stem}_scaled'
            
        mu = scaler_data.loc[raw_col, 'mean']
        sigma = scaler_data.loc[raw_col, 'std']
        
        # Apply Z-score scaling: (x - mu) / sigma
        df_features[scaled_col] = (df_features[raw_col] - mu) / sigma
        
    # Select final predictors, ensuring order is correct
    final_features = df_features[PREDICTOR_COLUMNS]
    
    # Add intercept ('const') for statsmodels GLM
    final_features = sm.add_constant(final_features, has_constant='add') 
    
    return final_features

def run_predictions(model, df_features_scaled, df_raw):
    """Generates predictions and calculates probabilities."""
    logger.info(f"Generating predictions for {len(df_raw)} players...")
    
    # 1. Predict the SOT Rate (lambda = E[SOT])
    df_raw['E_SOT'] = model.predict(df_features_scaled)
    
    # 2. Calculate P(SOT >= 1) = 1 - P(SOT = 0)
    df_raw['P_SOT_1_Plus'] = 1 - np.exp(-df_raw['E_SOT'])
    
    # 3. Filter and save the final report, sorted by probability
    report = df_raw.sort_values(by='P_SOT_1_Plus', ascending=False)
    
    final_report = report[[
        'player_id', 'player_name', 'team_name', 'opponent_team', 
        'E_SOT', 'P_SOT_1_Plus', 'summary_min', 'match_datetime'
    ]].rename(columns={'summary_min': 'expected_minutes', 'team_name': 'team', 'opponent_team': 'opponent'}).round(3)

    final_report.to_csv(PREDICTION_OUTPUT, index=False)
    logger.info(f"Prediction report saved to {PREDICTION_OUTPUT}. Top 5 recommendations:")
    logger.info("\n" + final_report.head(5).to_string(index=False))

    return final_report

# ----------------------------------------------------------------------
# --- Main Execution ---
# ----------------------------------------------------------------------

def main():
    logger.info("--- Starting Live Prediction Service ---")
    
    # 1. Load Model Artifacts
    try:
        model, scaler_data = load_artifacts()
    except FileNotFoundError as e:
        logger.critical(f"💥 Failed to load model artifacts: {e}. Check that '{MODEL_FILE}' and '{SCALER_STATS_FILE}' are in the same directory as this script.")
        return
    except Exception as e:
        logger.error(f"An error occurred while loading artifacts: {e}")
        return

    # 2. Fetch and Process All Data
    df_combined_raw = load_and_merge_raw_data()
    if df_combined_raw.empty:
        return

    df_processed = calculate_ma5_factors(df_combined_raw)
    
    # 3. Filter for Next Gameweek's Live Features
    df_live_raw = get_live_gameweek_features(df_processed)
    if df_live_raw.empty:
        logger.info("Exiting as no scheduled games were processed.")
        return
        
    # 4. Scale Live Features
    df_scaled_input = scale_live_data(df_live_raw, scaler_data)
    
    # 5. Run Prediction and Save Report
    run_predictions(model, df_scaled_input, df_live_raw)
    
    logger.info("--- Live Prediction Service Complete ---")

if __name__ == '__main__':
    main()
