# src/services/ai/feature_scaling.py

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
import logging
import json 
import os # Added for checking file existence if needed, though primarily for robustness

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# --- Configuration ---
RAW_DATA_FILE = "final_feature_set_pfactors.parquet"
SCALED_DATA_FILE = "final_feature_set_scaled.parquet"
SCALER_STATS_FILE = "training_stats.json" # Critical file for live prediction scaling

# Features used for scaling and modeling
FEATURES_TO_SCALE = [
    'sot_conceded_MA5', 
    'tackles_att_3rd_MA5', 
    'sot_MA5', 
    'min_MA5',
    'summary_min'
]

# Filtering thresholds (to focus on offensive players)
# NOTE: Using MA5 features since raw 'sot' and 'min' are dropped by preceding script.
MIN_AVG_SOT_MA5 = 0.1
MIN_AVG_MIN_MA5 = 15.0 

def load_data():
    """Loads the data with O-factors and P-factors."""
    logger.info(f"Loading raw data from {RAW_DATA_FILE}...")
    try:
        df = pd.read_parquet(RAW_DATA_FILE)
        # Drop rows where any feature needed for scaling is missing (e.g., first 4 games)
        df.dropna(subset=FEATURES_TO_SCALE, inplace=True) 
        logger.info(f"Data loaded. Total rows after initial dropna: {len(df)}")
        return df
    except Exception as e:
        logger.error(f"Error loading data: {e}")
        return None

def filter_data(df):
    """
    Filters data to retain only relevant offensive players, 
    using the available MA5 features for player eligibility.
    """
    logger.info("Applying player filtering based on average SOT_MA5 and Min_MA5...")
    
    # Use the MA5 features for averaging, as the raw 'sot' and 'min' are missing.
    # We group by player_id and find their average MA5 form across all historical games.
    player_avg = df.groupby('player_id')[['sot_MA5', 'min_MA5']].mean().reset_index()
    player_avg.rename(columns={'sot_MA5': 'avg_sot_MA5', 'min_MA5': 'avg_min_MA5'}, inplace=True)

    # Identify players who meet the offensive thresholds
    eligible_players = player_avg[
        (player_avg['avg_sot_MA5'] >= MIN_AVG_SOT_MA5) & 
        (player_avg['avg_min_MA5'] >= MIN_AVG_MIN_MA5)
    ]['player_id']

    # Filter the main DataFrame
    df_filtered = df[df['player_id'].isin(eligible_players)]
    
    logger.info(f"Filtering complete. Retained {len(df_filtered)} records for training.")
    return df_filtered

def scale_and_save_stats(df):
    """
    Scales features, saves the scaled data, and saves the scaler mean/std stats
    to ensure live predictions use the exact same transformation.
    """
    logger.info("Scaling features and saving scaling statistics...")
    
    # --- 1. Scaling ---
    # Fit the scaler only on the features we care about
    scaler = StandardScaler()
    df[FEATURES_TO_SCALE] = scaler.fit_transform(df[FEATURES_TO_SCALE])
    
    # --- 2. Save Scaling Statistics (CRITICAL ARTIFACT) ---
    scaling_stats = {}
    for i, feature in enumerate(FEATURES_TO_SCALE):
        scaling_stats[feature] = {
            'mean': scaler.mean_[i],
            'std': scaler.scale_[i]
        }

    with open(SCALER_STATS_FILE, 'w') as f:
        json.dump(scaling_stats, f, indent=4)
        
    logger.info(f"Scaling statistics saved to {SCALER_STATS_FILE}.")

    # --- 3. Save Scaled Data ---
    # Rename columns for clarity in the final training data
    for feature in FEATURES_TO_SCALE:
        df.rename(columns={feature: f'{feature}_scaled'}, inplace=True)
        
    df.to_parquet(SCALED_DATA_FILE, index=False)
    logger.info(f"Scaled data saved to {SCALED_DATA_FILE}.")
    
    return df

if __name__ == '__main__':
    df = load_data()
    if df is not None:
        df_filtered = filter_data(df)
        if not df_filtered.empty:
            scale_and_save_stats(df_filtered)
        else:
            logger.error("Filtered DataFrame is empty. Cannot proceed with scaling.")
