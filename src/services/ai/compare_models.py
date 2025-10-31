"""
Model Comparison Script - v4.2 Compatible

Compares Poisson and ZIP models side-by-side.
Works with v4.2 models (7 features with npxg_MA5_scaled).
"""

import pandas as pd
import numpy as np
import pickle
import json
import logging
import os
import sys

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# Paths
ARTIFACT_PATH = "src/services/ai/artifacts/"
POISSON_MODEL = ARTIFACT_PATH + "poisson_model.pkl"
ZIP_MODEL = ARTIFACT_PATH + "zip_model.pkl"
TRAINING_STATS = ARTIFACT_PATH + "training_stats.json"
ZIP_STATS = ARTIFACT_PATH + "zip_training_stats.json"
OUTPUT_FILE = "model_comparison_report.txt"

def load_models():
    """Load both models if they exist."""
    logger.info("Loading models for comparison...")
    
    models = {}
    
    # Try to load Poisson
    if os.path.exists(POISSON_MODEL):
        with open(POISSON_MODEL, 'rb') as f:
            models['poisson'] = pickle.load(f)
        logger.info(f"✅ Poisson model loaded from {POISSON_MODEL}")
    else:
        logger.warning(f"⚠️ Poisson model not found at {POISSON_MODEL}")
    
    # Try to load ZIP
    if os.path.exists(ZIP_MODEL):
        with open(ZIP_MODEL, 'rb') as f:
            models['zip'] = pickle.load(f)
        logger.info(f"✅ ZIP model loaded from {ZIP_MODEL}")
    else:
        logger.warning(f"⚠️ ZIP model not found at {ZIP_MODEL}")
    
    if not models:
        logger.error("❌ No models found to compare!")
        sys.exit(1)
    
    return models

def load_stats():
    """Load training statistics."""
    logger.info("Loading training statistics...")
    
    stats = {}
    
    # Load scaling stats
    if os.path.exists(TRAINING_STATS):
        with open(TRAINING_STATS, 'r') as f:
            stats['scaling'] = json.load(f)
        logger.info(f"✅ Scaling stats loaded: {list(stats['scaling'].keys())}")
    
    # Load ZIP-specific stats
    if os.path.exists(ZIP_STATS):
        with open(ZIP_STATS, 'r') as f:
            stats['zip'] = json.load(f)
        logger.info(f"✅ ZIP stats loaded")
    
    return stats

def calculate_mcfadden_r2(model, ll_null=None):
    """Calculate McFadden's Pseudo R²."""
    if ll_null is None:
        # If no null model LL provided, can't calculate
        return None
    
    ll_model = model.llf
    pseudo_r2 = 1 - (ll_model / ll_null)
    return pseudo_r2

