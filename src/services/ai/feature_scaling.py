import pandas as pd
import numpy as np
import json
import logging
from sklearn.preprocessing import StandardScaler

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# --- Configuration ---
INPUT_FILE = "final_feature_set_pfactors.parquet"
OUTPUT_FILE = "final_feature_set_scaled.parquet"
STATS_FILE = "training_stats.json"

# Features to standardize (Z-score normalization)
# NOTE: MA5 features are standardized, but NOT position features (they're binary)
FEATURES_TO_SCALE = [
    'sot_MA5',
    'min_MA5',
    'sot_conceded_MA5',
    'tackles_att_3rd_MA5'
]

# Features to keep raw (no scaling)
RAW_FEATURES = [
    'summary_min',      # Raw minutes expected for this match
    'is_forward',       # Binary position indicator (0 or 1)
    'is_defender'       # Binary position indicator (0 or 1) - attacking defenders
]


def load_data():
    """Load the feature set with P-Factors."""
    logger.info("Loading data from player_factor_engineer output...")
    try:
        df = pd.read_parquet(INPUT_FILE)
        logger.info(f"✅ Data loaded successfully. Shape: {df.shape}")
        return df
    except FileNotFoundError:
        logger.error(f"❌ File not found: {INPUT_FILE}")
        logger.error("Run player_factor_engineer.py first!")
        exit(1)


def validate_columns(df):
    """Ensure all required columns exist."""
    logger.info("Validating required columns...")
    
    required = FEATURES_TO_SCALE + RAW_FEATURES + ['sot']  # sot is target
    missing = [col for col in required if col not in df.columns]
    
    if missing:
        logger.error(f"❌ Missing required columns: {missing}")
        logger.error("Ensure player_factor_engineer.py completed successfully")
        exit(1)
    
    logger.info(f"✅ All {len(required)} required columns present")


def add_summary_min(df):
    """
    Ensure 'summary_min' exists for live predictions.
    This represents expected minutes for the upcoming match.
    """
    logger.info("Checking for 'summary_min' column...")
    
    if 'summary_min' not in df.columns:
        if 'min' in df.columns:
            logger.info("  'summary_min' not found, using 'min' (recent actual minutes)")
            df['summary_min'] = df['min']
        else:
            logger.warning("  ⚠️ Neither 'summary_min' nor 'min' found, creating from min_MA5")
            df['summary_min'] = df['min_MA5']
    else:
        logger.info("  ✅ 'summary_min' already exists")
    
    return df


def standardize_features(df):
    """
    Standardize MA5 features using Z-score normalization.
    Position features (is_forward, is_defender) are NOT scaled - they stay as 0/1.
    """
    logger.info("\nStandardizing MA5 features...")
    logger.info(f"  Features to scale: {FEATURES_TO_SCALE}")
    logger.info(f"  Features kept raw: {RAW_FEATURES}")
    
    # Initialize scaler
    scaler = StandardScaler()
    
    # Fit and transform
    df_scaled = df.copy()
    scaled_values = scaler.fit_transform(df[FEATURES_TO_SCALE])
    
    # Create new scaled columns
    for i, feature in enumerate(FEATURES_TO_SCALE):
        df_scaled[f'{feature}_scaled'] = scaled_values[:, i]
        logger.info(f"  ✅ Scaled {feature} (μ={scaler.mean_[i]:.3f}, σ={scaler.scale_[i]:.3f})")
    
    # Save scaling statistics for live predictions
    stats = {}
    for i, feature in enumerate(FEATURES_TO_SCALE):
        stats[feature] = {
            'mean': float(scaler.mean_[i]),
            'std': float(scaler.scale_[i])
        }
    
    with open(STATS_FILE, 'w') as f:
        json.dump(stats, f, indent=2)
    
    logger.info(f"\n✅ Scaling statistics saved to {STATS_FILE}")
    
    return df_scaled


