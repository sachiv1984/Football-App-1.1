# src/services/ai/correlation_analysis.py - v4.2 (WITH xG FEATURE)

import pandas as pd
import logging
import numpy as np
import sys
import os

# Set up logging
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# --- Configuration (UPDATED with xG Feature) ---
# Now loading the file that includes P-Factors
FEATURE_FILE = "final_feature_set_pfactors.parquet" 
# Target column is 'sot' (Shots on Target), the current match performance
TARGET_COLUMN = 'sot'
# ✅ v4.2 CHANGE: Added npxg_MA5 to feature columns
FEATURE_COLUMNS = [
    'sot_conceded_MA5',   # Opponent weakness
    'tackles_att_3rd_MA5', # Opponent pressure
    'sot_MA5',            # Player form (shots)
    'npxg_MA5',           # ✅ NEW: Player form (xG quality)
    'min_MA5',            # Playing time
    'is_forward',         # Position
    'is_defender',        # Position (attacking defenders)
    'is_home'             # Venue
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
    ✅ v4.2: Now includes npxg_MA5 in correlation analysis
    """
    logger.info("\n" + "="*70)
    logger.info("STATISTICAL CORRELATION ANALYSIS v4.2 (WITH xG FEATURE)")
    logger.info("="*70)
    
    # 1. Handle Missing Values (where rolling averages are still NaN)
    # Ensure all required features and the target column exist before dropna
    analysis_cols = [col for col in FEATURE_COLUMNS + [TARGET_COLUMN] if col in df.columns]
    
    # ✅ v4.2: Check if npxg_MA5 exists
    if 'npxg_MA5' not in df.columns:
        logger.warning("⚠️ WARNING: npxg_MA5 not found in dataframe!")
        logger.warning("   Run player_factor_engineer.py first to calculate npxg_MA5")
        analysis_cols = [col for col in analysis_cols if col != 'npxg_MA5']
    else:
        npxg_coverage = df['npxg_MA5'].notna().sum() / len(df) * 100
        logger.info(f"✅ npxg_MA5 found | Coverage: {npxg_coverage:.1f}%")
    
    df_clean = df.dropna(subset=analysis_cols).copy()
    
    rows_dropped = len(df) - len(df_clean)
    logger.info(f"Dropped {rows_dropped} rows due to NaN factors.")
    logger.info(f"Cleaned data shape: {df_clean.shape}")
    
    if df_clean.empty:
        logger.error("Cleaned DataFrame is empty. Cannot perform correlation.")
        return

    # 2. Calculate Correlation
    correlation_results = df_clean[analysis_cols].corr()[TARGET_COLUMN].drop(TARGET_COLUMN)

    logger.info("\n" + "="*70)
    logger.info("CORRELATION RESULTS (Pearson's r)")
    logger.info("="*70)
    
    # Sort results for readability
    correlation_results = correlation_results.sort_values(ascending=False)

    for feature, r_value in correlation_results.items():
        # ✅ v4.2: Highlight npxG correlation
        if feature == 'npxg_MA5':
            logger.info(f"   {feature:<25}: {r_value:.4f} ✅ NEW FEATURE")
        else:
            logger.info(f"   {feature:<25}: {r_value:.4f}")

    # 3. Interpretation (UPDATED for xG Feature)
    logger.info("\n" + "="*70)
    logger.info("INTERPRETATION")
    logger.info("="*70)
    
    # P-Factor Expectations:
    logger.info("\n   📊 P-Factors (Historical Player):")
    logger.info("     - sot_MA5: Strong POSITIVE expected (Past SOT predicts Current SOT).")
    logger.info("     - npxg_MA5: POSITIVE expected (xG quality correlates with shots) ✅ NEW")
    logger.info("     - min_MA5: Weak POSITIVE expected (More historical minutes implies better starter/form).")
    
    # O-Factor Expectations:
    logger.info("\n   🛡️ O-Factors (Opponent Defense):")
    logger.info("     - sot_conceded_MA5: POSITIVE expected (Weaker defense => more SOT).")
    logger.info("     - tackles_att_3rd_MA5: NEGATIVE expected (Aggressive defense => fewer SOT).")

    # Position/Venue Feature Expectations:
    logger.info("\n   ⚽ Auxiliary Features (Position/Venue):")
    logger.info("     - is_forward: Strong POSITIVE expected (Forwards should have the highest correlation with SOT).")
    logger.info("     - is_defender: Weak/Negative expected (Attacking defenders still shoot less than MFs/FWs).")
    logger.info("     - is_home: Weak POSITIVE expected (Home team advantage often results in more shots).")

    # ✅ v4.2: Enhanced validation including npxG
    logger.info("\n" + "="*70)
    logger.info("VALIDATION CHECKS")
    logger.info("="*70)
    
    sot_ma5_r = correlation_results.get('sot_MA5', 0)
    npxg_ma5_r = correlation_results.get('npxg_MA5', 0)  # ✅ NEW
    forward_r = correlation_results.get('is_forward', 0)
    
    # Check critical features
    if sot_ma5_r > 0.4 and forward_r > 0.3:
        logger.info(f"✅ Success: Core features validated")
        logger.info(f"   - sot_MA5 (r={sot_ma5_r:.4f}) ✅ Strong positive")
        logger.info(f"   - is_forward (r={forward_r:.4f}) ✅ Strong positive")
    else:
        logger.warning(f"⚠️ Warning: Core features weaker than expected")
        logger.warning(f"   - sot_MA5 (r={sot_ma5_r:.4f})")
        logger.warning(f"   - is_forward (r={forward_r:.4f})")
        
    # ✅ v4.2: Validate npxG correlation
    if 'npxg_MA5' in correlation_results:
        logger.info(f"\n✅ NEW FEATURE: npxg_MA5 (r={npxg_ma5_r:.4f})")
        
        if npxg_ma5_r > 0.4:
            logger.info(f"   💰 STRONG correlation (>0.4) - High betting value!")
        elif npxg_ma5_r > 0.2:
            logger.info(f"   ✅ MODERATE correlation (>0.2) - Useful predictor")
        elif npxg_ma5_r > 0.0:
            logger.info(f"   ⚠️ WEAK correlation (>0.0) - Marginal value")
        else:
            logger.warning(f"   ❌ NEGATIVE/ZERO correlation - May need investigation")
            
        # Compare to sot_MA5
        if abs(npxg_ma5_r) > 0.1:
            correlation_ratio = npxg_ma5_r / sot_ma5_r if sot_ma5_r != 0 else 0
            logger.info(f"   📊 npxG/SOT correlation ratio: {correlation_ratio:.2f}")
            
            if correlation_ratio > 0.7:
                logger.info(f"      → npxG captures similar info to SOT (may have multicollinearity)")
            elif correlation_ratio > 0.4:
                logger.info(f"      → npxG provides complementary information ✅")
            else:
                logger.info(f"      → npxG provides unique information ✅")
    
    logger.info("\n" + "="*70)
    logger.info("✅ Correlation analysis complete (v4.2)")
    logger.info("="*70)
    logger.info("Next step: Run feature_scaling.py to prepare for model training")
    logger.info("="*70 + "\n")
    
    
if __name__ == '__main__':
    df_final = load_final_features()
    analyze_correlations(df_final)