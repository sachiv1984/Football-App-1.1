# src/services/ai/feature_scaling.py

import pandas as pd
from sklearn.preprocessing import StandardScaler
import logging

# --- FIX: Define logging globally so 'logger' is accessible everywhere ---
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# --- Configuration ---
INPUT_FILE = "final_feature_set_pfactors.parquet"
OUTPUT_FILE = "final_feature_set_scaled.parquet"

# --- PLAYER FILTERING CONFIGURATION ---
# We will only train the model on players relevant to offensive stats
MIN_AVG_MINUTES = 15.0 # Minimum average minutes played historically
MIN_AVG_SOT = 0.1      # Minimum average SOT per match historically

# List of numerical features to scale
FEATURES_TO_SCALE = [
    'summary_min',           
    'sot_conceded_MA5',      
    'tackles_att_3rd_MA5',   
    'sot_MA5',               
    'min_MA5'                
]

def load_and_scale_features():
    """Loads, filters, performs Standardization, and saves the result."""
    logger.info(f"Loading feature set from {INPUT_FILE} for scaling...")
    try:
        df = pd.read_parquet(INPUT_FILE)
    except FileNotFoundError:
        logger.error(f"File not found: {INPUT_FILE}. Ensure player_factor_engineer.py ran successfully.")
        return

    # 1. Prepare data and create a copy to prevent SettingWithCopyWarning
    df_clean = df.dropna(subset=FEATURES_TO_SCALE).copy()
    
    # 2. IMPLEMENT CRITICAL PLAYER FILTERING
    initial_rows = len(df_clean)
    
    # Calculate player lifetime averages for the filter criteria
    player_averages = df_clean.groupby('player_id').agg(
        total_sot=('summary_sot', 'sum'),
        total_min=('summary_min', 'sum'),
        match_count=('player_id', 'size')
    )
    player_averages['avg_sot'] = player_averages['total_sot'] / player_averages['match_count']
    player_averages['avg_min'] = player_averages['total_min'] / player_averages['match_count']
    
    # Identify relevant offensive-minded players (the sample the model should learn from)
    relevant_players = player_averages[
        (player_averages['avg_min'] >= MIN_AVG_MINUTES) & 
        (player_averages['avg_sot'] >= MIN_AVG_SOT)
    ].index
    
    # Apply the filter to the main DataFrame
    df_filtered = df_clean[df_clean['player_id'].isin(relevant_players)].copy()
    
    rows_dropped = initial_rows - len(df_filtered)
    logger.info(f"Filtered out non-offensive players. Dropped {rows_dropped} rows (Non-SOT/Low-Minutes Players).")
    logger.info(f"Filtered data shape for scaling: {df_filtered.shape}")

    # 3. Initialize and Fit Scaler
    scaler = StandardScaler()
    
    # Fit the scaler to the data and transform the selected columns
    df_filtered[FEATURES_TO_SCALE] = scaler.fit_transform(df_filtered[FEATURES_TO_SCALE])

    logger.info("Features successfully standardized (Z-Score scaling applied).")
    
    # 4. Save the Scaled Data
    df_filtered.to_parquet(OUTPUT_FILE, index=False)
    logger.info(f"Scaled feature set saved to {OUTPUT_FILE}.")
    
    # Quick check for verification
    logger.info("\n--- Verification of Scaled Data (Mean should be ~0, Std Dev ~1) ---")
    logger.info(df_filtered[FEATURES_TO_SCALE].agg(['mean', 'std']).T)


if __name__ == '__main__':
    load_and_scale_features()
