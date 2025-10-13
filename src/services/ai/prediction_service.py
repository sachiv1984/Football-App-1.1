# src/services/ai/prediction_service.py

import pandas as pd
import numpy as np
import pickle
import statsmodels.api as sm
import logging
import json

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# --- Configuration ---
MODEL_FILE = "poisson_model.pkl"
SCALER_STATS_FILE = "training_stats.json"

PREDICTOR_COLUMNS = [
    'sot_conceded_MA5_scaled',
    'tackles_att_3rd_MA5_scaled',
    'sot_MA5_scaled',
    'min_MA5_scaled',
    'summary_min'  # raw minutes
]

TARGET_COLUMN = 'sot'

def load_model():
    """Load trained Poisson model."""
    try:
        with open(MODEL_FILE, 'rb') as f:
            model = pickle.load(f)
        logger.info("Poisson model loaded successfully.")
        return model
    except FileNotFoundError:
        logger.error(f"Model file not found: {MODEL_FILE}")
        return None

def load_scaler_stats():
    """Load mean/std for live feature scaling."""
    try:
        with open(SCALER_STATS_FILE, 'r') as f:
            stats = json.load(f)
        logger.info("Scaler stats loaded successfully.")
        return stats
    except FileNotFoundError:
        logger.error(f"Scaler stats file not found: {SCALER_STATS_FILE}")
        return None

def prepare_live_features(live_input: dict, scaler_stats: dict):
    """
    Convert live raw input to scaled features matching training.
    - Only MA5 features are scaled.
    - summary_min is kept raw.
    """
    df = pd.DataFrame([live_input])

    # Apply Z-score scaling to MA5 features
    for feature in ['sot_conceded_MA5', 'tackles_att_3rd_MA5', 'sot_MA5', 'min_MA5']:
        if feature in df.columns and feature in scaler_stats:
            mean = scaler_stats[feature]['mean']
            std = scaler_stats[feature]['std']
            df[f"{feature}_scaled"] = (df[feature] - mean) / std

    # Keep summary_min raw
    if 'summary_min' not in df.columns:
        df['summary_min'] = 0.0  # fallback

    # Select final prediction columns
    df_final = df[PREDICTOR_COLUMNS]

    # Add intercept for statsmodels
    df_final = sm.add_constant(df_final, has_constant='add')

    return df_final

def predict_sot(model, live_features: pd.DataFrame):
    """Make a live prediction of SOT and basic probabilities."""
    predicted_lambda = model.predict(live_features).iloc[0]

    # Poisson PMF for 0,1,2 SOT
    prob_0 = np.exp(-predicted_lambda)
    prob_1 = predicted_lambda * prob_0
    prob_2 = (predicted_lambda**2 / 2) * prob_0

    logger.info(f"Predicted E[SOT]: {predicted_lambda:.3f}")
    logger.info(f"Probability 0 SOT: {prob_0:.2%}")
    logger.info(f"Probability 1 SOT: {prob_1:.2%}")
    logger.info(f"Probability 2 SOT: {prob_2:.2%}")

    return predicted_lambda, [prob_0, prob_1, prob_2]

if __name__ == "__main__":
    # 1️⃣ Load artifacts
    model = load_model()
    scaler_stats = load_scaler_stats()

    if model is None or scaler_stats is None:
        logger.error("Cannot run prediction. Missing model or scaler stats.")
        exit(1)

    # 2️⃣ Mock live input (replace with actual live data in deployment)
    live_input = {
        'sot_conceded_MA5': 1.5,
        'tackles_att_3rd_MA5': 0.8,
        'sot_MA5': 2.0,
        'min_MA5': 90.0,
        'summary_min': 85.0
    }

    # 3️⃣ Prepare and scale features
    live_features = prepare_live_features(live_input, scaler_stats)

    # 4️⃣ Predict
    predict_sot(model, live_features)
