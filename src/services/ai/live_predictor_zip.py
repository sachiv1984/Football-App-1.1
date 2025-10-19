"""
Live Predictor with Zero-Inflated Poisson (ZIP) Model Support

This version can use either:
1. Standard Poisson model (poisson_model.pkl)
2. Zero-Inflated Poisson model (zip_model.pkl)

Set MODEL_TYPE = 'zip' or 'poisson' to choose.
"""

import os
import sys
import pandas as pd
import numpy as np
import pickle
import statsmodels.api as sm
import logging
import json
from supabase import create_client, Client
from dotenv import load_dotenv

# ✅ Fix: ensure project root is on Python path BEFORE imports
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# ✅ Import the fixed utility function
from src.services.ai.utils.supabase_utils import fetch_with_deduplication

# --- Configuration and Setup ---

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

load_dotenv() 

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") 

# --- AI Artifacts and Model Configuration ---
ARTIFACT_PATH = "src/services/ai/artifacts/" 

# ✅ CHOOSE MODEL TYPE: 'zip' or 'poisson'
MODEL_TYPE = os.getenv("MODEL_TYPE", "zip")  # Default to ZIP model

if MODEL_TYPE == 'zip':
    MODEL_FILE = ARTIFACT_PATH + "zip_model.pkl"
    STATS_FILE = ARTIFACT_PATH + "zip_training_stats.json"
else:
    MODEL_FILE = ARTIFACT_PATH + "poisson_model.pkl"
    STATS_FILE = ARTIFACT_PATH + "training_stats.json"

PREDICTION_OUTPUT = "gameweek_sot_recommendations.csv"
MIN_PERIODS = 5

# ✅ PROPER FILTER THRESHOLDS (based on training criteria)
MIN_EXPECTED_MINUTES = 15.0
MIN_SOT_MA5 = 0.1
MIN_MATCHES_PLAYED = 3

