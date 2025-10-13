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

load_dotenv() 

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") 

# --- AI Artifacts and Model Configuration ---
ARTIFACT_PATH = "src/services/ai/artifacts/" 

MODEL_FILE = ARTIFACT_PATH + "poisson_model.pkl"
SCALER_STATS_FILE = ARTIFACT_PATH + "training_stats.json" 
PREDICTION_OUTPUT = "gameweek_sot_recommendations.csv"
MIN_PERIODS = 5
MIN_EXPECTED_MINUTES = 45 # New Filter 1: Minimum rolling minute average to qualify
MIN_SOT_MA5 = 0.1          # New Filter 2: Minimum rolling SOT average to qualify (to exclude low-shot players/defenders)

PREDICTOR_COLUMNS = [
    'sot_conceded_MA5_scaled', 'tackles_att_3rd_MA5_scaled', 
    'sot_MA5_scaled', 'min_MA5_scaled', 'summary_min' # summary_min is the only unscaled feature input
]
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
    return pd.DataFrame(data)

def load_and_merge_raw_data() -> pd.DataFrame:
    """
    Fetches and merges all player, team defense, and fixture data.
    Critically, it now appends placeholder rows for future scheduled fixtures
    to ensure the MA5 calculation has a target row.
    """
    
    # 1. Fetch ALL Fixtures Data (needed to identify historical and future games)
    fixture_cols = "datetime, hometeam, awayteam, matchweek, status" 
    df_fixtures = fetch_all_data_from_supabase(
        table_name="fixtures", 
        select_columns=fixture_cols,
        order_by_column="datetime" 
    ).rename(columns={'hometeam': 'home_team', 'awayteam': 'away_team'})
    
    df_fixtures['datetime'] = pd.to_datetime(df_fixtures['datetime'])
    df_fixtures['match_date'] = df_fixtures['datetime'].dt.date
    if df_fixtures.empty:
        return pd.DataFrame()

    # Normalize fixture status immediately for robust filtering
    df_fixtures['status'] = df_fixtures['status'].astype(str).str.strip().str.lower()
    
    # --- A. BUILD HISTORICAL DATA (Finished Games) ---
    
    # 2. Player Stats (P-Factors Source) - HISTORICAL ONLY
    player_cols = "player_id, player_name, team_name, summary_sot, summary_min, home_team, away_team, team_side, match_datetime"
    df_player_history = fetch_all_data_from_supabase(
        table_name="player_match_stats", 
        select_columns=player_cols,
        order_by_column="match_datetime" 
    )
    if df_player_history.empty:
        # Cannot make predictions without player history to calculate MA5
        return pd.DataFrame()
    
    df_player_history['summary_min'] = pd.to_numeric(df_player_history['summary_min'], errors='coerce')
    df_player_history['match_datetime'] = pd.to_datetime(df_player_history['match_datetime'])
    df_player_history['match_date'] = df_player_history['match_datetime'].dt.date 

    # 3. Team Defense Stats (O-Factors Source) - HISTORICAL ONLY
    merge_keys = ['match_date', 'team_name']
    df_shooting_def = fetch_all_data_from_supabase(
        table_name="team_shooting_stats", 
        select_columns="match_date, team_name, opp_shots_on_target",
        order_by_column="match_date" 
    ).rename(columns={'opp_shots_on_target': 'sot_conceded'})
    
    df_tackle_def = fetch_all_data_from_supabase(
        table_name="team_defense_stats", 
        select_columns="match_date, team_name, team_tackles_att_3rd",
        order_by_column="match_date" 
    ).rename(columns={'team_tackles_att_3rd': 'tackles_att_3rd'})
    
    df_team_def = pd.merge(df_shooting_def, df_tackle_def, on=merge_keys, how='inner')
    df_team_def['match_date'] = pd.to_datetime(df_team_def['match_date']).dt.date

    # 4. Join Player and Team Defense Data (Historical Player-Match Rows)
    df_historical = pd.merge(
        df_player_history,
        df_team_def,
        on=['match_date', 'team_name'],
        how='left' 
    )
    
    # 5. Join with Fixtures Data to get Status and Matchweek for Historical Games
    df_historical = pd.merge(
        df_historical,
        df_fixtures[['match_date', 'home_team', 'away_team', 'matchweek', 'status']], 
        on=['match_date', 'home_team', 'away_team'],
        how='left'
    )
    
    # --- B. BUILD FUTURE DATA (Scheduled Games) ---
    
    # Get the list of all active players based on history
    active_players = df_player_history[['player_id', 'player_name', 'team_name']].drop_duplicates()
    
    # Get all scheduled fixtures
    df_future_fixtures = df_fixtures[df_fixtures['status'] == 'scheduled']
    
    # Cross-join active players with scheduled fixtures to create placeholder rows
    future_rows = []
    for _, fixture in df_future_fixtures.iterrows():
        # Get players for the home team
        home_players = active_players[active_players['team_name'] == fixture['home_team']].copy()
        if not home_players.empty:
            home_players['team_side'] = 'home'
            home_players['home_team'] = fixture['home_team']
            home_players['away_team'] = fixture['away_team']
            future_rows.append(home_players)
            
        # Get players for the away team
        away_players = active_players[active_players['team_name'] == fixture['away_team']].copy()
        if not away_players.empty:
            away_players['team_side'] = 'away'
            away_players['home_team'] = fixture['home_team']
            away_players['away_team'] = fixture['away_team']
            future_rows.append(away_players)
            
    if not future_rows:
        logger.warning("No future scheduled player data could be generated.")
        return df_historical 
        
    df_future = pd.concat(future_rows, ignore_index=True)
    
    # Add fixture context columns to the future rows
    context_cols = ['datetime', 'match_date', 'matchweek', 'status']
    df_future = pd.merge(
        df_future, 
        df_future_fixtures[context_cols + ['home_team', 'away_team']],
        on=['home_team', 'away_team'],
        how='left'
    )
    
    # Add the defensive factors for future matches (MA5 will use these)
    df_future = pd.merge(
        df_future, 
        df_team_def.drop(columns=['sot_conceded', 'tackles_att_3rd'], errors='ignore'), # Only merge to match structure
        on=['match_date', 'team_name'],
        how='left'
    )
    
    # Set prediction-specific columns to NaN for future games
    for col in ['summary_sot', 'summary_min', 'sot_conceded', 'tackles_att_3rd']:
        if col not in df_future.columns:
             df_future[col] = np.nan
        else:
             df_future[col] = df_future[col].apply(lambda x: np.nan if pd.isna(x) else x) # Ensure NaN for prediction

    # --- C. COMBINE HISTORICAL AND FUTURE DATA ---
    df_final = pd.concat([df_historical, df_future], ignore_index=True)

    df_final = df_final.sort_values(by=['match_datetime', 'player_id']).reset_index(drop=True)
    logger.info(f"Final merged data loaded: {df_final.shape}")
    
    return df_final


