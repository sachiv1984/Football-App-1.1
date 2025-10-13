# src/services/ai/player_factor_engineer.py

import pandas as pd
import numpy as np
import logging

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# --- Configuration ---
INPUT_FILE = "final_feature_set.parquet" # Output from backtest_processor.py
OUTPUT_FILE = "final_feature_set_pfactors.parquet"
MIN_PERIODS = 5 # Window size for rolling average

def load_features() -> pd.DataFrame:
    """Loads the feature set including the O-Factors."""
    logger.info(f"Loading feature set from {INPUT_FILE}...")
    try:
        df = pd.read_parquet(INPUT_FILE)
        logger.info(f"Data loaded successfully. Shape: {df.shape}")
        return df
    except FileNotFoundError:
        logger.error(f"File not found: {INPUT_FILE}. Ensure backtest_processor.py ran successfully.")
        exit(1)

def calculate_p_factors(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculates Player-specific rolling historical factors (P-Factors).
    """
    logger.info("Starting calculation of Player-specific Factors (P-Factors)...")
    
    # 1. Ensure data is sorted for accurate time-series calculation
    # Sort by player, then by match date, to ensure we calculate the rolling average
    # based only on prior matches for that specific player.
    df = df.sort_values(by=['player_id', 'match_datetime']).reset_index(drop=True)
    
    # 2. Define the metrics to track for the player
    PLAYER_METRICS = {
        'summary_sot': 'sot_MA5',
        'summary_min': 'min_MA5'
    }
    
    # 3. Calculate Rolling Averages (MA5)
    for raw_col, new_col in PLAYER_METRICS.items():
        logger.info(f"Calculating rolling 5-match average for {raw_col}...")
        
        # Group by 'player_id' and apply the rolling transformation
        df[new_col] = (
            df.groupby('player_id')[raw_col]
            .transform(
                lambda x: x.rolling(window=MIN_PERIODS, min_periods=1, closed='left').mean()
            )
        )
        
    logger.info("P-Factors calculated successfully.")
    return df

def drop_nan_factors(df: pd.DataFrame) -> pd.DataFrame:
    """Drops rows where the O-Factors or P-Factors are still NaN."""
    # We drop NaNs that result from the *combination* of P-Factors and O-Factors.
    # The minimum required columns are the O-Factors and the new P-Factors.
    REQUIRED_FACTORS = ['sot_conceded_MA5', 'tackles_att_3rd_MA5', 'sot_MA5', 'min_MA5']
    
    initial_rows = len(df)
    df_clean = df.dropna(subset=REQUIRED_FACTORS).copy()
    
    rows_dropped = initial_rows - len(df_clean)
    logger.info(f"Dropped an additional {rows_dropped} rows where factors were NaN.")
    logger.info(f"Final data shape for modeling: {df_clean.shape}")
    return df_clean

if __name__ == '__main__':
    df_features = load_features()
    df_features = calculate_p_factors(df_features)
    
    # Save the file containing both O-Factors and P-Factors
    df_features.to_parquet(OUTPUT_FILE, index=False)
    logger.info(f"Feature engineering complete. Data saved to {OUTPUT_FILE}")
