import pandas as pd
import numpy as np
import statsmodels.api as sm
import pickle
from sklearn.metrics import mean_squared_error
import logging

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

SCALED_DATA_FILE = "final_feature_set_scaled.parquet"
MODEL_PKL_FILE = "poisson_model.pkl"

PREDICTOR_COLUMNS = [
    'sot_conceded_MA5_scaled',
    'tackles_att_3rd_MA5_scaled',
    'sot_MA5_scaled',
    'min_MA5_scaled',
    'summary_min'   # raw minutes, kept in scaled DF
]
TARGET_COLUMN = 'sot'  # raw SOT

def load_data():
    logger.info(f"Loading scaled dataset from {SCALED_DATA_FILE}...")
    df = pd.read_parquet(SCALED_DATA_FILE)
    logger.info(f"Data loaded. Shape: {df.shape}")
    return df

def train_and_evaluate_model(df):
    logger.info("Starting POISSON REGRESSION training...")
    
    X = df[PREDICTOR_COLUMNS]
    X = sm.add_constant(X)
    y = df[TARGET_COLUMN]

    model = sm.GLM(y, X, family=sm.families.Poisson()).fit()
    y_pred = model.predict(X)

    # Metrics
    pseudo_r2 = model.prsquared
    rmse = np.sqrt(mean_squared_error(y, y_pred))

    logger.info(f"Pseudo R-squared: {pseudo_r2:.4f}")
    logger.info(f"RMSE: {rmse:.4f}")

    logger.info("Feature Odds Ratios:")
    odds_ratios = np.exp(model.params)
    for feature in PREDICTOR_COLUMNS:
        logger.info(f"  {feature.replace('_scaled',''):<25}: {odds_ratios[feature]:.4f}")

    # Save model
    with open(MODEL_PKL_FILE, 'wb') as f:
        pickle.dump(model, f)
    logger.info(f"Poisson model saved to {MODEL_PKL_FILE}")

    return MODEL_PKL_FILE

if __name__ == "__main__":
    df_scaled = load_data()
    train_and_evaluate_model(df_scaled)