def calculate_ma5_factors(df: pd.DataFrame) -> pd.DataFrame:
    """Calculates all Player (P-Factors) and Opponent (O-Factors) MA5 metrics."""
    df_processed = df.copy()
    
    # Ensure 'summary_sot' and 'summary_min' are present before renaming
    if 'summary_sot' not in df_processed.columns or 'summary_min' not in df_processed.columns:
        df_processed['summary_sot'] = np.nan
        df_processed['summary_min'] = np.nan
        
    # Rename for MA5 calculation: 'summary_sot' -> 'sot', 'summary_min' -> 'min'
    df_processed.rename(columns={'summary_sot': 'sot', 'summary_min': 'min'}, inplace=True)
    
    # Calculate P-Factors (Player MA5s)
    for col in MA5_METRICS:
        df_processed[f'{col}_MA5'] = (
            df_processed.groupby('player_id')[col]
            .transform(lambda x: x.rolling(window=MIN_PERIODS, min_periods=1, closed='left').mean())
        )
        
    # Determine the opponent team
    df_processed['opponent_team'] = np.where(
        df_processed['team_side'] == 'home', 
        df_processed['away_team'], 
        df_processed['home_team']
    )
    
    # Calculate O-Factors (Opponent MA5s)
    for col in OPP_METRICS:
        # The defensive MA5 is calculated based on the OPPONENT'S HISTORICAL PERFORMANCE
        df_processed[f'{col}_MA5'] = (
            df_processed.groupby('opponent_team')[col]
            .transform(lambda x: x.rolling(window=MIN_PERIODS, min_periods=1, closed='left').mean())
        )
        
    return df_processed

