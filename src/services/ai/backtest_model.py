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
MODEL_OUTPUT = "poisson_model.pkl"

# Predictor columns for the model
# ✅ UPDATED: Added is_forward and is_defender position features
PREDICTOR_COLUMNS = [
    'sot_conceded_MA5_scaled',      # Opponent weakness (O-Factor)
    'sot_MA5_scaled',                # Player form (P-Factor)
    'summary_min',                   # Expected minutes this match (raw)
    'is_forward',                    # Position: Forward (binary, not scaled)
    'is_defender'                    # Position: Attacking Defender (binary, not scaled)
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
    logger.info("  Model family: Poisson (log link)")
    logger.info("  Solver: IRLS (Iteratively Reweighted Least Squares)")
    
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
    
    # 1. Model Fit Statistics
    logger.info("\n📊 Model Fit Statistics:")
    
    # ✅ FIXED: Calculate McFadden's Pseudo R-squared using statsmodels' llnull
    ll_model = model.llf
    
    if hasattr(model, 'llnull'):
        # Use statsmodels' built-in null log-likelihood
        ll_null = model.llnull
        pseudo_r2 = 1 - (ll_model / ll_null)
        
        logger.info(f"  Pseudo R² (McFadden): {pseudo_r2:.4f} ({pseudo_r2*100:.2f}%)")
        logger.info(f"  Log-Likelihood (Model): {ll_model:.2f}")
        logger.info(f"  Log-Likelihood (Null):  {ll_null:.2f}")
    else:
        # Fallback: Manual calculation for Poisson null model
        y_mean = y.mean()
        if y_mean > 0:
            # Poisson null model: all observations predicted as the mean
            ll_null = np.sum(y * np.log(y_mean) - y_mean - np.log(np.maximum(1, np.arange(1, len(y)+1))))
            pseudo_r2 = 1 - (ll_model / ll_null)
            logger.info(f"  Pseudo R² (McFadden): {pseudo_r2:.4f} ({pseudo_r2*100:.2f}%)")
            logger.info(f"  Log-Likelihood (Model): {ll_model:.2f}")
            logger.info(f"  Log-Likelihood (Null):  {ll_null:.2f} (calculated)")
        else:
            logger.warning("  ⚠️ Could not calculate Pseudo R² (mean SOT = 0)")
            pseudo_r2 = np.nan
    
    logger.info(f"  AIC:                  {model.aic:.2f}")
    logger.info(f"  BIC:                  {model.bic_llf:.2f}")  # Use log-likelihood based BIC
    
    # 2. Prediction Performance
    y_pred = model.predict(X)
    rmse = np.sqrt(np.mean((y - y_pred)**2))
    mae = np.mean(np.abs(y - y_pred))
    
    logger.info(f"\n📊 Prediction Performance:")
    logger.info(f"  RMSE:                 {rmse:.4f}")
    logger.info(f"  MAE:                  {mae:.4f}")
    logger.info(f"  Mean Actual SOT:      {y.mean():.4f}")
    logger.info(f"  Mean Predicted SOT:   {y_pred.mean():.4f}")
    
    # 3. Feature Coefficients (Rate Multipliers)
    logger.info(f"\n📊 Feature Coefficients (Rate Multipliers):")
    logger.info(f"  {'Feature':<35} {'Coefficient':<12} {'Rate Mult.':<12} {'P-value':<10}")
    logger.info(f"  {'-'*70}")
    
    feature_names = ['const'] + PREDICTOR_COLUMNS
    
    for feature in feature_names:
        if feature not in model.params.index:
            continue
            
        coef = model.params[feature]
        rate_mult = np.exp(coef)
        p_value = model.pvalues[feature]
        
        # Interpretation
        if feature == 'const':
            interp = "(baseline)"
        elif rate_mult > 1.05:
            interp = f"(+{(rate_mult-1)*100:.1f}% SOT) ✅"
        elif rate_mult < 0.95:
            interp = f"({(rate_mult-1)*100:.1f}% SOT) ⚠️"
        else:
            interp = "(minimal effect)"
        
        # Significance
        sig = "***" if p_value < 0.001 else "**" if p_value < 0.01 else "*" if p_value < 0.05 else ""
        
        logger.info(f"  {feature:<35} {coef:>11.4f} {rate_mult:>11.4f}{sig:<3} {interp}")
    
    logger.info(f"\n  Significance: *** p<0.001, ** p<0.01, * p<0.05")
    
    # 4. Position Feature Insights (NEW)
    if 'is_forward' in model.params.index and 'is_defender' in model.params.index:
        logger.info(f"\n📊 Position Feature Insights:")
        
        forward_mult = np.exp(model.params['is_forward'])
        defender_mult = np.exp(model.params['is_defender'])
        
        logger.info(f"  Forwards vs Midfielders:   {(forward_mult-1)*100:+.1f}% SOT")
        logger.info(f"  Att.Defenders vs Midfielders: {(defender_mult-1)*100:+.1f}% SOT")
        logger.info(f"  ")
        logger.info(f"  Interpretation:")
        logger.info(f"    - Baseline (Midfielders): Reference group (coefficient = 0)")
        logger.info(f"    - Forwards: {forward_mult:.3f}x multiplier")
        logger.info(f"    - Attacking Defenders: {defender_mult:.3f}x multiplier")
    
    # 5. Training Sample Info
    logger.info(f"\n📊 Training Sample:")
    logger.info(f"  Total observations:   {len(y)}")
    logger.info(f"  Zero SOT matches:     {(y == 0).sum()} ({(y==0).sum()/len(y)*100:.1f}%)")
    logger.info(f"  Non-zero matches:     {(y > 0).sum()} ({(y>0).sum()/len(y)*100:.1f}%)")
    logger.info(f"  Max SOT in sample:    {y.max():.0f}")
    
    # 6. Comparison with Baseline (if available)
    logger.info(f"\n📊 Comparison with Baseline (No Position Features):")
    logger.info(f"  Baseline Pseudo R²:   8.27% (reference)")
    logger.info(f"  Current Pseudo R²:    {pseudo_r2*100:.2f}%")
    
    if not np.isnan(pseudo_r2):
        improvement = (pseudo_r2 - 0.0827) * 100
        if improvement > 0:
            logger.info(f"  Improvement:          +{improvement:.2f} percentage points ✅")
        else:
            logger.info(f"  Change:               {improvement:.2f} percentage points ⚠️")
            logger.warning(f"  ⚠️ Model fit WORSE than baseline!")


def save_model(model):
    """Save the trained model to disk."""
    logger.info(f"\nSaving model to {MODEL_OUTPUT}...")
    
    try:
        with open(MODEL_OUTPUT, 'wb') as f:
            pickle.dump(model, f)
        
        logger.info(f"✅ Model saved successfully")
        logger.info(f"   File: {MODEL_OUTPUT}")
        logger.info(f"   Size: {os.path.getsize(MODEL_OUTPUT) / 1024:.1f} KB")
        
    except Exception as e:
        logger.error(f"❌ Error saving model: {e}")
        exit(1)


def main():
    """Main execution pipeline."""
    logger.info("="*70)
    logger.info("  POISSON REGRESSION MODEL TRAINING - WITH POSITION FEATURES")
    logger.info("="*70)
    
    # Step 1: Load data
    df = load_data()
    
    # Step 2: Prepare features
    X, y, df_clean = prepare_features(df)
    
    # Step 3: Train model
    model = train_poisson_model(X, y)
    
    # Step 4: Display results
    display_model_summary(model, X, y)
    
    # Step 5: Save model
    save_model(model)
    
    logger.info("\n" + "="*70)
    logger.info("  ✅ MODEL TRAINING COMPLETE")
    logger.info("="*70)
    logger.info("\n🚨 CRITICAL: Upload poisson_model.pkl to src/services/ai/artifacts/")
    logger.info("             The live predictor needs it in that location!")
    logger.info("\nNext step: Run live_predictor_zip.py for predictions")


if __name__ == '__main__':
    main()