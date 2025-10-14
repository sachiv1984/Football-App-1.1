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

# ✅ PROPER FILTER THRESHOLDS (based on training criteria)
MIN_EXPECTED_MINUTES = 15.0  # Same as training: minimum 15 mins average
MIN_SOT_MA5 = 0.1            # Same as training: minimum 0.1 SOT per match
MIN_MATCHES_PLAYED = 5       # Require at least 5 historical matches for reliable MA5

PREDICTOR_COLUMNS = [
    'sot_conceded_MA5_scaled', 'tackles_att_3rd_MA5_scaled', 
    'sot_MA5_scaled', 'min_MA5_scaled', 'summary_min'
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
    Appends placeholder rows for future scheduled fixtures.
    """
    
    # 1. Fetch ALL Fixtures Data
    fixture_cols = "datetime, hometeam, awayteam, matchweek, status" 
    df_fixtures = fetch_all_data_from_supabase(
        table_name="fixtures", 
        select_columns=fixture_cols,
        order_by_column="datetime" 
    ).rename(columns={'hometeam': 'home_team', 'awayteam': 'away_team'})
    
    df_fixtures['datetime'] = pd.to_datetime(df_fixtures['datetime'], utc=True)
    df_fixtures['match_date'] = df_fixtures['datetime'].dt.date
    if df_fixtures.empty:
        return pd.DataFrame()

    # Normalize status and add debug logging
    df_fixtures['status'] = df_fixtures['status'].astype(str).str.strip().str.lower()
    
    logger.info(f"Loaded {len(df_fixtures)} total fixtures")
    logger.info(f"Unique status values: {df_fixtures['status'].unique().tolist()}")
    
    # Identify future fixtures by datetime instead of relying only on status
    # Use timezone-aware timestamp for comparison
    now = pd.Timestamp.now(tz='UTC')
    df_fixtures['is_future'] = df_fixtures['datetime'] > now
    
    future_count = df_fixtures['is_future'].sum()
    logger.info(f"Fixtures in the future (datetime > now): {future_count}")
    
    # --- A. BUILD HISTORICAL DATA (Finished Games) ---
    
    # 2. Player Stats (P-Factors Source) - HISTORICAL ONLY
    player_cols = "player_id, player_name, team_name, summary_sot, summary_min, home_team, away_team, team_side, match_datetime"
    df_player_history = fetch_all_data_from_supabase(
        table_name="player_match_stats", 
        select_columns=player_cols,
        order_by_column="match_datetime" 
    )
    if df_player_history.empty:
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

    # 4. Join Player and Team Defense Data
    df_historical = pd.merge(
        df_player_history,
        df_team_def,
        on=['match_date', 'team_name'],
        how='left' 
    )
    
    # 5. Join with Fixtures to get Status and Matchweek
    df_historical = pd.merge(
        df_historical,
        df_fixtures[['match_date', 'home_team', 'away_team', 'matchweek', 'status']], 
        on=['match_date', 'home_team', 'away_team'],
        how='left'
    )
    
    # --- B. BUILD FUTURE DATA (Scheduled Games) ---
    
    # Get active players (those with sufficient history)
    player_match_counts = df_player_history.groupby('player_id').size()
    active_players = df_player_history[
        df_player_history['player_id'].isin(
            player_match_counts[player_match_counts >= MIN_MATCHES_PLAYED].index
        )
    ][['player_id', 'player_name', 'team_name']].drop_duplicates()
    
    logger.info(f"Found {len(active_players)} active players with >= {MIN_MATCHES_PLAYED} matches")
    
    # Get scheduled fixtures - use multiple methods to identify future games
    # Method 1: Check for 'scheduled' or similar status
    # Method 2: Use datetime to identify future fixtures
    df_future_fixtures = df_fixtures[
        (df_fixtures['status'].isin(['scheduled', 'fixture', 'upcoming', 'not started'])) | 
        (df_fixtures['is_future'])
    ].copy()
    
    logger.info(f"Future fixtures identified: {len(df_future_fixtures)}")
    
    if df_future_fixtures.empty:
        logger.warning("No scheduled fixtures found. Checking fixture status values...")
        logger.warning(f"Available status values: {df_fixtures['status'].value_counts().to_dict()}")
        return df_historical
    
    # Cross-join active players with scheduled fixtures
    future_rows = []
    for _, fixture in df_future_fixtures.iterrows():
        # Home team players
        home_players = active_players[active_players['team_name'] == fixture['home_team']].copy()
        if not home_players.empty:
            home_players['team_side'] = 'home'
            home_players['home_team'] = fixture['home_team']
            home_players['away_team'] = fixture['away_team']
            home_players['match_date'] = fixture['match_date']
            home_players['match_datetime'] = fixture['datetime']  # ✅ FIX: Preserve datetime
            home_players['matchweek'] = fixture['matchweek']
            home_players['status'] = fixture['status']
            future_rows.append(home_players)
            
        # Away team players
        away_players = active_players[active_players['team_name'] == fixture['away_team']].copy()
        if not away_players.empty:
            away_players['team_side'] = 'away'
            away_players['home_team'] = fixture['home_team']
            away_players['away_team'] = fixture['away_team']
            away_players['match_date'] = fixture['match_date']
            away_players['match_datetime'] = fixture['datetime']  # ✅ FIX: Preserve datetime
            away_players['matchweek'] = fixture['matchweek']
            away_players['status'] = fixture['status']
            future_rows.append(away_players)
            
    if not future_rows:
        logger.warning("No future scheduled player data could be generated.")
        return df_historical 
        
    df_future = pd.concat(future_rows, ignore_index=True)
    
    # Set prediction-specific columns to NaN for future games
    for col in ['summary_sot', 'summary_min', 'sot_conceded', 'tackles_att_3rd']:
        df_future[col] = np.nan

    # --- C. COMBINE HISTORICAL AND FUTURE DATA ---
    df_final = pd.concat([df_historical, df_future], ignore_index=True)
    df_final = df_final.sort_values(by=['match_datetime', 'player_id']).reset_index(drop=True)
    
    logger.info(f"Final merged data: {len(df_historical)} historical + {len(df_future)} future = {len(df_final)} total rows")
    
    return df_final


def calculate_ma5_factors(df: pd.DataFrame) -> pd.DataFrame:
    """Calculates all Player (P-Factors) and Opponent (O-Factors) MA5 metrics."""
    df_processed = df.copy()
    
    # Ensure columns exist
    if 'summary_sot' not in df_processed.columns:
        df_processed['summary_sot'] = np.nan
    if 'summary_min' not in df_processed.columns:
        df_processed['summary_min'] = np.nan
        
    # Rename for MA5 calculation
    df_processed.rename(columns={'summary_sot': 'sot', 'summary_min': 'min'}, inplace=True)
    
    # Calculate P-Factors (Player MA5s)
    for col in MA5_METRICS:
        df_processed[f'{col}_MA5'] = (
            df_processed.groupby('player_id')[col]
            .transform(lambda x: x.rolling(window=MIN_PERIODS, min_periods=1, closed='left').mean())
        )
        
    # Determine opponent team
    df_processed['opponent_team'] = np.where(
        df_processed['team_side'] == 'home', 
        df_processed['away_team'], 
        df_processed['home_team']
    )
    
    # Calculate O-Factors (Opponent MA5s)
    for col in OPP_METRICS:
        df_processed[f'{col}_MA5'] = (
            df_processed.groupby('opponent_team')[col]
            .transform(lambda x: x.rolling(window=MIN_PERIODS, min_periods=1, closed='left').mean())
        )
        
    return df_processed

def get_live_gameweek_features(df_processed: pd.DataFrame) -> pd.DataFrame:
    """Filters the processed data to get features for the next scheduled gameweek."""
    
    # 1. Filter for scheduled/future games using flexible criteria
    scheduled_games = df_processed[
        (df_processed['status'].isin(['scheduled', 'fixture', 'upcoming', 'not started'])) |
        (df_processed.get('is_future', False) == True)
    ].copy()
    
    if scheduled_games.empty:
        logger.warning("No rows found with future game indicators")
        logger.warning(f"Available status values in processed data: {df_processed['status'].value_counts().to_dict()}")
        return pd.DataFrame()
    
    logger.info(f"Total scheduled player rows: {len(scheduled_games)}")
    
    # 2. Identify next gameweek
    next_gameweek = scheduled_games['matchweek'].min()
    logger.info(f"Targeting predictions for Gameweek {next_gameweek}")
    
    # 3. Filter for target gameweek
    df_live = scheduled_games[scheduled_games['matchweek'] == next_gameweek].copy()
    
    # Log fixtures
    target_fixtures = df_live[['match_datetime', 'home_team', 'away_team']].drop_duplicates()
    logger.info(f"\nFixtures in Gameweek {next_gameweek}:")
    for _, row in target_fixtures.iterrows():
        dt = pd.to_datetime(row['match_datetime'])
        logger.info(f"  {dt.strftime('%Y-%m-%d %H:%M')} - {row['home_team']} vs {row['away_team']}")

    # Required MA5 columns
    REQUIRED_MA5_COLUMNS = [f'{col}_MA5' for col in MA5_METRICS + OPP_METRICS]
    
    initial_count = len(df_live)
    
    # ✅ FILTER 1: Drop players with insufficient MA5 history
    df_live = df_live.dropna(subset=REQUIRED_MA5_COLUMNS).copy()
    dropped_history = initial_count - len(df_live)
    logger.info(f"Filter 1 (History): Dropped {dropped_history} players without complete MA5 data")
    
    if df_live.empty:
        logger.warning("No players remain after history filter")
        return pd.DataFrame()
    
    # ✅ FILTER 2: Drop players with low expected minutes (based on historical average)
    df_live = df_live[df_live['min_MA5'] >= MIN_EXPECTED_MINUTES].copy()
    dropped_minutes = len(df_live.dropna(subset=['min_MA5'])) if not df_live.empty else 0
    after_min_filter = len(df_live)
    logger.info(f"Filter 2 (Minutes): Dropped {initial_count - dropped_history - after_min_filter} players with min_MA5 < {MIN_EXPECTED_MINUTES}")
    
    if df_live.empty:
        logger.warning("No players remain after minutes filter")
        return pd.DataFrame()
    
    # ✅ FILTER 3: Drop players with low offensive output (defenders, etc.)
    before_sot_filter = len(df_live)
    df_live = df_live[df_live['sot_MA5'] >= MIN_SOT_MA5].copy()
    dropped_sot = before_sot_filter - len(df_live)
    logger.info(f"Filter 3 (Offense): Dropped {dropped_sot} players with sot_MA5 < {MIN_SOT_MA5}")
    
    if df_live.empty:
        logger.warning("No players remain after offensive filter")
        return pd.DataFrame()
    
    # 4. Set expected minutes for prediction (use historical average)
    df_live['summary_min'] = df_live['min_MA5']
    
    # Log final player count
    logger.info(f"\n✅ {len(df_live)} players qualified for prediction")
    
    # Show sample of qualified players
    if len(df_live) > 0:
        sample_cols = ['player_name', 'team_name', 'opponent_team', 'sot_MA5', 'min_MA5', 'sot_conceded_MA5']
        logger.info("\nSample of qualified players:")
        logger.info(df_live[sample_cols].head(10).to_string(index=False))
    
    return df_live

def load_artifacts():
    """Loads the trained model and scaling statistics."""
    logger.info("Loading model and scaling statistics...")
    with open(MODEL_FILE, 'rb') as f:
        model = pickle.load(f)
    with open(SCALER_STATS_FILE, 'r') as f:
        stats_dict = json.load(f)
    scaler_data = pd.DataFrame(stats_dict).T
    return model, scaler_data

def scale_live_data(df_raw, scaler_data):
    """Standardizes the live MA5 features using training stats."""
    df_features = df_raw.copy()
    scaled_feature_stems = [col.replace('_scaled', '') for col in PREDICTOR_COLUMNS if col != 'summary_min']
    
    # Check for missing features
    for feature_stem in scaled_feature_stems:
        if feature_stem not in df_features.columns:
            logger.error(f"FATAL: MA5 column '{feature_stem}' missing before scaling")
            return None

    # Scale each MA5 feature
    for feature_stem in scaled_feature_stems:
        raw_col = feature_stem
        scaled_col = f'{feature_stem}_scaled'
        
        if raw_col not in scaler_data.index:
            logger.error(f"Feature '{raw_col}' not found in scaler data")
            continue
            
        mu = scaler_data.loc[raw_col, 'mean']
        sigma = scaler_data.loc[raw_col, 'std']
        
        if sigma == 0:
            df_features[scaled_col] = 0 
        else:
            df_features[scaled_col] = (df_features[raw_col] - mu) / sigma
            
    # Include unscaled summary_min
    final_features = df_features[PREDICTOR_COLUMNS] 
    final_features = sm.add_constant(final_features, has_constant='add') 
    return final_features

def run_predictions(model, df_features_scaled, df_raw):
    """Generates predictions and calculates probabilities."""
    logger.info(f"\nGenerating predictions for {len(df_raw)} players...")
    
    if not all(col in df_features_scaled.columns for col in PREDICTOR_COLUMNS + ['const']):
        logger.error("Missing required feature columns for prediction")
        return None

    df_raw['E_SOT'] = model.predict(df_features_scaled)
    df_raw['P_SOT_1_Plus'] = 1 - np.exp(-df_raw['E_SOT'])
    
    # Create report
    report = df_raw.sort_values(by='E_SOT', ascending=False).copy()
    
    final_report = report[[
        'player_id', 'player_name', 'team_name', 'opponent_team', 
        'E_SOT', 'P_SOT_1_Plus', 'min_MA5', 'sot_MA5', 'match_datetime'
    ]].rename(columns={
        'min_MA5': 'expected_minutes',
        'sot_MA5': 'recent_sot_avg',
        'team_name': 'team',
        'opponent_team': 'opponent'
    }).round(3)
    
    final_report.to_csv(PREDICTION_OUTPUT, index=False)
    
    logger.info(f"\n✅ Prediction report saved to {PREDICTION_OUTPUT}")
    logger.info(f"\nTop 10 Recommendations (by Expected SOT):\n")
    logger.info(final_report.head(10).to_string(index=False))
    
    return final_report

def main():
    logger.info("=" * 70)
    logger.info("STARTING LIVE PREDICTION SERVICE")
    logger.info("=" * 70)
    
    # 1. Load Model Artifacts
    try:
        model, scaler_data = load_artifacts()
    except FileNotFoundError as e:
        logger.critical(f"Failed to load model artifacts: {e}")
        logger.critical(f"Check paths: MODEL_FILE={MODEL_FILE}, SCALER_STATS_FILE={SCALER_STATS_FILE}")
        return
    except Exception as e:
        logger.error(f"Error loading artifacts: {e}")
        return

    # 2. Fetch and Process Data
    df_combined_raw = load_and_merge_raw_data()
    if df_combined_raw.empty:
        logger.error("No data loaded from database")
        return

    df_processed = calculate_ma5_factors(df_combined_raw)
    
    # 3. Filter for Next Gameweek
    df_live_raw = get_live_gameweek_features(df_processed)
    
    if df_live_raw.empty:
        logger.warning("No players qualified for prediction. Creating empty report.")
        empty_cols = ['player_id', 'player_name', 'team', 'opponent', 'E_SOT', 'P_SOT_1_Plus', 'expected_minutes', 'recent_sot_avg', 'match_datetime']
        pd.DataFrame(columns=empty_cols).to_csv(PREDICTION_OUTPUT, index=False)
        return
        
    # 4. Scale Features
    df_scaled_input = scale_live_data(df_live_raw, scaler_data)
    if df_scaled_input is None:
        logger.error("Scaling failed. Aborting prediction.")
        return
    
    # 5. Run Predictions
    report = run_predictions(model, df_scaled_input, df_live_raw)
    
    logger.info("\n" + "=" * 70)
    logger.info("LIVE PREDICTION SERVICE COMPLETE")
    logger.info("=" * 70)

if __name__ == '__main__':
    main()