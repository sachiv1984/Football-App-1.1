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
import json
import warnings
from sklearn.metrics import mean_squared_error, mean_absolute_error
from scipy.stats import poisson

# Suppress statsmodels BIC warning
import statsmodels.api as sm
# The following import is only needed if statsmodels version requires it
# from statsmodels.genmod.generalized_linear_model import SET_USE_BIC_LLF
# SET_USE_BIC_LLF(True)  # Use log-likelihood based BIC (future default)

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# --- Configuration ---
INPUT_FILE = "final_feature_set_scaled.parquet"
POISSON_MODEL = "src/services/ai/artifacts/poisson_model.pkl"
ZIP_MODEL = "src/services/ai/artifacts/zip_model.pkl"
OUTPUT_FILE = "model_comparison_report.txt"

# --- FEATURE FIX: ADDED 'is_home' TO BOTH LISTS TO MATCH 7-FEATURE TRAINING MODEL ---

# Features used for prediction - FULL SET FOR POISSON (COUNT) PART
# This must match the 7 features the Poisson model was trained on.
PREDICTOR_COLUMNS = [
    'sot_conceded_MA5_scaled', 
    'sot_MA5_scaled', 
    'summary_min',
    'is_forward',   
    'is_defender',
    'is_home' # <--- ADDED 'is_home' to fix the (981,6) vs (7,) mismatch
]

# Inflation columns used for the Logistic part of the ZIP model
INFLATION_PREDICTOR_COLUMNS = [
    'sot_MA5_scaled', 
    'is_forward',   
    'is_defender',
    'is_home' # <--- ADDED 'is_home' to match ZIP training
] 

TARGET_COLUMN = 'sot'


def print_section(title):
    """Print formatted section header."""
    logger.info("\n" + "=" * 80)
    logger.info(f"  {title}")
    logger.info("=" * 80)


def load_data():
    """Load and clean the test dataset."""
    print_section("1. LOADING DATA")
    
    try:
        df = pd.read_parquet(INPUT_FILE)
        logger.info(f"✅ Data loaded successfully. Shape: {df.shape}")
        
        # --- Data Cleaning to match the training data subset (705 rows) ---
        initial_shape = df.shape[0]
        # Ensure all columns needed for both models' predictions are present
        required_cols = list(set(PREDICTOR_COLUMNS + INFLATION_PREDICTOR_COLUMNS + [TARGET_COLUMN]))
        
        # Replace Inf with NaN and then drop NaNs
        df = df.replace([np.inf, -np.inf], np.nan)
        df = df.dropna(subset=required_cols)
        
        final_shape = df.shape[0]
        if initial_shape != final_shape:
            logger.warning(f"⚠️ NaN/Inf rows detected and dropped. Samples lost: {initial_shape - final_shape}")
            logger.info(f"  Shape after cleaning: {df.shape}")
        else:
            logger.info("✅ Data is clean (no NaNs/Infs in feature/target columns).")
        # ----------------------------------------------------
        
        # Prepare features for the COUNT part of the models (7 columns)
        X = df[PREDICTOR_COLUMNS].copy()
        y = df[TARGET_COLUMN].copy()
        
        # Add constant (X will now have 6 features + 1 const = 7 columns/parameters)
        X = sm.add_constant(X, has_constant='add')
        
        logger.info(f"  Feature matrix: {X.shape}")
        logger.info(f"  Target vector: {y.shape}")
        logger.info(f"  Zero rate: {(y == 0).sum() / len(y) * 100:.1f}%")
        
        return X, y, df
        
    except FileNotFoundError:
        logger.error(f"❌ File not found: {INPUT_FILE}")
        sys.exit(1)


def load_models():
    """Load both models."""
    print_section("2. LOADING MODELS")
    
    models = {}
    
    # Load Poisson model
    try:
        with open(POISSON_MODEL, 'rb') as f:
            models['poisson'] = pickle.load(f)
        logger.info(f"✅ Poisson model loaded from: {POISSON_MODEL}")
    except FileNotFoundError:
        logger.warning(f"⚠️ Poisson model not found: {POISSON_MODEL}")
        models['poisson'] = None
    
    # Load ZIP model
    try:
        with open(ZIP_MODEL, 'rb') as f:
            models['zip'] = pickle.load(f)
        logger.info(f"✅ ZIP model loaded from: {ZIP_MODEL}")
    except FileNotFoundError:
        logger.warning(f"⚠️ ZIP model not found: {ZIP_MODEL}")
        models['zip'] = None
    
    if not models['poisson'] and not models['zip']:
        logger.error("❌ No models available for comparison!")
        sys.exit(1)
    
    return models


