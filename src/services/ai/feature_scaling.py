# src/services/ai/feature_scaling.py

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
import logging
import json
import os

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# --- Configuration ---
RAW_DATA_FILE = "final_feature_set_pfactors.parquet"
SCALED_DATA_FILE = "final_feature_set_scaled.parquet"
SCALER_STATS_FILE = "training_stats.json"  # Critical file for live prediction scaling

# Features used for scaling and modeling
FEATURES_TO_SCALE = [
    'sot_conceded_MA5',
    'tackles_att_3rd_MA5',
    'sot_MA5',
    'min_MA5',
    'summary_min'
]

# Filtering thresholds (to focus on offensive players)
MIN_AVG_SOT_MA5 = 0.1
MIN_AVG_MIN_MA5 = 15.0


def load_data():
    """Loads the data with O-factors and P-factors, dynamically handling missing columns."""
    logger.info(f"Loading raw data from {RAW_DATA_FILE}...")
    try:
        df = pd.read_parquet(RAW_DATA_FILE)

        # --- Handle missing columns dynamically ---
        available_cols = [c for c in FEATURES_TO_SCALE if c in df.columns]
        missing_cols = [c for c in FEATURES_TO_SCALE if c not in df.columns]

        if missing_cols:
            logger.warning(f"Missing columns in dataset: {missing_cols}. They will be excluded from scaling.")
        else:
            logger.info("All expected feature columns are present.")

        # Drop rows with missing values in the available columns only
        df.dropna(subset=available_cols, inplace=True)
        logger.info(f"Data loaded. Total rows after initial dropna: {len(df)}")

        return df, available_cols
    except Exception as e:
        logger.error(f"Error loading data: {e}")
        return None, []


def filter_data(df):
    """
    Filters data to retain only relevant offensive players,
    using the available MA5 features for player eligibility.
    """
    logger.info("Applying player filtering based on average SOT_MA5 and Min_MA5...")

    if not all(col in df.columns for col in ['sot_MA5', 'min_MA5']):
        logger.error("Required columns for filtering ('sot_MA5', 'min_MA5') are missing.")
        return pd.DataFrame()

    # Calculate per-player averages
    player_avg = df.groupby('player_id')[['sot_MA5', 'min_MA5']].mean().reset_index()
    player_avg.rename(columns={'sot_MA5': 'avg_sot_MA5', 'min_MA5': 'avg_min_MA5'}, inplace=True)

    # Identify eligible players
    eligible_players = player_avg[
        (player_avg['avg_sot_MA5'] >= MIN_AVG_SOT_MA5) &
        (player_avg['avg_min_MA5'] >= MIN_AVG_MIN_MA5)
    ]['player_id']

    # Filter main DataFrame
    df_filtered = df[df['player_id'].isin(eligible_players)]

    logger.info(f"Filtering complete. Retained {len(df_filtered)} records for training.")
    return df_filtered


def scale_and_save_stats(df, features_to_scale):
    """
    Scales features, saves the scaled data, and saves the scaler mean/std stats
    to ensure live predictions use the exact same transformation.
    """
    logger.info("Scaling features and saving scaling statistics...")

    # --- 1. Scaling ---
    scaler = StandardScaler()
    df[features_to_scale] = scaler.fit_transform(df[features_to_scale])

    # --- 2. Save Scaling Statistics (CRITICAL ARTIFACT) ---
    scaling_stats = {}
    for i, feature in enumerate(features_to_scale):
        scaling_stats[feature] = {
            'mean': scaler.mean_[i],
            'std': scaler.scale_[i]
        }

    with open(SCALER_STATS_FILE, 'w') as f:
        json.dump(scaling_stats, f, indent=4)

    logger.info(f"Scaling statistics saved to {SCALER_STATS_FILE}.")

    # --- 3. Save Scaled Data ---
    for feature in features_to_scale:
        df.rename(columns={feature: f'{feature}_scaled'}, inplace=True)

    df.to_parquet(SCALED_DATA_FILE, index=False)
    logger.info(f"Scaled data saved to {SCALED_DATA_FILE}.")

    return df


if __name__ == '__main__':
    df, available_features = load_data()

    if df is not None and available_features:
        df_filtered = filter_data(df)
        if not df_filtered.empty:
            scale_and_save_stats(df_filtered, available_features)
        else:
            logger.error("Filtered DataFrame is empty. Cannot proceed with scaling.")
    else:
        logger.error("No data or valid features available. Scaling aborted.")
