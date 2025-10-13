# src/services/ai/backtest_model.py

import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import logging

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# --- Configuration ---
INPUT_FILE = "final_feature_set_scaled.parquet"
TARGET_COLUMN = 'summary_sot'
# Note: We include only the scaled MA5 factors and scaled summary_min as predictors
PREDICTOR_COLUMNS = [
    'sot_conceded_MA5', 
    'tackles_att_3rd_MA5', 
    'sot_MA5', 
    'min_MA5',
    'summary_min' # Player raw minutes played (scaled)
]
# We won't use a formal time-series split here, but split into simple train/test sets for quick evaluation
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
    Trains a Linear Regression model and evaluates its performance on the test set.
    """
    logger.info("Starting Linear Regression backtesting...")
    
    # Define features (X) and target (y)
    X = df[PREDICTOR_COLUMNS]
    y = df[TARGET_COLUMN]

    # Split the data into training and testing sets
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, shuffle=False
    )
    
    logger.info(f"Training set size: {len(X_train)} | Test set size: {len(X_test)}")

    # Initialize and train the Linear Regression Model
    model = LinearRegression()
    model.fit(X_train, y_train)
    
    # Make predictions on the test set
    y_pred = model.predict(X_test)
    
    # --- Evaluation ---
    
    # R-squared (Coefficient of Determination): Proportion of the variance in the 
    # dependent variable that is predictable from the independent variables.
    r2 = r2_score(y_test, y_pred)
    
    # Mean Absolute Error (MAE): Average absolute difference between predicted and actual values.
    # This is highly interpretable: the average error in predicting the player's SOT count.
    mae = mean_absolute_error(y_test, y_pred)
    
    # Calculate the mean of the target for context
    target_mean = y_test.mean()

    logger.info("\n--- Model Performance Metrics (Linear Regression) ---")
    logger.info(f"R-squared ($R^2$): {r2:.4f}")
    logger.info(f"Mean Absolute Error (MAE): {mae:.4f} SOT")
    logger.info(f"Average SOT in Test Set: {target_mean:.4f}")

    logger.info("\n--- Feature Importance (Model Coefficients) ---")
    coefficients = pd.Series(model.coef_, index=X.columns).sort_values(ascending=False)
    for feature, coef in coefficients.items():
        # A positive coefficient means the feature increases the predicted SOT
        logger.info(f"   {feature:<20}: {coef:.4f}")

    logger.info("Backtesting and model evaluation complete.")


if __name__ == '__main__':
    df_scaled = load_scaled_data()
    train_and_evaluate_model(df_scaled)
