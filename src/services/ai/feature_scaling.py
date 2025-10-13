# src/services/ai/feature_scaling.py

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
import logging
import json # New import for saving stats

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# --- Configuration ---
RAW_DATA_FILE = "final_feature_set_pfactors.parquet"
SCALED_DATA_FILE = "final_feature_set_scaled.parquet"
SCALER_STATS_FILE = "training_stats.json" # New file name

# Features used for scaling and modeling
FEATURES_TO_SCALE = [
    'sot_conceded_MA5', 
    'tackles_att_3rd_MA5', 
    'sot_MA5', 
    'min_MA5',
    'summary_min'
]

# Filtering thresholds (to focus on offensive players)
MIN_AVG_SOT = 0.1
MIN_AVG_MIN = 15.0

def load_data():
    """Loads the data with O-factors and P-factors."""
    logger.info(f"Loading raw data from {RAW_DATA_FILE}...")
    try:
        df = pd.read_parquet(RAW_DATA_FILE)
        # Drop rows where any feature needed for scaling is missing
        df.dropna(subset=FEATURES_TO_SCALE, inplace=True) 
        logger.info(f"Data loaded. Total rows after initial dropna: {len(df)}")
        return df
    except Exception as e:
        logger.error(f"Error loading data: {e}")
        return None

def filter_data(df):
    """Filters data to retain only relevant offensive players."""
    logger.info("Applying player filtering based on average SOT and Minutes...")
    
    # Calculate average SOT and minutes per player across all records
    player_avg = df.groupby('player_id')[['sot', 'min']].mean().reset_index()
    player_avg.rename(columns={'sot': 'avg_sot', 'min': 'avg_min'}, inplace=True)

    # Identify players who meet the offensive thresholds
    eligible_players = player_avg[
        (player_avg['avg_sot'] >= MIN_AVG_SOT) & 
        (player_avg['avg_min'] >= MIN_AVG_MIN)
    ]['player_id']

    # Filter the main DataFrame
    df_filtered = df[df['player_id'].isin(eligible_players)]
    
    logger.info(f"Filtering complete. Retained {len(df_filtered)} records for training.")
    return df_filtered

def scale_and_save_stats(df):
    """
    Scales features, saves the scaled data, and saves the scaler mean/std stats.
    """
    logger.info("Scaling features and saving scaling statistics...")
    
    # Initialize and fit the scaler on the data
    scaler = StandardScaler()
    df[FEATURES_TO_SCALE] = scaler.fit_transform(df[FEATURES_TO_SCALE])
    
    # -------------------------------------------------------------
    # NEW STEP: Extract and Save Scaling Statistics (mu and sigma)
    # -------------------------------------------------------------
    
    # Create a dictionary to hold the mean and std dev for each feature
    scaling_stats = {}
    for i, feature in enumerate(FEATURES_TO_SCALE):
        scaling_stats[feature] = {
            'mean': scaler.mean_[i],
            'std': scaler.scale_[i]
        }

    # Save the statistics to a JSON file
    with open(SCALER_STATS_FILE, 'w') as f:
        json.dump(scaling_stats, f, indent=4)
        
    logger.info(f"Scaling statistics saved to {SCALER_STATS_FILE}.")
    # -------------------------------------------------------------

    # Save the final scaled data for the model training script (backtest_model.py)
    df.to_parquet(SCALED_DATA_FILE, index=False)
    logger.info(f"Scaled data saved to {SCALED_DATA_FILE}.")
    
    # Return the scaled data for continuity, although the model script will reload it
    return df

if __name__ == '__main__':
    df = load_data()
    if df is not None:
        df_filtered = filter_data(df)
        if not df_filtered.empty:
            scale_and_save_stats(df_filtered)
        else:
            logger.error("Filtered DataFrame is empty. Cannot proceed with scaling.")
