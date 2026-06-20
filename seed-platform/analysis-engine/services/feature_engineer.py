"""
S.E.E.D. Feature Engineer

Converts raw behavioral signals to normalized, age-adjusted feature scores
for the XGBoost fusion model.

Pipeline per signal value:
  1. Load normative baseline for child's age group
  2. Compute z-score: (value - norm_mean) / norm_std
  3. Clip z-scores to [-3, 3]
  4. Map z-score to 0-10 risk score:
       z ≤ 0          → score = 0   (at or above norm, no concern)
       0 < z ≤ 1      → score = 2   (mild deviation)
       1 < z ≤ 2      → score = 5   (moderate deviation)
       z > 2          → score = 8–10 (significant deviation)
  5. Compute binary risk flags per spec thresholds

IMPORTANT: z-score direction conventions
  For metrics where HIGHER value = MORE concerning (latency, variability,
  disengagement, motor_consistency as spread), the z-score is already positive
  when the child is worse than norm — use directly.

  For metrics where LOWER value = MORE concerning (accuracy, attention ratio,
  imitation), norm subtraction gives a NEGATIVE z when the child is below norm —
  these are NEGATED before the risk score mapping so that "below norm" still maps
  to a positive risk score.
"""

from __future__ import annotations
import json
import logging
import numpy as np
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, Any, Tuple, List

from services.landmark_extractor import ExtractedSignals

logger = logging.getLogger(__name__)

NORMATIVE_DATA_PATH = Path(__file__).parent.parent / "models" / "normative_data.json"

# Age group labels matching normative_data.json keys
AGE_GROUP_BOUNDS = [
    (24, 30, "24-30m"),
    (30, 36, "30-36m"),
    (36, 42, "36-42m"),
    (42, 48, "42-48m"),
    (48, 54, "48-54m"),
    (54, 61, "54-60m"),
]

# Binary risk flag thresholds (from spec)
GAZE_FLAG_THRESHOLD        = 0.40   # joint_attention_ratio < 0.40
LATENCY_FLAG_SIGMA         = 2.0    # social_latency_mean > 2σ above norm
PRECISION_FLAG_THRESHOLD   = 0.55   # accuracy_score < 0.55
IMITATION_FLAG_THRESHOLD   = 0.60   # imitation_accuracy < 0.60
ENGAGEMENT_FLAG_THRESHOLD  = 3.0    # disengagement_events > 3

# Confidence threshold below which we do not issue a risk tier
MIN_CONFIDENCE_FOR_TIER    = 0.60


def _load_normative_data() -> Dict[str, Any]:
    with open(NORMATIVE_DATA_PATH, "r") as f:
        return json.load(f)


_normative_cache: Dict[str, Any] | None = None


def get_normative_data() -> Dict[str, Any]:
    global _normative_cache
    if _normative_cache is None:
        _normative_cache = _load_normative_data()
    return _normative_cache


def get_age_group(age_months: int) -> str:
    """Map exact age in months to normative age group string."""
    for lo, hi, label in AGE_GROUP_BOUNDS:
        if lo <= age_months < hi:
            return label
    if age_months < 24:
        return "24-30m"
    return "54-60m"


def _z_score(value: float, mean: float, std: float) -> float:
    """Compute z-score, clipped to [-3, 3]. Handles zero std."""
    if std <= 0:
        return 0.0
    z = (value - mean) / std
    return float(np.clip(z, -3.0, 3.0))


def _risk_score(z: float) -> float:
    """
    Map z-score to 0-10 risk score.
    z ≤ 0   → 0   (within or above norm)
    0 < z ≤ 1 → 2  (mild)
    1 < z ≤ 2 → 5  (moderate)
    z > 2   → 8-10 (significant, linear within 2-3 band)
    """
    if z <= 0.0:
        return 0.0
    elif z <= 1.0:
        return 2.0 * z          # 0→0, 1→2
    elif z <= 2.0:
        return 2.0 + 3.0 * (z - 1.0)   # 1→2, 2→5
    else:
        return 5.0 + 5.0 * (z - 2.0)   # 2→5, 3→10


