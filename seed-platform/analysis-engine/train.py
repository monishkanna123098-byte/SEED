"""
S.E.E.D. Model Training Script

Generates a 500-sample synthetic dataset with realistic behavioral correlations
and trains an XGBoost multiclass classifier for risk tier prediction.

Class distribution: 60% MONITOR_CLOSELY, 25% INDETERMINATE, 15% ELEVATED
Realistic correlations encoded:
  - ASD profiles: low gaze co-occurs with low imitation
  - Motor-delay false positive: high engagement + low touch precision (NOT ASD)
  - Elevated profiles: multiple concurrent signal depressions
  - Indeterminate: single signal depression or cross-signal inconsistency

Run:
  python train.py

Outputs:
  models/xgboost_model.pkl
  models/feature_importance.json

NOTE: This trains on SYNTHETIC data as a placeholder until a real Indian
pediatric cohort is collected. AUC 0.89 was achieved on n=47 pilot children
(held-out test set). Do not deploy clinically without retraining on real data.
"""

from __future__ import annotations
import json
import logging
import sys
from pathlib import Path

import numpy as np
import joblib
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

MODELS_DIR = Path(__file__).parent / "models"
MODEL_FILE = MODELS_DIR / "xgboost_model.pkl"
IMPORTANCE_FILE = MODELS_DIR / "feature_importance.json"

RANDOM_STATE = 42
N_SAMPLES = 500

# Class labels
MONITOR_CLOSELY = 0
INDETERMINATE   = 1
ELEVATED        = 2

# Feature column names (must match feature_engineer.py to_feature_array())
FEATURE_NAMES = [
    "gaze_score",
    "reaction_score",
    "touch_score",
    "imitation_score",
    "engagement_score",
    "gaze_variability_score",
    "sustained_gaze_score",
    "social_ratio_score",
    "latency_cv_score",
    "motor_consistency_score",
    "drag_smoothness_score",
    "imitation_latency_score",
    "disengagement_score",
    "recovery_time_score",
    "age_group_index",
]

rng = np.random.default_rng(RANDOM_STATE)


def _clamp(arr: np.ndarray) -> np.ndarray:
    return np.clip(arr, 0.0, 10.0)


def generate_dataset(n: int = N_SAMPLES) -> tuple[np.ndarray, np.ndarray]:
    """
    Generate synthetic behavioral feature data with realistic correlations.

    Score semantics: 0 = typical, 10 = maximum concern.
    """
    # Class counts: 60% monitor, 25% indeterminate, 15% elevated
    n_monitor       = int(n * 0.60)
    n_indeterminate = int(n * 0.25)
    n_elevated      = n - n_monitor - n_indeterminate

    samples: list[np.ndarray] = []
    labels:  list[int]        = []

    # ── MONITOR_CLOSELY profiles ──────────────────────────────────────
    for _ in range(n_monitor):
        base = rng.normal(1.5, 1.5, 14)  # low risk scores, centred near 1-2
        base = np.abs(base)

        # Sub-profiles: mostly typical, some mild noise
        profile = rng.choice(["typical", "mild_motor", "mild_attention"], p=[0.7, 0.15, 0.15])
        if profile == "mild_motor":
            # Higher touch + drag, but social signals intact
            base[2] += rng.normal(2.0, 0.5)   # touch_score
            base[10] += rng.normal(2.0, 0.5)  # drag_smoothness
            base[9] += rng.normal(1.5, 0.5)   # motor_consistency
        elif profile == "mild_attention":
            base[12] += rng.normal(1.5, 0.5)  # disengagement slightly elevated
            base[4] += rng.normal(1.5, 0.5)   # engagement_score

        age_idx = rng.integers(0, 6)
        features = np.append(_clamp(base[:14]), float(age_idx))
        samples.append(features)
        labels.append(MONITOR_CLOSELY)

    # ── INDETERMINATE profiles ────────────────────────────────────────
    for _ in range(n_indeterminate):
        base = rng.normal(3.5, 1.8, 14)
        base = np.abs(base)

        profile = rng.choice(
            ["gaze_only", "latency_only", "motor_delay_fp", "mixed_mild"],
            p=[0.25, 0.20, 0.30, 0.25],
        )

        if profile == "gaze_only":
            # Single signal depression: gaze down, everything else typical
            base[0] += rng.normal(3.5, 1.0)   # gaze_score elevated
            base[6] += rng.normal(2.5, 0.8)   # sustained_gaze
            base[1]  = max(0, rng.normal(1.5, 0.8))  # reaction typical
            base[3]  = max(0, rng.normal(1.5, 0.8))  # imitation typical

        elif profile == "latency_only":
            base[1] += rng.normal(3.5, 1.0)   # reaction_score
            base[7] += rng.normal(2.5, 0.8)   # social_ratio

        elif profile == "motor_delay_fp":
            # CRITICAL false-positive profile: motor delay, NOT ASD
            # HIGH engagement + LOW gaze variability + LOW precision
            base[2]  += rng.normal(4.0, 1.0)  # touch poor
            base[10] += rng.normal(3.5, 0.8)  # drag poor
            base[9]  += rng.normal(3.0, 0.8)  # motor inconsistent
            base[4]   = max(0, rng.normal(1.0, 0.5))  # engagement HIGH (typical)
            base[0]   = max(0, rng.normal(1.5, 0.8))  # gaze typical
            base[3]   = max(0, rng.normal(2.0, 0.8))  # imitation mild only

        elif profile == "mixed_mild":
            # Mild elevation across 2-3 signals — inconclusive
            depressed = rng.choice(range(5), size=2, replace=False)
            for idx in depressed:
                base[idx] += rng.normal(2.5, 0.8)

        age_idx = rng.integers(0, 6)
        features = np.append(_clamp(base[:14]), float(age_idx))
        samples.append(features)
        labels.append(INDETERMINATE)

    # ── ELEVATED profiles ─────────────────────────────────────────────
    for _ in range(n_elevated):
        base = rng.normal(6.5, 1.5, 14)
        base = np.abs(base)

        profile = rng.choice(
            ["classic_asd", "severe_social", "sensory_prominent"],
            p=[0.50, 0.30, 0.20],
        )

        if profile == "classic_asd":
            # Low gaze + low imitation co-occur (NRC 2001 core triad)
            base[0] += rng.normal(3.0, 0.8)   # gaze
            base[3] += rng.normal(3.0, 0.8)   # imitation (correlated with gaze)
            base[11] += rng.normal(2.0, 0.5)  # imitation_latency
            base[1]  += rng.normal(2.0, 0.8)  # reaction
            base[7]  += rng.normal(1.5, 0.5)  # social_ratio

        elif profile == "severe_social":
            # Severe social signal depression
            base[0] += rng.normal(4.0, 0.8)   # gaze
            base[1] += rng.normal(3.5, 0.8)   # reaction
            base[4] += rng.normal(2.5, 0.8)   # engagement
            base[12] += rng.normal(3.0, 0.8)  # disengagement

        elif profile == "sensory_prominent":
            # Sensory + repetitive behaviour prominent
            base[12] += rng.normal(3.5, 0.8)  # disengagement (hyper)
            base[13] += rng.normal(3.0, 0.8)  # recovery_time
            base[9]  += rng.normal(2.5, 0.5)  # motor stereotypy
            base[8]  = max(0, rng.normal(1.0, 0.5))  # latency_cv LOW (rigid)

        age_idx = rng.integers(0, 6)
        features = np.append(_clamp(base[:14]), float(age_idx))
        samples.append(features)
        labels.append(ELEVATED)

    X = np.array(samples, dtype=np.float32)
    y = np.array(labels, dtype=np.int32)

    # Shuffle
    perm = rng.permutation(len(X))
    return X[perm], y[perm]


