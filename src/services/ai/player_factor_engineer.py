# src/services/ai/player_factor_engineer.py - Revised

import pandas as pd
import numpy as np
import logging
import ast # <<< NEW IMPORT: Needed for safe parsing of list-like strings

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# --- Configuration ---
INPUT_FILE = "final_feature_set.parquet"
OUTPUT_FILE = "final_feature_set_pfactors.parquet"
MIN_PERIODS = 5  # Minimum periods for rolling average

# Player-level metrics to calculate MA5 for
MA5_METRICS = ['sot', 'min']

# --- Helper Function for Position Parsing ---
def safe_extract_position(pos_str):
    """
    Safely extracts the primary position code from potentially corrupted strings.
    Handles 'FW,MF' (clean) and '["FW", "MF"]' (corrupted).
    """
    if pd.isna(pos_str) or pos_str is None:
        return None
    
    pos_str = str(pos_str).strip()
    
    # Check for and handle the observed corrupted format '["FW", "MF"]'
    if pos_str.startswith('["') and pos_str.endswith(']'):
        try:
            # Safely evaluate the string to a list of strings
            pos_list = ast.literal_eval(pos_str)
            if isinstance(pos_list, list) and pos_list:
                return pos_list[0].strip().upper()
        except (ValueError, SyntaxError, IndexError):
            # Fallback for unexpected corruption: strip and split
            cleaned_str = pos_str.strip('[" ]').replace('"', '')
            return cleaned_str.split(',')[0].strip().upper()
            
    # Handle the expected clean format 'FW,MF' or simple 'FW'
    return pos_str.split(',')[0].strip().upper()

# ---------------------------------------------


def load_data():
    """Load the feature set with O-Factors from backtest_processor."""
    logger.info("Loading data from backtest_processor output...")
    try:
        df = pd.read_parquet(INPUT_FILE)
        logger.info(f"✅ Data loaded successfully. Shape: {df.shape}")
        return df
    except FileNotFoundError:
        logger.error(f"❌ File not found: {INPUT_FILE}")
        logger.error("Run backtest_processor.py first!")
        exit(1)


def rename_columns_for_consistency(df):
    """Rename summary columns to shorter names for easier processing."""
    logger.info("Renaming columns for consistency...")
    
    rename_map = {
        'summary_sot': 'sot',
        'summary_min': 'min'
    }
    
    df = df.rename(columns=rename_map)
    logger.info(f"  ✅ Renamed: {list(rename_map.keys())} → {list(rename_map.values())}")
    
    return df