@dataclass
class MetricScore:
    raw_value: float
    norm_mean: float
    norm_std: float
    z_score: float              # clipped [-3,3], direction corrected (positive = more concern)
    risk_score: float           # 0-10
    risk_flagged: bool
    age_group: str
    source: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class FeatureVector:
    """
    All 15 features fed to XGBoost, plus per-metric scores and flags.
    Feature array order is fixed — must match train.py exactly.
    """
    age_group: str
    age_months: int

    # Per-metric scores (0-10)
    gaze_score: float
    reaction_score: float
    touch_score: float
    imitation_score: float
    engagement_score: float

    # Additional sub-scores used in DSM-5 criterion mapping
    gaze_variability_score: float
    sustained_gaze_score: float
    social_ratio_score: float
    latency_cv_score: float
    motor_consistency_score: float
    drag_smoothness_score: float
    imitation_latency_score: float
    disengagement_score: float
    recovery_time_score: float

    # Binary flags
    gaze_flag: bool
    latency_flag: bool
    precision_flag: bool
    imitation_flag: bool
    engagement_flag: bool

    # Per-metric detail for explainability
    metric_details: Dict[str, MetricScore]

    # Confidence metadata
    confidence: float
    is_low_confidence: bool

    def to_feature_array(self) -> np.ndarray:
        """
        Returns the 15-dim float32 array fed to XGBoost.
        ORDER MUST MATCH train.py feature list exactly.
        """
        return np.array([
            self.gaze_score,
            self.reaction_score,
            self.touch_score,
            self.imitation_score,
            self.engagement_score,
            self.gaze_variability_score,
            self.sustained_gaze_score,
            self.social_ratio_score,
            self.latency_cv_score,
            self.motor_consistency_score,
            self.drag_smoothness_score,
            self.imitation_latency_score,
            self.disengagement_score,
            self.recovery_time_score,
            float(age_group_to_index(self.age_group)),
        ], dtype=np.float32)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["feature_array"] = self.to_feature_array().tolist()
        return d


def age_group_to_index(age_group: str) -> int:
    """Convert age group string to integer index 0-5."""
    mapping = {
        "24-30m": 0, "30-36m": 1, "36-42m": 2,
        "42-48m": 3, "48-54m": 4, "54-60m": 5,
    }
    return mapping.get(age_group, 2)


