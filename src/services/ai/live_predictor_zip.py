"""
Live Predictor with Zero-Inflated Poisson (ZIP) Model Support - WITH DEBUG

This version can use either:
1. Standard Poisson model (poisson_model.pkl)
2. Zero-Inflated Poisson model (zip_model.pkl)

Set MODEL_TYPE = 'zip' or 'poisson' to choose.

✅ UPDATED 2025-10-19: Implemented position extraction and hybrid filtering logic.
✅ UPDATED 2025-10-27: Removed min_MA5_scaled from model features (redundant after position features).
✅ FIX APPLIED 2025-10-19: Correctly handles the simplified feature set for ZIP model prediction (exog_infl).
✅ DEBUG ADDED 2025-10-28: Added debug logging for star players
✅ FIX APPLIED 2025-10-29: Added 'is_home' feature to match 7-parameter models.
"""

import os
import sys
import pandas as pd
import numpy as np
import pickle
import statsmodels.api as sm
import logging
import json
import ast 
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
MODEL_TYPE = os.getenv("MODEL_TYPE", "poisson")  # ✅ CHANGED: Default to Poisson (recommended)

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

# --- Position Feature Configuration (NEW) ---
ATTACKING_DEFENDER_THRESHOLD = 0.3  # Min avg SOT to qualify as attacking defender

POSITION_MAPPING = {
    'GK': 'Goalkeeper',
    # Defenders
    'DF': 'Defender', 'CB': 'Defender', 'LB': 'Defender', 
    'RB': 'Defender', 'WB': 'Defender',
    # Midfielders
    'MF': 'Midfielder', 'CM': 'Midfielder', 'DM': 'Midfielder', 
    'AM': 'Midfielder', 'LM': 'Midfielder', 'RM': 'Midfielder',
    # Forwards
    'FW': 'Forward', 'LW': 'Forward', 'RW': 'Forward'
}

# ✅ FIXED: Updated to match 7-feature training model (5 features + is_home)
PREDICTOR_COLUMNS = [
    'sot_conceded_MA5_scaled', 
    'sot_MA5_scaled', 
    'summary_min',
    'is_forward', 
    'is_defender',
    'is_home' # <-- ADDED is_home
]

# Still calculate min_MA5 for filtering purposes
MA5_METRICS = ['sot', 'min']
OPP_METRICS = ['sot_conceded']

# ✅ NEW: Simplified list of features for the ZIP Inflation (Logistic) part (3 features + is_home + const)
INFLATION_PREDICTOR_COLUMNS = [
    'sot_MA5_scaled', 
    'is_forward',   
    'is_defender',
    'is_home' # <-- ADDED is_home
]

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
# --- NEW Position Utility Function ---
# ----------------------------------------------------------------------

def safe_extract_position(pos_str):
    """
    Safely extracts primary position code from potentially corrupted strings.
    Handles 'FW,MF' (clean) and '["FW", "MF"]' (corrupted).
    """
    if pd.isna(pos_str) or pos_str is None:
        return None
    
    pos_str = str(pos_str).strip()
    
    # Handle corrupted format '["FW", "MF"]' (using try/except for robustness)
    if pos_str.startswith('["') and pos_str.endswith(']'):
        try:
            pos_list = ast.literal_eval(pos_str)
            if isinstance(pos_list, list) and pos_list:
                return pos_list[0].strip().upper()
        except (ValueError, SyntaxError, IndexError):
            # Fallback for corrupted but unparsable formats
            cleaned_str = pos_str.strip('[" ]').replace('"', '')
            return cleaned_str.split(',')[0].strip().upper()
            
    # Handle clean format 'FW,MF' or simple 'FW'
    return pos_str.split(',')[0].strip().upper()

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

    df_player_history['summary_sot'] = pd.to_numeric(df_player_history['summary_sot'], errors='coerce') # Ensure SOT is numeric
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
    
    df_team_def = df_shooting_def.copy()
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
    for col in ['summary_sot', 'summary_min', 'sot_conceded']:
        df_future[col] = np.nan
    
    df_final = pd.concat([df_historical, df_future], ignore_index=True)
    df_final = df_final.sort_values(by=['match_datetime', 'player_id']).reset_index(drop=True)
    
    # 🔍 DEBUG: Store df_player_history globally for debugging
    global df_player_history_global
    df_player_history_global = df_player_history
    
    return df_final