def get_live_gameweek_features(df_processed: pd.DataFrame) -> pd.DataFrame:
    """Filters the processed data to get the features for the next scheduled gameweek."""
    
    # 1. Filter for all scheduled games
    scheduled_games = df_processed[df_processed['status'] == 'scheduled']
    
    if scheduled_games.empty:
        logger.warning("No rows found with status='scheduled'. Check your Supabase data.")
        return pd.DataFrame()
    
    logger.info(f"Total scheduled player rows found: {len(scheduled_games)}")
        
    # 2. Identify the next gameweek
    next_gameweek = scheduled_games['matchweek'].min()
    logger.info(f"Targeting predictions for Gameweek {next_gameweek}.")
    
    # 3. Filter for the target gameweek
    df_live = scheduled_games[scheduled_games['matchweek'] == next_gameweek].copy()
    
    # Log fixtures (for context)
    target_fixtures = df_live[['match_date', 'home_team', 'away_team']].drop_duplicates()
    logger.info(f"Fixtures in Gameweek {next_gameweek}:")
    for _, row in target_fixtures.iterrows():
        match_date_str = row['match_date'].strftime('%Y-%m-%d')
        logger.info(f"  {row['home_team']} vs {row['away_team']} on {match_date_str}")

    REQUIRED_MA5_COLUMNS = [f'{col}_MA5' for col in MA5_METRICS + OPP_METRICS]
    initial_rows = len(df_live)
    
    # Filter 1: Drop players with insufficient historical data (MA5 factors are NaN)
    df_live.dropna(subset=REQUIRED_MA5_COLUMNS, inplace=True)
    dropped_history_count = initial_rows - len(df_live)
    
    # 4. Impute the final input column 'summary_min' with the rolling minute average 'min_MA5'
    df_live['summary_min'] = df_live['min_MA5']
    
    # Filter 2: Drop players with low expected minutes (less than 45 min average)
    initial_rows_after_history = len(df_live)
    df_live_after_min_filter = df_live[df_live['summary_min'] >= MIN_EXPECTED_MINUTES].copy()
    dropped_minutes_count = initial_rows_after_history - len(df_live_after_min_filter)
    
    # Filter 3: Drop players with low offensive intent (SOT MA5 below 0.1)
    initial_rows_after_min_filter = len(df_live_after_min_filter)
    df_live_final = df_live_after_min_filter[df_live_after_min_filter['sot_MA5'] >= MIN_SOT_MA5].copy()
    dropped_sot_count = initial_rows_after_min_filter - len(df_live_final)
    
    
    logger.info(f"Dropped {dropped_history_count} players with insufficient historical data.")
    logger.info(f"Dropped {dropped_minutes_count} players with expected minutes < {MIN_EXPECTED_MINUTES} (low playing time risk).")
    logger.info(f"Dropped {dropped_sot_count} players with SOT MA5 < {MIN_SOT_MA5} (low offensive intent, e.g., Mavropanos).")
    
    # The final working dataframe for prediction is df_live_final
    
    # *** NEW DEBUGGING STEP: Show the input data for the few remaining players ***
    if not df_live_final.empty:
        # The MA5 columns must reference the name used for calculation ('min_MA5')
        log_cols_ma5 = [f'{col}_MA5' for col in ['sot_conceded', 'tackles_att_3rd', 'sot', 'min']] 
        log_cols = ['player_name', 'summary_min'] + log_cols_ma5
        
        # Check which logging columns exist
        existing_log_cols = [col for col in log_cols if col in df_live_final.columns]

        logger.info("\nRaw Features for Players Being Predicted (Filtered for Time & SOT):")
        logger.info(df_live_final[existing_log_cols].to_string(index=False))
        
    return df_live_final

def load_artifacts():
    """Loads the trained model and the required scaling statistics."""
    logger.info("Loading model and scaling statistics...")
    with open(MODEL_FILE, 'rb') as f:
        model = pickle.load(f)
    with open(SCALER_STATS_FILE, 'r') as f:
        stats_dict = json.load(f)
    scaler_data = pd.DataFrame(stats_dict).T
    return model, scaler_data

