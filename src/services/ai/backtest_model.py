# src/services/ai/backtest_model.py (UPDATED for Poisson Regression)

import pandas as pd
# Importing statsmodels for Generalized Linear Models
import statsmodels.api as sm 
from statsmodels.genmod import families 
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import logging

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
    # ... (loading logic remains the same) ...
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
    
    # Add a constant (intercept) for statsmodels GLM
    X = sm.add_constant(X)

    # Split the data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, shuffle=False
    )
    logger.info(f"Training set size: {len(X_train)} | Test set size: {len(X_test)}")

    # Initialize and train the Generalized Linear Model with Poisson family
    # Link function is log (standard for Poisson)
    poisson_model = sm.GLM(y_train, X_train, family=families.Poisson()).fit()
    
    # Make predictions on the test set (returns predicted event rate, lambda)
    # The prediction is the expected count (E[y])
    y_pred_rate = poisson_model.predict(X_test)
    
    # --- Evaluation ---
    
    # MAE is still a useful metric
    mae = mean_absolute_error(y_test, y_pred_rate)
    
    # We use Pseudo R-squared for GLMs as the standard R-squared is inappropriate.
    # statsmodels provides this in the model summary, but we'll use a direct calculation for MAE
    # and reference the model's D-squared (Deviance R-squared) for goodness-of-fit.
    
    logger.info("\n--- Model Performance Metrics (Poisson Regression) ---")
    logger.info(f"Mean Absolute Error (MAE): {mae:.4f} SOT")
    logger.info(f"Average SOT in Test Set: {y_test.mean():.4f}")
    
    # We report the Pseudo R-squared (D-squared) from the model summary for fit quality
    logger.info(f"Deviance Pseudo R-squared: {poisson_model.pseudo_rsquared:.4f}")

    logger.info("\n--- Feature Importance (Model Coefficients - Log Odds) ---")
    # Coefficients are reported on the log-odds scale. We can exponentiate them 
    # to get the expected change in SOT rate (odds ratio).
    coefficients = pd.Series(poisson_model.params).drop('const')
    
    # Convert log-odds (log(lambda)) to Odds Ratio (change in SOT rate)
    odds_ratio = np.exp(coefficients).sort_values(ascending=False)
    
    for feature, ratio in odds_ratio.items():
        # Interpretation: A ratio of 1.10 means a 1-unit increase in the feature 
        # increases the predicted SOT rate by 10%
        logger.info(f"   {feature:<20}: {ratio:.4f} (Rate Multiplier)")

    logger.info("Poisson Regression backtesting complete. Model metrics updated.")


if __name__ == '__main__':
    df_scaled = load_scaled_data()
    train_and_evaluate_model(df_scaled)

