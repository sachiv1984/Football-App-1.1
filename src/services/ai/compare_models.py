"""
Side-by-Side Comparison: Poisson vs ZIP Model

This script compares both models on the same test set and generates
comprehensive evaluation metrics.
"""

import pandas as pd
import numpy as np
import pickle
import logging
import sys
from sklearn.metrics import mean_squared_error, mean_absolute_error
import statsmodels.api as sm

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# --- Configuration ---
INPUT_FILE = "final_feature_set_scaled.parquet"
POISSON_MODEL = "src/services/ai/artifacts/poisson_model.pkl"
ZIP_MODEL = "src/services/ai/artifacts/zip_model.pkl"
OUTPUT_FILE = "model_comparison_report.txt"

# Features used for prediction - FULL SET FOR POISSON (COUNT) PART
PREDICTOR_COLUMNS = [
    'sot_conceded_MA5_scaled', 
    'sot_MA5_scaled', 
    'npxg_MA5_scaled', 
    'summary_min',
    'is_forward',   
    'is_defender',
    'is_home'
]

# Inflation columns used for the Logistic part of the ZIP model
INFLATION_PREDICTOR_COLUMNS = [
    'sot_MA5_scaled',
    'is_forward',   
    'is_defender',
    'is_home'
] 

TARGET_COLUMN = 'sot'


def print_section(title):
    logger.info("\n" + "=" * 80)
    logger.info(f"  {title}")
    logger.info("=" * 80)


def load_data():
    print_section("1. LOADING DATA")
    df = pd.read_parquet(INPUT_FILE)
    
    # Drop NaNs/Infs
    required_cols = list(set(PREDICTOR_COLUMNS + INFLATION_PREDICTOR_COLUMNS + [TARGET_COLUMN]))
    df = df.replace([np.inf, -np.inf], np.nan).dropna(subset=required_cols)
    
    # Prepare feature matrix
    X = df[PREDICTOR_COLUMNS].copy()
    X = sm.add_constant(X, has_constant='add')
    y = df[TARGET_COLUMN].copy()
    
    logger.info(f"  Feature matrix: {X.shape}")
    logger.info(f"  Target vector: {y.shape}")
    logger.info(f"  Zero rate: {(y==0).sum()/len(y)*100:.1f}%")
    return X, y, df


def load_models():
    print_section("2. LOADING MODELS")
    models = {}
    with open(POISSON_MODEL, 'rb') as f:
        models['poisson'] = pickle.load(f)
    logger.info(f"✅ Poisson model loaded from: {POISSON_MODEL}")
    
    with open(ZIP_MODEL, 'rb') as f:
        models['zip'] = pickle.load(f)
    logger.info(f"✅ ZIP model loaded from: {ZIP_MODEL}")
    
    return models


def evaluate_model(model, X, y, model_name='Model'):
    logger.info(f"\n📊 Evaluating {model_name}...")
    results = {}

    y_array = np.array(y).flatten()

    if model_name.lower() == 'zip':
        X_infl_pred = X[['const'] + INFLATION_PREDICTOR_COLUMNS].copy()
        y_pred = model.predict(X, exog_infl=X_infl_pred)

        # Probability for 1+ SOT
        prob_zero = model.predict(X, which='prob', exog_infl=X_infl_pred)
        if isinstance(prob_zero, tuple):
            prob_zero = prob_zero[0]
        prob_zero = np.array(prob_zero).flatten()[:len(y_array)]
        y_pred_proba = 1 - prob_zero
    else:
        y_pred = model.predict(X)
        y_pred_array = np.array(y_pred).flatten()
        y_pred_proba = 1 - np.exp(-y_pred_array)

    results['predictions'] = y_pred
    y_pred_array = np.array(y_pred).flatten()
    results['rmse'] = np.sqrt(mean_squared_error(y_array, y_pred_array))
    results['mae'] = mean_absolute_error(y_array, y_pred_array)
    results['mean_pred'] = y_pred_array.mean()
    results['mean_actual'] = y_array.mean()
    results['aic'] = getattr(model, 'aic', np.nan)
    results['bic'] = getattr(model, 'bic', np.nan)
    results['llf'] = getattr(model, 'llf', np.nan)
    results['prob_predictions'] = y_pred_proba
    results['brier_score'] = np.mean((y_pred_proba - (y_array>0).astype(int))**2)

    return results



def compare_models(models, X, y):
    print_section("3. MODEL COMPARISON")
    results = {}
    if models.get('poisson'):
        results['poisson'] = evaluate_model(models['poisson'], X, y, 'Poisson')
    if models.get('zip'):
        results['zip'] = evaluate_model(models['zip'], X, y, 'ZIP')
    return results


def display_comparison(results):
    print_section("4. COMPARISON RESULTS")
    metrics = ['rmse','mae','brier_score','aic','bic','llf','mean_pred','mean_actual']
    logger.info(f"{'Metric':<20} {'Poisson':<15} {'ZIP':<15}")
    logger.info("-"*50)
    for m in metrics:
        p_val = results.get('poisson', {}).get(m, np.nan)
        z_val = results.get('zip', {}).get(m, np.nan)
        logger.info(f"{m:<20} {p_val:<15.4f} {z_val:<15.4f}")


def main():
    logger.info("="*80)
    logger.info("  POISSON VS ZIP MODEL COMPARISON")
    logger.info("="*80)
    
    X, y, df = load_data()
    models = load_models()
    results = compare_models(models, X, y)
    display_comparison(results)
    print_section("✅ COMPARISON COMPLETE")


if __name__ == '__main__':
    main()
