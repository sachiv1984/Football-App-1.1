import pandas as pd
import logging
import numpy as np
import sys
import os

# Set up logging
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# --- Configuration (UPDATED with Venue Feature) ---
# Now loading the file that includes P-Factors
FEATURE_FILE = "final_feature_set_pfactors.parquet" 
# Target column is 'sot' (Shots on Target), the current match performance
TARGET_COLUMN = 'sot'
# Including the new P-Factors, Position Features, AND VENUE FEATURE
FEATURE_COLUMNS = [
    'sot_conceded_MA5', 
    'tackles_att_3rd_MA5', 
    'sot_MA5', 
    'min_MA5',
    'is_forward',   
    'is_defender',  
    'is_home'   # <-- NEW: Binary indicator for Home/Away (Venue Feature)
] 
MIN_PERIODS = 5 

def load_final_features() -> pd.DataFrame:
    """Loads the final feature set including all O-Factors and P-Factors."""
    logger.info(f"Loading final feature set from {FEATURE_FILE}...")
    try:
        # Check if file exists before trying to read
        if not os.path.exists(FEATURE_FILE):
             logger.error(f"❌ File not found: {FEATURE_FILE}. Ensure player_factor_engineer.py ran successfully.")
             sys.exit(1)
             
        df = pd.read_parquet(FEATURE_FILE)
        logger.info(f"Data loaded successfully. Shape: {df.shape}")
        return df
    except Exception as e:
        logger.error(f"❌ Error loading data: {e}")
        sys.exit(1)

def analyze_correlations(df: pd.DataFrame):
    """
    Cleans the data and calculates Pearson's correlation coefficients 
    between all factors and the target variable.
    """
    logger.info("\nStarting statistical correlation analysis (Full Feature Set)...")
    
    # 1. Handle Missing Values (where rolling averages are still NaN)
    # Ensure all required features and the target column exist before dropna
    analysis_cols = [col for col in FEATURE_COLUMNS + [TARGET_COLUMN] if col in df.columns]
    
    df_clean = df.dropna(subset=analysis_cols).copy()
    
    rows_dropped = len(df) - len(df_clean)
    logger.info(f"Dropped {rows_dropped} rows due to NaN factors.")
    logger.info(f"Cleaned data shape: {df_clean.shape}")
    
    if df_clean.empty:
        logger.error("Cleaned DataFrame is empty. Cannot perform correlation.")
        return

    # 2. Calculate Correlation
    correlation_results = df_clean[analysis_cols].corr()[TARGET_COLUMN].drop(TARGET_COLUMN)

    logger.info("\n--- Correlation Results (Pearson's r) ---")
    
    # Sort results for readability
    correlation_results = correlation_results.sort_values(ascending=False)

    for feature, r_value in correlation_results.items():
        logger.info(f"   {feature:<20}: {r_value:.4f}")

    # 3. Interpretation (UPDATED for Venue Feature)
    logger.info("\n--- Interpretation ---")
    
    # P-Factor Expectations:
    logger.info("   P-Factors (Historical Player):")
    logger.info("     - sot_MA5: Strong POSITIVE expected (Past SOT predicts Current SOT).")
    logger.info("     - min_MA5: Weak POSITIVE expected (More historical minutes implies better starter/form).")
    
    # O-Factor Expectations:
    logger.info("   O-Factors (Opponent Defense):")
    logger.info("     - sot_conceded_MA5: POSITIVE expected (Weaker defense => more SOT).")
    logger.info("     - tackles_att_3rd_MA5: NEGATIVE expected (Aggressive defense => fewer SOT).")

    # Position/Venue Feature Expectations:
    logger.info("   Auxiliary Features (Position/Venue):")
    logger.info("     - is_forward: Strong POSITIVE expected (Forwards should have the highest correlation with SOT).")
    logger.info("     - is_defender: Weak/Negative expected (Attacking defenders still shoot less than MFs/FWs).")
    logger.info("     - is_home: Weak POSITIVE expected (Home team advantage often results in more shots).") # <-- NEW EXPECTATION

    # Simple check for the most critical features
    sot_ma5_r = correlation_results.get('sot_MA5', 0)
    forward_r = correlation_results.get('is_forward', 0)
    
    if sot_ma5_r > 0.4 and forward_r > 0.3:
        logger.info(f"✅ Success: 'sot_MA5' (r={sot_ma5_r:.4f}) and 'is_forward' (r={forward_r:.4f}) show the expected strong positive correlation with SOT.")
    else:
        logger.warning(f"⚠️ Warning: 'sot_MA5' (r={sot_ma5_r:.4f}) or 'is_forward' (r={forward_r:.4f}) correlation is weaker than expected. Proceed, but monitor model results closely.")
        
    logger.info("\nCorrelation analysis complete. Ready for Model Training.")
    
    
if __name__ == '__main__':
    df_final = load_final_features()
    analyze_correlations(df_final)
