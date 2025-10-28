import pandas as pd
import numpy as np
import pickle
import logging
import statsmodels.api as sm
import os
from scipy.stats import poisson

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# --- Configuration ---
INPUT_FILE = "final_feature_set_scaled.parquet"
MODEL_OUTPUT = "poisson_model.pkl"
PROB_OUTPUT = "poisson_probabilities.csv"

# Predictor columns for the model
PREDICTOR_COLUMNS = [
    'sot_conceded_MA5_scaled',      # Opponent weakness
    'tackles_att_3rd_MA5_scaled',   # Opponent pressing
    'sot_MA5_scaled',               # Player form
    'summary_min',                  # Expected minutes
    'is_forward',                   # Position: Forward
    'is_defender'                   # Position: Attacking Defender
]

TARGET_COLUMN = 'sot'

def load_data():
    logger.info("Loading scaled feature set...")
    try:
        df = pd.read_parquet(INPUT_FILE)
        logger.info(f"✅ Data loaded successfully. Shape: {df.shape}")
        return df
    except FileNotFoundError:
        logger.error(f"❌ File not found: {INPUT_FILE}")
        exit(1)

def prepare_features(df):
    logger.info("\nPreparing features for Poisson regression...")
    missing = [col for col in PREDICTOR_COLUMNS + [TARGET_COLUMN] if col not in df.columns]
    if missing:
        logger.error(f"❌ Missing required columns: {missing}")
        exit(1)
    
    df_clean = df.dropna(subset=PREDICTOR_COLUMNS + [TARGET_COLUMN])
    dropped = len(df) - len(df_clean)
    if dropped > 0:
        logger.warning(f"⚠️ Dropped {dropped} rows with NaN values ({(dropped/len(df)*100):.1f}%)")
    
    X = df_clean[PREDICTOR_COLUMNS].copy()
    y = df_clean[TARGET_COLUMN].copy()
    X = sm.add_constant(X, has_constant='add')
    
    logger.info(f"  ✅ Feature matrix shape: {X.shape}")
    logger.info(f"  ✅ Target vector shape: {y.shape}")
    return X, y, df_clean

def train_poisson_model(X, y):
    logger.info("\nTraining Poisson Regression model...")
    try:
        model = sm.GLM(y, X, family=sm.families.Poisson()).fit()
        logger.info("✅ Model training complete")
        return model
    except Exception as e:
        logger.error(f"❌ Model training failed: {e}")
        exit(1)

def compute_sot_probabilities(model, X, df_clean):
    """
    Compute 1+, 2+, 3+ SOT probabilities using Poisson PMF/CDF.
    """
    logger.info("\nCalculating 1+, 2+, 3+ SOT probabilities for each player...")
    
    y_pred = model.predict(X)
    
    prob_1_plus = 1 - poisson.cdf(0, y_pred)
    prob_2_plus = 1 - poisson.cdf(1, y_pred)
    prob_3_plus = 1 - poisson.cdf(2, y_pred)
    
    results = pd.DataFrame({
        'player_name': df_clean['player_name'],
        'team': df_clean['team'],
        'opponent': df_clean['opponent'],
        'predicted_sot': y_pred,
        'P_1_plus': prob_1_plus,
        'P_2_plus': prob_2_plus,
        'P_3_plus': prob_3_plus
    })
    
    # Save to CSV for live predictions
    results.to_csv(PROB_OUTPUT, index=False)
    logger.info(f"✅ Probabilities saved to {PROB_OUTPUT}")
    return results

def display_model_summary(model):
    logger.info("\n" + "="*70)
    logger.info("  POISSON MODEL SUMMARY")
    logger.info("="*70)
    logger.info(model.summary())

def save_model(model):
    logger.info(f"\nSaving model to {MODEL_OUTPUT}...")
    try:
        with open(MODEL_OUTPUT, 'wb') as f:
            pickle.dump(model, f)
        logger.info(f"✅ Model saved successfully")
    except Exception as e:
        logger.error(f"❌ Error saving model: {e}")
        exit(1)

def main():
    logger.info("="*70)
    logger.info("  POISSON REGRESSION MODEL TRAINING + SOT PROBABILITIES")
    logger.info("="*70)
    
    df = load_data()
    X, y, df_clean = prepare_features(df)
    model = train_poisson_model(X, y)
    display_model_summary(model)
    save_model(model)
    compute_sot_probabilities(model, X, df_clean)
    
    logger.info("\n✅ MODEL TRAINING AND PROBABILITY CALCULATION COMPLETE")
    logger.info("Next step: Use live_predictor.py with poisson_model.pkl and probabilities CSV")

if __name__ == '__main__':
    main()
