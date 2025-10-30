import pandas as pd
import numpy as np
import statsmodels.api as sm
from statsmodels.stats.outliers_influence import variance_inflation_factor
import logging
import sys

# -----------------------------
# Logging Setup
# -----------------------------
logging.basicConfig(
    level=logging.INFO, 
    format='[%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('diagnostics_report.txt', mode='w')
    ]
)
logger = logging.getLogger(__name__)

SCALED_DATA_FILE = "final_feature_set_scaled.parquet"

# Updated predictor list
PREDICTOR_COLUMNS = [
    'sot_conceded_MA5_scaled',
    'sot_MA5_scaled',
    'npxg_MA5_scaled',
    'summary_min',
    'is_forward',   
    'is_defender',
    'is_home'
]

TARGET_COLUMN = 'sot'

# -----------------------------
# Helper function
# -----------------------------
def print_section_header(title):
    """Print a formatted section header."""
    logger.info("\n" + "="*70)
    logger.info(f"  {title}")
    logger.info("="*70)

# -----------------------------
# Main diagnostics
# -----------------------------
def investigate_model_issues():
    logger.info("Loading data for diagnostics...")
    try:
        df = pd.read_parquet(SCALED_DATA_FILE)
        logger.info(f"✅ Data loaded successfully. Shape: {df.shape}")
    except FileNotFoundError:
        logger.error(f"❌ File not found: {SCALED_DATA_FILE}")
        logger.error("Make sure the model training pipeline has completed first.")
        sys.exit(1)
    
    # --- DATA CLEANING ---
    required_cols = PREDICTOR_COLUMNS + [TARGET_COLUMN]
    initial_shape = df.shape[0]
    df = df.replace([np.inf, -np.inf], np.nan)
    df = df.dropna(subset=required_cols)
    final_shape = df.shape[0]
    if initial_shape != final_shape:
        logger.warning(f"⚠️ NaN/Inf rows dropped. Samples lost: {initial_shape - final_shape}")
        logger.info(f"  Shape after cleaning: {df.shape}")
    else:
        logger.info("✅ Data is clean (no NaNs/Infs in feature/target columns).")
    
    # -----------------------------
    # 1. MULTICOLLINEARITY CHECK (VIF)
    # -----------------------------
    print_section_header("1. MULTICOLLINEARITY CHECK (Variance Inflation Factor)")
    
    X = df[PREDICTOR_COLUMNS].copy()
    X_with_const = sm.add_constant(X, has_constant='add')
    
    vif_data = pd.DataFrame()
    vif_data["Feature"] = X_with_const.columns
    vif_data["VIF"] = [variance_inflation_factor(X_with_const.values, i) 
                       for i in range(X_with_const.shape[1])]
    vif_data = vif_data.sort_values('VIF', ascending=False)
    
    logger.info("\nVariance Inflation Factors (with 'const'):")
    logger.info("-" * 50)
    for _, row in vif_data.iterrows():
        vif_val = row['VIF']
        status = "🔴 SEVERE" if vif_val > 10 else ("⚠️ MODERATE" if vif_val > 5 and row['Feature'] != 'const' else "✅ OK")
        logger.info(f"  {row['Feature']:<30} VIF: {vif_val:>8.2f}  {status}")
    
    vif_data[vif_data['Feature'] != 'const'].to_csv('vif_results.csv', index=False)
    
    # -----------------------------
    # 2. CORRELATION MATRIX
    # -----------------------------
    print_section_header("2. FEATURE CORRELATION MATRIX")
    corr_matrix = df[PREDICTOR_COLUMNS + [TARGET_COLUMN]].corr()
    logger.info("\nFull Correlation Matrix:")
    logger.info(corr_matrix.to_string())
    corr_matrix.to_csv('correlation_matrix.csv')
    
    logger.info("\nKey Feature Correlations (absolute value > 0.5):")
    for i, col1 in enumerate(PREDICTOR_COLUMNS):
        for col2 in PREDICTOR_COLUMNS[i+1:]:
            corr_val = corr_matrix.loc[col1, col2]
            if abs(corr_val) > 0.5:
                logger.warning(f"  {col1} ↔ {col2}: {corr_val:+.4f} ⚠️")
    
    # -----------------------------
    # 3. TARGET DISTRIBUTION & OVERDISPERSION
    # -----------------------------
    print_section_header("3. TARGET DISTRIBUTION & OVERDISPERSION")
    
    logger.info("\nShots on Target (SOT) Distribution:")
    sot_counts = df[TARGET_COLUMN].value_counts().sort_index()
    for sot_val, count in sot_counts.items():
        pct = count / len(df) * 100
        logger.info(f"  {sot_val} SOT: {count:>4} matches ({pct:>5.1f}%)")
    
    mean_sot = df[TARGET_COLUMN].mean()
    var_sot = df[TARGET_COLUMN].var()
    dispersion_ratio = var_sot / mean_sot
    
    logger.info(f"\nMean SOT: {mean_sot:.4f}")
    logger.info(f"Variance SOT: {var_sot:.4f}")
    logger.info(f"Variance/Mean: {dispersion_ratio:.4f}")
    
    if dispersion_ratio > 1.5:
        logger.warning("🔴 OVERDISPERSION DETECTED - consider Negative Binomial")
    elif dispersion_ratio > 1.2:
        logger.warning("⚠️ Slight overdispersion")
    else:
        logger.info("✅ Poisson assumption satisfied (Var ≈ Mean)")
    
    zero_pct = (df[TARGET_COLUMN] == 0).sum() / len(df) * 100
    logger.info(f"\nZero-Inflation Check: {zero_pct:.1f}% zeros")
    if zero_pct > 40:
        logger.warning("🔴 High zero-inflation (>40%)")
    elif zero_pct > 30:
        logger.warning("⚠️ Moderate zero-inflation")
    else:
        logger.info("✅ Zero-inflation acceptable")
    
    # -----------------------------
    # 4. UNIVARIATE FEATURE CORRELATIONS
    # -----------------------------
    print_section_header("4. UNIVARIATE FEATURE IMPORTANCE")
    
    correlations = []
    for col in PREDICTOR_COLUMNS:
        corr = df[col].corr(df[TARGET_COLUMN])
        correlations.append({'Feature': col, 'Correlation': corr})
        strength = "STRONG" if abs(corr) > 0.3 else ("MODERATE" if abs(corr) > 0.1 else "WEAK")
        logger.info(f"  {col:<30}: {corr:+.4f}  ({strength})")
    
    pd.DataFrame(correlations).to_csv('feature_target_correlations.csv', index=False)
    
    # -----------------------------
    # 5. SUMMARY
    # -----------------------------
    print_section_header("5. FINAL SUMMARY & RECOMMENDATIONS")
    
    issues_found = []
    max_vif_row = vif_data.sort_values('VIF', ascending=False).iloc[0]
    max_vif = max_vif_row['VIF']
    if max_vif > 10:
        issues_found.append(f"🔴 Severe multicollinearity (VIF: {max_vif:.2f} for {max_vif_row['Feature']})")
    elif max_vif > 5:
        issues_found.append(f"⚠️ Moderate multicollinearity (VIF: {max_vif:.2f} for {max_vif_row['Feature']})")
    if dispersion_ratio > 1.5:
        issues_found.append("🔴 Overdispersion detected")
    if zero_pct > 40:
        issues_found.append("🔴 High zero-inflation")
    
    if issues_found:
        logger.warning("\n⚠️ ISSUES IDENTIFIED:")
        for issue in issues_found:
            logger.warning(f"  • {issue}")
    else:
        logger.info("\n✅ No major issues detected. Model looks reasonable.")
    
    logger.info("\n📋 RECOMMENDED ACTIONS:")
    logger.info("  1. Review VIF and correlation results")
    logger.info("  2. Monitor overdispersion and zero-inflation")
    logger.info("  3. Consider retraining if major issues are found")
    
    logger.info("\n📁 Output files generated:")
    logger.info("  • diagnostics_report.txt")
    logger.info("  • vif_results.csv")
    logger.info("  • correlation_matrix.csv")
    logger.info("  • feature_target_correlations.csv")
    
    return df

if __name__ == "__main__":
    try:
        df = investigate_model_issues()
        logger.info("\n" + "="*70)
        logger.info("  DIAGNOSTICS COMPLETE")
        logger.info("="*70)
        sys.exit(0)
    except Exception as e:
        logger.error(f"\n❌ FATAL ERROR: {e}")
        import traceback
        logger.error(traceback.format_exc())
        sys.exit(1)