def clean_and_enrich_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Creates positional dummy variables (is_forward, is_defender) 
    and the new 'is_home' feature.
    """
    df_enriched = df.copy()
    
    # --- Step 1: Extract and Map Position ---
    df_enriched['position_code'] = df_enriched['summary_positions'].apply(safe_extract_position)
    df_enriched['position_group'] = df_enriched['position_code'].map(POSITION_MAPPING).fillna('Midfielder')
    
    # --- Step 2: Goalkeeper Removal ---
    initial_count = len(df_enriched)
    df_enriched = df_enriched[df_enriched['position_group'] != 'Goalkeeper'].copy()
    logger.info(f"  Filtered out {initial_count - len(df_enriched)} Goalkeeper records.")
    
    # --- Step 3: Create Model Feature Dummy Variables ---
    # Midfielders are the baseline (is_forward=0, is_defender=0)
    df_enriched['is_forward'] = (df_enriched['position_group'] == 'Forward').astype(int)
    df_enriched['is_defender'] = (df_enriched['position_group'] == 'Defender').astype(int)
    
    # ✅ NEW FIX: Create the 'is_home' feature
    df_enriched['is_home'] = (df_enriched['team_side'] == 'home').astype(int)
    
    logger.info(f"✅ Position and location data extracted, dummies created. Enriched data shape: {df_enriched.shape}")
    
    return df_enriched


def calculate_ma5_factors(df: pd.DataFrame) -> pd.DataFrame:
    """Calculate MA5 factors for players and opponents."""
    df_processed = df.copy()
    df_processed.rename(columns={'summary_sot': 'sot', 'summary_min': 'min'}, inplace=True)
    
    # Calculate player MA5 (based on their own history)
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
    
    # 🔧 FIX: Calculate opponent MA5 differently for historical vs future matches
    # This logic block handles opponent MA5 calculation
    
    for col in OPP_METRICS:
        # First, calculate each TEAM's defensive MA5 (when they were the team being attacked)
        # This is based on THEIR historical data as the team_name
        
        # Now map this defensive MA5 to when they are the OPPONENT
        
        opponent_ma5_map = {}
        # Iterate over all rows to calculate the opponent's defensive MA5 up to the point of that match
        for idx, row in df_processed.iterrows():
            opponent = row['opponent_team']
            
            # Get the opponent's historical defensive stats
            # Filter for the opponent's matches that occurred *before* the current match
            opponent_history = df_processed[
                (df_processed['team_name'] == opponent) & 
                (df_processed['match_datetime'] < row['match_datetime'])
            ].sort_values('match_datetime')
            
            if len(opponent_history) >= MIN_PERIODS:
                # Calculate their last 5 matches defensive average
                recent_defense = opponent_history.tail(MIN_PERIODS)['sot_conceded'].mean()
                opponent_ma5_map[idx] = recent_defense
            elif len(opponent_history) > 0:
                # Use what we have if less than 5
                opponent_ma5_map[idx] = opponent_history['sot_conceded'].mean()
            else:
                # No history - will be filled with league average later
                opponent_ma5_map[idx] = np.nan
        
        # Assign the opponent MA5
        df_processed[f'{col}_MA5'] = pd.Series(opponent_ma5_map)
        
        # 🔧 FIX: Fill missing opponent data with league average
        missing_count = df_processed[f'{col}_MA5'].isna().sum()
        if missing_count > 0:
            # Calculate league average from historical completed matches only
            historical_matches = df_processed[df_processed['sot_conceded'].notna()]
            if len(historical_matches) > 0:
                league_avg = historical_matches['sot_conceded'].mean()
                df_processed[f'{col}_MA5'] = df_processed[f'{col}_MA5'].fillna(league_avg)
                logger.info(f"  ⚠️ Filled {missing_count} missing {col}_MA5 with league avg: {league_avg:.2f}")
            else:
                logger.warning(f"  ⚠️ No historical data to calculate league average for {col}")
    
    return df_processed


def get_live_gameweek_features(df_processed: pd.DataFrame) -> pd.DataFrame:
    """
    Filter for live gameweek and apply qualification criteria, 
    including the hybrid attacking defender filter based on sot_MA5.
    """
    scheduled_games = df_processed[
        (df_processed['status'].isin(['scheduled', 'fixture', 'upcoming', 'not started'])) |
        (df_processed.get('is_future', False) == True)
    ].copy()
    
    if scheduled_games.empty:
        return pd.DataFrame()
    
    next_gameweek = scheduled_games['matchweek'].min()
    df_live = scheduled_games[scheduled_games['matchweek'] == next_gameweek].copy()
    
    # 🔍 DEBUG: Check star players BEFORE filtering (unchanged)
    logger.info("\n" + "="*80)
    logger.info("🔍 DEBUG: CHECKING STAR PLAYERS (Before MA5 dropna)")
    # ... (star player debug logging omitted for brevity) ...
    logger.info("="*80 + "\n")
    
    REQUIRED_MA5_COLUMNS = [f'{col}_MA5' for col in MA5_METRICS + OPP_METRICS]
    df_live_before_dropna = df_live.copy()
    df_live = df_live.dropna(subset=REQUIRED_MA5_COLUMNS).copy()
    
    # 🔍 DEBUG: Check which star players were dropped by NaN (unchanged)
    logger.info("\n" + "="*80)
    logger.info("🔍 DEBUG: AFTER MA5 DROPNA")
    # ... (star player dropna debug logging omitted for brevity) ...
    logger.info("="*80 + "\n")
    
    # --- Mandatory Model Qualification Filters ---
    initial_qualified_count = len(df_live)
    df_live_before_mins = df_live.copy()
    df_live = df_live[df_live['min_MA5'] >= MIN_EXPECTED_MINUTES].copy()
    
    # 🔍 DEBUG: Check MIN filter (unchanged)
    logger.info("\n" + "="*80)
    logger.info(f"🔍 DEBUG: AFTER MIN_EXPECTED_MINUTES >= {MIN_EXPECTED_MINUTES}")
    # ... (star player min filter debug logging omitted for brevity) ...
    logger.info("="*80 + "\n")
    
    df_live_before_sot = df_live.copy()
    df_live = df_live[df_live['sot_MA5'] >= MIN_SOT_MA5].copy()
    
    # 🔍 DEBUG: Check SOT filter (unchanged)
    logger.info("\n" + "="*80)
    logger.info(f"🔍 DEBUG: AFTER MIN_SOT_MA5 >= {MIN_SOT_MA5}")
    # ... (star player sot filter debug logging omitted for brevity) ...
    logger.info("="*80 + "\n")
    
    logger.info(f"  Applied MIN_MINUTES/MIN_SOT filters: {len(df_live)} remaining.")
    
    # --- NEW: Hybrid Filtering Logic (Matching Training Pipeline) ---
    
    # 1. Non-Defender Group: Keep all Forwards and Midfielders who qualified above.
    non_defenders = df_live[df_live['position_group'].isin(['Forward', 'Midfielder'])].copy()
    
    # 2. Defender Group: Keep only Defenders who meet the SOT threshold (0.3).
    defenders = df_live[df_live['position_group'] == 'Defender'].copy()
    attacking_defenders = defenders[
        defenders['sot_MA5'] >= ATTACKING_DEFENDER_THRESHOLD
    ].copy()
    
    # 3. Combine the groups for the final prediction set
    df_final_qualified = pd.concat([non_defenders, attacking_defenders], ignore_index=True)
    
    logger.info(f"  Applied Hybrid Filter. Attacking Defenders kept: {len(attacking_defenders)}")
    logger.info(f"  Final qualified players: {len(df_final_qualified)}")
    
    # 🔍 DEBUG: Final check on star players (unchanged)
    logger.info("\n" + "="*80)
    logger.info("🔍 DEBUG: FINAL QUALIFIED PLAYERS")
    # ... (final star player debug logging omitted for brevity) ...
    logger.info("="*80 + "\n")
    
    if df_final_qualified.empty:
        return pd.DataFrame()
    
    # Set the 'summary_min' feature to the calculated MA5 min for live prediction
    df_final_qualified['summary_min'] = df_final_qualified['min_MA5'] 
    
    return df_final_qualified


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
        logger.error(f"   🚨 CRITICAL: Did you run backtest_model.py and manually upload the artifacts?")
        exit(1)


def scale_live_data(df_raw, scaler_data):
    """Scale features using training statistics."""
    df_features = df_raw.copy()
    
    # Get features that need scaling (exclude raw features like summary_min and binary dummies)
    feature_stems_to_scale = [
        col.replace('_scaled', '') 
        for col in PREDICTOR_COLUMNS 
        if col not in ['summary_min', 'is_forward', 'is_defender', 'is_home'] # <-- ADDED 'is_home'
    ]
    
    # Scale MA5 features using training statistics
    for feature_stem in feature_stems_to_scale:
        if feature_stem not in scaler_data.index:
            logger.warning(f"⚠️ Feature '{feature_stem}' not found in scaler_data, skipping scaling.")
            continue
            
        mu = scaler_data.loc[feature_stem, 'mean']
        sigma = scaler_data.loc[feature_stem, 'std']
        df_features[f'{feature_stem}_scaled'] = (
            (df_features[feature_stem] - mu) / sigma 
            if sigma != 0 else 0
        )
    
    # Copy unscaled binary/raw features to their final names
    df_features['is_forward'] = df_features['is_forward']
    df_features['is_defender'] = df_features['is_defender']
    df_features['is_home'] = df_features['is_home'] # <-- Copy is_home
    df_features['summary_min'] = df_features['summary_min']
    
    # Verify all required features exist
    missing_features = [col for col in PREDICTOR_COLUMNS if col not in df_features.columns]
    if missing_features:
        logger.error(f"❌ Missing required features: {missing_features}")
        raise ValueError(f"Missing features: {missing_features}")
    
    # Select final features (6 features + 1 const = 7 total matching training model)
    final_features = df_features[PREDICTOR_COLUMNS]
    final_features = sm.add_constant(final_features, has_constant='add')
    
    logger.info(f"✅ Features scaled. Final shape: {final_features.shape} (expected: N x 7 with const)")
    
    # ✅ ZIP Check: The full feature set for the COUNT part (df_features_scaled, shape N x 7)
    if MODEL_TYPE == 'zip':
        # Create the simplified feature set for the INFLATION part (shape N x 5 with const)
        X_infl_cols = ['const'] + INFLATION_PREDICTOR_COLUMNS
        X_infl = final_features[X_infl_cols]
        logger.info(f"   ZIP Inflation Features (X_infl) shape: {X_infl.shape} (expected: N x 5 with const)")
        # This check is now robust and prevents the previous mismatch
        
    return final_features


def run_predictions(model, df_features_scaled, df_raw, model_type='poisson'):
    """Generate predictions using ZIP or Poisson model."""
    
    # ✅ FIX: Create the correct simplified feature subset for the ZIP inflation component
    if model_type == 'zip':
        # The full feature set (df_features_scaled, shape N x 7) is X (Count Part)
        # Create the simplified feature set (X_infl, shape N x 5)
        df_infl_scaled = df_features_scaled[['const'] + INFLATION_PREDICTOR_COLUMNS] 
    else:
        # Placeholder for Poisson
        df_infl_scaled = None # Not used, but avoids an unassigned warning

    # Use the full scaled features (X) for both models' main prediction
    X = df_features_scaled
    
    if model_type == 'zip':
        # --- ZIP Expected Value (E_SOT) ---
        # Pass the full features (Count) and the simplified features (Inflation)
        e_sot = model.predict(X, exog_infl=df_infl_scaled)
        
        # Convert to simple array
        if hasattr(e_sot, 'values'):
            e_sot = e_sot.values
        e_sot = np.asarray(e_sot).ravel()
        if len(e_sot) > len(df_raw):
            e_sot = e_sot[:len(df_raw)]
        
        df_raw['E_SOT'] = e_sot
        
        # --- ZIP P(1+ SOT) ---
        prob_results = model.predict(X, which='prob', exog_infl=df_infl_scaled)
        
        # Extract P(Y=0)
        if isinstance(prob_results, tuple):
            prob_zero = prob_results[0]
        else:
            prob_zero = prob_results
        
        # Convert to simple 1D numpy array and clean up
        prob_zero = np.asarray(prob_zero).ravel()
        if len(prob_zero) > len(df_raw):
            prob_zero = prob_zero[:len(df_raw)]
        
        if len(prob_zero) != len(df_raw):
            raise ValueError(f"Length mismatch: prob_zero={len(prob_zero)}, df_raw={len(df_raw)}")
        
        p_vals = [1 - p for p in prob_zero]
        df_raw['P_SOT_1_Plus'] = p_vals
        
        # --- ZIP P(structural zero/Never Shooter) ---
        prob_inflate = model.predict(X, which='prob-inflate', exog_infl=df_infl_scaled)
        
        # Convert to simple 1D numpy array and clean up
        prob_inflate = np.asarray(prob_inflate).ravel()
        if len(prob_inflate) > len(df_raw):
            prob_inflate = prob_inflate[:len(df_raw)]
        
        if len(prob_inflate) != len(df_raw):
            raise ValueError(f"Length mismatch: prob_inflate={len(prob_inflate)}, df_raw={len(df_raw)}")
        
        df_raw['P_Never_Shooter'] = prob_inflate.tolist()
        
    else:
        # Standard Poisson predictions
        df_raw['E_SOT'] = model.predict(X)
        
        # Calculate probability distributions for betting
        from scipy.stats import poisson
        
        # P(0 SOT) - probability of zero
        df_raw['P_SOT_0'] = poisson.pmf(0, df_raw['E_SOT'])
        
        # P(1+ SOT) - at least 1 shot on target (most common betting market)
        df_raw['P_SOT_1_Plus'] = 1 - df_raw['P_SOT_0']
        
        # P(2+ SOT) - at least 2 shots on target
        df_raw['P_SOT_2_Plus'] = 1 - poisson.cdf(1, df_raw['E_SOT'])
        
        # P(3+ SOT) - at least 3 shots on target
        df_raw['P_SOT_3_Plus'] = 1 - poisson.cdf(2, df_raw['E_SOT'])
        
        # P(4+ SOT) - at least 4 shots on target (for high-confidence bets)
        df_raw['P_SOT_4_Plus'] = 1 - poisson.cdf(3, df_raw['E_SOT'])
        
        # Confidence level based on E[SOT]
        df_raw['confidence'] = pd.cut(
            df_raw['E_SOT'],
            bins=[0, 0.4, 0.8, float('inf')],
            labels=['low', 'medium', 'high']
        )
    
    report = df_raw.sort_values(by='E_SOT', ascending=False).copy()
    
    # Select columns for output
    output_cols = [
        'player_id', 'player_name', 'team_name', 'opponent_team', 
        'E_SOT', 'P_SOT_0', 'P_SOT_1_Plus', 'P_SOT_2_Plus', 'P_SOT_3_Plus', 'P_SOT_4_Plus',
        'confidence', 'min_MA5', 'sot_MA5', 'match_datetime'
    ]
    
    # Add ZIP-specific column if available
    if 'P_Never_Shooter' in report.columns:
        output_cols.insert(6, 'P_Never_Shooter')
    
    # Only include columns that exist
    output_cols = [col for col in output_cols if col in report.columns]
    
    final_report = report[output_cols].rename(columns={
        'min_MA5': 'expected_minutes',
        'sot_MA5': 'recent_sot_avg',
        'team_name': 'team',
        'opponent_team': 'opponent'
    }).round(3)
    
    final_report.to_csv(PREDICTION_OUTPUT, index=False)
    logger.info(f"✅ Prediction report saved to {PREDICTION_OUTPUT}")
    
    # Display top 10 predictions with all probability columns
    logger.info(f"\n🎯 TOP 10 PREDICTIONS (Gameweek {df_raw['matchweek'].iloc[0]}):")
    logger.info("─" * 120)
    
    # Show different columns based on model type
    if model_type == 'zip' and 'P_Never_Shooter' in final_report.columns:
        display_cols = ['player_name', 'team', 'opponent', 'E_SOT', 'P_Never_Shooter', 'P_SOT_1_Plus']
    else:
        display_cols = ['player_name', 'team', 'opponent', 'E_SOT', 'P_SOT_1_Plus', 'P_SOT_2_Plus', 'P_SOT_3_Plus', 'confidence']
    
    # Only include columns that exist
    display_cols = [col for col in display_cols if col in final_report.columns]
    
    logger.info(final_report[display_cols].head(10).to_string(index=False))
    logger.info("─" * 120)
    
    # Show additional betting insights
    logger.info("\n💰 BETTING INSIGHTS:")
    logger.info("─" * 80)
    
    # High confidence bets (E[SOT] >= 0.8)
    high_conf = final_report[final_report['E_SOT'] >= 0.8].head(5)
    if len(high_conf) > 0:
        logger.info("\n🔥 Top 5 High-Confidence Bets (E[SOT] >= 0.8):")
        logger.info(high_conf[['player_name', 'team', 'E_SOT', 'P_SOT_1_Plus', 'P_SOT_2_Plus']].to_string(index=False))
    
    # Best 2+ SOT opportunities
    if 'P_SOT_2_Plus' in final_report.columns:
        best_2plus = final_report.nlargest(5, 'P_SOT_2_Plus')
        logger.info("\n⚡ Top 5 Best 2+ SOT Opportunities:")
        logger.info(best_2plus[['player_name', 'team', 'E_SOT', 'P_SOT_2_Plus', 'P_SOT_3_Plus']].to_string(index=False))
    
    logger.info("─" * 80)
    
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

    # NEW STEP: Enrich data with positional dummies, 'is_home', and filter GKs
    df_enriched = clean_and_enrich_data(df_combined_raw)

    # Calculate MA5 factors
    df_processed = calculate_ma5_factors(df_enriched)
    
    # Get live features and apply all remaining filters (including hybrid SOT filter for defenders)
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
