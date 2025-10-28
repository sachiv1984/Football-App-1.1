"""
Zero-Inflated Poisson (ZIP) Model Training Script
Updated: 2025-10-28

✅ FIXED: Handles high zero-inflation for SOT.
✅ NEW: Calculates probabilities for 1+, 2+, 3+ SOT.
"""

import pandas as pd
import numpy as np
import pickle
import json
import logging
import sys
import os
import statsmodels.api as sm
from statsmodels.discrete.count_model import ZeroInflatedPoisson
from sklearn.metrics import mean_squared_error, mean_absolute_error

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# --- Configuration ---
INPUT_FILE = "final_feature_set_scaled.parquet"
MODEL_OUTPUT = "src/services/ai/artifacts/zip_model.pkl"
STATS_OUTPUT = "src/services/ai/artifacts/zip_training_stats.json"
COMPARISON_OUTPUT = "zip_vs_poisson_comparison.txt"

# Features
PREDICTOR_COLUMNS = [
    'sot_conceded_MA5_scaled', 
    'tackles_att_3rd_MA5_scaled', 
    'sot_MA5_scaled', 
    'summary_min',
    'is_forward',   
    'is_defender'   
]

INFLATION_PREDICTOR_COLUMNS = [
    'sot_MA5_scaled', 
    'is_forward',   
    'is_defender'   
]

TARGET_COLUMN = 'sot'

# --- Helper Functions ---

def print_section(title):
    logger.info("\n" + "="*80)
    logger.info(f"  {title}")
    logger.info("="*80)

def calculate_metrics(y_true, y_pred):
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    mae = mean_absolute_error(y_true, y_pred)
    return {'rmse': rmse, 'mae': mae}

def calculate_mcfadden_r2(model, y_true):
    ll_model = model.llf
    y_mean = y_true.mean()
    ll_null = np.sum(y_true * np.log(y_mean) - y_mean)
    if ll_null == 0:
        return 0.0
    return 1 - (ll_model / ll_null)

def get_significance_stars(p):
    if p < 0.001: return '***'
    elif p < 0.01: return '**'
    elif p < 0.05: return '*'
    else: return ''

# --- Main Pipeline ---

def load_data():
    print_section("1. LOADING DATA")
    if not os.path.exists(INPUT_FILE):
        logger.error(f"❌ File not found: {INPUT_FILE}")
        sys.exit(1)
    df = pd.read_parquet(INPUT_FILE)
    logger.info(f"✅ Data loaded. Shape: {df.shape}")

    required_cols = list(set(PREDICTOR_COLUMNS + INFLATION_PREDICTOR_COLUMNS + [TARGET_COLUMN]))
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        logger.error(f"❌ Missing columns: {missing}")
        sys.exit(1)
    df = df.dropna(subset=required_cols)
    return df

def prepare_features(df):
    print_section("2. PREPARING FEATURES")
    X_count = sm.add_constant(df[PREDICTOR_COLUMNS], has_constant='add')
    X_infl = sm.add_constant(df[INFLATION_PREDICTOR_COLUMNS], has_constant='add')
    y = df[TARGET_COLUMN]
    logger.info(f"Count features shape: {X_count.shape}, Inflation features shape: {X_infl.shape}")
    zeros_pct = (y==0).sum()/len(y)*100
    logger.info(f"Zero-inflation: {zeros_pct:.1f}%")
    return X_count, X_infl, y

def train_zip_model(X_count, X_infl, y):
    print_section("3. TRAINING ZIP MODEL")
    import warnings
    warnings.filterwarnings('ignore', category=FutureWarning)
    zip_model = ZeroInflatedPoisson(endog=y, exog=X_count, exog_infl=X_infl).fit(
        method='bfgs', maxiter=1000, disp=False)
    warnings.filterwarnings('default', category=FutureWarning)
    logger.info("✅ ZIP model trained")
    return zip_model