def compare_models(models, stats):
    """Generate detailed comparison report."""
    
    report_lines = []
    
    report_lines.append("=" * 80)
    report_lines.append("  MODEL COMPARISON REPORT v4.2")
    report_lines.append("=" * 80)
    
    # Model versions
    report_lines.append("\n📊 Model Versions:")
    
    if 'poisson' in models:
        report_lines.append("  Poisson Model: v4.2 (7 features)")
    
    if 'zip' in models and 'zip' in stats:
        version = stats['zip'].get('model_version', 'unknown')
        report_lines.append(f"  ZIP Model: {version}")
    
    # Feature set
    report_lines.append("\n📋 Feature Set (v4.2):")
    if 'scaling' in stats:
        report_lines.append("  Scaled features (MA5):")
        for i, feature in enumerate(stats['scaling'].keys(), 1):
            marker = " ✅ NEW" if 'npxg' in feature else ""
            report_lines.append(f"    {i}. {feature}{marker}")
    
    report_lines.append("\n  Raw features:")
    report_lines.append("    4. summary_min (minutes)")
    report_lines.append("    5. is_forward (position)")
    report_lines.append("    6. is_defender (position)")
    report_lines.append("    7. is_home (venue)")
    
    # Model statistics comparison
    report_lines.append("\n" + "=" * 80)
    report_lines.append("MODEL PERFORMANCE COMPARISON")
    report_lines.append("=" * 80)
    
    report_lines.append(f"\n{'Metric':<30} {'Poisson':<20} {'ZIP':<20}")
    report_lines.append("-" * 80)
    
    # Get metrics
    poisson_aic = models.get('poisson', {}).aic if 'poisson' in models else None
    zip_aic = models.get('zip', {}).aic if 'zip' in models else None
    
    poisson_bic = models.get('poisson', {}).bic if 'poisson' in models else None
    zip_bic = models.get('zip', {}).bic if 'zip' in models else None
    
    poisson_llf = models.get('poisson', {}).llf if 'poisson' in models else None
    zip_llf = models.get('zip', {}).llf if 'zip' in models else None
    
    # Display metrics
    report_lines.append(f"{'AIC (lower is better)':<30} {poisson_aic if poisson_aic else 'N/A':<20} {zip_aic if zip_aic else 'N/A':<20}")
    report_lines.append(f"{'BIC (lower is better)':<30} {poisson_bic if poisson_bic else 'N/A':<20} {zip_bic if zip_bic else 'N/A':<20}")
    report_lines.append(f"{'Log-Likelihood':<30} {poisson_llf if poisson_llf else 'N/A':<20} {zip_llf if zip_llf else 'N/A':<20}")
    
    # From ZIP stats
    if 'zip' in stats:
        zip_stats_dict = stats['zip']
        if 'pseudo_r2' in zip_stats_dict:
            report_lines.append(f"{'Pseudo R² (McFadden)':<30} {'N/A':<20} {zip_stats_dict['pseudo_r2']:.4f}")
        if 'rmse' in zip_stats_dict:
            report_lines.append(f"{'RMSE':<30} {'N/A':<20} {zip_stats_dict['rmse']:.4f}")
        if 'mae' in zip_stats_dict:
            report_lines.append(f"{'MAE':<30} {'N/A':<20} {zip_stats_dict['mae']:.4f}")
    
    report_lines.append("-" * 80)
    
    # Model recommendation
    report_lines.append("\n" + "=" * 80)
    report_lines.append("RECOMMENDATION")
    report_lines.append("=" * 80)
    
    if poisson_aic and zip_aic:
        aic_diff = poisson_aic - zip_aic
        
        report_lines.append(f"\nAIC Improvement: {aic_diff:.2f} points")
        
        if aic_diff > 10:
            report_lines.append("\n✅ **STRONG RECOMMENDATION: Deploy ZIP model**")
            report_lines.append(f"   ZIP model shows {aic_diff:.2f} point improvement in AIC")
            report_lines.append("   This is strong evidence of better fit to the data")
        elif aic_diff > 2:
            report_lines.append("\n⚠️ **MARGINAL IMPROVEMENT: Consider ZIP model**")
            report_lines.append(f"   ZIP model shows {aic_diff:.2f} point improvement in AIC")
            report_lines.append("   Improvement is weak but positive")
            report_lines.append("   Business decision: Complexity vs slight performance gain")
        else:
            report_lines.append("\n❌ **KEEP POISSON MODEL**")
            report_lines.append(f"   ZIP model shows minimal/negative improvement ({aic_diff:.2f} points)")
            report_lines.append("   Added complexity not justified by performance")
    else:
        report_lines.append("\n⚠️ Cannot compare - both models not available")
        if 'zip' in models:
            report_lines.append("   Only ZIP model available")
        elif 'poisson' in models:
            report_lines.append("   Only Poisson model available")
    
    # Model complexity
    report_lines.append("\n" + "=" * 80)
    report_lines.append("MODEL COMPLEXITY")
    report_lines.append("=" * 80)
    
    if 'poisson' in models:
        n_params_poisson = len(models['poisson'].params)
        report_lines.append(f"\nPoisson: {n_params_poisson} parameters")
        report_lines.append("  - 7 features + 1 intercept = 8 parameters")
    
    if 'zip' in models:
        n_params_zip = len(models['zip'].params)
        report_lines.append(f"\nZIP: {n_params_zip} parameters")
        report_lines.append("  - Count model: 7 features + 1 intercept = 8 parameters")
        report_lines.append("  - Inflation model: 5 features + 1 intercept = 6 parameters")
        report_lines.append("  - Total: 14 parameters")
        report_lines.append("\n  Trade-off: More parameters = Better fit but more complexity")
    
    # Training info
    report_lines.append("\n" + "=" * 80)
    report_lines.append("TRAINING INFORMATION")
    report_lines.append("=" * 80)
    
    if 'zip' in stats:
        zip_info = stats['zip']
        if 'training_samples' in zip_info:
            report_lines.append(f"\nTraining samples: {zip_info['training_samples']}")
        if 'count_features' in zip_info:
            report_lines.append(f"\nCount features: {zip_info['count_features']}")
        if 'inflation_features' in zip_info:
            report_lines.append(f"\nInflation features: {zip_info['inflation_features']}")
    
    # v4.2 notes
    report_lines.append("\n" + "=" * 80)
    report_lines.append("v4.2 NOTES")
    report_lines.append("=" * 80)
    
    report_lines.append("\n✅ Model updates in v4.2:")
    report_lines.append("  • Added npxg_MA5_scaled (non-penalty xG) as 7th feature")
    report_lines.append("  • Expected improvement: +1-2% Pseudo R²")
    report_lines.append("  • Betting impact: Better identification of high-xG players")
    
    report_lines.append("\n📊 Training stats now include:")
    if 'scaling' in stats:
        for feature in stats['scaling'].keys():
            report_lines.append(f"  • {feature}")
    
    report_lines.append("\n" + "=" * 80)
    
    return "\n".join(report_lines)

def main():
    logger.info("=" * 80)
    logger.info("  MODEL COMPARISON v4.2")
    logger.info("=" * 80)
    
    # Load models
    models = load_models()
    
    # Load stats
    stats = load_stats()
    
    # Generate comparison
    report = compare_models(models, stats)
    
    # Print to console
    print("\n" + report)
    
    # Save to file
    with open(OUTPUT_FILE, 'w') as f:
        f.write(report)
    
    logger.info(f"\n✅ Comparison report saved to {OUTPUT_FILE}")
    logger.info("=" * 80)

if __name__ == '__main__':
    main()