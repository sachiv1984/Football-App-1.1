"""
Zero-Inflated Poisson (ZIP) Model Training Script

This script trains a ZIP model to handle the high zero-inflation in SOT data.
It models the probability of shooting (logistic part) separately from the count 
of shots (Poisson part).

Run after: feature_scaling.py
Outputs: src/services/ai/artifacts/zip_model.pkl, src/services/ai/artifacts/zip_training_stats.json
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

# Features used for prediction - UPDATED to include POSITION FEATURES
PREDICTOR_COLUMNS = [
    'sot_conceded_MA5_scaled', 
    'tackles_att_3rd_MA5_scaled', 
    'sot_MA5_scaled', 
    'min_MA5_scaled', 
    'summary_min',
    'is_forward',   # <-- NEW POSITION FEATURE
    'is_defender'   # <-- NEW POSITION FEATURE
]

TARGET_COLUMN = 'sot'

# --- Helper Functions ---

def calculate_mcfadden_r2(model, y_true):
    """Calculate McFadden's Pseudo R-squared manually."""
    ll_model = model.llf
    
    # Null model: predict mean for all observations
    y_mean = y_true.mean()
    # Calculate log-likelihood of the null model (Poisson with only intercept)
    ll_null = np.sum(y_true * np.log(y_mean) - y_mean)
    
    # Handle potential LL_Null = 0 or near-zero issue, although rare with Poisson
    if ll_null == 0:
        return 0.0
    
    pseudo_r2 = 1 - (ll_model / ll_null)
    return pseudo_r2


def calculate_metrics(y_true, y_pred):
    """Calculate performance metrics."""
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    mae = mean_absolute_error(y_true, y_pred)
    return {'rmse': rmse, 'mae': mae}


def print_section(title):
    """Print formatted section header."""
    logger.info("\n" + "=" * 80)
    logger.info(f"  {title}")
    logger.info("=" * 80)


# --- Main Training Pipeline ---

def load_data():
    """Load the scaled feature set."""
    print_section("1. LOADING DATA")
    
    try:
        if not os.path.exists(INPUT_FILE):
             logger.error(f"❌ File not found: {INPUT_FILE}. Run feature_scaling.py first!")
             sys.exit(1)
             
        df = pd.read_parquet(INPUT_FILE)
        logger.info(f"✅ Data loaded successfully. Shape: {df.shape}")
        
        # Verify required columns exist
        missing_cols = [col for col in PREDICTOR_COLUMNS + [TARGET_COLUMN] if col not in df.columns]
        if missing_cols:
            logger.error(f"❌ Missing columns: {missing_cols}")
            sys.exit(1)
        
        # Check for NaN values in predictor or target columns
        nan_cols = df[PREDICTOR_COLUMNS + [TARGET_COLUMN]].isnull().any()
        if nan_cols.any():
            nan_features = nan_cols[nan_cols].index.tolist()
            logger.warning(f"⚠️ NaN values detected in features: {nan_features}. Dropping rows...")
            df = df.dropna(subset=PREDICTOR_COLUMNS + [TARGET_COLUMN])
            logger.info(f"  Shape after dropping NaN: {df.shape}")
        
        return df
        
    except Exception as e:
        logger.error(f"❌ Error loading data: {e}")
        sys.exit(1)


def prepare_features(df):
    """Prepare features and target for modeling."""
    print_section("2. PREPARING FEATURES")
    
    X = df[PREDICTOR_COLUMNS].copy()
    y = df[TARGET_COLUMN].copy()
    
    # Add constant (intercept) term
    X = sm.add_constant(X, has_constant='add')
    
    logger.info(f"  Feature matrix shape: {X.shape}")
    logger.info(f"  Target vector shape: {y.shape}")
    logger.info(f"\n  Zero-inflation check (should match correlation analysis):")
    logger.info(f"    Zeros: {(y == 0).sum()} ({(y == 0).sum() / len(y) * 100:.1f}%)")
    logger.info(f"    Non-zeros: {(y > 0).sum()} ({(y > 0).sum() / len(y) * 100:.1f}%)")
    
    return X, y


def train_zip_model(X, y):
    """Train Zero-Inflated Poisson model."""
    print_section("3. TRAINING ZIP MODEL")
    
    logger.info("Training Zero-Inflated Poisson regression...")
    logger.info("  This may take 30-60 seconds for convergence...\n")
    
    # Temporarily suppress some warnings during fitting
    import warnings
    warnings.filterwarnings('ignore', category=FutureWarning)
    
    try:
        # Train ZIP model
        # exog_infl: Features for the inflation (zero) model (logistic part)
        # exog: Features for the count model (Poisson part)
        # Using the same features for both parts is common practice
        zip_model = ZeroInflatedPoisson(
            endog=y,
            exog=X,
            exog_infl=X  
        ).fit(method='bfgs', maxiter=1000, disp=False) # disp=False to clean up logs
        
        logger.info("\n✅ ZIP Model training complete!")
        return zip_model
        
    except Exception as e:
        logger.error(f"❌ Training failed: {e}")
        sys.exit(1)
    finally:
        # Restore warnings
        warnings.filterwarnings('default', category=FutureWarning)


