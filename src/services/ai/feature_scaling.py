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

# ✅ v4.2: Only 3 MA5 features need scaling (npxg_MA5 added)
FEATURES_TO_SCALE = [
    'sot_MA5',
    'sot_conceded_MA5',
    'npxg_MA5'  # ✅ NEW: Expected goals MA5
]

# Features to keep raw (no scaling)
# These are binary (0/1) or interpretable as-is (minutes)
RAW_FEATURES = [
    'summary_min',      # Raw minutes expected (from min_MA5)
    'is_forward',       # Binary position indicator (0 or 1)
    'is_defender',      # Binary position indicator (0 or 1)
    'is_home'           # Binary home/away indicator (0 or 1)
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


def validate_columns(df):
    """Ensure all required columns exist."""
    logger.info("Validating required columns...")
    
    # ✅ v4.2: Check for npxg_MA5
    required = FEATURES_TO_SCALE + ['min_MA5', 'is_forward', 'is_defender', 'team_side', 'sot']
    missing = [col for col in required if col not in df.columns]
    
    if missing:
        logger.error(f"❌ Missing required columns: {missing}")
        logger.error("Ensure player_factor_engineer.py completed successfully")
        sys.exit(1)
    
    logger.info(f"✅ All {len(required)} required columns present")
    
    # ✅ v4.2: Verify npxg_MA5 has data
    if 'npxg_MA5' in df.columns:
        npxg_coverage = df['npxg_MA5'].notna().sum() / len(df) * 100
        npxg_mean = df['npxg_MA5'].mean()
        logger.info(f"✅ npxg_MA5: {npxg_coverage:.1f}% coverage, mean={npxg_mean:.3f}")
        
        if npxg_coverage < 50:
            logger.warning(f"⚠️ Low npxg_MA5 coverage ({npxg_coverage:.1f}%)")


def create_venue_feature(df):
    """
    Create is_home binary feature from team_side column.
    """
    logger.info("\nCreating venue feature (is_home)...")
    
    if 'team_side' not in df.columns:
        logger.error("❌ 'team_side' column not found!")
        logger.error("Ensure data_loader.py includes 'team_side' in SELECT query")
        sys.exit(1)
    
    df['is_home'] = (df['team_side'] == 'home').astype(int)
    
    home_count = df['is_home'].sum()
    away_count = len(df) - home_count
    home_pct = (home_count / len(df)) * 100
    away_pct = (away_count / len(df)) * 100
    
    logger.info(f"  ✅ Created is_home feature:")
    logger.info(f"    Home matches (is_home=1): {home_count:>5} ({home_pct:>5.1f}%)")
    logger.info(f"    Away matches (is_home=0): {away_count:>5} ({away_pct:>5.1f}%)")
    
    return df


def add_summary_min(df):
    """
    Ensure 'summary_min' exists for live predictions.
    This represents expected minutes for the upcoming match.
    """
    logger.info("Checking for 'summary_min' column...")
    
    # Use min_MA5 as expected minutes for future predictions
    if 'summary_min' not in df.columns:
        logger.info("  'summary_min' not found, creating from 'min_MA5' column.")
        df['summary_min'] = df['min_MA5']
    else:
        logger.info("  ✅ 'summary_min' already exists")
    
    return df


def standardize_features(df):
    """
    Standardize MA5 features using Z-score normalization.
    ✅ v4.2: Now scales 3 features (added npxg_MA5)
    """
    logger.info("\nStandardizing MA5 features (v4.2)...")
    logger.info(f"  Features to scale: {FEATURES_TO_SCALE}")
    logger.info(f"  Features kept raw: {RAW_FEATURES}")
    
    scaler = StandardScaler()
    df_scaled = df.copy()
    
    # Fill NaN with mean for scaling (will be marked as NaN again after)
    df_temp = df[FEATURES_TO_SCALE].fillna(df[FEATURES_TO_SCALE].mean())
    scaled_values = scaler.fit_transform(df_temp)
    
    # Apply scaled values and restore NaN where original was NaN
    for i, feature in enumerate(FEATURES_TO_SCALE):
        df_scaled[f'{feature}_scaled'] = scaled_values[:, i]
        df_scaled.loc[df[feature].isna(), f'{feature}_scaled'] = np.nan
        
        marker = " ✅ xG" if feature == 'npxg_MA5' else ""
        logger.info(f"  ✅ Scaled {feature} (μ={scaler.mean_[i]:.3f}, σ={scaler.scale_[i]:.3f}){marker}")
    
    # Save scaling statistics (ONLY the 3 MA5 features)
    stats = {f: {'mean': float(scaler.mean_[i]), 'std': float(scaler.scale_[i])} 
             for i, f in enumerate(FEATURES_TO_SCALE)}
    
    with open(STATS_FILE, 'w') as f:
        json.dump(stats, f, indent=2)
    
    logger.info(f"\n✅ Scaling statistics saved to {STATS_FILE}")
    logger.info(f"   Features saved: {list(stats.keys())}")
    
    return df_scaled


def prepare_final_dataset(df):
    """Select and organize columns for model training."""
    logger.info("\nPreparing final dataset...")
    
    scaled_cols = [f'{f}_scaled' for f in FEATURES_TO_SCALE]
    
    keep_cols = [
        'player_id', 'player_name', 'team_name', 'match_datetime',
        'home_team', 'away_team', 'opponent',
        'sot',  # Target variable
        *scaled_cols,  # Scaled MA5 features
        *RAW_FEATURES,  # Raw features (binary + minutes)
        'position_group', 'player_avg_sot',
        'team_side'
    ]
    
    # Only keep columns that exist
    keep_cols = [col for col in keep_cols if col in df.columns]
    df_final = df[keep_cols].copy()
    
    logger.info(f"  ✅ Final dataset shape: {df_final.shape}")
    logger.info(f"  ✅ Columns kept: {len(keep_cols)}")
    
    return df_final


def validate_output(df):
    """Validate the final output before saving."""
    logger.info("\nValidating output data...")
    
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
    
    logger.info("\n📊 Final Dataset Summary:")
    logger.info(f"  Total observations: {len(df)}")
    logger.info(f"  Unique players: {df['player_id'].nunique()}")
    logger.info(f"  Date range: {df['match_datetime'].min()} to {df['match_datetime'].max()}")
    
    if 'position_group' in df.columns:
        logger.info("\n📊 Position Distribution:")
        position_counts = df['position_group'].value_counts()
        for pos, count in position_counts.items():
            pct = (count / len(df)) * 100
            logger.info(f"  {pos:<15} {count:>5} ({pct:>5.1f}%)")
    
    logger.info("\n📊 Binary Features (Not Scaled):")
    if 'is_forward' in df.columns:
        logger.info(f"  is_forward:  {df['is_forward'].sum():>5} ({(df['is_forward'].sum()/len(df)*100):>5.1f}%) = 1")
    if 'is_defender' in df.columns:
        logger.info(f"  is_defender: {df['is_defender'].sum():>5} ({(df['is_defender'].sum()/len(df)*100):>5.1f}%) = 1")
    if 'is_home' in df.columns:
        logger.info(f"  is_home:     {df['is_home'].sum():>5} ({(df['is_home'].sum()/len(df)*100):>5.1f}%) = 1")
    
    # Venue impact on SOT
    if 'is_home' in df.columns and 'sot' in df.columns:
        home_sot = df[df['is_home'] == 1]['sot'].mean()
        away_sot = df[df['is_home'] == 0]['sot'].mean()
        diff_pct = ((home_sot - away_sot) / away_sot) * 100 if away_sot > 0 else 0
        logger.info("\n📊 Average SOT by Venue:")
        logger.info(f"  Home: {home_sot:.3f}")
        logger.info(f"  Away: {away_sot:.3f}")
        logger.info(f"  Home advantage: {diff_pct:+.1f}%")
    
    # ✅ v4.2: Show npxG stats
    if 'npxg_MA5_scaled' in df.columns:
        logger.info("\n📊 npxG Feature (v4.2):")
        npxg_mean = df['npxg_MA5_scaled'].mean()
        npxg_std = df['npxg_MA5_scaled'].std()
        logger.info(f"  npxg_MA5_scaled mean: {npxg_mean:.3f} (should be ~0)")
        logger.info(f"  npxg_MA5_scaled std:  {npxg_std:.3f} (should be ~1)")
    
    logger.info("\n📊 Scaled Feature Ranges (Z-scores):")
    for col in scaled_cols:
        if col in df.columns:
            min_val = df[col].min()
            max_val = df[col].max()
            marker = " ✅ xG" if 'npxg' in col else ""
            logger.info(f"  {col:<30} [{min_val:>6.2f}, {max_val:>6.2f}]{marker}")
    
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
    logger.info("  FEATURE SCALING v4.2 - WITH npxg_MA5")
    logger.info("="*70)
    
    df = load_data()
    validate_columns(df)
    df = create_venue_feature(df)
    df = add_summary_min(df)
    df = standardize_features(df)
    df = prepare_final_dataset(df)
    validate_output(df)
    save_output(df)
    
    logger.info("="*70)
    logger.info("  ✅ FEATURE SCALING COMPLETE (v4.2)")
    logger.info("="*70)
    logger.info(f"\n✅ Key Changes:")
    logger.info(f"  • Scaled features: {len(FEATURES_TO_SCALE)} (added npxg_MA5)")
    logger.info(f"  • training_stats.json has {len(FEATURES_TO_SCALE)} entries")
    logger.info(f"  • Removed: min_MA5, tackles_att_3rd_MA5 (not used in model)")
    logger.info(f"\n📁 Output files:")
    logger.info(f"  • {OUTPUT_FILE}")
    logger.info(f"  • {STATS_FILE} (3 features)")
    logger.info(f"\nNext step: Run backtest_model.py or zip_model_trainer.py")
    logger.info("="*70)


if __name__ == '__main__':
    main()