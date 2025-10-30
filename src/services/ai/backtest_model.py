import pandas as pd
import numpy as np
import pickle
import logging
import statsmodels.api as sm
import os

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# --- Configuration ---
INPUT_FILE = "final_feature_set_scaled.parquet"
MODEL_OUTPUT = "poisson_model_v4.2.pkl"

# Predictor columns for the model (updated to include npxg_MA5_scaled)
PREDICTOR_COLUMNS = [
    'sot_conceded_MA5_scaled',  # Opponent weakness
    'sot_MA5_scaled',           # Player form
    'npxg_MA5_scaled',          # Expected goals factor
    'summary_min',              # Expected minutes
    'is_forward',               # Position: Forward
    'is_defender',              # Position: Attacking Defender
    'is_home'                   # Venue: Home
]

TARGET_COLUMN = 'sot'


def load_data():
    """Load the scaled feature set."""
    logger.info("Loading scaled feature set...")
    try:
        df = pd.read_parquet(INPUT_FILE)
        logger.info(f"✅ Data loaded successfully. Shape: {df.shape}")
        return df
    except FileNotFoundError:
        logger.error(f"❌ File not found: {INPUT_FILE}")
        logger.error("Run feature_scaling.py first!")
        exit(1)


def prepare_features(df):
    """Prepare features and target for modeling."""
    logger.info("\nPreparing features for Poisson regression...")
    
    # Check all required columns exist
    missing = [col for col in PREDICTOR_COLUMNS + [TARGET_COLUMN] if col not in df.columns]
    if missing:
        logger.error(f"❌ Missing required columns: {missing}")
        exit(1)
    
    # Drop rows with NaN in critical columns
    df_clean = df.dropna(subset=PREDICTOR_COLUMNS + [TARGET_COLUMN])
    dropped = len(df) - len(df_clean)
    
    if dropped > 0:
        logger.warning(f"⚠️ Dropped {dropped} rows with NaN values ({(dropped/len(df)*100):.1f}%)")
    
    # Extract features and target
    X = df_clean[PREDICTOR_COLUMNS].copy()
    y = df_clean[TARGET_COLUMN].copy()
    
    # Add constant (intercept) for statsmodels
    X = sm.add_constant(X, has_constant='add')
    
    logger.info(f"  ✅ Feature matrix shape: {X.shape}")
    logger.info(f"  ✅ Target vector shape: {y.shape}")
    logger.info(f"\n  Features in model:")
    for i, col in enumerate(['const'] + PREDICTOR_COLUMNS, 1):
        logger.info(f"    {i}. {col}")
    
    return X, y, df_clean


def train_poisson_model(X, y):
    """Train Poisson regression model."""
    logger.info("\nTraining Poisson Regression model...")
    
    try:
        # Train Poisson GLM
        model = sm.GLM(y, X, family=sm.families.Poisson()).fit()
        logger.info("✅ Model training complete")
        return model
    except Exception as e:
        logger.error(f"❌ Model training failed: {e}")
        exit(1)


def display_model_summary(model, X, y):
    """Display comprehensive model performance metrics."""
    logger.info("\n" + "="*70)
    logger.info("  MODEL PERFORMANCE SUMMARY")
    logger.info("="*70)
    
    # McFadden's Pseudo R²
    ll_model = model.llf
    if hasattr(model, 'llnull'):
        ll_null = model.llnull
        pseudo_r2 = 1 - (ll_model / ll_null)
    else:
        pseudo_r2 = np.nan

    logger.info(f"  Pseudo R² (McFadden): {pseudo_r2:.4f}")
    logger.info(f"  AIC: {model.aic:.2f}")
    logger.info(f"  BIC: {model.bic:.2f}")
    
    # Prediction performance
    y_pred = model.predict(X)
    rmse = np.sqrt(np.mean((y - y_pred)**2))
    mae = np.mean(np.abs(y - y_pred))
    
    logger.info(f"\nPrediction Performance:")
    logger.info(f"  RMSE: {rmse:.4f}")
    logger.info(f"  MAE:  {mae:.4f}")
    
    # Feature coefficients
    logger.info("\nFeature Coefficients (Rate Multipliers):")
    for feature in ['const'] + PREDICTOR_COLUMNS:
        coef = model.params.get(feature, np.nan)
        rate_mult = np.exp(coef) if not np.isnan(coef) else np.nan
        p_val = model.pvalues.get(feature, np.nan)
        logger.info(f"  {feature:<20} coef={coef:.4f}, mult={rate_mult:.3f}, p={p_val:.4f}")


def save_model(model):
    """Save the trained model to disk."""
    logger.info(f"\nSaving model to {MODEL_OUTPUT}...")
    try:
        with open(MODEL_OUTPUT, 'wb') as f:
            pickle.dump(model, f)
        logger.info(f"✅ Model saved successfully ({os.path.getsize(MODEL_OUTPUT)/1024:.1f} KB)")
    except Exception as e:
        logger.error(f"❌ Error saving model: {e}")
        exit(1)


def main():
    logger.info("="*70)
    logger.info("  POISSON REGRESSION MODEL TRAINING - WITH NPXG & VENUE (v4.2)")
    logger.info("="*70)
    
    df = load_data()
    X, y, df_clean = prepare_features(df)
    model = train_poisson_model(X, y)
    display_model_summary(model, X, y)
    save_model(model)
    
    logger.info("\n✅ MODEL TRAINING COMPLETE (v4.2)")
    logger.info("Next step: Run live_predictor_zip.py for live predictions")


if __name__ == '__main__':
    main()
