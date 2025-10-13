# src/services/ai/player_factor_engineer.py - Revised

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

def prepare_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Renames the summary columns to the expected model target/feature names.
    This resolves the 'sot' KeyError in backtest_model.py.
    """
    logger.info("Renaming raw target column 'summary_sot' to 'sot'...")
    
    # 1. Rename raw SOT to the expected Target Column Name ('sot')
    if 'summary_sot' in df.columns:
        df.rename(columns={'summary_sot': 'sot'}, inplace=True)
    else:
        logger.warning("'summary_sot' not found. Check previous script's output.")
        
    # 2. Ensure min is also renamed if that's the raw column name
    if 'summary_min' in df.columns:
        df.rename(columns={'summary_min': 'min'}, inplace=True)
    
    # 3. Sort for time-series calculation
    df = df.sort_values(by=['player_id', 'match_datetime']).reset_index(drop=True)
    
    return df

def calculate_p_factors(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculates Player-specific rolling historical factors (P-Factors).
    The raw columns 'sot' and 'min' are now expected to be present.
    """
    logger.info("Starting calculation of Player-specific Factors (P-Factors)...")
    
    # Define the metrics to track for the player (using the new, simpler names)
    PLAYER_METRICS = {
        'sot': 'sot_MA5', # Raw SOT
        'min': 'min_MA5'  # Raw Minutes
    }
    
    # Calculate Rolling Averages (MA5)
    for raw_col, new_col in PLAYER_METRICS.items():
        logger.info(f"Calculating rolling {MIN_PERIODS}-match average for {raw_col}...")
        
        # Group by 'player_id' and apply the rolling transformation
        df[new_col] = (
            df.groupby('player_id')[raw_col]
            .transform(
                lambda x: x.rolling(window=MIN_PERIODS, min_periods=1, closed='left').mean()
            )
        )
        
    logger.info("P-Factors calculated successfully.")
    
    # NOTE: The drop_nan_factors function is not needed here as it was in the old code.
    # It will be handled by the feature_scaling.py script.
    return df

if __name__ == '__main__':
    df_features = load_features()
    df_features = prepare_data(df_features) # New step to standardize column names
    df_features = calculate_p_factors(df_features)
    
    # Save the file containing both O-Factors, P-Factors, and the target 'sot'
    df_features.to_parquet(OUTPUT_FILE, index=False)
    logger.info(f"Feature engineering complete. Data saved to {OUTPUT_FILE}")