def process_position_data(df):
    """
    Extract and process position data with hybrid filtering.
    
    Keeps:
    - All Forwards and Midfielders
    - Defenders with avg SOT >= 0.3 (attacking defenders like Trent, Reece James)
    
    Removes:
    - Goalkeepers (never shoot)
    - Pure defenders (avg SOT < 0.3)
    """
    logger.info("\n" + "="*60)
    logger.info("PROCESSING POSITION DATA (HYBRID FILTERING)")
    logger.info("="*60)
    
    # Check if position data exists
    if 'summary_positions' not in df.columns:
        logger.error("❌ 'summary_positions' column not found!")
        logger.error("Make sure data_loader.py includes 'summary_positions' in SELECT query")
        exit(1)
    
    # 1. Extract primary position (first position if multiple) - FIXED WITH SAFE PARSING
    df['position'] = df['summary_positions'].apply(safe_extract_position)
    logger.info(f"  ✅ Extracted primary position using robust parsing.")
    
    # 2. Map to position groups (Must include the detailed codes from your logs: CB, CM, etc.)
    # Note: Your validation log showed detailed codes (CB, CM, LB, etc.), so the mapping must be expanded.
    position_mapping = {
        'GK': 'Goalkeeper',
        # Defenders (DF, CB, LB, RB, WB)
        'DF': 'Defender', 'CB': 'Defender', 'LB': 'Defender', 'RB': 'Defender', 'WB': 'Defender',
        # Midfielders (MF, CM, DM, AM, LM, RM)
        'MF': 'Midfielder', 'CM': 'Midfielder', 'DM': 'Midfielder', 'AM': 'Midfielder', 'LM': 'Midfielder', 'RM': 'Midfielder',
        # Forwards (FW, LW, RW)
        'FW': 'Forward', 'LW': 'Forward', 'RW': 'Forward'
    }
    
    df['position_group'] = df['position'].map(position_mapping)
    
    # Fill missing positions with 'Unknown' for diagnostics, then filter/default
    missing_positions_count = df['position_group'].isna().sum()
    if missing_positions_count > 0:
        # First, check how many started as None/NaN after parsing
        na_count = df['position'].isna().sum()
        logger.warning(f"  ⚠️ {na_count} records had no position data (NaN) or failed parsing.")
        
        # Now map unmapped codes (like the original CB/CM) to 'Midfielder' (conservative default)
        unknown_codes = df[df['position_group'].isna()]['position'].nunique()
        if unknown_codes > 0:
             logger.warning(f"  ⚠️ {unknown_codes} unknown position codes remaining after mapping, defaulting to 'Midfielder'.")

        df['position_group'] = df['position_group'].fillna('Midfielder')
    
    # 3. Calculate player's average SOT (for hybrid filtering)
    player_avg_sot = df.groupby('player_id')['sot'].mean().reset_index()
    player_avg_sot.columns = ['player_id', 'player_avg_sot']
    df = df.merge(player_avg_sot, on='player_id', how='left')
    
    # 4. Show position distribution BEFORE filtering
    logger.info("\n  Position Distribution (Before Filtering):")
    position_counts = df['position_group'].value_counts()
    for pos, count in position_counts.items():
        pct = (count / len(df)) * 100
        logger.info(f"    {pos:<15} {count:>5} ({pct:>5.1f}%)")
    
    # 5. HYBRID FILTERING
    original_count = len(df)
    
    # Threshold for attacking defenders
    ATTACKING_DEFENDER_THRESHOLD = 0.3
    
    # Keep if:
    # - Forward or Midfielder (always keep)
    # - Defender with avg SOT >= threshold (attacking defenders)
    # Remove:
    # - Goalkeepers (always remove)
    # - Pure defenders (avg SOT < threshold)
    
    attacking_defenders_df = df[
        (df['position_group'] == 'Defender') & 
        (df['player_avg_sot'] >= ATTACKING_DEFENDER_THRESHOLD)
    ]
    
    if len(attacking_defenders_df) > 0:
        logger.info(f"\n  🎯 Found {attacking_defenders_df['player_id'].nunique()} unique attacking defenders (avg SOT >= {ATTACKING_DEFENDER_THRESHOLD}):")
        top_attacking_defenders = attacking_defenders_df.groupby('player_name')['player_avg_sot'].first().sort_values(ascending=False).head(5)
        for name, avg_sot in top_attacking_defenders.items():
            logger.info(f"    {name:<30} {avg_sot:.3f}")
    
    df = df[
        (df['position_group'].isin(['Forward', 'Midfielder'])) |  # Regular offensive players
        ((df['position_group'] == 'Defender') & (df['player_avg_sot'] >= ATTACKING_DEFENDER_THRESHOLD))  # Attacking defenders
    ].copy()
    
    filtered_count = original_count - len(df)
    
    logger.info(f"\n  🗑️  Filtered out {filtered_count} non-offensive players")
    logger.info(f"  ✅ Remaining: {len(df)} offensive players")
    
    # 6. Show position distribution AFTER filtering
    logger.info("\n  Position Distribution (After Filtering):")
    position_counts = df['position_group'].value_counts()
    for pos, count in position_counts.items():
        pct = (count / len(df)) * 100
        avg_sot = df[df['position_group']==pos]['player_avg_sot'].mean()
        logger.info(f"    {pos:<15} {count:>5} ({pct:>5.1f}%) - Avg SOT: {avg_sot:.3f}")
    
    # 7. Create dummy variables for model
    df['is_forward'] = (df['position_group'] == 'Forward').astype(int)
    df['is_defender'] = (df['position_group'] == 'Defender').astype(int)  # Attacking defenders
    
    logger.info(f"\n  ✅ Created position dummy variables:")
    logger.info(f"    is_forward: {df['is_forward'].sum()} ({(df['is_forward'].sum()/len(df)*100):.1f}%)")
    logger.info(f"    is_defender: {df['is_defender'].sum()} ({(df['is_defender'].sum()/len(df)*100):.1f}%) [attacking defenders only]")
    
    # Calculate baseline (Midfielders) count
    midfielders_count = ((~df['is_forward'].astype(bool)) & (~df['is_defender'].astype(bool))).sum()
    midfielders_pct = (midfielders_count/len(df)*100)
    logger.info(f"    Midfielders (baseline): {midfielders_count} ({midfielders_pct:.1f}%)")
    
    logger.info("="*60 + "\n")
    
    return df


