import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
import logging
import json

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# --- Configuration ---
RAW_DATA_FILE = "final_feature_set_pfactors.parquet"
SCALED_DATA_FILE = "final_feature_set_scaled.parquet"
SCALER_STATS_FILE = "training_stats.json"

FEATURES_TO_SCALE = [
    'sot_conceded_MA5',
    'tackles_att_3rd_MA5',
    'sot_MA5',
    'min_MA5'
    'min'
]

def load_data():
    logger.info(f"Loading raw data from {RAW_DATA_FILE}...")
    df = pd.read_parquet(RAW_DATA_FILE)
    df.dropna(subset=FEATURES_TO_SCALE, inplace=True)
    logger.info(f"Data loaded. Rows after dropna: {len(df)}")
    return df

def scale_and_save(df):
    logger.info("Scaling MA5 features...")
    scaler = StandardScaler()
    df[FEATURES_TO_SCALE] = scaler.fit_transform(df[FEATURES_TO_SCALE])

    # Save scaler stats for deployment
    scaling_stats = {f: {'mean': scaler.mean_[i], 'std': scaler.scale_[i]} 
                     for i, f in enumerate(FEATURES_TO_SCALE)}
    with open(SCALER_STATS_FILE, 'w') as f:
        json.dump(scaling_stats, f, indent=4)
    logger.info(f"Scaler stats saved to {SCALER_STATS_FILE}")

    # Rename scaled columns
    for f in FEATURES_TO_SCALE:
        df.rename(columns={f: f'{f}_scaled'}, inplace=True)

    # ✅ Keep summary_min as raw
    df['summary_min'] = df['summary_min']

    # Save final scaled dataset
    df.to_parquet(SCALED_DATA_FILE, index=False)
    logger.info(f"Scaled dataset saved to {SCALED_DATA_FILE}")
    return df

if __name__ == "__main__":
    df = load_data()
    scale_and_save(df)
