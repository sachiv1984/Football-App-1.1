# src/services/ai/backtest_model.py (FINAL FIX)

import pandas as pd
import statsmodels.api as sm 
from statsmodels.genmod import families 
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
import numpy as np
import logging
import re # We need the regex library to parse the summary

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# --- Configuration (remains the same) ---
INPUT_FILE = "final_feature_set_scaled.parquet"
TARGET_COLUMN = 'summary_sot'
PREDICTOR_COLUMNS = [
    'sot_conceded_MA5', 
    'tackles_att_3rd_MA5', 
    'sot_MA5', 
    'min_MA5',
    'summary_min'
]
TEST_SIZE = 0.2 
RANDOM_STATE = 42

def load_scaled_data() -> pd.DataFrame:
    """Loads the final scaled feature set."""
    logger.info(f"Loading scaled feature set from {INPUT_FILE}...")
    try:
        df = pd.read_parquet(INPUT_FILE)
        logger.info(f"Data loaded successfully. Shape: {df.shape}")
        return df
    except FileNotFoundError:
        logger.error(f"File not found: {INPUT_FILE}. Ensure feature_scaling.py ran successfully.")
        exit(1)

def train_and_evaluate_model(df: pd.DataFrame):
    """
    Trains a Poisson Regression model (suitable for count data) and evaluates performance.
    """
    logger.info("Starting POISSON REGRESSION backtesting (using statsmodels)...")
    
    X = df[PREDICTOR_COLUMNS]
    y = df[TARGET_COLUMN]
    
    X = sm.add_constant(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, shuffle=False
    )
    logger.info(f"Training set size: {len(X_train)} | Test set size: {len(X_test)}")

    poisson_model = sm.GLM(y_train, X_train, family=families.Poisson()).fit()
    y_pred_rate = poisson_model.predict(X_test)
    
    # --- Evaluation ---
    
    mae = mean_absolute_error(y_test, y_pred_rate)
    
    # 1. FIX: Grab the full summary as a string
    summary_text = str(poisson_model.summary())
    
    # 2. Extract the Pseudo R-squared using regex (highly robust)
    # The summary typically lists the Pseudo R-squared on a line like "Pseudo R-squ.: 0.1550"
    pseudo_r2_match = re.search(r'Pseudo R-squ\.:\s*(\d\.\d{4})', summary_text)
    
    # Set a default value in case parsing fails
    pseudo_r2 = float(pseudo_r2_match.group(1)) if pseudo_r2_match else -999.0 

    logger.info("\n--- Model Performance Metrics (Poisson Regression) ---")
    logger.info(f"Mean Absolute Error (MAE): {mae:.4f} SOT")
    logger.info(f"Average SOT in Test Set: {y_test.mean():.4f}")
    
    # Now this is a guaranteed float
    logger.info(f"Deviance Pseudo R-squared: {pseudo_r2:.4f}") 

    logger.info("\n--- Feature Importance (Model Coefficients - Odds Ratio) ---")
    coefficients = pd.Series(poisson_model.params).drop('const', errors='ignore')
    odds_ratio = np.exp(coefficients).sort_values(ascending=False)
    
    for feature, ratio in odds_ratio.items():
        logger.info(f"   {feature:<20}: {ratio:.4f} (Rate Multiplier)")

    logger.info("Poisson Regression backtesting complete. Model metrics updated.")


if __name__ == '__main__':
    df_scaled = load_scaled_data()
    train_and_evaluate_model(df_scaled)
