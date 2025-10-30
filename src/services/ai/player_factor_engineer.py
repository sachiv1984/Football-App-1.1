"""
PLAYER FACTOR ENGINEER
v4.2 — Fix A (NPxG rename)

• Renames summary_non_pen_xg → npxg (Fix A)
• Safe-mode creates blank npxg only if still missing
• Hybrid position filtering retained
• MA5 factors generated for sot, min, npxg
"""

import pandas as pd
import numpy as np
import logging
import os
import sys

# ✅ Ensure src on path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from src.services.ai.backtest.data_loader_v4 import load_data_for_backtest

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)


# ============================================================
# ✅ Fix A — Correct rename map
# ============================================================
def rename_columns_for_consistency(df: pd.DataFrame) -> pd.DataFrame:
    """
    Renames columns to standardized naming expected by pipeline.
    Safe-mode fallback preserves npxg continuity.
    """

    rename_map = {
        "summary_sot": "sot",
        "summary_min": "min",
        "summary_non_pen_xg": "npxg",   # ✅ Fix A (correct NPxG)
    }

    before_cols = set(df.columns)
    df = df.rename(columns=rename_map)

    renamed_keys = [c for c in rename_map.keys() if c in before_cols]
    renamed_vals = [rename_map[c] for c in renamed_keys]

    if renamed_keys:
        logger.info(f"✅ Renamed: {renamed_keys} → {renamed_vals}")
    else:
        logger.warning("⚠️ No columns found to rename")

    # ✅ Safe-mode: ensure npxg exists
    if "npxg" not in df.columns:
        df["npxg"] = np.nan
        logger.warning("⚠️ NPxG missing → created blank 'npxg' (Safe Mode)")
    else:
        logger.info("✅ npxg column loaded successfully")

    return df


# ============================================================
# ✅ Position classification + filtering
# ============================================================
def extract_primary_position(position_str):
    if pd.isna(position_str):
        return "Unknown"
    return str(position_str).split(",")[0].strip()


def process_position_data(df: pd.DataFrame) -> pd.DataFrame:
    logger.info("=" * 60)
    logger.info("PROCESSING POSITION DATA (HYBRID FILTERING)")
    logger.info("=" * 60)

    df["primary_position"] = df["summary_positions"].apply(extract_primary_position)

    # Group buckets
    df["position_group"] = df["primary_position"].map(
        lambda x: "Defender" if x in ("D", "DF") else
                  "Forward" if x in ("F", "FW") else
                  "Midfielder" if x in ("M", "MF") else
                  "Unknown"
    )

    # Before filtering — stats
    counts = df["position_group"].value_counts()
    logger.info("\n  Position Distribution (Before Filtering):")
    for k,v in counts.items():
        logger.info(f"    {k:15s} {v:4d} ({v/len(df):5.1%})")

    # Hybrid logic:
    # midfielders only kept if avg SOT >= 0.2
    avg_sot = df.groupby("player_id")["sot"].mean().rename("player_avg_sot")
    df = df.merge(avg_sot, on="player_id", how="left")

    mask = (
        (df["position_group"] != "Defender") |
        (df["player_avg_sot"] >= 0.20)
    )

    removed = (~mask).sum()
    df = df.loc[mask].copy()
    logger.info(f"\n  🗑️  Filtered out {removed} non-offensive players")
    logger.info(f"  ✅ Remaining: {df.shape[0]} offensive players\n")

    dist = df["position_group"].value_counts()
    logger.info("  Position Distribution (After Filtering):")
    for p,c in dist.items():
        mean_s = df.loc[df["position_group"] == p, "player_avg_sot"].mean()
        logger.info(f"    {p:15s} {c:4d} ({c/len(df):5.1%}) - Avg SOT: {mean_s:.3f}")

    # One-hot
    df["is_forward"] = (df["position_group"] == "Forward").astype(int)
    df["is_defender"] = (df["position_group"] == "Defender").astype(int)

    logger.info("\n  ✅ Created position dummy variables:")
    logger.info(f"    is_forward:  {df['is_forward'].sum()} ({df['is_forward'].mean():.1%})")
    logger.info(f"    is_defender: {df['is_defender'].sum()} ({df['is_defender'].mean():.1%})")
    logger.info("    Midfielders (baseline): "
                f"{(df['position_group']=='Midfielder').sum()} "
                f"({(df['position_group']=='Midfielder').mean():.1%})")

    return df


# ============================================================
# ✅ Moving averages
# ============================================================
def calculate_player_ma5_factors(df: pd.DataFrame) -> pd.DataFrame:
    logger.info("Calculating Player MA5 Factors (P-Factors)...")

    df = df.sort_values(["player_id", "match_datetime"])

    metrics = ["sot", "min", "npxg"]   # ✅ includes npxg

    for m in metrics:
        if m not in df.columns:
            logger.warning(f"⚠️ Metric {m} not found — skipping MA5")
            continue

        ma_col = f"{m}_MA5"
        df[ma_col] = (
            df.groupby("player_id")[m]
              .rolling(5, min_periods=1)
              .mean()
              .reset_index(level=0, drop=True)
        )

        logger.info(f"  ✅ Calculated {ma_col}")

    logger.info(f"Player MA5 calculation complete. Shape: {df.shape}")
    return df


# ============================================================
# ✅ Home venue
# ============================================================
def create_venue_factor(df: pd.DataFrame) -> pd.DataFrame:
    logger.info("Creating Venue Factor (is_home)...")

    df["is_home"] = (df["team_side"].str.lower() == "home").astype(int)

    logger.info("  ✅ Created 'is_home'")
    logger.info(f"    Home: {df['is_home'].sum()}")
    logger.info(f"    Away: {(df['is_home']==0).sum()}")
    logger.info(f"Venue factor complete. Shape: {df.shape}")

    return df


# ============================================================
# ✅ Validation
# ============================================================
def validate_output(df: pd.DataFrame):
    logger.info("\nValidating output data...\n")

    logger.info(f"📊 Summary Statistics:")
    logger.info(f"  Total observations: {len(df)}")
    logger.info(f"  Unique players:     {df['player_id'].nunique()}")
    logger.info(f"  Forwards:           {df['is_forward'].sum()}")
    logger.info(f"  Att.Defenders:      {df['is_defender'].sum()}")

    # Coverage check
    coverage = df["npxg_M5"].notna().mean() if "npxg_MA5" in df else 0
    if "npxg_MA5" in df:
        coverage = df["npxg_MA5"].notna().mean()
    logger.info(f"  ✅ npxg_MA5 coverage: {coverage:.1%}")

    logger.info("✅ Validation complete")


# ============================================================
# ✅ Main
# ============================================================
def main():
    logger.info("=" * 70)
    logger.info("  PLAYER FACTOR ENGINEER v4.2 — Fix A (NPxG rename)")
    logger.info("=" * 70)

    df_player, _ = load_data_for_backtest()

    if df_player.empty:
        logger.error("No player data — exiting.")
        return

    df = rename_columns_for_consistency(df_player)
    df = process_position_data(df)
    df = calculate_player_ma5_factors(df)
    df = create_venue_factor(df)
    validate_output(df)

    out_path = "final_feature_set_pfactors.parquet"
    df.to_parquet(out_path, index=False)

    logger.info("✅ Data saved → final_feature_set_pfactors.parquet")
    logger.info("=" * 70)
    logger.info("  ✅ PLAYER FACTOR ENGINEERING COMPLETE")
    logger.info("=" * 70)


if __name__ == "__main__":
    main()