def scale_live_data(df_raw, scaler_data):
    """Standardizes the live MA5 feature data using training stats."""
    df_features = df_raw.copy()
    scaled_feature_stems = [col.replace('_scaled', '') for col in PREDICTOR_COLUMNS if col != 'summary_min']
    
    # Check if any feature stems are missing from the raw data
    for feature_stem in scaled_feature_stems:
        if feature_stem not in df_features.columns:
             logger.error(f"FATAL: MA5 column '{feature_stem}' is missing before scaling. Check MA5 calculation.")
             return None

    for feature_stem in scaled_feature_stems:
        raw_col = feature_stem
        scaled_col = f'{feature_stem}_scaled'
        
        # Guard against key missing in scaler data (shouldn't happen if artifacts are correct)
        if raw_col not in scaler_data.index:
            logger.error(f"Feature '{raw_col}' not found in scaler data. Skipping scale.")
            continue
            
        mu = scaler_data.loc[raw_col, 'mean']
        sigma = scaler_data.loc[raw_col, 'std']
        
        # Check for division by zero
        if sigma == 0:
            df_features[scaled_col] = 0 
        else:
            df_features[scaled_col] = (df_features[raw_col] - mu) / sigma
            
    # Include the unscaled 'summary_min' in the final features
    final_features = df_features[PREDICTOR_COLUMNS] 
    final_features = sm.add_constant(final_features, has_constant='add') 
    return final_features

def run_predictions(model, df_features_scaled, df_raw):
    """Generates predictions and calculates probabilities."""
    logger.info(f"Generating predictions for {len(df_raw)} players...")
    
    # Ensure all required columns are present in df_features_scaled before prediction
    if not all(col in df_features_scaled.columns for col in PREDICTOR_COLUMNS + ['const']):
        logger.error("Missing required feature columns in scaled data for prediction.")
        return

    df_raw['E_SOT'] = model.predict(df_features_scaled)
    df_raw['P_SOT_1_Plus'] = 1 - np.exp(-df_raw['E_SOT'])
    report = df_raw.sort_values(by='P_SOT_1_Plus', ascending=False)
    final_report = report[[
        'player_id', 'player_name', 'team_name', 'opponent_team', 
        'E_SOT', 'P_SOT_1_Plus', 'summary_min', 'match_datetime'
    ]].rename(columns={'summary_min': 'expected_minutes', 'team_name': 'team', 'opponent_team': 'opponent'}).round(3)
    final_report.to_csv(PREDICTION_OUTPUT, index=False)
    logger.info(f"Prediction report saved to {PREDICTION_OUTPUT}. Top 5 recommendations:")
    logger.info("\n" + final_report.head(5).to_string(index=False))
    return final_report

def main():
    logger.info("--- Starting Live Prediction Service ---")
    
    # 1. Load Model Artifacts
    try:
        model, scaler_data = load_artifacts()
    except FileNotFoundError as e:
        logger.critical(f"💥 Failed to load model artifacts: {e}. Check that '{MODEL_FILE}' and '{SCALER_STATS_FILE}' are accessible via the path set in ARTIFACT_PATH.")
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
    
    # ⚠️ Safely create an empty output file if no predictions are made
    if df_live_raw.empty:
        logger.warning("Exiting: No scheduled games or players with sufficient history were processed. Creating empty report file.")
        empty_cols = ['player_id', 'player_name', 'team_name', 'opponent_team', 'E_SOT', 'P_SOT_1_Plus', 'expected_minutes', 'match_datetime']
        empty_report = pd.DataFrame(columns=empty_cols)
        empty_report.to_csv(PREDICTION_OUTPUT, index=False)
        return
        
    # 4. Scale Live Features
    df_scaled_input = scale_live_data(df_live_raw, scaler_data)

    # Handle the case where scaling failed (returned None)
    if df_scaled_input is None:
        logger.error("Prediction aborted due to missing MA5 features after filtering.")
        return
    
    # 5. Run Prediction and Save Report
    run_predictions(model, df_scaled_input, df_live_raw)
    
    logger.info("--- Live Prediction Service Complete ---")

if __name__ == '__main__':
    main()