def calculate_brier_score(y_true, y_pred_proba):
    """Calculate Brier score for probability predictions."""
    y_binary = (y_true > 0).astype(int)
    return np.mean((y_pred_proba - y_binary) ** 2)


def calculate_calibration_metrics(y_true, y_pred_proba, n_bins=10):
    """Calculate calibration metrics (reliability curve)."""
    # Convert everything to numpy arrays first for consistent handling
    y_true_array = y_true.values if hasattr(y_true, 'values') else np.array(y_true)
    y_pred_proba_array = y_pred_proba.values if hasattr(y_pred_proba, 'values') else np.array(y_pred_proba)
    
    # Flatten arrays if needed (handle 2D arrays from predictions)
    y_true_array = y_true_array.flatten()
    y_pred_proba_array = y_pred_proba_array.flatten()
    
    y_binary = (y_true_array > 0).astype(int)
    
    bins = np.linspace(0, 1, n_bins + 1)
    bin_means_predicted = []
    bin_means_actual = []
    bin_counts = []
    
    for i in range(n_bins):
        mask = (y_pred_proba_array >= bins[i]) & (y_pred_proba_array < bins[i + 1])
        
        if mask.sum() > 0:
            bin_means_predicted.append(y_pred_proba_array[mask].mean())
            bin_means_actual.append(y_binary[mask].mean())
            bin_counts.append(mask.sum())
    
    # Calibration error
    if bin_means_predicted:
        cal_error = np.mean([abs(p - a) for p, a in zip(bin_means_predicted, bin_means_actual)])
    else:
        cal_error = np.nan
    
    return cal_error, bin_means_predicted, bin_means_actual, bin_counts


def evaluate_model(model, X, y, model_name='Model'):
    """Comprehensive model evaluation."""
    logger.info(f"\n📊 Evaluating {model_name}...")
    
    results = {}
    
    # Generate predictions
    if model_name.lower() == 'zip':
        # Pass the correct, feature subset for the inflation component
        X_infl_pred = X[['const'] + INFLATION_PREDICTOR_COLUMNS] 
        y_pred = model.predict(X, exog_infl=X_infl_pred)
    else:
        # Poisson only needs the full X
        y_pred = model.predict(X)
        
    results['predictions'] = y_pred
    
    # Convert to numpy arrays for consistent handling
    y_array = y.values if hasattr(y, 'values') else np.array(y)
    y_pred_array = y_pred.values if hasattr(y_pred, 'values') else np.array(y_pred)
    
    # Flatten to ensure 1D
    y_array = y_array.flatten()
    y_pred_array = y_pred_array.flatten()
    
    # Basic metrics
    results['rmse'] = np.sqrt(mean_squared_error(y_array, y_pred_array))
    results['mae'] = mean_absolute_error(y_array, y_pred_array)
    results['mean_pred'] = y_pred_array.mean()
    results['mean_actual'] = y_array.mean()
    
    # Model fit statistics
    results['aic'] = model.aic if hasattr(model, 'aic') else np.nan
    # Use bic_llf if available (log-likelihood based BIC)
    results['bic'] = model.bic_llf if hasattr(model, 'bic_llf') else model.bic if hasattr(model, 'bic') else np.nan
    results['llf'] = model.llf if hasattr(model, 'llf') else np.nan
    
    # Probability predictions for 1+ SOT
    if model_name.lower() == 'zip':
        # Use the correct, simplified feature subset for the probability prediction as well
        X_infl_pred = X[['const'] + INFLATION_PREDICTOR_COLUMNS] 
        prob_results = model.predict(X, which='prob', exog_infl=X_infl_pred)
        
        # Handle tuple return (prob for each count: 0, 1, 2, 3, 4, ...)
        if isinstance(prob_results, tuple):
            # Take only P(Y=0) - first element of tuple
            prob_zero = prob_results[0]
        else:
            # If not tuple, assume it's already just P(Y=0)
            prob_zero = prob_results
        
        # Convert to numpy and flatten
        prob_zero = prob_zero.values if hasattr(prob_zero, 'values') else np.array(prob_zero)
        prob_zero = prob_zero.flatten()
        
        # Ensure length matches (critical for zip predict which might return a long array if not handled)
        if len(prob_zero) > len(y_array):
            prob_zero = prob_zero[:len(y_array)]
        
        y_pred_proba = 1 - prob_zero
    else:
        # Poisson model: P(1+) = 1 - P(0) = 1 - exp(-λ)
        y_pred_proba = 1 - np.exp(-y_pred_array)
    
    results['prob_predictions'] = y_pred_proba
    
    # Brier score
    results['brier_score'] = calculate_brier_score(y_array, y_pred_proba)
    
    # Calibration
    cal_error, _, _, _ = calculate_calibration_metrics(y_array, y_pred_proba)
    results['calibration_error'] = cal_error
    
    # Prediction distribution
    results['pred_dist'] = {
        'min': y_pred_array.min(),
        'q25': np.percentile(y_pred_array, 25),
        'median': np.median(y_pred_array),
        'q75': np.percentile(y_pred_array, 75),
        'max': y_pred_array.max()
    }
    
    return results