def calculate_player_ma5_factors(df):
    """
    Calculate rolling MA5 (Moving Average over 5 matches) for player-specific metrics.
    
    NOTE: This is now calculated AFTER position filtering, so only relevant offensive players 
    are used for their own rolling averages.
    """
    logger.info("Calculating Player MA5 Factors (P-Factors)...")
    
    # Ensure data is sorted by player and time
    df = df.sort_values(by=['player_id', 'match_datetime']).reset_index(drop=True)
    
    for metric in MA5_METRICS:
        if metric not in df.columns:
            logger.warning(f"⚠️ Metric '{metric}' not found in dataframe, skipping...")
            continue
        
        # Calculate rolling MA5 with closed='left' (exclude current match)
        df[f'{metric}_MA5'] = (
            df.groupby('player_id')[metric]
            .transform(lambda x: x.rolling(window=MIN_PERIODS, min_periods=1, closed='left').mean())
        )
        
        logger.info(f"  ✅ Calculated {metric}_MA5")
    
    logger.info(f"Player MA5 calculation complete. Shape: {df.shape}")
    
    return df


def validate_output(df):
    """Validate the output before saving."""
    logger.info("\nValidating output data...")
    
    required_columns = [
        'sot', 'min',  # Renamed columns
        'sot_MA5', 'min_MA5',  # Player factors
        'sot_conceded_MA5', 'tackles_att_3rd_MA5',  # Opponent factors (from backtest_processor)
        'position_group', 'is_forward', 'is_defender'  # Position features (UPDATED)
    ]
    
    missing = [col for col in required_columns if col not in df.columns]
    
    if missing:
        logger.error(f"❌ Missing required columns: {missing}")
        exit(1)
    
    # Check for excessive NaN values in critical columns
    for col in required_columns:
        nan_count = df[col].isna().sum()
        nan_pct = (nan_count / len(df)) * 100
        
        if nan_pct > 50:
            logger.warning(f"⚠️ {col} has {nan_pct:.1f}% NaN values (high!)")
        elif nan_pct > 0:
            logger.info(f"  ℹ️ {col} has {nan_pct:.1f}% NaN values (acceptable)")
    
    # Summary statistics
    logger.info("\n📊 Summary Statistics:")
    logger.info(f"  Total observations: {len(df)}")
    logger.info(f"  Unique players: {df['player_id'].nunique()}")
    logger.info(f"  Date range: {df['match_datetime'].min()} to {df['match_datetime'].max()}")
    logger.info(f"  Forwards: {df['is_forward'].sum()} ({(df['is_forward'].sum()/len(df)*100):.1f}%)")
    logger.info(f"  Att.Defenders: {df['is_defender'].sum()} ({(df['is_defender'].sum()/len(df)*100):.1f}%)")
    
    # Show average SOT by position
    logger.info("\n📊 Average SOT by Position:")
    avg_sot = df.groupby('position_group')['sot'].mean()
    for pos, val in avg_sot.items():
        logger.info(f"  {pos:<15} {val:.3f}")
    
    logger.info("\n✅ Validation complete")


def save_output(df):
    """Save the processed dataframe."""
    logger.info(f"\nSaving processed data to {OUTPUT_FILE}...")
    
    try:
        df.to_parquet(OUTPUT_FILE, index=False)
        logger.info(f"✅ Data saved successfully")
        logger.info(f"   Shape: {df.shape}")
        logger.info(f"   Columns: {len(df.columns)}")
    except Exception as e:
        logger.error(f"❌ Error saving file: {e}")
        exit(1)


def main():
    """Main execution pipeline."""
    logger.info("="*70)
    logger.info("  PLAYER FACTOR ENGINEER (P-FACTORS) - WITH POSITION FEATURES")
    logger.info("="*70)
    
    # Step 1: Load data
    df = load_data()
    
    # Step 2: Rename columns for consistency
    df = rename_columns_for_consistency(df)
    
    # Step 3: Process position data (NEW - CRITICAL STEP)
    df = process_position_data(df)
    
    # Step 4: Calculate player MA5 factors
    # NOTE: Now calculated AFTER filtering, so only offensive players included
    df = calculate_player_ma5_factors(df)
    
    # Step 5: Validate output
    validate_output(df)
    
    # Step 6: Save output
    save_output(df)
    
    logger.info("="*70)
    logger.info("  ✅ PLAYER FACTOR ENGINEERING COMPLETE")
    logger.info("="*70)
    logger.info("\nNext step: Run feature_scaling.py")


if __name__ == '__main__':
    main()
