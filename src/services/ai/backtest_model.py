import pandas as pd
import numpy as np
import pickle
import logging
import statsmodels.api as sm
import os
import shutil

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# --- Configuration ---
INPUT_FILE = "final_feature_set_scaled.parquet"
MODEL_OUTPUT_TEMP = "poisson_model_v4.2.pkl"
MODEL_OUTPUT_FINAL = "src/services/ai/artifacts/poisson_model.pkl"

# Predictor columns for the model (v4.2: 7 features)
PREDICTOR_COLUMNS = [
    'sot_conceded_MA5_scaled',  # Opponent weakness
    'sot_MA5_scaled',           # Player form
    'npxg_MA5_scaled',          # ✅ Expected goals factor
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
    logger.info("\nPreparing features for Poisson regression (v4.2)...")
    
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
    
    logger.info(f"  ✅ Feature matrix shape: {X.shape} (7 features + const = 8)")
    logger.info(f"  ✅ Target vector shape: {y.shape}")
    logger.info(f"\n  Features in model:")
    for i, col in enumerate(['const'] + PREDICTOR_COLUMNS, 1):
        marker = " ✅ NEW" if col == 'npxg_MA5_scaled' else ""
        logger.info(f"    {i}. {col}{marker}")
    
    return X, y, df_clean


def train_poisson_model(X, y):
    """Train Poisson regression model."""
    logger.info("\nTraining Poisson Regression model (v4.2 with xG)...")
    
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
    logger.info("  MODEL PERFORMANCE SUMMARY (v4.2)")
    logger.info("="*70)
    
    # McFadden's Pseudo R²
    ll_model = model.llf
    if hasattr(model, 'llnull'):
        ll_null = model.llnull
        pseudo_r2 = 1 - (ll_model / ll_null)
    else:
        # Calculate manually
        y_mean = y.mean()
        ll_null = np.sum(y * np.log(y_mean) - y_mean)
        pseudo_r2 = 1 - (ll_model / ll_null)

    logger.info(f"  Pseudo R² (McFadden): {pseudo_r2:.4f} ({pseudo_r2*100:.2f}%)")
    logger.info(f"  AIC: {model.aic:.2f}")
    logger.info(f"  BIC: {model.bic:.2f}")
    logger.info(f"  Log-Likelihood: {ll_model:.2f}")
    
    # Prediction performance
    y_pred = model.predict(X)
    rmse = np.sqrt(np.mean((y - y_pred)**2))
    mae = np.mean(np.abs(y - y_pred))
    
    logger.info(f"\nPrediction Performance:")
    logger.info(f"  RMSE: {rmse:.4f}")
    logger.info(f"  MAE:  {mae:.4f}")
    
    # Feature coefficients
    logger.info("\n" + "="*70)
    logger.info("FEATURE COEFFICIENTS (Rate Multipliers)")
    logger.info("="*70)
    logger.info(f"{'Feature':<30} {'Coef':<12} {'Rate Mult':<12} {'P-value':<10} {'Sig'}")
    logger.info("-"*70)
    
    for feature in ['const'] + PREDICTOR_COLUMNS:
        coef = model.params.get(feature, np.nan)
        rate_mult = np.exp(coef) if not np.isnan(coef) else np.nan
        p_val = model.pvalues.get(feature, np.nan)
        
        # Significance stars
        if p_val < 0.001:
            sig = '***'
        elif p_val < 0.01:
            sig = '**'
        elif p_val < 0.05:
            sig = '*'
        else:
            sig = ''
        
        # Highlight xG feature
        marker = " ✅ xG" if feature == 'npxg_MA5_scaled' else ""
        
        logger.info(f"{feature:<30} {coef:>11.4f} {rate_mult:>11.4f} {p_val:>9.4f} {sig:<3}{marker}")
    
    logger.info("\nSignificance: *** p<0.001, ** p<0.01, * p<0.05")
    
    return pseudo_r2


def save_model(model):
    """Save the trained model to disk and copy to artifacts."""
    logger.info(f"\n" + "="*70)
    logger.info("SAVING MODEL")
    logger.info("="*70)
    
    # Save temp file first
    try:
        with open(MODEL_OUTPUT_TEMP, 'wb') as f:
            pickle.dump(model, f)
        temp_size = os.path.getsize(MODEL_OUTPUT_TEMP) / 1024
        logger.info(f"✅ Temp model saved: {MODEL_OUTPUT_TEMP} ({temp_size:.1f} KB)")
    except Exception as e:
        logger.error(f"❌ Error saving temp model: {e}")
        exit(1)
    
    # Copy to artifacts directory
    try:
        os.makedirs(os.path.dirname(MODEL_OUTPUT_FINAL), exist_ok=True)
        shutil.copy2(MODEL_OUTPUT_TEMP, MODEL_OUTPUT_FINAL)
        logger.info(f"✅ Model copied to artifacts: {MODEL_OUTPUT_FINAL}")
    except Exception as e:
        logger.error(f"⚠️ Could not copy to artifacts: {e}")
        logger.info(f"   Manually copy {MODEL_OUTPUT_TEMP} to {MODEL_OUTPUT_FINAL}")
    
    # Copy training_stats.json to artifacts
    try:
        if os.path.exists('training_stats.json'):
            shutil.copy2('training_stats.json', 'src/services/ai/artifacts/training_stats.json')
            logger.info(f"✅ training_stats.json copied to artifacts")
        else:
            logger.warning(f"⚠️ training_stats.json not found - make sure feature_scaling.py ran")
    except Exception as e:
        logger.warning(f"⚠️ Could not copy training_stats.json: {e}")


def main():
    logger.info("="*70)
    logger.info("  POISSON REGRESSION MODEL TRAINING v4.2")
    logger.info("  (WITH npxG & VENUE - 7 FEATURES)")
    logger.info("="*70)
    
    df = load_data()
    X, y, df_clean = prepare_features(df)
    model = train_poisson_model(X, y)
    pseudo_r2 = display_model_summary(model, X, y)
    save_model(model)
    
    logger.info("\n" + "="*70)
    logger.info("✅ MODEL TRAINING COMPLETE (v4.2)")
    logger.info("="*70)
    logger.info(f"\n📊 Final Results:")
    logger.info(f"  • Training samples: {len(y)}")
    logger.info(f"  • Pseudo R²: {pseudo_r2:.4f} ({pseudo_r2*100:.2f}%)")
    logger.info(f"  • Features: 7 (added npxg_MA5_scaled)")
    logger.info(f"\n📁 Output files:")
    logger.info(f"  • {MODEL_OUTPUT_TEMP} (temp)")
    logger.info(f"  • {MODEL_OUTPUT_FINAL} (production)")
    logger.info(f"\n🚀 Next step: Run live_predictor_zip.py with MODEL_TYPE=poisson")
    logger.info("="*70)


if __name__ == '__main__':
    main()