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
    """Loads the data with O-factors and P-factors, verifying required columns exist."""
    logger.info(f"Loading raw data from {RAW_DATA_FILE}...")
    try:
        df = pd.read_parquet(RAW_DATA_FILE)
        logger.info(f"Data loaded successfully. Total rows: {len(df)}")

        # --- Check for missing expected features ---
        missing_cols = [c for c in FEATURES_TO_SCALE if c not in df.columns]
        if missing_cols:
            logger.warning(f"⚠️ Missing columns in dataset: {missing_cols}. "
                           f"These will be skipped during scaling.")
            # Remove missing columns from scaling list to prevent KeyError
            global FEATURES_TO_SCALE
            FEATURES_TO_SCALE = [c for c in FEATURES_TO_SCALE if c in df.columns]

        # Drop rows with NaN in the remaining features
        df.dropna(subset=FEATURES_TO_SCALE, inplace=True)
        logger.info(f"Rows remaining after dropna: {len(df)}")

        return df
    except Exception as e:
        logger.error(f"Error loading data: {e}")
        return None


def filter_data(df):
    """
    Filters data to retain only relevant offensive players,
    using MA5 features for eligibility.
    """
    logger.info("Applying player filtering based on average SOT_MA5 and Min_MA5...")

    player_avg = df.groupby('player_id')[['sot_MA5', 'min_MA5']].mean().reset_index()
    player_avg.rename(columns={'sot_MA5': 'avg_sot_MA5', 'min_MA5': 'avg_min_MA5'}, inplace=True)

    eligible_players = player_avg[
        (player_avg['avg_sot_MA5'] >= MIN_AVG_SOT_MA5) &
        (player_avg['avg_min_MA5'] >= MIN_AVG_MIN_MA5)
    ]['player_id']

    df_filtered = df[df['player_id'].isin(eligible_players)]

    logger.info(f"Filtering complete. Retained {len(df_filtered)} records for training.")
    return df_filtered


def scale_and_save_stats(df):
    """
    Scales features, saves the scaled data, and saves the scaler mean/std stats
    to ensure live predictions use the exact same transformation.
    """
    if not FEATURES_TO_SCALE:
        logger.error("No features available for scaling. Aborting scaling step.")
        return None

    logger.info("Scaling features and saving scaling statistics...")

    scaler = StandardScaler()
    df[FEATURES_TO_SCALE] = scaler.fit_transform(df[FEATURES_TO_SCALE])

    # Save scaling statistics (critical artifact)
    scaling_stats = {
        feature: {'mean': scaler.mean_[i], 'std': scaler.scale_[i]}
        for i, feature in enumerate(FEATURES_TO_SCALE)
    }

    with open(SCALER_STATS_FILE, 'w') as f:
        json.dump(scaling_stats, f, indent=4)
    logger.info(f"Scaling statistics saved to {SCALER_STATS_FILE}.")

    # Save scaled dataset
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
