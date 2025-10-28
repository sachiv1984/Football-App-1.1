import os
import pickle
import pandas as pd
import numpy as np
import logging
import statsmodels.api as sm

# --- Logging ---
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# --- Config ---
MODEL_TYPE = os.getenv("MODEL_TYPE", "poisson")  # 'poisson' or 'zip'
MODEL_DIR = "src/services/ai/artifacts"
FEATURE_FILE = "final_feature_set_scaled.parquet"
OUTPUT_CSV = "gameweek_sot_recommendations.csv"

# --- Load Feature Data ---
logger.info(f"Loading feature data from {FEATURE_FILE}...")
try:
    df = pd.read_parquet(FEATURE_FILE)
    logger.info(f"✅ Data loaded. Shape: {df.shape}")
except Exception as e:
    logger.error(f"❌ Failed to load feature file: {e}")
    raise

# --- Load Model ---
model_file = os.path.join(MODEL_DIR, f"{MODEL_TYPE}_model.pkl")
logger.info(f"Loading {MODEL_TYPE} model from {model_file}...")
try:
    with open(model_file, "rb") as f:
        model = pickle.load(f)
    logger.info("✅ Model loaded successfully.")
except Exception as e:
    logger.error(f"❌ Failed to load model: {e}")
    raise

# --- Prepare Features ---
PREDICTOR_COLUMNS = [
    'sot_conceded_MA5_scaled',
    'tackles_att_3rd_MA5_scaled',
    'sot_MA5_scaled',
    'summary_min',
    'is_forward',
    'is_defender'
]

X = df[PREDICTOR_COLUMNS].copy()
X = sm.add_constant(X, has_constant='add')

# --- Make Predictions ---
logger.info("Predicting expected SOT and probability thresholds...")
if MODEL_TYPE == "poisson":
    # Expected SOT
    df['E_SOT'] = model.predict(X)
    
    # Poisson probabilities for 1+, 2+, 3+ SOT
    df['P_1_plus'] = 1 - np.exp(-df['E_SOT'])
    df['P_2_plus'] = 1 - np.exp(-df['E_SOT']) * (1 + df['E_SOT'])
    df['P_3_plus'] = 1 - np.exp(-df['E_SOT']) * (1 + df['E_SOT'] + df['E_SOT']**2/2)

elif MODEL_TYPE == "zip":
    # ZIP predicts expected count (already accounts for zeros)
    # Statsmodels returns E(Y) including zero inflation
    df['E_SOT'] = model.predict(X, exog_infl=X)  # Assumes inflation features = X subset
    # Probabilities: assume Poisson distribution given E_SOT
    lam = df['E_SOT'].clip(min=0.01)  # prevent zeros
    df['P_1_plus'] = 1 - np.exp(-lam)
    df['P_2_plus'] = 1 - np.exp(-lam) * (1 + lam)
    df['P_3_plus'] = 1 - np.exp(-lam) * (1 + lam + lam**2/2)

else:
    logger.error(f"Unsupported MODEL_TYPE: {MODEL_TYPE}")
    raise ValueError("MODEL_TYPE must be 'poisson' or 'zip'")

# --- Select Columns and Sort ---
output_cols = [
    'player_name', 'team', 'opponent', 'E_SOT',
    'P_1_plus', 'P_2_plus', 'P_3_plus'
]
df_output = df[output_cols].sort_values(by='E_SOT', ascending=False)

# --- Save CSV ---
df_output.to_csv(OUTPUT_CSV, index=False)
logger.info(f"✅ Predictions saved to {OUTPUT_CSV}")
logger.info("Top 10 players:")
logger.info("\n" + str(df_output.head(10)))