def prepare_final_dataset(df):
    """
    Select and organize columns for model training.
    Keep only necessary columns to reduce file size.
    """
    logger.info("\nPreparing final dataset...")
    
    # Scaled feature columns
    scaled_cols = [f'{f}_scaled' for f in FEATURES_TO_SCALE]
    
    # Columns to keep
    keep_cols = [
        # Identifiers
        'player_id', 'player_name', 'team_name', 'match_datetime',
        'home_team', 'away_team', 'opponent_team',
        
        # Target variable
        'sot',
        
        # Scaled MA5 features
        *scaled_cols,
        
        # Raw features (including position)
        *RAW_FEATURES,
        
        # Position metadata (for analysis)
        'position_group', 'player_avg_sot'
    ]
    
    # Filter to only columns that exist
    keep_cols = [col for col in keep_cols if col in df.columns]
    
    df_final = df[keep_cols].copy()
    
    logger.info(f"  ✅ Final dataset shape: {df_final.shape}")
    logger.info(f"  ✅ Columns kept: {len(keep_cols)}")
    
    return df_final


def validate_output(df):
    """Validate the final output before saving."""
    logger.info("\nValidating output data...")
    
    # Check for NaN in critical columns
    scaled_cols = [f'{f}_scaled' for f in FEATURES_TO_SCALE]
    critical_cols = scaled_cols + RAW_FEATURES + ['sot']
    
    for col in critical_cols:
        if col not in df.columns:
            logger.error(f"❌ Missing column: {col}")
            continue
        
        nan_count = df[col].isna().sum()
        if nan_count > 0:
            nan_pct = (nan_count / len(df)) * 100
            if nan_pct > 50:
                logger.error(f"❌ {col} has {nan_pct:.1f}% NaN values (too high!)")
            else:
                logger.warning(f"⚠️ {col} has {nan_pct:.1f}% NaN values")
    
    # Summary statistics
    logger.info("\n📊 Final Dataset Summary:")
    logger.info(f"  Total observations: {len(df)}")
    logger.info(f"  Unique players: {df['player_id'].nunique()}")
    logger.info(f"  Date range: {df['match_datetime'].min()} to {df['match_datetime'].max()}")
    
    # Position distribution
    if 'position_group' in df.columns:
        logger.info("\n📊 Position Distribution:")
        position_counts = df['position_group'].value_counts()
        for pos, count in position_counts.items():
            pct = (count / len(df)) * 100
            logger.info(f"  {pos:<15} {count:>5} ({pct:>5.1f}%)")
    
    # Position feature statistics
    if 'is_forward' in df.columns:
        logger.info("\n📊 Position Features (Binary, Not Scaled):")
        logger.info(f"  is_forward:  {df['is_forward'].sum()} ({(df['is_forward'].sum()/len(df)*100):.1f}%) have value 1")
        logger.info(f"  is_defender: {df['is_defender'].sum()} ({(df['is_defender'].sum()/len(df)*100):.1f}%) have value 1")
    
    # Check scaled feature ranges (should be roughly -3 to +3 for Z-scores)
    logger.info("\n📊 Scaled Feature Ranges (Z-scores):")
    scaled_cols = [f'{f}_scaled' for f in FEATURES_TO_SCALE]
    for col in scaled_cols:
        if col in df.columns:
            min_val = df[col].min()
            max_val = df[col].max()
            logger.info(f"  {col:<30} [{min_val:>6.2f}, {max_val:>6.2f}]")
    
    logger.info("\n✅ Validation complete")


def save_output(df):
    """Save the scaled dataframe."""
    logger.info(f"\nSaving scaled data to {OUTPUT_FILE}...")
    
    try:
        df.to_parquet(OUTPUT_FILE, index=False)
        logger.info(f"✅ Data saved successfully")
        logger.info(f"   Shape: {df.shape}")
    except Exception as e:
        logger.error(f"❌ Error saving file: {e}")
        exit(1)


def main():
    """Main execution pipeline."""
    logger.info("="*70)
    logger.info("  FEATURE SCALING - WITH POSITION FEATURES")
    logger.info("="*70)
    
    # Step 1: Load data
    df = load_data()
    
    # Step 2: Validate columns
    validate_columns(df)
    
    # Step 3: Ensure summary_min exists
    df = add_summary_min(df)
    
    # Step 4: Standardize MA5 features (NOT position features)
    df = standardize_features(df)
    
    # Step 5: Prepare final dataset
    df = prepare_final_dataset(df)
    
    # Step 6: Validate output
    validate_output(df)
    
    # Step 7: Save output
    save_output(df)
    
    logger.info("="*70)
    logger.info("  ✅ FEATURE SCALING COMPLETE")
    logger.info("="*70)
    logger.info("\nNext step: Run backtest_model.py")


if __name__ == '__main__':
    main()