def train_standard_poisson(X, y):
    """Train standard Poisson model for comparison."""
    logger.info("\nTraining standard Poisson model for comparison...")
    
    try:
        poisson_model = sm.GLM(
            y, X, 
            family=sm.families.Poisson()
        ).fit()
        
        logger.info("✅ Standard Poisson training complete!")
        return poisson_model
        
    except Exception as e:
        logger.error(f"⚠️ Standard Poisson training failed: {e}")
        return None


def evaluate_models(zip_model, poisson_model, X, y):
    """Compare ZIP vs standard Poisson."""
    print_section("4. MODEL EVALUATION & COMPARISON")
    
    # Generate predictions
    y_pred_zip = zip_model.predict(X)
    y_pred_poisson = poisson_model.predict(X) if poisson_model else None
    
    # Calculate metrics
    metrics_zip = calculate_metrics(y, y_pred_zip)
    metrics_poisson = calculate_metrics(y, y_pred_poisson) if poisson_model else None
    
    # Display comparison
    logger.info("\n" + "─" * 80)
    logger.info("MODEL COMPARISON RESULTS")
    logger.info("─" * 80)
    logger.info(f"{'Metric':<30} {'ZIP Model':<20} {'Poisson Model':<20}")
    logger.info("─" * 80)
    
    # Pseudo R²
    pseudo_r2_zip = calculate_mcfadden_r2(zip_model, y)
    pseudo_r2_poisson = calculate_mcfadden_r2(poisson_model, y) if poisson_model else None
    
    logger.info(f"{'Pseudo R² (McFadden)':<30} {pseudo_r2_zip:<20.4f} {pseudo_r2_poisson if pseudo_r2_poisson else 'N/A':<20}")
    
    # AIC / BIC
    logger.info(f"{'AIC':<30} {zip_model.aic:<20.2f} {poisson_model.aic if poisson_model else 'N/A':<20}")
    logger.info(f"{'BIC':<30} {zip_model.bic:<20.2f} {poisson_model.bic if poisson_model else 'N/A':<20}")
    
    # Log-Likelihood
    logger.info(f"{'Log-Likelihood':<30} {zip_model.llf:<20.2f} {poisson_model.llf if poisson_model else 'N/A':<20}")
    
    # RMSE / MAE
    logger.info(f"{'RMSE':<30} {metrics_zip['rmse']:<20.4f} {metrics_poisson['rmse'] if metrics_poisson else 'N/A':<20}")
    logger.info(f"{'MAE':<30} {metrics_zip['mae']:<20.4f} {metrics_poisson['mae'] if metrics_poisson else 'N/A':<20}")
    
    logger.info("─" * 80)
    
    # Model recommendation
    logger.info("\n📊 MODEL SELECTION RECOMMENDATION:")
    
    if poisson_model:
        aic_improvement = poisson_model.aic - zip_model.aic
        # A difference of 10 or more is considered strong evidence (Burnham & Anderson)
        if aic_improvement > 10:
            logger.info(f"✅ DEPLOY ZIP MODEL: AIC improved by {aic_improvement:.2f} points (Strong evidence for better fit)")
        elif aic_improvement > 2:
            logger.info(f"⚠️ MARGINAL IMPROVEMENT: AIC improved by {aic_improvement:.2f} points (Weak evidence for better fit)")
        else:
            logger.info(f"❌ KEEP POISSON: AIC difference is minimal or negative (Improvement: {aic_improvement:.2f}).")
    else:
        logger.info("✅ ZIP MODEL TRAINED (no comparison available)")
    
    return {
        'zip': {'pseudo_r2': pseudo_r2_zip, 'aic': zip_model.aic, 'bic': zip_model.bic, **metrics_zip},
        'poisson': {'pseudo_r2': pseudo_r2_poisson, 'aic': poisson_model.aic, 'bic': poisson_model.bic, **metrics_poisson} if poisson_model else None
    }