class FeatureEngineer:
    """
    Transforms ExtractedSignals → FeatureVector with age-adjusted normalization.
    """

    def __init__(self) -> None:
        self._norms = get_normative_data()

    def engineer(self, signals: ExtractedSignals, age_months: int) -> FeatureVector:
        age_group = get_age_group(age_months)
        norms = self._norms[age_group]
        details: Dict[str, MetricScore] = {}

        # ── GAZE ──────────────────────────────────────────────────────
        # joint_attention_ratio: lower = more concerning → negate z for risk scoring
        ja_mean = norms["joint_attention_ratio"]["mean"]
        ja_std  = norms["joint_attention_ratio"]["std"]
        ja_z    = -_z_score(signals.gaze.joint_attention_ratio, ja_mean, ja_std)
        gaze_flag = signals.gaze.joint_attention_ratio < GAZE_FLAG_THRESHOLD
        gaze_score = _risk_score(ja_z)
        details["joint_attention"] = MetricScore(
            raw_value=signals.gaze.joint_attention_ratio,
            norm_mean=ja_mean, norm_std=ja_std, z_score=ja_z,
            risk_score=gaze_score, risk_flagged=gaze_flag,
            age_group=age_group, source=norms["joint_attention_ratio"]["source"],
        )

        # gaze_variability: higher = more scanning/concerning → direct z
        gv_mean = norms["gaze_variability"]["mean"]
        gv_std  = norms["gaze_variability"]["std"]
        gv_z    = _z_score(signals.gaze.gaze_variability, gv_mean, gv_std)
        gaze_variability_score = _risk_score(gv_z)
        details["gaze_variability"] = MetricScore(
            raw_value=signals.gaze.gaze_variability,
            norm_mean=gv_mean, norm_std=gv_std, z_score=gv_z,
            risk_score=gaze_variability_score, risk_flagged=False,
            age_group=age_group, source=norms["gaze_variability"]["source"],
        )

        # sustained gaze: lower = more concerning → negate z
        sg_mean = norms["sustained_gaze_events_per_min"]["mean"]
        sg_std  = norms["sustained_gaze_events_per_min"]["std"]
        sg_z    = -_z_score(signals.gaze.sustained_gaze_events, sg_mean, sg_std)
        sustained_gaze_score = _risk_score(sg_z)
        details["sustained_gaze"] = MetricScore(
            raw_value=signals.gaze.sustained_gaze_events,
            norm_mean=sg_mean, norm_std=sg_std, z_score=sg_z,
            risk_score=sustained_gaze_score, risk_flagged=False,
            age_group=age_group, source=norms["sustained_gaze_events_per_min"]["source"],
        )

        # ── REACTION LATENCY ──────────────────────────────────────────
        # social_latency_mean: higher = more concerning → direct z
        sl_mean = norms["social_latency_mean_ms"]["mean"]
        sl_std  = norms["social_latency_mean_ms"]["std"]
        sl_z    = _z_score(signals.reaction.social_latency_mean, sl_mean, sl_std)
        latency_flag = sl_z >= LATENCY_FLAG_SIGMA
        reaction_score = _risk_score(sl_z)
        details["social_latency"] = MetricScore(
            raw_value=signals.reaction.social_latency_mean,
            norm_mean=sl_mean, norm_std=sl_std, z_score=sl_z,
            risk_score=reaction_score, risk_flagged=latency_flag,
            age_group=age_group, source=norms["social_latency_mean_ms"]["source"],
        )

        # social_vs_nonsocial_ratio: higher = more concerning → direct z
        sr_mean = norms["social_vs_nonsocial_ratio"]["mean"]
        sr_std  = norms["social_vs_nonsocial_ratio"]["std"]
        sr_z    = _z_score(signals.reaction.social_vs_nonsocial_ratio, sr_mean, sr_std)
        social_ratio_score = _risk_score(sr_z)
        details["social_ratio"] = MetricScore(
            raw_value=signals.reaction.social_vs_nonsocial_ratio,
            norm_mean=sr_mean, norm_std=sr_std, z_score=sr_z,
            risk_score=social_ratio_score, risk_flagged=False,
            age_group=age_group, source=norms["social_vs_nonsocial_ratio"]["source"],
        )

        # latency_cv: higher = more inconsistent → direct z
        cv_mean = norms["latency_cv"]["mean"]
        cv_std  = norms["latency_cv"]["std"]
        cv_z    = _z_score(signals.reaction.latency_cv, cv_mean, cv_std)
        latency_cv_score = _risk_score(cv_z)
        details["latency_cv"] = MetricScore(
            raw_value=signals.reaction.latency_cv,
            norm_mean=cv_mean, norm_std=cv_std, z_score=cv_z,
            risk_score=latency_cv_score, risk_flagged=False,
            age_group=age_group, source=norms["latency_cv"]["source"],
        )

        # ── TOUCH PRECISION ───────────────────────────────────────────
        # accuracy_score: lower = more concerning → negate z
        ac_mean = norms["accuracy_score"]["mean"]
        ac_std  = norms["accuracy_score"]["std"]
        ac_z    = -_z_score(signals.touch.accuracy_score, ac_mean, ac_std)
        precision_flag = signals.touch.accuracy_score < PRECISION_FLAG_THRESHOLD
        touch_score = _risk_score(ac_z)
        details["accuracy"] = MetricScore(
            raw_value=signals.touch.accuracy_score,
            norm_mean=ac_mean, norm_std=ac_std, z_score=ac_z,
            risk_score=touch_score, risk_flagged=precision_flag,
            age_group=age_group, source=norms["accuracy_score"]["source"],
        )

        # drag_smoothness: higher px deviation = more concerning → direct z
        ds_mean = norms["drag_smoothness"]["mean"]
        ds_std  = norms["drag_smoothness"]["std"]
        ds_z    = _z_score(signals.touch.drag_smoothness, ds_mean, ds_std)
        drag_smoothness_score = _risk_score(ds_z)
        details["drag_smoothness"] = MetricScore(
            raw_value=signals.touch.drag_smoothness,
            norm_mean=ds_mean, norm_std=ds_std, z_score=ds_z,
            risk_score=drag_smoothness_score, risk_flagged=False,
            age_group=age_group, source=norms["drag_smoothness"]["source"],
        )

        # motor_consistency (spread): higher std = more inconsistent → direct z
        mc_mean = norms["motor_consistency"]["mean"]
        mc_std  = norms["motor_consistency"]["std"]
        mc_z    = _z_score(signals.touch.motor_consistency, mc_mean, mc_std)
        motor_consistency_score = _risk_score(mc_z)
        details["motor_consistency"] = MetricScore(
            raw_value=signals.touch.motor_consistency,
            norm_mean=mc_mean, norm_std=mc_std, z_score=mc_z,
            risk_score=motor_consistency_score, risk_flagged=False,
            age_group=age_group, source=norms["motor_consistency"]["source"],
        )

        # ── IMITATION ─────────────────────────────────────────────────
        # imitation_accuracy: lower = more concerning → negate z
        ia_mean = norms["imitation_accuracy"]["mean"]
        ia_std  = norms["imitation_accuracy"]["std"]
        ia_z    = -_z_score(signals.imitation.imitation_accuracy, ia_mean, ia_std)
        imitation_flag = signals.imitation.imitation_accuracy < IMITATION_FLAG_THRESHOLD
        imitation_score = _risk_score(ia_z)
        details["imitation_accuracy"] = MetricScore(
            raw_value=signals.imitation.imitation_accuracy,
            norm_mean=ia_mean, norm_std=ia_std, z_score=ia_z,
            risk_score=imitation_score, risk_flagged=imitation_flag,
            age_group=age_group, source=norms["imitation_accuracy"]["source"],
        )

        # imitation_latency: higher = more concerning → direct z
        il_mean = norms["imitation_latency_ms"]["mean"]
        il_std  = norms["imitation_latency_ms"]["std"]
        il_z    = _z_score(signals.imitation.imitation_latency, il_mean, il_std)
        imitation_latency_score = _risk_score(il_z)
        details["imitation_latency"] = MetricScore(
            raw_value=signals.imitation.imitation_latency,
            norm_mean=il_mean, norm_std=il_std, z_score=il_z,
            risk_score=imitation_latency_score, risk_flagged=False,
            age_group=age_group,
            source=norms["imitation_latency_ms"]["source"],
        )

        # ── ENGAGEMENT ────────────────────────────────────────────────
        # session_completion_rate: lower = more concerning → negate z
        sc_mean = norms["session_completion_rate"]["mean"]
        sc_std  = norms["session_completion_rate"]["std"]
        sc_z    = -_z_score(signals.engagement.session_completion_rate, sc_mean, sc_std)
        engagement_flag = signals.engagement.disengagement_events > ENGAGEMENT_FLAG_THRESHOLD
        engagement_score = _risk_score(sc_z)
        details["completion_rate"] = MetricScore(
            raw_value=signals.engagement.session_completion_rate,
            norm_mean=sc_mean, norm_std=sc_std, z_score=sc_z,
            risk_score=engagement_score, risk_flagged=engagement_flag,
            age_group=age_group, source=norms["session_completion_rate"]["source"],
        )

        # disengagement_events: higher = more concerning → direct z
        de_mean = norms["disengagement_events"]["mean"]
        de_std  = norms["disengagement_events"]["std"]
        de_z    = _z_score(signals.engagement.disengagement_events, de_mean, de_std)
        disengagement_score = _risk_score(de_z)
        details["disengagement"] = MetricScore(
            raw_value=signals.engagement.disengagement_events,
            norm_mean=de_mean, norm_std=de_std, z_score=de_z,
            risk_score=disengagement_score, risk_flagged=False,
            age_group=age_group, source=norms["disengagement_events"]["source"],
        )

        # attention_recovery_time: higher = more concerning → direct z
        ar_mean = norms["attention_recovery_ms"]["mean"]
        ar_std  = norms["attention_recovery_ms"]["std"]
        ar_z    = _z_score(signals.engagement.attention_recovery_time, ar_mean, ar_std)
        recovery_time_score = _risk_score(ar_z)
        details["attention_recovery"] = MetricScore(
            raw_value=signals.engagement.attention_recovery_time,
            norm_mean=ar_mean, norm_std=ar_std, z_score=ar_z,
            risk_score=recovery_time_score, risk_flagged=False,
            age_group=age_group, source=norms["attention_recovery_ms"]["source"],
        )

        # ── Confidence calculation ─────────────────────────────────────
        # confidence = quality_score × (1 - latency_cv) × completion_rate
        confidence = float(
            signals.video_quality_score
            * (1.0 - min(signals.reaction.latency_cv, 1.0))
            * signals.engagement.session_completion_rate
        )
        # Floor confidence at 0.15 so we don't emit complete zeroes
        confidence = float(np.clip(confidence, 0.15, 1.0))
        is_low_confidence = confidence < MIN_CONFIDENCE_FOR_TIER

        return FeatureVector(
            age_group=age_group,
            age_months=age_months,
            gaze_score=gaze_score,
            reaction_score=reaction_score,
            touch_score=touch_score,
            imitation_score=imitation_score,
            engagement_score=engagement_score,
            gaze_variability_score=gaze_variability_score,
            sustained_gaze_score=sustained_gaze_score,
            social_ratio_score=social_ratio_score,
            latency_cv_score=latency_cv_score,
            motor_consistency_score=motor_consistency_score,
            drag_smoothness_score=drag_smoothness_score,
            imitation_latency_score=imitation_latency_score,
            disengagement_score=disengagement_score,
            recovery_time_score=recovery_time_score,
            gaze_flag=gaze_flag,
            latency_flag=latency_flag,
            precision_flag=precision_flag,
            imitation_flag=imitation_flag,
            engagement_flag=engagement_flag,
            metric_details=details,
            confidence=confidence,
            is_low_confidence=is_low_confidence,
        )
