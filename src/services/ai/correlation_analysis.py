# src/services/ai/correlation_analysis.py

import pandas as pd
import logging
import numpy as np

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# --- Configuration ---
FEATURE_FILE = "final_feature_set.parquet"
TARGET_COLUMN = 'summary_sot'
FEATURE_COLUMNS = ['sot_conceded_MA5', 'tackles_att_3rd_MA5']
# The minimum number of matches needed for the MA5 calculation (5)
MIN_PERIODS = 5 

def load_final_features() -> pd.DataFrame:
    """Loads the final feature set created by the processor script."""
    logger.info(f"Loading final feature set from {FEATURE_FILE}...")
    try:
        df = pd.read_parquet(FEATURE_FILE)
        logger.info(f"Data loaded successfully. Shape: {df.shape}")
        return df
    except FileNotFoundError:
        logger.error(f"File not found: {FEATURE_FILE}. Ensure backtest_processor.py ran successfully.")
        exit(1)

def analyze_correlations(df: pd.DataFrame):
    """
    Cleans the data and calculates Pearson's correlation coefficients 
    between the O-Factors and the target variable.
    """
    logger.info("Starting statistical correlation analysis...")
    
    # 1. Handle Missing Values (expected for the first MIN_PERIODS matches)
    # We must drop rows where the rolling averages (MA5) are NaN, as these rows 
    # cannot be used for predictive modeling.
    df_clean = df.dropna(subset=FEATURE_COLUMNS).copy()
    
    # Check data integrity after dropping NaNs
    rows_dropped = len(df) - len(df_clean)
    logger.info(f"Dropped {rows_dropped} rows (first {MIN_PERIODS-1} matches per team) due to NaN O-Factors.")
    logger.info(f"Cleaned data shape: {df_clean.shape}")
    
    if df_clean.empty:
        logger.error("Cleaned DataFrame is empty. Cannot perform correlation.")
        return

    # 2. Calculate Correlation
    # We use a Series of the target vs the selected features for simplicity
    correlation_results = df_clean[FEATURE_COLUMNS + [TARGET_COLUMN]].corr()[TARGET_COLUMN].drop(TARGET_COLUMN)

    logger.info("\n--- Correlation Results (Pearson's r) ---")
    
    # A positive 'r' means when the feature increases, the target increases.
    # A negative 'r' means when the feature increases, the target decreases.
    for feature, r_value in correlation_results.items():
        logger.info(f"   {feature:<20}: {r_value:.4f}")

    # 3. Interpret and Conclude
    logger.info("\n--- Interpretation ---")
    
    # Expected sign based on football logic:
    # 1. sot_conceded_MA5: The higher the opponent's MA5 Shots on Target Conceded, the WEAKER their defense. 
    #    Therefore, the player's summary_sot (SOT for the player) should be HIGHER (Positive correlation).
    
    # 2. tackles_att_3rd_MA5: The higher the opponent's MA5 Tackles in the Attacking Third, the MORE PRESSING/AGGRESSIVE 
    #    their defense is in attacking areas. This might REDUCE the player's SOT (Negative correlation).

    if correlation_results['sot_conceded_MA5'] > 0:
        logger.info(f"✅ 'sot_conceded_MA5' has a positive correlation. This aligns with expectation: Weaker defense (more SOT conceded) $\\implies$ more SOT for player.")
    else:
        logger.warning("⚠️ 'sot_conceded_MA5' correlation is not positive. Investigate data or logic.")
        
    if correlation_results['tackles_att_3rd_MA5'] < 0:
        logger.info(f"✅ 'tackles_att_3rd_MA5' has a negative correlation. This aligns with expectation: More aggressive defense $\\implies$ fewer SOT for player.")
    else:
        logger.warning("⚠️ 'tackles_att_3rd_MA5' correlation is not negative. Investigate data or logic.")
        
    logger.info("Correlation analysis complete.")
    

if __name__ == '__main__':
    df_final = load_final_features()
    analyze_correlations(df_final)

