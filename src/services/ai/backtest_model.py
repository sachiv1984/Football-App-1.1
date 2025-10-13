# src/services/ai/backtest_model.py (Updated)

import pandas as pd
import numpy as np
import statsmodels.api as sm
import pickle
from sklearn.model_selection import KFold
from sklearn.metrics import mean_squared_error, mean_absolute_error
import logging

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# --- Configuration ---
SCALED_DATA_FILE = "final_feature_set_scaled.parquet"
MODEL_PKL_FILE = "poisson_model.pkl"

# --- UPDATED: Add '_scaled' suffix to match the columns saved by feature_scaling.py ---
PREDICTOR_COLUMNS = [
    'sot_conceded_MA5_scaled',
    'tackles_att_3rd_MA5_scaled',
    'sot_MA5_scaled',
    'min_MA5_scaled',
    'summary_min_scaled'   # Will exist after converting to numeric in feature_scaling.py
]
TARGET_COLUMN = 'sot' # Still the raw SOT count

# ... (rest of the file remains the same) ...

def load_data():
    """Loads the final scaled data set for modeling."""
    logger.info(f"Loading scaled feature set from {SCALED_DATA_FILE}...")
    try:
        df = pd.read_parquet(SCALED_DATA_FILE)
        logger.info(f"Data loaded successfully. Shape: {df.shape}")
        return df
    except Exception as e:
        logger.error(f"Error loading scaled data: {e}")
        return None

def train_and_evaluate_model(df):
    """Trains the final Poisson Regression model and saves it."""
    logger.info("Starting POISSON REGRESSION training (using statsmodels)...")

    # 1. Prepare Data
    # NOTE: The model requires an intercept, which statsmodels doesn't add by default for GLM.
    X = df[PREDICTOR_COLUMNS]
    X = sm.add_constant(X)  # Add the constant term (intercept)
    y = df[TARGET_COLUMN]

    # 2. Train Model
    # The 'family' argument specifies the Poisson distribution and Log link function.
    model = sm.GLM(y, X, family=sm.families.Poisson()).fit()
    logger.info("Model trained successfully.")

    # 3. Evaluate (Basic In-Sample Metrics)
    y_pred_rate = model.predict(X)
    
    # Calculate R-squared (using Pseudo R-squared for GLMs)
    pseudo_r2 = model.prsquared
    
    # Calculate RMSE (Root Mean Squared Error)
    rmse = np.sqrt(mean_squared_error(y, y_pred_rate))

    logger.info("-" * 40)
    logger.info(f"Model Summary:")
    logger.info(f"Pseudo R-squared: {pseudo_r2:.4f}")
    logger.info(f"RMSE (Expected SOT): {rmse:.4f}")
    
    # Print a simplified coefficient summary (Odds Ratios)
    odds_ratios = np.exp(model.params)
    logger.info("Top Feature Odds Ratios (Rate Multiplier for 1 SD increase):")
    for feature in PREDICTOR_COLUMNS:
        logger.info(f"  {feature.replace('_scaled', ''):<25}: {odds_ratios[feature]:.4f}")
    logger.info("-" * 40)

    # 4. Save Model Artifact
    with open(MODEL_PKL_FILE, 'wb') as file:
        pickle.dump(model, file)
        
    logger.info(f"Trained model saved to {MODEL_PKL_FILE}.")
    return MODEL_PKL_FILE


if __name__ == '__main__':
    df_scaled = load_data()
    if df_scaled is not None:
        # NOTE: No cross-validation implemented here, just final training/save
        train_and_evaluate_model(df_scaled)