# FIX 1: Add the positional dummy variables to match the 8-parameter model (7 features + const)
PREDICTOR_COLUMNS = [
    'sot_conceded_MA5_scaled', 'tackles_att_3rd_MA5_scaled', 
    'sot_MA5_scaled', 'min_MA5_scaled', 'summary_min',
    'is_forward', 'is_defender' 
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

def load_and_merge_raw_data() -> pd.DataFrame:
    """Load and merge all raw data for predictions."""
    
    fixture_cols = "datetime, hometeam, awayteam, matchweek, status" 
    df_fixtures = fetch_with_deduplication(
        supabase_client=supabase,
        table_name="fixtures", 
        select_columns=fixture_cols,
        order_by="datetime"
    ).rename(columns={'hometeam': 'home_team', 'awayteam': 'away_team'})
    
    df_fixtures['datetime'] = pd.to_datetime(df_fixtures['datetime'], utc=True)
    df_fixtures['match_date'] = df_fixtures['datetime'].dt.date
    if df_fixtures.empty:
        return pd.DataFrame()

    df_fixtures['status'] = df_fixtures['status'].astype(str).str.strip().str.lower()
    now = pd.Timestamp.now(tz='UTC')
    df_fixtures['is_future'] = df_fixtures['datetime'] > now

    # MODIFIED: Include 'summary_positions' from the player_match_stats table
    player_cols = "player_id, player_name, team_name, summary_sot, summary_min, home_team, away_team, team_side, match_datetime, summary_positions"
    df_player_history = fetch_with_deduplication(
        supabase_client=supabase,
        table_name="player_match_stats", 
        select_columns=player_cols,
        order_by="match_datetime"
    )

    df_player_history['summary_min'] = pd.to_numeric(df_player_history['summary_min'], errors='coerce')
    df_player_history['match_datetime'] = pd.to_datetime(df_player_history['match_datetime'], utc=True)
    df_player_history['match_date'] = df_player_history['match_datetime'].dt.date 

    merge_keys = ['match_date', 'team_name']
    df_shooting_def = fetch_with_deduplication(
        supabase_client=supabase,
        table_name="team_shooting_stats", 
        select_columns="match_date, team_name, opp_shots_on_target",
        order_by="match_date"
    ).rename(columns={'opp_shots_on_target': 'sot_conceded'})
    
    df_tackle_def = fetch_with_deduplication(
        supabase_client=supabase,
        table_name="team_defense_stats", 
        select_columns="match_date, team_name, team_tackles_att_3rd",
        order_by="match_date"
    ).rename(columns={'team_tackles_att_3rd': 'tackles_att_3rd'})
    
    df_team_def = pd.merge(df_shooting_def, df_tackle_def, on=merge_keys, how='inner')
    df_team_def['match_date'] = pd.to_datetime(df_team_def['match_date']).dt.date
    
    df_historical = pd.merge(df_player_history, df_team_def, on=['match_date', 'team_name'], how='left')
    df_historical = pd.merge(
        df_historical,
        df_fixtures[['match_date', 'home_team', 'away_team', 'matchweek', 'status', 'datetime']], 
        on=['match_date', 'home_team', 'away_team'],
        how='left',
        suffixes=('', '_fixture')
    )

    df_historical['match_datetime'] = df_historical['match_datetime'].fillna(df_historical['datetime'])
    df_historical.drop(columns=['datetime'], errors='ignore', inplace=True)
    
    player_match_counts = df_player_history.groupby('player_id').size().reset_index(name='match_count')
    qualified_player_ids = player_match_counts[player_match_counts['match_count'] >= MIN_MATCHES_PLAYED]['player_id'].tolist()
    
    # MODIFIED: Preserve 'summary_positions' for future fixtures
    active_players = (
        df_player_history[df_player_history['player_id'].isin(qualified_player_ids)]
        .sort_values('match_datetime')
        .groupby('player_id')
        .last()[['player_name', 'team_name', 'summary_positions']]
        .reset_index()
    )
    
    df_future_fixtures = df_fixtures[
        (df_fixtures['status'].isin(['scheduled', 'fixture', 'upcoming', 'not started'])) | 
        (df_fixtures['is_future'])
    ].copy()
    
    future_rows = []
    for _, fixture in df_future_fixtures.iterrows():
        for side, team, opp in [('home', fixture['home_team'], fixture['away_team']), ('away', fixture['away_team'], fixture['home_team'])]:
            side_players = active_players[active_players['team_name'] == team].copy()
            if side_players.empty:
                continue
            side_players['team_side'] = side
            side_players['home_team'] = fixture['home_team']
            side_players['away_team'] = fixture['away_team']
            side_players['match_date'] = fixture['match_date']
            side_players['match_datetime'] = fixture['datetime']
            side_players['matchweek'] = fixture['matchweek']
            side_players['status'] = fixture['status']
            future_rows.append(side_players)
            
    df_future = pd.concat(future_rows, ignore_index=True) if future_rows else pd.DataFrame()
    for col in ['summary_sot', 'summary_min', 'sot_conceded', 'tackles_att_3rd']:
        df_future[col] = np.nan
    
    df_final = pd.concat([df_historical, df_future], ignore_index=True)
    df_final = df_final.sort_values(by=['match_datetime', 'player_id']).reset_index(drop=True)
    return df_final

def clean_and_enrich_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    CLEANED: Creates positional dummy variables (is_forward, is_defender) 
    using the reliable 'summary_positions' column fetched from the database.
    """
    df_enriched = df.copy()
    
    # Ensure position is uppercase string for reliable comparison
    df_enriched['position'] = df_enriched['summary_positions'].astype(str).str.upper()
    
    # --- Create Positional Dummy Variables ---
    
    # is_forward: Checks for common forward keywords (FWD, ATT, ST, CF, RW, LW)
    df_enriched['is_forward'] = np.where(
        df_enriched['position'].str.contains('FWD|ATT|ST|CF|RW|LW'), 
        1, 
        0
    )
    
    # is_defender: Checks for common defender keywords (DEF, CB, LB, RB, LWB, RWB)
    df_enriched['is_defender'] = np.where(
        df_enriched['position'].str.contains('DEF|LB|RB|CB|LCB|RCB|LWB|RWB'), 
        1, 
        0
    )
    
    # Note: Midfielders (MID) and Goalkeepers (GK) become the reference group (is_forward=0, is_defender=0)
    
    logger.info(f"✅ Position data successfully converted to dummies.")
    logger.info(f"  Enriched data shape: {df_enriched.shape}")
    
    return df_enriched


def calculate_ma5_factors(df: pd.DataFrame) -> pd.DataFrame:
    """Calculate MA5 factors for players and opponents."""
    df_processed = df.copy()
    df_processed.rename(columns={'summary_sot': 'sot', 'summary_min': 'min'}, inplace=True)
    
    for col in MA5_METRICS:
        df_processed[f'{col}_MA5'] = (
            df_processed.groupby('player_id')[col]
            .transform(lambda x: x.rolling(window=MIN_PERIODS, min_periods=1, closed='left').mean())
        )
        
    df_processed['opponent_team'] = np.where(
        df_processed['team_side'] == 'home', 
        df_processed['away_team'], 
        df_processed['home_team']
    )
    
    for col in OPP_METRICS:
        df_processed[f'{col}_MA5'] = (
            df_processed.groupby('opponent_team')[col]
            .transform(lambda x: x.rolling(window=MIN_PERIODS, min_periods=1, closed='left').mean())
        )
    return df_processed


def get_live_gameweek_features(df_processed: pd.DataFrame) -> pd.DataFrame:
    """Filter for live gameweek and apply qualification criteria."""
    scheduled_games = df_processed[
        (df_processed['status'].isin(['scheduled', 'fixture', 'upcoming', 'not started'])) |
        (df_processed.get('is_future', False) == True)
    ].copy()
    
    if scheduled_games.empty:
        return pd.DataFrame()
    
    next_gameweek = scheduled_games['matchweek'].min()
    df_live = scheduled_games[scheduled_games['matchweek'] == next_gameweek].copy()
    
    REQUIRED_MA5_COLUMNS = [f'{col}_MA5' for col in MA5_METRICS + OPP_METRICS]
    df_live = df_live.dropna(subset=REQUIRED_MA5_COLUMNS).copy()
    df_live = df_live[df_live['min_MA5'] >= MIN_EXPECTED_MINUTES].copy()
    df_live = df_live[df_live['sot_MA5'] >= MIN_SOT_MA5].copy()
    
    # Set the 'summary_min' feature to the calculated MA5 min for live prediction
    df_live['summary_min'] = df_live['min_MA5'] 
    return df_live


def load_artifacts():
    """Load model and scaling statistics."""
    logger.info(f"Loading {MODEL_TYPE.upper()} model and scaling statistics...")
    
    try:
        with open(MODEL_FILE, 'rb') as f:
            model = pickle.load(f)
        logger.info(f"✅ Model loaded from: {MODEL_FILE}")
        
        with open(STATS_FILE, 'r') as f:
            stats_dict = json.load(f)
        
        # Handle different stats file formats
        if 'model_type' in stats_dict:
            # New format from ZIP trainer
            logger.info(f"   Model type: {stats_dict['model_type']}")
            # Load scaler stats from training_stats.json (always needed)
            scaler_file = ARTIFACT_PATH + "training_stats.json"
            with open(scaler_file, 'r') as f:
                scaler_dict = json.load(f)
            scaler_data = pd.DataFrame(scaler_dict).T
        else:
            # Old format (scaler stats directly)
            scaler_data = pd.DataFrame(stats_dict).T
        
        return model, scaler_data
        
    except FileNotFoundError as e:
        logger.error(f"❌ Model file not found: {e}")
        logger.error(f"   Expected: {MODEL_FILE}")
        logger.error(f"   Run zip_model_trainer.py first!")
        exit(1)


def scale_live_data(df_raw, scaler_data):
    """Scale features using training statistics."""
    df_features = df_raw.copy()
    # Correctly include all 7 features for scaling
    feature_stems_to_scale = [col.replace('_scaled', '') for col in PREDICTOR_COLUMNS if col not in ['summary_min', 'is_forward', 'is_defender']]
    
    for feature_stem in feature_stems_to_scale:
        mu = scaler_data.loc[feature_stem, 'mean']
        sigma = scaler_data.loc[feature_stem, 'std']
        df_features[f'{feature_stem}_scaled'] = (df_features[feature_stem] - mu) / sigma if sigma != 0 else 0
            
    # The final features are the scaled MA5 features + summary_min + the dummy variables
    final_features = df_features[PREDICTOR_COLUMNS]
    final_features = sm.add_constant(final_features, has_constant='add')
    return final_features


def run_predictions(model, df_features_scaled, df_raw, model_type='zip'):
    """Generate predictions using ZIP or Poisson model."""
    
    if model_type == 'zip':
        e_sot = model.predict(df_features_scaled, exog_infl=df_features_scaled)
        
        # Convert to simple array
        if hasattr(e_sot, 'values'):
            e_sot = e_sot.values
        e_sot = np.asarray(e_sot).ravel()
        if len(e_sot) > len(df_raw):
            e_sot = e_sot[:len(df_raw)]
        
        df_raw['E_SOT'] = e_sot
        
        # Calculate P(1+ SOT) for ZIP
        # Get P(Y=0) from the model
        prob_results = model.predict(df_features_scaled, which='prob', exog_infl=df_features_scaled)
        
        # Extract P(Y=0)
        if isinstance(prob_results, tuple):
            prob_zero = prob_results[0]
        else:
            prob_zero = prob_results
        
        # Convert to simple 1D numpy array
        if isinstance(prob_zero, pd.DataFrame):
            prob_zero = prob_zero.iloc[:, 0].values
        elif isinstance(prob_zero, pd.Series):
            prob_zero = prob_zero.values
        elif hasattr(prob_zero, 'values'):
            prob_zero = prob_zero.values
        
        prob_zero = np.asarray(prob_zero).ravel()
        
        # Truncate if needed
        if len(prob_zero) > len(df_raw):
            prob_zero = prob_zero[:len(df_raw)]
        
        # Validate length
        if len(prob_zero) != len(df_raw):
            raise ValueError(f"Length mismatch: prob_zero={len(prob_zero)}, df_raw={len(df_raw)}")
        
        # Calculate P(1+ SOT) = 1 - P(0)
        p_vals = [1 - p for p in prob_zero]
        df_raw['P_SOT_1_Plus'] = p_vals
        
        # Get P(structural zero) from inflation model
        prob_inflate = model.predict(df_features_scaled, which='prob-main', exog_infl=df_features_scaled)
        
        # Convert to simple 1D numpy array
        if isinstance(prob_inflate, pd.DataFrame):
            prob_inflate = prob_inflate.iloc[:, 0].values
        elif isinstance(prob_inflate, pd.Series):
            prob_inflate = prob_inflate.values
        elif hasattr(prob_inflate, 'values'):
            prob_inflate = prob_inflate.values
        
        prob_inflate = np.asarray(prob_inflate).ravel()
        
        # Truncate if needed
        if len(prob_inflate) > len(df_raw):
            prob_inflate = prob_inflate[:len(df_raw)]
        
        # Validate length
        if len(prob_inflate) != len(df_raw):
            raise ValueError(f"Length mismatch: prob_inflate={len(prob_inflate)}, df_raw={len(df_raw)}")
        
        # Assign as list
        df_raw['P_Never_Shooter'] = prob_inflate.tolist()
        
    else:
        # Standard Poisson predictions
        df_raw['E_SOT'] = model.predict(df_features_scaled)
        df_raw['P_SOT_1_Plus'] = 1 - np.exp(-df_raw['E_SOT'])
    
    report = df_raw.sort_values(by='E_SOT', ascending=False).copy()
    
    # Select columns for output
    output_cols = [
        'player_id', 'player_name', 'team_name', 'opponent_team', 
        'E_SOT', 'P_SOT_1_Plus', 'min_MA5', 'sot_MA5', 'match_datetime'
    ]
    
    # Add ZIP-specific column if available
    if 'P_Never_Shooter' in report.columns:
        output_cols.insert(6, 'P_Never_Shooter')
    
    final_report = report[output_cols].rename(columns={
        'min_MA5': 'expected_minutes',
        'sot_MA5': 'recent_sot_avg',
        'team_name': 'team',
        'opponent_team': 'opponent'
    }).round(3)
    
    final_report.to_csv(PREDICTION_OUTPUT, index=False)
    logger.info(f"✅ Prediction report saved to {PREDICTION_OUTPUT}")
    
    # Display top 10 predictions
    logger.info(f"\n🎯 TOP 10 PREDICTIONS (Gameweek {df_raw['matchweek'].iloc[0]}):")
    logger.info("─" * 100)
    
    display_cols = ['player_name', 'team', 'opponent', 'E_SOT', 'P_SOT_1_Plus']
    if 'P_Never_Shooter' in final_report.columns:
        display_cols.insert(4, 'P_Never_Shooter')
    
    logger.info(final_report[display_cols].head(10).to_string(index=False))
    logger.info("─" * 100)
    
    return final_report

def main():
    """Main execution pipeline."""
    logger.info("=" * 70)
    logger.info(f"STARTING LIVE PREDICTION SERVICE ({MODEL_TYPE.upper()} MODEL)")
    logger.info("=" * 70)
    
    # Load model
    model, scaler_data = load_artifacts()
    
    # Load and process data
    df_combined_raw = load_and_merge_raw_data()
    if df_combined_raw.empty:
        logger.error("No data loaded from database")
        return

    # NEW STEP: Enrich data with positional dummies (now using real data)
    df_enriched = clean_and_enrich_data(df_combined_raw)

    df_processed = calculate_ma5_factors(df_enriched)
    df_live_raw = get_live_gameweek_features(df_processed)
    
    if df_live_raw.empty:
        logger.warning("No players qualified for prediction.")
        return
    
    logger.info(f"\n📊 Qualified players: {len(df_live_raw)}")
        
    # Scale features
    df_scaled_input = scale_live_data(df_live_raw, scaler_data)
    
    # Generate predictions
    report = run_predictions(model, df_scaled_input, df_live_raw, model_type=MODEL_TYPE)
    
    logger.info("=" * 70)
    logger.info("LIVE PREDICTION SERVICE COMPLETE")
    logger.info("=" * 70)


if __name__ == '__main__':
    main()