def display_coefficients(zip_model):
    """Display ZIP model coefficients with interpretation."""
    print_section("5. ZIP MODEL COEFFICIENTS")
    
    # Total number of features + 1 for const
    n_params_count = len(PREDICTOR_COLUMNS) + 1 
    
    # Poisson (count) part coefficients
    logger.info("\n🎯 COUNT MODEL (Poisson Part) - Rate Multipliers:")
    logger.info("   (Predicts the SOT count, given the player shoots > 0)")
    logger.info("─" * 80)
    logger.info(f"{'Feature':<35} {'Coefficient':<15} {'Rate Multiplier':<15} {'P-value':<10}")
    logger.info("─" * 80)
    
    for i, feature in enumerate(['const'] + PREDICTOR_COLUMNS):
        coef = zip_model.params[i]
        rate_mult = np.exp(coef)
        p_value = zip_model.pvalues[i]
        sig = get_significance_stars(p_value)
        logger.info(f"{feature:<35} {coef:<15.4f} {rate_mult:<15.4f} {p_value:<8.4f}{sig}")
    
    # Inflation (logistic) part coefficients
    logger.info("\n🎯 INFLATION MODEL (Logistic Part) - Odds Ratios:")
    logger.info("   (Predicts the probability of the *excess* zero/non-shooter)")
    logger.info("─" * 80)
    logger.info(f"{'Feature':<35} {'Coefficient':<15} {'Odds Ratio':<15} {'P-value':<10}")
    logger.info("─" * 80)
    
    # Inflation parameters start after count parameters
    for i, feature in enumerate(['const'] + PREDICTOR_COLUMNS):
        coef = zip_model.params[n_params_count + i]
        odds_ratio = np.exp(coef)
        p_value = zip_model.pvalues[n_params_count + i]
        sig = get_significance_stars(p_value)
        logger.info(f"{feature:<35} {coef:<15.4f} {odds_ratio:<15.4f} {p_value:<8.4f}{sig}")
    
    logger.info("\nSignificance: *** p<0.001, ** p<0.01, * p<0.05")
    logger.info("\n💡 Interpretation:")
    logger.info("  • Count Rate Multiplier > 1: Feature increases SOT count (if SOT > 0)")
    logger.info("  • Inflation Odds Ratio > 1: Feature INCREASES the chance of being an 'excess zero' (a non-shooter)")
    logger.info("  • Inflation Odds Ratio < 1: Feature DECREASES the chance of being an 'excess zero'")


def get_significance_stars(p_value):
    """Returns significance stars based on P-value."""
    if p_value < 0.001:
        return '***'
    elif p_value < 0.01:
        return '**'
    elif p_value < 0.05:
        return '*'
    else:
        return ''


def save_model_and_stats(zip_model, comparison_stats):
    """Save the trained ZIP model and statistics."""
    print_section("6. SAVING MODEL & STATISTICS")
    
    # Ensure the artifacts directory exists
    os.makedirs(os.path.dirname(MODEL_OUTPUT), exist_ok=True)
    
    # Save model
    try:
        with open(MODEL_OUTPUT, 'wb') as f:
            pickle.dump(zip_model, f)
        logger.info(f"✅ ZIP model saved to: {MODEL_OUTPUT}")
    except Exception as e:
        logger.error(f"❌ Failed to save model: {e}")
        sys.exit(1)
    
    # Save training statistics
    try:
        stats = {
            'model_type': 'ZeroInflatedPoisson',
            'pseudo_r2': comparison_stats['zip']['pseudo_r2'],
            'aic': comparison_stats['zip']['aic'],
            'bic': comparison_stats['zip']['bic'],
            'rmse': comparison_stats['zip']['rmse'],
            'mae': comparison_stats['zip']['mae'],
            'features': PREDICTOR_COLUMNS,
            'training_samples': len(zip_model.model.endog)
        }
        
        with open(STATS_OUTPUT, 'w') as f:
            json.dump(stats, f, indent=2)
        
        logger.info(f"✅ Training statistics saved to: {STATS_OUTPUT}")
    except Exception as e:
        logger.error(f"⚠️ Failed to save statistics: {e}")


def main():
    """Main execution pipeline."""
    logger.info("=" * 80)
    logger.info("  ZERO-INFLATED POISSON (ZIP) MODEL TRAINING")
    logger.info("=" * 80)
    
    # Step 1: Load data
    df = load_data()
    
    # Step 2: Prepare features
    X, y = prepare_features(df)
    
    # Step 3: Train ZIP model
    zip_model = train_zip_model(X, y)
    
    # Step 4: Train standard Poisson for comparison
    poisson_model = train_standard_poisson(X, y)
    
    # Step 5: Evaluate models
    comparison_stats = evaluate_models(zip_model, poisson_model, X, y)
    
    # Step 6: Display coefficients
    display_coefficients(zip_model)
    
    # Step 7: Save artifacts
    save_model_and_stats(zip_model, comparison_stats)
    
    print_section("✅ ZIP MODEL TRAINING COMPLETE")
    logger.info("\n📁 Generated files:")
    logger.info(f"  • {MODEL_OUTPUT}")
    logger.info(f"  • {STATS_OUTPUT}")
    logger.info("\n🚀 Next steps:")
    logger.info("  1. Review model comparison results (AIC/Pseudo R²) to select best model.")
    logger.info("  2. If ZIP is chosen, run live_predictor_zip.py for predictions.")
    

if __name__ == '__main__':
    main()