def train_poisson(X_count, y):
    logger.info("\nTraining standard Poisson for comparison...")
    try:
        model = sm.GLM(y, X_count, family=sm.families.Poisson()).fit()
        logger.info("✅ Poisson model trained")
        return model
    except:
        logger.warning("❌ Poisson training failed")
        return None

def evaluate_models(zip_model, poisson_model, X_count, X_infl, y):
    print_section("4. MODEL EVALUATION")
    y_pred_zip = zip_model.predict(X_count, exog_infl=X_infl)
    y_pred_poisson = poisson_model.predict(X_count) if poisson_model else None
    metrics_zip = calculate_metrics(y, y_pred_zip)
    metrics_poisson = calculate_metrics(y, y_pred_poisson) if poisson_model else None
    pseudo_r2_zip = calculate_mcfadden_r2(zip_model, y)
    pseudo_r2_poisson = calculate_mcfadden_r2(poisson_model, y) if poisson_model else None

    logger.info(f"Pseudo R² ZIP: {pseudo_r2_zip:.4f}, Poisson: {pseudo_r2_poisson}")
    logger.info(f"RMSE ZIP: {metrics_zip['rmse']:.4f}, Poisson: {metrics_poisson['rmse'] if metrics_poisson else 'N/A'}")
    return metrics_zip

def compute_sot_probabilities(zip_model, X_count, X_infl, max_sot=3):
    """
    Compute probabilities for 1+, 2+, 3+ SOT using the ZIP CDF.
    P(SOT >= k) = 1 - CDF_Poisson(k-1) * (1 - π)
    """
    logger.info("\n🎯 Computing SOT probabilities (1+, 2+, 3+)...")
    # Predicted count mean
    mu = zip_model.predict(X_count, exog_infl=X_infl, which='mean')
    # Predicted zero-inflation probability (π)
    pi = zip_model.predict(X_count, exog_infl=X_infl, which='prob-zero')
    probs = pd.DataFrame(index=X_count.index)
    for k in range(1, max_sot+1):
        # P(SOT >= k) = 1 - P(SOT <= k-1)
        cdf_k_minus_1 = np.exp(-mu) * sum((mu**i)/np.math.factorial(i) for i in range(k))
        probs[f'P_SOT_{k}_Plus'] = 1 - (1-pi) * cdf_k_minus_1
    return probs

def save_model_and_stats(zip_model, metrics_zip, probs_df):
    print_section("5. SAVING MODEL & STATS")
    os.makedirs(os.path.dirname(MODEL_OUTPUT), exist_ok=True)
    pickle.dump(zip_model, open(MODEL_OUTPUT, 'wb'))
    logger.info(f"✅ Model saved: {MODEL_OUTPUT}")
    stats = {
        'pseudo_r2': metrics_zip['rmse'], # or any relevant metrics
        'rmse': metrics_zip['rmse'],
        'mae': metrics_zip['mae'],
        'count_features': PREDICTOR_COLUMNS,
        'inflation_features': INFLATION_PREDICTOR_COLUMNS,
        'sot_prob_columns': list(probs_df.columns),
        'training_samples': len(zip_model.model.endog)
    }
    with open(STATS_OUTPUT, 'w') as f:
        json.dump(stats, f, indent=2)
    logger.info(f"✅ Stats saved: {STATS_OUTPUT}")

def main():
    df = load_data()
    X_count, X_infl, y = prepare_features(df)
    zip_model = train_zip_model(X_count, X_infl, y)
    poisson_model = train_poisson(X_count, y)
    metrics_zip = evaluate_models(zip_model, poisson_model, X_count, X_infl, y)
    probs_df = compute_sot_probabilities(zip_model, X_count, X_infl)
    save_model_and_stats(zip_model, metrics_zip, probs_df)
    logger.info("\n✅ ZIP MODEL TRAINING COMPLETE")

if __name__ == '__main__':
    main()