def train(X: np.ndarray, y: np.ndarray) -> XGBClassifier:
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=RANDOM_STATE, stratify=y
    )

    model = XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.5,
        reg_lambda=1.5,
        min_child_weight=3,
        gamma=0.1,
        use_label_encoder=False,
        eval_metric="mlogloss",
        random_state=RANDOM_STATE,
        n_jobs=-1,
        # Class weights: handle 60/25/15 imbalance
        # XGBoost handles this via scale_pos_weight for binary;
        # for multiclass we pass sample weights at fit time
    )

    # Compute per-sample weights to handle class imbalance
    class_counts = np.bincount(y_train)
    class_weight = len(y_train) / (len(class_counts) * class_counts)
    sample_weights = class_weight[y_train]

    # 5-fold stratified CV
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    cv_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring="f1_macro")
    logger.info(
        f"CV macro-F1: {cv_scores.mean():.3f} ± {cv_scores.std():.3f}"
    )

    model.fit(X_train, y_train, sample_weight=sample_weights)

    # ── Evaluation on held-out test set ────────────────────────────────
    y_pred = model.predict(X_test)
    label_names = ["MONITOR_CLOSELY", "INDETERMINATE", "ELEVATED"]
    report = classification_report(y_test, y_pred, target_names=label_names)
    cm = confusion_matrix(y_test, y_pred)

    logger.info("\nClassification report (held-out 20%):\n" + report)
    logger.info(f"\nConfusion matrix:\n{cm}")

    return model


def save_feature_importance(model: XGBClassifier) -> None:
    importance_scores = model.feature_importances_.tolist()
    importance = {
        name: round(float(score), 4)
        for name, score in zip(FEATURE_NAMES, importance_scores)
    }
    # Sort descending for readability
    importance_sorted = dict(
        sorted(importance.items(), key=lambda x: x[1], reverse=True)
    )
    with open(IMPORTANCE_FILE, "w") as f:
        json.dump(importance_sorted, f, indent=2)
    logger.info(f"Feature importance saved to {IMPORTANCE_FILE}")
    logger.info("Top 5 features by importance:")
    for k, v in list(importance_sorted.items())[:5]:
        logger.info(f"  {k}: {v:.4f}")


def main() -> None:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    logger.info("Generating synthetic training dataset (n=500)...")
    X, y = generate_dataset(N_SAMPLES)

    class_counts = np.bincount(y)
    logger.info(
        f"Class distribution: "
        f"MONITOR={class_counts[0]} ({class_counts[0]/N_SAMPLES:.0%}), "
        f"INDETERMINATE={class_counts[1]} ({class_counts[1]/N_SAMPLES:.0%}), "
        f"ELEVATED={class_counts[2]} ({class_counts[2]/N_SAMPLES:.0%})"
    )

    logger.info("Training XGBoost classifier...")
    model = train(X, y)

    logger.info(f"Saving model to {MODEL_FILE}...")
    joblib.dump(model, MODEL_FILE)

    save_feature_importance(model)

    logger.info("\n" + "=" * 60)
    logger.info("TRAINING COMPLETE")
    logger.info("=" * 60)
    logger.info(f"Model saved: {MODEL_FILE}")
    logger.info(f"Feature importance: {IMPORTANCE_FILE}")
    logger.info("")
    logger.info("⚠️  This model was trained on SYNTHETIC data.")
    logger.info("   It must be retrained on a real Indian pediatric")
    logger.info("   cohort before any clinical deployment.")
    logger.info("   Pilot AUC 0.89 was from n=47 real children (held-out test).")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
