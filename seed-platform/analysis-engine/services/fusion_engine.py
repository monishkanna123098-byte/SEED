"""
S.E.E.D. Fusion Engine

Combines M-CHAT-R/F, video CV, and game CV outputs using learned XGBoost weights.
Produces the final risk tier and per-metric breakdown returned to the frontend.

Modality weights:
  Full (all three):   M-CHAT 20% + Video 45% + Game 35%
  Video only:         M-CHAT 20% + Video 80%
  Game only:          M-CHAT 20% + Game 80%
  M-CHAT only:        Not scored — insufficient behavioral data

Final tier always defers to Scorer (which applies divergence override).
XGBoost is used to predict the probability of ELEVATED tier, which modulates
the composite_normalized before final tier assignment.
"""

from __future__ import annotations
import logging
import numpy as np
import joblib
from pathlib import Path
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict

from services.feature_engineer import FeatureVector
from services.scorer import ScorerResult

logger = logging.getLogger(__name__)

MODEL_PATH = Path(__file__).parent.parent / "models" / "xgboost_model.pkl"

# FEATURE_NAMES must match train.py exactly — used for feature importance
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


@dataclass
class FusionResult:
    session_id: str
    child_age_months: int

    # Final output
    final_risk_tier: str              # MONITOR_CLOSELY | INDETERMINATE | ELEVATED | INSUFFICIENT_DATA
    composite_score: float            # 0-70
    composite_normalized: float       # 0-1
    criterion_a: float                # 0-30
    criterion_b: float                # 0-40
    confidence: float                 # 0-1
    xgb_elevated_probability: float   # model's P(ELEVATED) before threshold

    # Breakdown
    divergence_flag: bool
    divergence_detail: Optional[str]
    active_flags: List[str]
    recommended_action: str
    per_metric_breakdown: Dict[str, Any]

    # Modality availability
    has_video: bool
    has_game: bool
    has_mchat: bool
    model_version: str

    # Differential pattern — motor delay vs ASD vs mixed
    differential_pattern: str   # MOTOR_DELAY_PATTERN | ASD_PROFILE | MIXED_PATTERN | TYPICAL_PATTERN
    motor_delay_flag: bool       # True when motor domain dominant, social communication intact
    differential_note: str       # Plain-language clinical interpretation for clinician UI

    disclaimer: str = (
        "Screening tool only. Not a diagnostic instrument. "
        "Clinical confirmation required."
    )

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class FusionEngine:
    """
    Loads XGBoost model and fuses scorer results across modalities.
    Falls back to scorer-only result if model is not yet trained.
    """

    def __init__(self) -> None:
        self._model = None
        self._model_version = "heuristic-fallback"
        self._load_model()

    def _load_model(self) -> None:
        if MODEL_PATH.exists():
            try:
                self._model = joblib.load(MODEL_PATH)
                self._model_version = "xgboost-v1"
                logger.info(f"XGBoost fusion model loaded from {MODEL_PATH}")
            except Exception as e:
                logger.error(f"Failed to load XGBoost model: {e}. Using scorer-only mode.")
        else:
            logger.warning(
                "XGBoost model not found. Run train.py to generate it. "
                "Fusion engine will use scorer-only mode until then."
            )

    @property
    def model_loaded(self) -> bool:
        return self._model is not None

    def fuse(
        self,
        session_id: str,
        scorer_result_video: Optional[ScorerResult],
        scorer_result_game: Optional[ScorerResult],
        features_video: Optional[FeatureVector],
        features_game: Optional[FeatureVector],
        mchat_score: Optional[float],
        child_age_months: int,
    ) -> FusionResult:
        """
        Fuse all available modality results into a final risk assessment.

        At least one of scorer_result_video or scorer_result_game must be provided.
        """
        has_video = scorer_result_video is not None
        has_game = scorer_result_game is not None
        has_mchat = mchat_score is not None

        if not has_video and not has_game:
            raise ValueError("At least one modality (video or game) must be provided")

        # ── Weighted composite fusion ──────────────────────────────────
        composite_normalized = self._weighted_composite(
            scorer_result_video, scorer_result_game, mchat_score,
            has_video, has_game, has_mchat,
        )

        # ── XGBoost modulation ─────────────────────────────────────────
        xgb_prob = 0.0
        if self._model is not None:
            primary_features = features_video if has_video else features_game
            if primary_features is not None:
                X = primary_features.to_feature_array().reshape(1, -1)
                try:
                    proba = self._model.predict_proba(X)[0]
                    # Class 2 = ELEVATED
                    xgb_prob = float(proba[2]) if len(proba) == 3 else float(proba[-1])
                    # Blend XGBoost with rule-based (60/40)
                    composite_normalized = (
                        0.6 * composite_normalized + 0.4 * xgb_prob
                    )
                    composite_normalized = float(np.clip(composite_normalized, 0.0, 1.0))
                except Exception as e:
                    logger.error(f"XGBoost prediction failed: {e}. Using heuristic only.")

        # ── Tier assignment from blended composite ─────────────────────
        composite_score = composite_normalized * 70.0  # back to 0-70 scale

        # Select the primary scorer result for DSM-5 breakdown
        # Video is primary for composite/criterion scores (richer gaze signal).
        primary_scorer = scorer_result_video if has_video else scorer_result_game
        assert primary_scorer is not None

        # For differential pattern (motor delay detection), game scorer is always
        # preferred when available. Motor domain metrics — touch_score,
        # drag_smoothness_score, motor_consistency_score — are only real in game
        # data. Video-derived FeatureVectors use neutral defaults for motor domain,
        # which would permanently suppress MOTOR_DELAY_PATTERN when both modalities
        # are present.
        differential_scorer = scorer_result_game if has_game else scorer_result_video
        assert differential_scorer is not None

        # Use primary scorer's criterion breakdown (most data-rich modality)
        criterion_a = primary_scorer.criterion_a_total
        criterion_b = primary_scorer.criterion_b_total
        confidence = primary_scorer.confidence
        divergence_flag = primary_scorer.divergence_flag
        divergence_detail = primary_scorer.divergence_detail
        active_flags = list(primary_scorer.active_flags)

        # ── Final tier ─────────────────────────────────────────────────
        if primary_scorer.is_low_confidence:
            final_tier = "INSUFFICIENT_DATA"
        elif composite_score >= 35.0:
            final_tier = "ELEVATED"
        elif composite_score >= 20.0:
            final_tier = "INDETERMINATE"
        else:
            final_tier = "MONITOR_CLOSELY"

        # Divergence override
        if divergence_flag and final_tier == "MONITOR_CLOSELY":
            final_tier = "INDETERMINATE"
            if "DIVERGENCE" not in str(active_flags):
                active_flags.append(
                    "DIVERGENCE: parent-report / behavioral data mismatch — "
                    "tier upgraded from MONITOR_CLOSELY"
                )

        recommended = primary_scorer.recommended_action

        # ── Per-metric breakdown ───────────────────────────────────────
        breakdown = self._build_breakdown(
            primary_scorer, differential_scorer, features_video, features_game, mchat_score
        )

        return FusionResult(
            session_id=session_id,
            child_age_months=child_age_months,
            final_risk_tier=final_tier,
            composite_score=float(np.clip(composite_score, 0.0, 70.0)),
            composite_normalized=float(np.clip(composite_normalized, 0.0, 1.0)),
            criterion_a=float(np.clip(criterion_a, 0.0, 30.0)),
            criterion_b=float(np.clip(criterion_b, 0.0, 40.0)),
            confidence=confidence,
            xgb_elevated_probability=float(np.clip(xgb_prob, 0.0, 1.0)),
            divergence_flag=divergence_flag,
            divergence_detail=divergence_detail,
            active_flags=active_flags,
            recommended_action=recommended,
            per_metric_breakdown=breakdown,
            has_video=has_video,
            has_game=has_game,
            has_mchat=has_mchat,
            model_version=self._model_version,
            # Use differential_scorer (game preferred) for motor delay pattern.
            # See scorer selection comment above for rationale.
            differential_pattern=differential_scorer.differential_pattern,
            motor_delay_flag=differential_scorer.motor_delay_flag,
            differential_note=differential_scorer.differential_note,
        )

    def _weighted_composite(
        self,
        video_result: Optional[ScorerResult],
        game_result: Optional[ScorerResult],
        mchat_score: Optional[float],
        has_video: bool,
        has_game: bool,
        has_mchat: bool,
    ) -> float:
        """
        Compute weighted composite_normalized from all available modalities.

        Weights:
          Full: M-CHAT 0.20, Video 0.45, Game 0.35
          Video only: M-CHAT 0.20, Video 0.80
          Game only: M-CHAT 0.20, Game 0.80
        """
        mchat_normalized = float(np.clip(mchat_score / 20.0, 0.0, 1.0)) if has_mchat else None

        if has_video and has_game:
            w_video, w_game, w_mchat = 0.45, 0.35, 0.20
        elif has_video:
            w_video, w_game, w_mchat = 0.80, 0.00, 0.20
        else:
            w_video, w_game, w_mchat = 0.00, 0.80, 0.20

        # If no mCHAT, redistribute its weight proportionally
        if not has_mchat:
            total_cv = w_video + w_game
            if total_cv > 0:
                w_video = w_video / total_cv
                w_game = w_game / total_cv
            w_mchat = 0.0

        composite = 0.0
        if has_video and video_result:
            composite += w_video * video_result.composite_normalized
        if has_game and game_result:
            composite += w_game * game_result.composite_normalized
        if has_mchat and mchat_normalized is not None:
            composite += w_mchat * mchat_normalized

        return float(np.clip(composite, 0.0, 1.0))

    def _build_breakdown(
        self,
        scorer: ScorerResult,
        differential_scorer: ScorerResult,
        features_video: Optional[FeatureVector],
        features_game: Optional[FeatureVector],
        mchat_score: Optional[float],
    ) -> Dict[str, Any]:
        """Build the per_metric_breakdown dict for the API response.

        scorer            — primary scorer (video preferred) for DSM-5 breakdown
        differential_scorer — game preferred scorer for motor delay pattern section
        """
        # For feature display, prefer game features (real motor domain data)
        # Fall back to video features if game unavailable
        primary_features = features_game or features_video

        breakdown: Dict[str, Any] = {
            "criterion_a": {
                "total": scorer.criterion_a_total,
                "max": 30,
                "a1_reciprocity": scorer.criterion_a1.to_dict(),
                "a2_nonverbal":   scorer.criterion_a2.to_dict(),
                "a3_imitation":   scorer.criterion_a3.to_dict(),
            },
            "criterion_b": {
                "total": scorer.criterion_b_total,
                "max": 40,
                "b1_stereotypy":  scorer.criterion_b1.to_dict(),
                "b2_sameness":    scorer.criterion_b2.to_dict(),
                "b3_restricted":  scorer.criterion_b3.to_dict(),
                "b4_sensory":     scorer.criterion_b4.to_dict(),
            },
        }

        if primary_features:
            breakdown["metric_scores"] = {
                "gaze": primary_features.gaze_score,
                "reaction": primary_features.reaction_score,
                "touch": primary_features.touch_score,
                "imitation": primary_features.imitation_score,
                "engagement": primary_features.engagement_score,
            }
            breakdown["metric_details"] = {
                k: v.to_dict()
                for k, v in primary_features.metric_details.items()
            }
            breakdown["binary_flags"] = {
                "gaze_flag":       primary_features.gaze_flag,
                "latency_flag":    primary_features.latency_flag,
                "precision_flag":  primary_features.precision_flag,
                "imitation_flag":  primary_features.imitation_flag,
                "engagement_flag": primary_features.engagement_flag,
            }

        if mchat_score is not None:
            breakdown["mchat"] = {
                "raw_score": mchat_score,
                "normalized": float(np.clip(mchat_score / 20.0, 0.0, 1.0)),
                "clinical_threshold": 3,
                "reference": "Robins DL et al. 2014 (M-CHAT-R/F)",
            }

        # Differential pattern — always present regardless of modalities
        breakdown["differential_pattern"] = {
            "pattern": differential_scorer.differential_pattern,
            "motor_delay_flag": differential_scorer.motor_delay_flag,
            "note": differential_scorer.differential_note,
            "motor_domain_metrics": ["touch_precision", "drag_smoothness", "motor_consistency"],
            "social_domain_metrics": ["gaze", "imitation", "reaction_latency", "engagement"],
            "clinical_guidance": (
                "MOTOR_DELAY_PATTERN suggests referral for OT/physio assessment "
                "rather than ASD evaluation as primary pathway. "
                "ASD_PROFILE suggests clinical ASD evaluation. "
                "MIXED_PATTERN warrants comprehensive multi-disciplinary assessment. "
                "All interpretations require clinical judgment."
            ),
        }

        return breakdown
