# src/services/ai/player_factor_engineer.py
# v4.2 (WITH ROBUST NPxG FIX)

import pandas as pd
import numpy as np
import logging
import ast

# --- Configuration ---
INPUT_FILE = "final_feature_set.parquet"
OUTPUT_FILE = "final_feature_set_pfactors.parquet"
MIN_PERIODS = 5  # Minimum periods for rolling average

# Player-level metrics to calculate MA5 for
MA5_METRICS = ['sot', 'min', 'npxg']

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# --- Helper Function for Position Parsing ---
def safe_extract_position(pos_str):
    """
    Safely extracts the primary position code from potentially corrupted strings.
    """
    if pd.isna(pos_str) or pos_str is None:
        return None
    
    pos_str = str(pos_str).strip()
    
    # Check for and handle the observed corrupted format '["FW", "MF"]'
    if pos_str.startswith('["') and pos_str.endswith(']'):
        try:
            pos_list = ast.literal_eval(pos_str)
            if isinstance(pos_list, list) and pos_list:
                return pos_list[0].strip().upper()
        except (ValueError, SyntaxError, IndexError):
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
    """
    Rename summary columns to shorter names for easier processing.
    ✅ NEW: summary_npxg → npxg handled safely.
    """
    logger.info("Renaming columns for consistency...")
    
    # Always safe rename for sot/min
    rename_map = {
        'summary_sot': 'sot',
        'summary_min': 'min'
    }
    df = df.rename(columns=rename_map)

    # ✅ Safe handling of npxg
    if "summary_npxg" in df.columns:
        df = df.rename(columns={"summary_npxg": "npxg"})
        logger.info("  ✅ Renamed: summary_npxg → npxg")
    else:
        # Create blank column
        df["npxg"] = np.nan
        logger.warning("  ⚠️ 'summary_npxg' missing → created blank 'npxg'")
    
    logger.info("  ✅ Rename completed")
    return df


def process_position_data(df):
    """
    Extract and process position data with hybrid filtering.
    """
    logger.info("\n" + "="*60)
    logger.info("PROCESSING POSITION DATA (HYBRID FILTERING)")
    logger.info("="*60)
    
    if 'summary_positions' not in df.columns:
        logger.error("❌ 'summary_positions' column not found!")
        exit(1)
    
    # 1. Extract primary position
    df['position'] = df['summary_positions'].apply(safe_extract_position)
    logger.info(f"  ✅ Extracted primary position using robust parsing.")
    
    # 2. Map to position groups
    position_mapping = {
        'GK': 'Goalkeeper', 'DF': 'Defender', 'CB': 'Defender', 'LB': 'Defender', 'RB': 'Defender', 'WB': 'Defender',
        'MF': 'Midfielder', 'CM': 'Midfielder', 'DM': 'Midfielder', 'AM': 'Midfielder', 'LM': 'Midfielder', 'RM': 'Midfielder',
        'FW': 'Forward', 'LW': 'Forward', 'RW': 'Forward'
    }
    df['position_group'] = df['position'].map(position_mapping)
    df['position_group'] = df['position_group'].fillna('Midfielder') # Default 
    
    # 3. Calculate player's average SOT
    player_avg_sot = df.groupby('player_id')['sot'].mean().reset_index()
    player_avg_sot.columns = ['player_id', 'player_avg_sot']
    df = df.merge(player_avg_sot, on='player_id', how='left')
    
    # 4. Position distribution BEFORE filtering
    logger.info("\n  Position Distribution (Before Filtering):")
    position_counts = df['position_group'].value_counts()
    for pos, count in position_counts.items():
        pct = (count / len(df)) * 100
        logger.info(f"    {pos:<15} {count:>5} ({pct:>5.1f}%)")
    
    # 5. HYBRID FILTERING
    original_count = len(df)
    ATTACKING_DEFENDER_THRESHOLD = 0.3
    
    # Guard: capture columns BEFORE filtering
    original_cols = df.columns.tolist() 
    
    # Mask logic
    offensive_player_mask = (
        (df['position_group'].isin(['Forward', 'Midfielder'])) |
        ((df['position_group'] == 'Defender') & (df['player_avg_sot'] >= ATTACKING_DEFENDER_THRESHOLD))
    )
    
    # Filter but keep ALL original columns
    df = df.loc[offensive_player_mask, original_cols].copy()
    
    filtered_count = original_count - len(df)
    
    logger.info(f"\n  🗑️  Filtered out {filtered_count} non-offensive players")
    logger.info(f"  ✅ Remaining: {len(df)} offensive players")
    
    # 6. Position distribution AFTER filtering
    logger.info("\n  Position Distribution (After Filtering):")
    position_counts = df['position_group'].value_counts()
    for pos, count in position_counts.items():
        pct = (count / len(df)) * 100
        avg_sot = df[df['position_group']==pos]['player_avg_sot'].mean()
        logger.info(f"    {pos:<15} {count:>5} ({pct:>5.1f}%) - Avg SOT: {avg_sot:.3f}")
    
    # 7. Dummy variables
    df['is_forward'] = (df['position_group'] == 'Forward').astype(int)
    df['is_defender'] = (df['position_group'] == 'Defender').astype(int)
    
    logger.info("\n  ✅ Created position dummy variables:")
    logger.info(f"    is_forward: {df['is_forward'].sum()} ({(df['is_forward'].sum()/len(df)*100):.1f}%)")
    logger.info(f"    is_defender: {df['is_defender'].sum()} ({(df['is_defender'].sum()/len(df)*100):.1f}%)")
    
    midfielders_count = ((~df['is_forward'].astype(bool)) & (~df['is_defender'].astype(bool))).sum()
    midfielders_pct = (midfielders_count/len(df)*100)
    logger.info(f"    Midfielders (baseline): {midfielders_count} ({midfielders_pct:.1f}%)")
    
    logger.info("="*60 + "\n")
    
    return df


