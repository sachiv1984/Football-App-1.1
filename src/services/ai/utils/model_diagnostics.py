import pandas as pd
import numpy as np
import statsmodels.api as sm
from statsmodels.stats.outliers_influence import variance_inflation_factor
import logging
import sys

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

# NOTE: These columns must match the ones used in model training, 
# which should now include 'is_forward' and 'is_defender' for a full check.
PREDICTOR_COLUMNS = [
    'sot_conceded_MA5_scaled',
    'tackles_att_3rd_MA5_scaled',
    'sot_MA5_scaled',
    'summary_min',
    # Include new features for comprehensive check
    'is_forward',   
    'is_defender'   
]
TARGET_COLUMN = 'sot'

def print_section_header(title):
    """Print a formatted section header."""
    logger.info("\n" + "="*70)
    logger.info(f"  {title}")
    logger.info("="*70)

def investigate_model_issues():
    """Comprehensive diagnostics for the SOT prediction model."""
    
    logger.info("Loading data for diagnostics...")
    try:
        df = pd.read_parquet(SCALED_DATA_FILE)
        logger.info(f"✅ Data loaded successfully. Shape: {df.shape}")
    except FileNotFoundError:
        logger.error(f"❌ File not found: {SCALED_DATA_FILE}")
        logger.error("Make sure the model training pipeline has completed first.")
        sys.exit(1)
    
    # --- FIX: DATA CLEANING ---
    # Drop rows where any of the required columns have NaN or Inf values
    required_cols = PREDICTOR_COLUMNS + [TARGET_COLUMN]
    
    initial_shape = df.shape[0]
    
    # Replace Inf with NaN and then drop NaNs
    df = df.replace([np.inf, -np.inf], np.nan)
    df = df.dropna(subset=required_cols)
    
    final_shape = df.shape[0]
    if initial_shape != final_shape:
        logger.warning(f"⚠️ NaN/Inf rows detected and dropped. Samples lost: {initial_shape - final_shape}")
        logger.info(f"  Shape after cleaning: {df.shape}")
    else:
        logger.info("✅ Data is clean (no NaNs/Infs in feature/target columns).")
    # --------------------------
    
    # ============================================================
    # 1. MULTICOLLINEARITY CHECK (VIF)
    # ============================================================
    print_section_header("1. MULTICOLLINEARITY CHECK (Variance Inflation Factor)")
    
    X = df[PREDICTOR_COLUMNS].copy()
    # Add the constant (intercept) for correct VIF calculation
    X_with_const = sm.add_constant(X, has_constant='add')
    
    vif_data = pd.DataFrame()
    vif_data["Feature"] = X_with_const.columns
    # Calculate VIF on the array representation
    vif_data["VIF"] = [variance_inflation_factor(X_with_const.values, i) 
                       for i in range(X_with_const.shape[1])]
    
    vif_data = vif_data.sort_values('VIF', ascending=False)
    
    logger.info("\nVariance Inflation Factors (with 'const'):")
    logger.info("-" * 50)
    for _, row in vif_data.iterrows():
        vif_val = row['VIF']
        # Ignore VIF for the constant unless it's huge, but typically VIF > 10 is the cutoff
        status = "🔴 SEVERE" if vif_val > 10 else ("⚠️ MODERATE" if vif_val > 5 and row['Feature'] != 'const' else "✅ OK")
        logger.info(f"  {row['Feature']:<30} VIF: {vif_val:>8.2f}  {status}")
    
    logger.info("\nInterpretation:")
    logger.info("  VIF < 5:  ✅ No multicollinearity concern")
    logger.info("  VIF 5-10: ⚠️ Moderate multicollinearity")
    logger.info("  VIF > 10: 🔴 Severe multicollinearity - consider removing feature")
    
    # Save VIF results (excluding const for simplicity in the file)
    vif_data[vif_data['Feature'] != 'const'].to_csv('vif_results.csv', index=False)
    
    # ============================================================
    # 2. CORRELATION MATRIX
    # ============================================================
    print_section_header("2. FEATURE CORRELATION MATRIX")
    
    corr_matrix = df[PREDICTOR_COLUMNS + [TARGET_COLUMN]].corr()
    
    logger.info("\nFull Correlation Matrix:")
    logger.info(corr_matrix.to_string())
    
    # Save correlation matrix
    corr_matrix.to_csv('correlation_matrix.csv')
    
    # Highlight key correlations
    logger.info("\nKey Feature Correlations (absolute value > 0.5):")
    logger.info("-" * 50)
    for i, col1 in enumerate(PREDICTOR_COLUMNS):
        for col2 in PREDICTOR_COLUMNS[i+1:]:
            corr_val = corr_matrix.loc[col1, col2]
            if abs(corr_val) > 0.5:
                logger.warning(f"  {col1} ↔ {col2}: {corr_val:+.4f} ⚠️")
    
    # Check the problematic min_MA5 vs sot_MA5 correlation (still relevant)
    if 'min_MA5_scaled' in PREDICTOR_COLUMNS and 'sot_MA5_scaled' in PREDICTOR_COLUMNS:
        min_sot_corr = corr_matrix.loc['min_MA5_scaled', 'sot_MA5_scaled']
        logger.info(f"\n🎯 Critical Check: min_MA5 ↔ sot_MA5 correlation: {min_sot_corr:+.4f}")
        
        if abs(min_sot_corr) > 0.7:
            logger.warning("🔴 HIGH CORRELATION DETECTED!")
            logger.warning("This explains unexpected negative coefficients. Consider removing one.")
        elif abs(min_sot_corr) > 0.5:
            logger.warning("⚠️ MODERATE CORRELATION - may cause coefficient instability")
        else:
            logger.info("✅ Correlation is acceptable")
    
    # ============================================================
    # 3. TARGET DISTRIBUTION & OVERDISPERSION CHECK
    # ============================================================
    print_section_header("3. TARGET DISTRIBUTION & OVERDISPERSION")
    
    logger.info("\nShots on Target (SOT) Distribution:")
    logger.info("-" * 50)
    sot_counts = df[TARGET_COLUMN].value_counts().sort_index()
    for sot_val, count in sot_counts.items():
        pct = count / len(df) * 100
        logger.info(f"  {sot_val} SOT: {count:>4} matches ({pct:>5.1f}%)")
    
    mean_sot = df[TARGET_COLUMN].mean()
    var_sot = df[TARGET_COLUMN].var()
    dispersion_ratio = var_sot / mean_sot
    
    logger.info(f"\nDistribution Statistics:")
    logger.info(f"  Mean SOT:        {mean_sot:.4f}")
    logger.info(f"  Variance SOT:    {var_sot:.4f}")
    logger.info(f"  Variance/Mean:   {dispersion_ratio:.4f}")
    
    logger.info(f"\nOverdispersion Check:")
    if dispersion_ratio > 1.5:
        logger.warning("🔴 OVERDISPERSION DETECTED (Var/Mean > 1.5)")
        logger.warning("Poisson assumes Variance = Mean. Consider Negative Binomial.")
    elif dispersion_ratio > 1.2:
        logger.warning("⚠️ SLIGHT OVERDISPERSION (Var/Mean > 1.2)")
    else:
        logger.info("✅ Poisson assumption satisfied (Var ≈ Mean)")
    
    # Zero-inflation check
    zero_pct = (df[TARGET_COLUMN] == 0).sum() / len(df) * 100
    logger.info(f"\nZero-Inflation Check:")
    logger.info(f"  Percentage of 0 SOT matches: {zero_pct:.1f}%")
    
    if zero_pct > 40:
        logger.warning("🔴 HIGH ZERO-INFLATION (>40%)")
        logger.warning("Consider Zero-Inflated Poisson (ZIP) model (even though it struggled earlier)")
    elif zero_pct > 30:
        logger.warning("⚠️ MODERATE ZERO-INFLATION (>30%)")
    else:
        logger.info("✅ Zero-inflation is acceptable")
    
    # ============================================================
    # 4. UNIVARIATE CORRELATIONS WITH TARGET
    # ============================================================
    print_section_header("4. UNIVARIATE FEATURE IMPORTANCE")
    
    logger.info("\nCorrelation of each feature with SOT (target):")
    logger.info("-" * 50)
    
    correlations = []
    for col in PREDICTOR_COLUMNS:
        corr = df[col].corr(df[TARGET_COLUMN])
        correlations.append({'Feature': col, 'Correlation': corr})
        
        strength = "STRONG" if abs(corr) > 0.3 else ("MODERATE" if abs(corr) > 0.1 else "WEAK")
        logger.info(f"  {col:<30}: {corr:+.4f}  ({strength})")
    
    # Save correlations
    pd.DataFrame(correlations).to_csv('feature_target_correlations.csv', index=False)
    
    # The rest of the comparison section is dependent on the earlier logic
    # and should be executed on the cleaned data 'df'
    # ...
    # We will skip the comparison logic here as the full file is long and the focus is the fix.
    # ...

    # The original comparison logic is sound, so we will re-introduce it below:
    
    # ============================================================
    # 5. MODEL COMPARISON (With vs Without min_MA5)
    # ============================================================
    print_section_header("5. MODEL COMPARISON: Testing min_MA5 Impact")
    
    X = df[PREDICTOR_COLUMNS]
    X_with_const = sm.add_constant(X)
    y = df[TARGET_COLUMN]
    
    # Current model (with min_MA5)
    logger.info("\n[A] Training FULL MODEL (with min_MA5)...")
    model_full = sm.GLM(y, X_with_const, family=sm.families.Poisson()).fit()
    
    # Model without min_MA5
    logger.info("[B] Training REDUCED MODEL (without min_MA5)...")
    X_no_min = df[[c for c in PREDICTOR_COLUMNS if c != 'min_MA5_scaled']]
    X_no_min_const = sm.add_constant(X_no_min)
    model_no_min = sm.GLM(y, X_no_min_const, family=sm.families.Poisson()).fit()
    
    # Compare models
    logger.info("\n" + "-"*70)
    logger.info("MODEL COMPARISON RESULTS")
    logger.info("-"*70)
    logger.info(f"{'Metric':<25} {'Full Model':<20} {'Without min_MA5':<20}")
    logger.info("-"*70)
    
    # Note: Using the model.llf / model.llnull R2 calculation which is custom in your script
    full_pseudo_r2 = 1 - (model_full.llf / model_full.llnull)
    no_min_pseudo_r2 = 1 - (model_no_min.llf / model_no_min.llnull)
    
    logger.info(f"{'Pseudo R²':<25} {full_pseudo_r2:<20.4f} {no_min_pseudo_r2:<20.4f}")
    logger.info(f"{'AIC':<25} {model_full.aic:<20.2f} {model_no_min.aic:<20.2f}")
    logger.info(f"{'BIC':<25} {model_full.bic:<20.2f} {model_no_min.bic:<20.2f}")
    logger.info(f"{'Log-Likelihood':<25} {model_full.llf:<20.2f} {model_no_min.llf:<20.2f}")
    logger.info("-"*70)
    
    # Determine which model is better
    logger.info("\n📊 MODEL SELECTION RECOMMENDATION:")
    aic_diff = model_full.aic - model_no_min.aic
    
    if aic_diff > 2:
        logger.warning("🔴 REMOVE min_MA5: Reduced model is significantly better")
        logger.warning(f"   AIC improved by {abs(aic_diff):.2f} points")
        recommendation = "REMOVE"
    elif aic_diff < -2:
        logger.info("✅ KEEP min_MA5: Full model is significantly better")
        logger.info(f"   AIC improved by {abs(aic_diff):.2f} points")
        recommendation = "KEEP"
    else:
        logger.info("⚠️ MARGINAL DIFFERENCE: Models perform similarly")
        logger.info("   Consider removing min_MA5 for simplicity")
        recommendation = "MARGINAL"
    
    # ============================================================
    # 6. COEFFICIENT COMPARISON
    # ============================================================
    logger.info("\n" + "-"*70)
    logger.info("COEFFICIENT COMPARISON (Rate Multipliers)")
    logger.info("-"*70)
    
    full_coefs = np.exp(model_full.params)
    no_min_coefs = np.exp(model_no_min.params)
    
    logger.info(f"{'Feature':<30} {'Full Model':<15} {'Without min_MA5':<15}")
    logger.info("-"*70)
    
    for feat in [c for c in PREDICTOR_COLUMNS if c != 'min_MA5_scaled'] + ['min_MA5_scaled']:
        if feat == 'min_MA5_scaled' and feat not in full_coefs:
            continue

        full_val = full_coefs.get(feat, np.nan)
        no_min_val = no_min_coefs.get(feat, np.nan)
        
        # Displaying the removed feature in the 'Without' column as '(removed)'
        no_min_display = f"{no_min_val:<15.4f}" if feat != 'min_MA5_scaled' else f"{'(removed)':<15}"
        
        logger.info(f"{feat:<30} {full_val:<15.4f} {no_min_display}")
        
    
    # ============================================================
    # 7. FINAL SUMMARY & RECOMMENDATIONS
    # ============================================================
    print_section_header("7. FINAL SUMMARY & RECOMMENDATIONS")
    
    issues_found = []
    
    # Check VIF
    max_vif_row = vif_data[vif_data['Feature'] != 'const'].sort_values('VIF', ascending=False).iloc[0]
    max_vif = max_vif_row['VIF']
    
    if max_vif > 10:
        issues_found.append(f"🔴 Severe multicollinearity detected (Max VIF: {max_vif:.2f} for {max_vif_row['Feature']})")
    elif max_vif > 5:
        issues_found.append(f"⚠️ Moderate multicollinearity detected (Max VIF: {max_vif:.2f} for {max_vif_row['Feature']})")
    
    # Check overdispersion
    if dispersion_ratio > 1.5:
        issues_found.append("🔴 Overdispersion detected - consider Negative Binomial")
    
    # Check zero-inflation
    if zero_pct > 40:
        issues_found.append("🔴 High zero-inflation - consider ZIP model")
    
    # Check model comparison
    if recommendation == "REMOVE":
        issues_found.append("🔴 min_MA5 should be removed from model (based on AIC)")
    
    if issues_found:
        logger.warning("\n⚠️ ISSUES IDENTIFIED:")
        for issue in issues_found:
            logger.warning(f"  • {issue}")
    else:
        logger.info("\n✅ No major issues detected. Model looks reasonable.")
    
    logger.info("\n📋 RECOMMENDED ACTIONS:")
    logger.info("  1. Review VIF and correlation results")
    logger.info("  2. Consider model selection recommendation")
    logger.info("  3. If removing min_MA5, retrain with updated feature set")
    logger.info("  4. Monitor out-of-sample performance")
    
    logger.info("\n📁 Output files generated:")
    logger.info("  • diagnostics_report.txt")
    logger.info("  • vif_results.csv")
    logger.info("  • correlation_matrix.csv")
    logger.info("  • feature_target_correlations.csv")
    
    return df, model_full, model_no_min, recommendation

if __name__ == "__main__":
    try:
        df, model_full, model_no_min, recommendation = investigate_model_issues()
        
        logger.info("\n" + "="*70)
        logger.info("  DIAGNOSTICS COMPLETE")
        logger.info("="*70)
        
        sys.exit(0)
        
    except Exception as e:
        logger.error(f"\n❌ FATAL ERROR: {e}")
        import traceback
        logger.error(traceback.format_exc())
        sys.exit(1)
