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

# ✅ Fix: ensure project root (so src/ can be imported) is in the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../..")))

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
MIN_EXPECTED_MINUTES = 15.0
MIN_SOT_MA5 = 0.1
MIN_MATCHES_PLAYED = 3

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
    """Fetches all data from a specified Supabase table with pagination to avoid limits."""
    logger.info(f"Fetching data from table: {table_name}")
    
    all_data = []
    offset = 0
    limit = 1000  # Supabase default limit
    
    while True:
        response = supabase.from_(table_name).select(select_columns).order(order_by_column, desc=False).range(offset, offset + limit - 1).execute()
        
        if not response.data:
            break
            
        all_data.extend(response.data)
        
        if len(response.data) < limit:
            break
            
        offset += limit
        logger.info(f"  Fetched {len(all_data)} rows so far...")
    
    if not all_data:
        logger.warning(f"No data found in table {table_name}.")
        return pd.DataFrame()
    
    logger.info(f"  Total fetched from {table_name}: {len(all_data)} rows")
    return pd.DataFrame(all_data)

# ----------------------------------------------------------------------
# --- Rest of your original live_predictor logic ---
# ----------------------------------------------------------------------

def load_and_merge_raw_data() -> pd.DataFrame:
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

    df_fixtures['status'] = df_fixtures['status'].astype(str).str.strip().str.lower()
    now = pd.Timestamp.now(tz='UTC')
    df_fixtures['is_future'] = df_fixtures['datetime'] > now

    player_cols = "player_id, player_name, team_name, summary_sot, summary_min, home_team, away_team, team_side, match_datetime"
    df_player_history = fetch_all_data_from_supabase(
        table_name="player_match_stats", 
        select_columns=player_cols,
        order_by_column="match_datetime" 
    )

    df_player_history['summary_min'] = pd.to_numeric(df_player_history['summary_min'], errors='coerce')
    df_player_history['match_datetime'] = pd.to_datetime(df_player_history['match_datetime'], utc=True)
    df_player_history['match_date'] = df_player_history['match_datetime'].dt.date 

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
    
    active_players = (
        df_player_history[df_player_history['player_id'].isin(qualified_player_ids)]
        .sort_values('match_datetime')
        .groupby('player_id')
        .last()[['player_name', 'team_name']]
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


def calculate_ma5_factors(df: pd.DataFrame) -> pd.DataFrame:
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
    
    df_live['summary_min'] = df_live['min_MA5']
    return df_live


def load_artifacts():
    logger.info("Loading model and scaling statistics...")
    with open(MODEL_FILE, 'rb') as f:
        model = pickle.load(f)
    with open(SCALER_STATS_FILE, 'r') as f:
        stats_dict = json.load(f)
    scaler_data = pd.DataFrame(stats_dict).T
    return model, scaler_data


def scale_live_data(df_raw, scaler_data):
    df_features = df_raw.copy()
    scaled_feature_stems = [col.replace('_scaled', '') for col in PREDICTOR_COLUMNS if col != 'summary_min']

    for feature_stem in scaled_feature_stems:
        mu = scaler_data.loc[feature_stem, 'mean']
        sigma = scaler_data.loc[feature_stem, 'std']
        df_features[f'{feature_stem}_scaled'] = (df_features[feature_stem] - mu) / sigma if sigma != 0 else 0
            
    final_features = df_features[PREDICTOR_COLUMNS]
    final_features = sm.add_constant(final_features, has_constant='add')
    return final_features


def run_predictions(model, df_features_scaled, df_raw):
    df_raw['E_SOT'] = model.predict(df_features_scaled)
    df_raw['P_SOT_1_Plus'] = 1 - np.exp(-df_raw['E_SOT'])
    
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
    logger.info(f"✅ Prediction report saved to {PREDICTION_OUTPUT}")
    return final_report


def main():
    logger.info("=" * 70)
    logger.info("STARTING LIVE PREDICTION SERVICE")
    logger.info("=" * 70)
    
    model, scaler_data = load_artifacts()
    df_combined_raw = load_and_merge_raw_data()
    if df_combined_raw.empty:
        logger.error("No data loaded from database")
        return

    df_processed = calculate_ma5_factors(df_combined_raw)
    df_live_raw = get_live_gameweek_features(df_processed)
    if df_live_raw.empty:
        logger.warning("No players qualified for prediction.")
        return
        
    df_scaled_input = scale_live_data(df_live_raw, scaler_data)
    report = run_predictions(model, df_scaled_input, df_live_raw)
    
    logger.info("=" * 70)
    logger.info("LIVE PREDICTION SERVICE COMPLETE")
    logger.info("=" * 70)

if __name__ == '__main__':
    main()