def calculate_player_ma5_factors(df):
    """
    Calculate rolling MA5 (Moving Average over 5 matches)
    """
    logger.info("Calculating Player MA5 Factors (P-Factors)...")
    
    df = df.sort_values(by=['player_id', 'match_datetime']).reset_index(drop=True)
    
    for metric in MA5_METRICS:
        if metric not in df.columns:
            logger.warning(f"⚠️ Metric '{metric}' not found in dataframe, skipping...")
            continue
        
        df[metric] = pd.to_numeric(df[metric], errors='coerce') 
        
        df[f'{metric}_MA5'] = (
            df.groupby('player_id')[metric]
            .transform(lambda x: x.rolling(window=MIN_PERIODS, min_periods=1, closed='left').mean())
        )
        
        logger.info(f"  ✅ Calculated {metric}_MA5")
    
    logger.info(f"Player MA5 calculation complete. Shape: {df.shape}")
    
    return df


def calculate_venue_factor(df):
    """Creates a binary feature for the venue (Home vs. Away)."""
    logger.info("Creating Venue Factor (is_home)...")
    
    if 'team_side' not in df.columns:
        logger.warning("⚠️ 'team_side' column missing. Cannot create venue factor.")
        return df

    df['is_home'] = (df['team_side'] == 'home').astype(int)
    
    home_count = df['is_home'].sum()
    away_count = len(df) - home_count
    
    logger.info("  ✅ Created 'is_home' binary factor.")
    logger.info(f"    Home count (1): {home_count}")
    logger.info(f"    Away count (0): {away_count}")
    
    logger.info(f"Venue factor calculation complete. Shape: {df.shape}")
    
    return df


def validate_output(df):
    """Validate the output before saving."""
    logger.info("\nValidating output data...")
    
    required_columns = [
        'sot', 'min', 'npxg',
        'sot_MA5', 'min_MA5', 'npxg_MA5',
        'position_group', 'is_forward', 'is_defender',
        'is_home'
    ]
    
    missing = [col for col in required_columns if col not in df.columns]
    
    if missing:
        logger.error(f"❌ Missing required columns: {missing}")
        exit(1)
    
    logger.info(f"\n📊 Summary Statistics:")
    logger.info(f"  Total observations: {len(df)}")
    logger.info(f"  Unique players: {df['player_id'].nunique()}")
    logger.info(f"  Forwards: {df['is_forward'].sum()}")
    logger.info(f"  Att.Defenders: {df['is_defender'].sum()}")
    
    if 'npxg_MA5' in df.columns:
        npxg_coverage = df['npxg_MA5'].notna().sum() / len(df) * 100
        logger.info(f"  ✅ npxg_MA5 coverage: {npxg_coverage:.1f}%")
        
    logger.info("✅ Validation complete")


def save_output(df):
    """Save the processed dataframe."""
    logger.info(f"\nSaving processed data to {OUTPUT_FILE}...")
    
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
    logger.info("  PLAYER FACTOR ENGINEER v4.2 - WITH NPxG SAFE MODE")
    logger.info("="*70)
    
    df = load_data()
    df = rename_columns_for_consistency(df)
    df = process_position_data(df)
    df = calculate_player_ma5_factors(df)
    df = calculate_venue_factor(df)
    validate_output(df)
    save_output(df)
    
    logger.info("="*70)
    logger.info("  ✅ PLAYER FACTOR ENGINEERING COMPLETE (v4.2)")
    logger.info("Next step: Run feature_scaling.py")


if __name__ == '__main__':
    main()