def compare_models(models, X, y):
    """Compare all available models."""
    print_section("3. MODEL COMPARISON")
    
    results = {}
    
    if models['poisson']:
        # This will now use the 7-column data (6 features + const) and match the 7-parameter model
        results['poisson'] = evaluate_model(models['poisson'], X, y, 'Poisson')
    
    if models['zip']:
        results['zip'] = evaluate_model(models['zip'], X, y, 'ZIP')
    
    return results


def display_comparison(results):
    """Display comprehensive comparison table."""
    print_section("4. COMPARISON RESULTS")
    
    metrics = [
        ('RMSE', 'rmse', '.4f', 'lower'),
        ('MAE', 'mae', '.4f', 'lower'),
        ('Brier Score', 'brier_score', '.4f', 'lower'),
        ('Calibration Error', 'calibration_error', '.4f', 'lower'),
        ('AIC', 'aic', '.2f', 'lower'),
        ('BIC', 'bic', '.2f', 'lower'),
        ('Log-Likelihood', 'llf', '.2f', 'higher'),
        ('Mean Prediction', 'mean_pred', '.4f', 'neutral'),
        ('Mean Actual', 'mean_actual', '.4f', 'neutral')
    ]
    
    logger.info("\n" + "─" * 80)
    logger.info(f"{'Metric':<30} {'Poisson':<20} {'ZIP':<20} {'Winner':<10}")
    logger.info("─" * 80)
    
    for metric_name, metric_key, fmt, better in metrics:
        poisson_val = results.get('poisson', {}).get(metric_key, np.nan)
        zip_val = results.get('zip', {}).get(metric_key, np.nan)
        
        # Format values
        poisson_str = f"{poisson_val:{fmt}}" if not np.isnan(poisson_val) else "N/A"
        zip_str = f"{zip_val:{fmt}}" if not np.isnan(zip_val) else "N/A"
        
        # Determine winner
        if np.isnan(poisson_val) or np.isnan(zip_val):
            winner = "N/A"
        elif better == 'lower':
            winner = "Poisson ✅" if poisson_val < zip_val else "ZIP ✅"
        elif better == 'higher':
            winner = "Poisson ✅" if poisson_val > zip_val else "ZIP ✅"
        else:
            winner = "-"
        
        logger.info(f"{metric_name:<30} {poisson_str:<20} {zip_str:<20} {winner:<10}")
    
    logger.info("─" * 80)


def analyze_predictions_by_zero_status(results, y):
    """Analyze predictions separately for zero and non-zero actuals."""
    print_section("5. PREDICTION ANALYSIS BY ACTUAL SOT")
    
    y_binary = (y > 0).astype(int)
    
    for model_name in ['poisson', 'zip']:
        if model_name not in results:
            continue
        
        logger.info(f"\n📊 {model_name.upper()} Model:")
        logger.info("─" * 60)
        
        y_pred = results[model_name]['predictions']
        
        # For actual zeros
        zeros_mask = y == 0
        logger.info(f"\nFor Actual ZEROS (n={zeros_mask.sum()}):")
        y_pred_zeros = y_pred[zeros_mask]
        logger.info(f"  Mean prediction: {y_pred_zeros.mean():.4f}")
        logger.info(f"  Median prediction: {np.median(y_pred_zeros):.4f}")
        logger.info(f"  Max prediction: {y_pred_zeros.max():.4f}")
        
        # For actual non-zeros
        nonzeros_mask = y > 0
        logger.info(f"\nFor Actual NON-ZEROS (n={nonzeros_mask.sum()}):")
        y_pred_nonzeros = y_pred[nonzeros_mask]
        logger.info(f"  Mean prediction: {y_pred_nonzeros.mean():.4f}")
        logger.info(f"  Median prediction: {np.median(y_pred_nonzeros):.4f}")
        logger.info(f"  Mean actual: {y[nonzeros_mask].mean():.4f}")


