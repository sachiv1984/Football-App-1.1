import pandas as pd
import numpy as np
import json
import logging
import sys
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
    'sot_conceded_MA5',
]

# Features to keep raw (no scaling)
# These are binary (0/1) or interpretable as-is (minutes)
RAW_FEATURES = [
    'min',              # Raw minutes expected for this match
    'is_forward',       # Binary position indicator (0 or 1)
    'is_defender',      # Binary position indicator (0 or 1) - attacking defenders
    'is_home'           # ✅ NEW: Binary home/away indicator (0 or 1)
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
        sys.exit(1)


def create_venue_feature(df):
    """
    Create is_home binary feature from team_side column.
    
    is_home = 1 if team_side == 'home', else 0
    """
    logger.info("\nCreating venue feature (is_home)...")
    
    if 'team_side' not in df.columns:
        logger.error("❌ 'team_side' column not found!")
        logger.error("Ensure data_loader.py includes 'team_side' in SELECT query")
        sys.exit(1)
    
    # Create binary feature
    df['is_home'] = (df['team_side'] == 'home').astype(int)
    
    # Show distribution
    home_count = df['is_home'].sum()
    away_count = len(df) - home_count
    home_pct = (home_count / len(df)) * 100
    away_pct = (away_count / len(df)) * 100
    
    logger.info(f"  ✅ Created is_home feature:")
    logger.info(f"    Home matches (is_home=1): {home_count:>5} ({home_pct:>5.1f}%)")
    logger.info(f"    Away matches (is_home=0): {away_count:>5} ({away_pct:>5.1f}%)")
    
    # Validate values
    unique_values = df['is_home'].unique()
    if not set(unique_values).issubset({0, 1}):
        logger.warning(f"  ⚠️ Unexpected is_home values: {unique_values}")
    
    return df


def validate_columns(df):
    """Ensure all required columns exist."""
    logger.info("Validating required columns...")
    
    # 'sot' is the target variable
    # team_side is needed to create is_home
    required = FEATURES_TO_SCALE + ['min', 'is_forward', 'is_defender', 'team_side', 'sot']
    missing = [col for col in required if col not in df.columns]
    
    if missing:
        logger.error(f"❌ Missing required columns: {missing}")
        logger.error("Ensure player_factor_engineer.py completed successfully")
        sys.exit(1)
    
    logger.info(f"✅ All {len(required)} required columns present")


def add_summary_min(df):
    """
    Ensure 'summary_min' exists for live predictions.
    This represents expected minutes for the upcoming match.
    """
    logger.info("Checking for 'summary_min' column...")
    
    # Use the 'min' column created by the factor engineer as the source
    if 'min' in df.columns and 'summary_min' not in df.columns:
        logger.info("  'summary_min' not found, creating from 'min' column.")
        df['summary_min'] = df['min']
    elif 'summary_min' in df.columns:
        logger.info("  ✅ 'summary_min' already exists")
    else:
        logger.warning("  ⚠️ Neither 'summary_min' nor 'min' found, creating from min_MA5")
        df['summary_min'] = df['min_MA5']
    
    return df


def standardize_features(df):
    """
    Standardize MA5 features using Z-score normalization.
    Position and venue features (is_forward, is_defender, is_home) are NOT scaled - they stay as 0/1.
    """
    logger.info("\nStandardizing MA5 features...")
    logger.info(f"  Features to scale: {FEATURES_TO_SCALE}")
    logger.info(f"  Features kept raw: {RAW_FEATURES}")
    
    # Initialize scaler
    scaler = StandardScaler()
    
    # Fit and transform
    df_scaled = df.copy()
    
    # Handle NaN values before scaling by filling with the mean of the existing data
    df_temp = df[FEATURES_TO_SCALE].fillna(df[FEATURES_TO_SCALE].mean())
    scaled_values = scaler.fit_transform(df_temp)
    
    # Create new scaled columns
    for i, feature in enumerate(FEATURES_TO_SCALE):
        df_scaled[f'{feature}_scaled'] = scaled_values[:, i]
        # Reapply NaNs to scaled features where the original was NaN
        df_scaled.loc[df[feature].isna(), f'{feature}_scaled'] = np.nan
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
        
        # Raw features (including position and venue)
        *RAW_FEATURES,
        
        # Compatibility column for live prediction scripts
        'summary_min',
        
        # Position metadata (for analysis)
        'position_group', 'player_avg_sot',
        
        # ✅ NEW: Keep team_side for reference
        'team_side'
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
    
    critical_cols = scaled_cols + ['min', 'is_forward', 'is_defender', 'is_home'] + ['sot']
    
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
    
    # Position and venue feature statistics
    logger.info("\n📊 Binary Features (Not Scaled):")
    if 'is_forward' in df.columns:
        logger.info(f"  is_forward:  {df['is_forward'].sum():>5} ({(df['is_forward'].sum()/len(df)*100):>5.1f}%) = 1")
    if 'is_defender' in df.columns:
        logger.info(f"  is_defender: {df['is_defender'].sum():>5} ({(df['is_defender'].sum()/len(df)*100):>5.1f}%) = 1")
    if 'is_home' in df.columns:
        logger.info(f"  is_home:     {df['is_home'].sum():>5} ({(df['is_home'].sum()/len(df)*100):>5.1f}%) = 1")
    
    # ✅ NEW: Show average SOT by venue
    if 'is_home' in df.columns and 'sot' in df.columns:
        logger.info("\n📊 Average SOT by Venue:")
        home_sot = df[df['is_home'] == 1]['sot'].mean()
        away_sot = df[df['is_home'] == 0]['sot'].mean()
        diff_pct = ((home_sot - away_sot) / away_sot) * 100 if away_sot > 0 else 0
        logger.info(f"  Home: {home_sot:.3f}")
        logger.info(f"  Away: {away_sot:.3f}")
        logger.info(f"  Home advantage: {diff_pct:+.1f}%")
    
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
        sys.exit(1)


def main():
    """Main execution pipeline."""
    logger.info("="*70)
    logger.info("  FEATURE SCALING - WITH POSITION & VENUE FEATURES")
    logger.info("="*70)
    
    # Step 1: Load data
    df = load_data()
    
    # Step 2: Validate columns
    validate_columns(df)
    
    # Step 3: Create venue feature (is_home) ✅ NEW
    df = create_venue_feature(df)
    
    # Step 4: Ensure summary_min exists
    df = add_summary_min(df)
    
    # Step 5: Standardize MA5 features (NOT position or venue features)
    df = standardize_features(df)
    
    # Step 6: Prepare final dataset
    df = prepare_final_dataset(df)
    
    # Step 7: Validate output
    validate_output(df)
    
    # Step 8: Save output
    save_output(df)
    
    logger.info("="*70)
    logger.info("  ✅ FEATURE SCALING COMPLETE")
    logger.info("="*70)
    logger.info("\nNext step: Run backtest_model.py")


if __name__ == '__main__':
    main()