# src/services/ai/feature_scaling.py

import pandas as pd
from sklearn.preprocessing import StandardScaler
import logging

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# --- Configuration ---
INPUT_FILE = "final_feature_set_pfactors.parquet"
OUTPUT_FILE = "final_feature_set_scaled.parquet"
# List of numerical features to scale
FEATURES_TO_SCALE = [
    'summary_min',           # Player raw minutes played
    'sot_conceded_MA5',      # Opponent Factor (O-Factor)
    'tackles_att_3rd_MA5',   # Opponent Factor (O-Factor)
    'sot_MA5',               # Player Factor (P-Factor)
    'min_MA5'                # Player Factor (P-Factor)
]

def load_and_scale_features():
    """Loads the feature set, performs Standardization (Z-Score scaling), and saves the result."""
    logger.info(f"Loading feature set from {INPUT_FILE} for scaling...")
    try:
        df = pd.read_parquet(INPUT_FILE)
    except FileNotFoundError:
        logger.error(f"File not found: {INPUT_FILE}. Ensure player_factor_engineer.py ran successfully.")
        return

    # 1. Drop rows with NaNs in the features to avoid issues with the scaler
    # We rely on player_factor_engineer.py to have handled this, but we'll drop here for safety.
    df_clean = df.dropna(subset=FEATURES_TO_SCALE).copy()
    logger.info(f"Data shape before scaling: {df_clean.shape}")

    # 2. Initialize and Fit Scaler
    scaler = StandardScaler()
    
    # Fit the scaler to the data and transform the selected columns
    df_clean[FEATURES_TO_SCALE] = scaler.fit_transform(df_clean[FEATURES_TO_SCALE])

    logger.info("Features successfully standardized (Z-Score scaling applied).")
    
    # 3. Save the Scaled Data
    df_clean.to_parquet(OUTPUT_FILE, index=False)
    logger.info(f"Scaled feature set saved to {OUTPUT_FILE}.")
    
    # Quick check for verification
    logger.info("\n--- Verification of Scaled Data (Mean should be ~0, Std Dev ~1) ---")
    logger.info(df_clean[FEATURES_TO_SCALE].agg(['mean', 'std']).T)


if __name__ == '__main__':
    load_and_scale_features()
