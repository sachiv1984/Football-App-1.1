# src/services/ai/correlation_analysis.py

import pandas as pd
import logging
import numpy as np

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# --- Configuration (UPDATED) ---
# Now loading the file that includes P-Factors
FEATURE_FILE = "final_feature_set_pfactors.parquet" 
TARGET_COLUMN = 'summary_sot'
# Including the new P-Factors in the list of features to analyze
FEATURE_COLUMNS = ['sot_conceded_MA5', 'tackles_att_3rd_MA5', 'sot_MA5', 'min_MA5'] 
MIN_PERIODS = 5 

def load_final_features() -> pd.DataFrame:
    """Loads the final feature set including all O-Factors and P-Factors."""
    logger.info(f"Loading final feature set from {FEATURE_FILE}...")
    try:
        df = pd.read_parquet(FEATURE_FILE)
        logger.info(f"Data loaded successfully. Shape: {df.shape}")
        return df
    except FileNotFoundError:
        logger.error(f"File not found: {FEATURE_FILE}. Ensure player_factor_engineer.py ran successfully.")
        exit(1)

def analyze_correlations(df: pd.DataFrame):
    """
    Cleans the data and calculates Pearson's correlation coefficients 
    between all factors and the target variable.
    """
    logger.info("Starting statistical correlation analysis (Full Feature Set)...")
    
    # 1. Handle Missing Values (where rolling averages are still NaN)
    df_clean = df.dropna(subset=FEATURE_COLUMNS).copy()
    
    rows_dropped = len(df) - len(df_clean)
    logger.info(f"Dropped {rows_dropped} rows due to NaN factors.")
    logger.info(f"Cleaned data shape: {df_clean.shape}")
    
    if df_clean.empty:
        logger.error("Cleaned DataFrame is empty. Cannot perform correlation.")
        return

    # 2. Calculate Correlation
    correlation_results = df_clean[FEATURE_COLUMNS + [TARGET_COLUMN]].corr()[TARGET_COLUMN].drop(TARGET_COLUMN)

    logger.info("\n--- Correlation Results (Pearson's r) ---")
    
    for feature, r_value in correlation_results.items():
        logger.info(f"   {feature:<20}: {r_value:.4f}")

    # 3. Interpretation (UPDATED for P-Factors)
    logger.info("\n--- Interpretation ---")
    
    # P-Factor Expectations:
    # sot_MA5: Player's historical SOT should be strongly POSITIVELY correlated with current SOT.
    # min_MA5: Player's historical minutes should be weakly POSITIVELY correlated with current SOT 
    #          (more minutes played historically implies a higher chance of starting and playing well).

    # O-Factor Expectations:
    # sot_conceded_MA5: POSITIVE (Weaker defense $\implies$ more SOT)
    # tackles_att_3rd_MA5: NEGATIVE (Aggressive defense $\implies$ fewer SOT)

    # Simple check for the most critical feature
    sot_ma5_r = correlation_results.get('sot_MA5', 0)
    
    if sot_ma5_r > 0.4:
        logger.info(f"✅ 'sot_MA5' has a strong positive correlation (r={sot_ma5_r:.4f}). This is expected: Past performance predicts future performance.")
    elif sot_ma5_r > 0:
        logger.warning(f"⚠️ 'sot_MA5' correlation is positive but only moderate (r={sot_ma5_r:.4f}).")
    else:
        logger.error("❌ 'sot_MA5' correlation is negative. Investigate data.")
        
    logger.info("Correlation analysis complete. Ready for Feature Scaling.")
    
    
if __name__ == '__main__':
    df_final = load_final_features()
    # The correlation analysis will be run in the next pipeline execution