def generate_recommendation(results):
    """Generate final recommendation."""
    print_section("6. FINAL RECOMMENDATION")
    
    if 'poisson' not in results or 'zip' not in results:
        logger.info("⚠️ Cannot generate recommendation - need both models")
        return
    
    # Key decision metrics
    # Lower is better for AIC/Brier/RMSE, so a negative difference means ZIP is better.
    aic_improvement = results['poisson']['aic'] - results['zip']['aic']
    brier_improvement = results['poisson']['brier_score'] - results['zip']['brier_score']
    rmse_improvement = results['poisson']['rmse'] - results['zip']['rmse']
    
    logger.info("\n📊 KEY IMPROVEMENTS (Poisson → ZIP):")
    logger.info("─" * 60)
    logger.info(f"  AIC difference (Poisson - ZIP): {aic_improvement:+.2f} {'✅ (ZIP better)' if aic_improvement > 0 else '❌ (Poisson better)'}")
    logger.info(f"  Brier difference (Poisson - ZIP): {brier_improvement:+.4f} {'✅ (ZIP better)' if brier_improvement > 0 else '❌ (Poisson better)'}")
    logger.info(f"  RMSE difference (Poisson - ZIP): {rmse_improvement:+.4f} {'✅ (ZIP better)' if rmse_improvement > 0 else '❌ (Poisson better)'}")
    
    # Make recommendation
    # Score favors ZIP model (if difference > 0, ZIP is better for that metric)
    score = 0
    if aic_improvement > 10:
        score += 3
    elif aic_improvement > 0:
        score += 1
    
    if brier_improvement > 0.01:
        score += 2
    elif brier_improvement > 0:
        score += 1
    
    if rmse_improvement > 0.01:
        score += 2
    elif rmse_improvement > 0:
        score += 1
    
    logger.info("\n" + "=" * 60)
    
    if score >= 5:
        logger.info("✅ STRONG RECOMMENDATION: Deploy ZIP Model")
        logger.info("   ZIP shows significant improvements across key metrics (AIC, Brier, RMSE)")
    elif score >= 3:
        logger.info("⚠️ MODERATE RECOMMENDATION: Consider ZIP Model")
        logger.info("   ZIP shows improvements but gains are modest or mixed")
    else:
        logger.info("❌ RECOMMENDATION: Keep Poisson Model")
        logger.info("   ZIP does not show sufficient improvement over Poisson")
    
    logger.info("=" * 60)


def save_report(results):
    """Save detailed report to file."""
    logger.info(f"\n💾 Saving detailed report to: {OUTPUT_FILE}")
    
    with open(OUTPUT_FILE, 'w') as f:
        f.write("=" * 80 + "\n")
        f.write("  POISSON VS ZIP MODEL COMPARISON REPORT\n")
        f.write("=" * 80 + "\n\n")
        
        for model_name, model_results in results.items():
            f.write(f"\n{model_name.upper()} MODEL RESULTS:\n")
            f.write("─" * 60 + "\n")
            for key, value in model_results.items():
                if key not in ['predictions', 'prob_predictions', 'pred_dist']:
                    f.write(f"  {key}: {value}\n")
    
    logger.info("✅ Report saved successfully")


def main():
    """Main execution pipeline."""
    logger.info("=" * 80)
    logger.info("  POISSON VS ZIP MODEL COMPARISON")
    logger.info("=" * 80)
    
    # Load data
    X, y, df = load_data()
    
    # Load models
    models = load_models()
    
    # Compare models
    results = compare_models(models, X, y)
    
    # Display comparison
    display_comparison(results)
    
    # Analyze by zero status
    analyze_predictions_by_zero_status(results, y)
    
    # Generate recommendation
    generate_recommendation(results)
    
    # Save report
    save_report(results)
    
    print_section("✅ COMPARISON COMPLETE")


if __name__ == '__main__':
    main()
