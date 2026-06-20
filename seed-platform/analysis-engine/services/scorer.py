"""
S.E.E.D. Scorer

Maps feature scores to DSM-5 criterion structure, computes composite score,
applies divergence detection, and assigns risk tier.

DSM-5 CRITERION MAPPING:
  Criterion A — Social Communication (max 30 pts)
    A1 Social-emotional reciprocity:   gaze (60%) + latency (40%)
    A2 Nonverbal communication:        gaze (70%) + engagement (30%)
    A3 Relationship/Imitation:         imitation (80%) + precision (20%)

  Criterion B — Repetitive Behaviours (max 40 pts)
    B1 Stereotyped movements:          motor_consistency (inverse — high = stereotypy)
    B2 Insistence on sameness:         rigidity from latency_cv + social_ratio
    B3 Restricted/fixated interests:   sustained_gaze + gaze_variability (inverse)
    B4 Sensory reactivity:             disengagement + recovery_time

COMPOSITE = Criterion A + Criterion B (max 70)

RISK TIERS (LOW deliberately absent):
  MONITOR_CLOSELY:  composite < 20
  INDETERMINATE:    20 ≤ composite < 35
  ELEVATED:         composite ≥ 35

DIVERGENCE DETECTION:
  If |mchat_normalized − cv_composite_normalized| > 0.30:
    → Override to INDETERMINATE minimum
    → divergence_flag = True
    → mandatory clinical review triggered

CONFIDENCE GATE:
  If confidence < 0.60:
    → No tier issued
    → Return INSUFFICIENT_DATA status
"""

from __future__ import annotations
import logging
import numpy as np
from dataclasses import dataclass, field, asdict
from typing import Dict, Any, List, Optional

from services.feature_engineer import FeatureVector, MIN_CONFIDENCE_FOR_TIER

logger = logging.getLogger(__name__)

# Composite score thresholds
MONITOR_THRESHOLD       = 20.0   # composite < 20 → MONITOR_CLOSELY
INDETERMINATE_THRESHOLD = 35.0   # 20 ≤ composite < 35 → INDETERMINATE
# composite ≥ 35 → ELEVATED

# Divergence: mismatch between parent-reported mCHAT and CV-derived composite
DIVERGENCE_THRESHOLD = 0.30

# Max possible composite score (A_max=30 + B_max=40)
MAX_COMPOSITE = 70.0

# ─── Motor delay pattern detection ────────────────────────────────────────────
# Motor domain scores (0-10): elevated when mean >= this value
MOTOR_DOMAIN_ELEVATED_THRESHOLD = 3.5

# Social/communication domain scores: "intact" when mean <= this value
SOCIAL_DOMAIN_INTACT_THRESHOLD = 3.0

# Motor domain mean must be at least this multiple of social domain mean
MOTOR_SOCIAL_RATIO_THRESHOLD = 1.8


def assess_differential_pattern(
    features: "FeatureVector",
) -> "tuple[str, bool, str]":
    """
    Classify score elevation into one of four clinical patterns:

      ASD_PROFILE         — social/communication domain primarily elevated
      MOTOR_DELAY_PATTERN — motor domain primarily elevated, social intact
      MIXED_PATTERN       — both domains elevated (co-occurring concerns)
      TYPICAL_PATTERN     — all scores low

    Returns:
        (pattern_label, motor_delay_flag, clinical_note)

    Clinical rationale:
      Motor delay (developmental coordination disorder, hypotonia) is the
      primary false-positive confound for this screening. A child with motor
      delay will show high touch_score, drag_smoothness_score, and
      motor_consistency_score while maintaining intact gaze, imitation,
      and engagement — the social communication triad. Surfacing this
      pattern prompts clinicians to consider OT/physio referral rather than
      ASD evaluation, preventing unnecessary diagnostic workup and family
      distress.

      Thresholds are conservative (3.5/10) to minimise false motor flags.
      This is a screening suggestion, not a differential diagnosis.
      Clinical judgment is required in all cases.
    """
    motor_scores = [
        features.touch_score,
        features.drag_smoothness_score,
        features.motor_consistency_score,
    ]
    social_scores = [
        features.gaze_score,
        features.imitation_score,
        features.reaction_score,
        features.engagement_score,
    ]

    motor_mean = float(np.mean(motor_scores))
    social_mean = float(np.mean(social_scores))

    motor_elevated = motor_mean >= MOTOR_DOMAIN_ELEVATED_THRESHOLD
    social_elevated = social_mean >= SOCIAL_DOMAIN_INTACT_THRESHOLD
    # Motor meaningfully dominant: ratio check guards against near-zero social mean edge case
    ratio_dominant = (social_mean > 0.5) and (
        motor_mean / max(social_mean, 0.1) >= MOTOR_SOCIAL_RATIO_THRESHOLD
    )

    if motor_elevated and not social_elevated and ratio_dominant:
        return (
            "MOTOR_DELAY_PATTERN",
            True,
            (
                f"Motor domain (mean {motor_mean:.1f}/10) is substantially elevated "
                f"relative to social communication domain (mean {social_mean:.1f}/10). "
                "This pattern is more consistent with motor developmental delay "
                "than ASD social communication atypicality. "
                "Consider referral for occupational therapy or physiotherapy assessment. "
                "ASD-specific evaluation may not be the primary indicated pathway — "
                "clinical judgment required."
            ),
        )

    if motor_elevated and social_elevated:
        return (
            "MIXED_PATTERN",
            True,
            (
                f"Both motor domain (mean {motor_mean:.1f}/10) and social communication "
                f"domain (mean {social_mean:.1f}/10) show elevation. "
                "Co-occurring motor and social communication difficulties may reflect "
                "ASD with motor features, motor delay with secondary social impact, "
                "or a distinct developmental presentation. "
                "Comprehensive multi-disciplinary evaluation recommended."
            ),
        )

    if social_elevated and not motor_elevated:
        return (
            "ASD_PROFILE",
            False,
            (
                f"Social communication domain (mean {social_mean:.1f}/10) is primarily "
                f"elevated relative to motor domain (mean {motor_mean:.1f}/10). "
                "Profile is consistent with ASD social communication atypicality. "
                "Clinical evaluation recommended per risk tier."
            ),
        )

    return (
        "TYPICAL_PATTERN",
        False,
        (
            f"Both motor domain (mean {motor_mean:.1f}/10) and social communication "
            f"domain (mean {social_mean:.1f}/10) are within or near normative range."
        ),
    )


@dataclass
class CriterionScore:
    name: str
    raw_score: float           # 0-10 per sub-criterion
    max_score: float           # always 10
    components: Dict[str, float]   # contributing metric scores + weights

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ScorerResult:
    # Risk outcome
    risk_tier: str             # MONITOR_CLOSELY | INDETERMINATE | ELEVATED | INSUFFICIENT_DATA
    composite_score: float     # 0-70
    composite_normalized: float  # 0-1 for fusion and divergence check
    criterion_a_total: float   # 0-30
    criterion_b_total: float   # 0-40

    # DSM-5 sub-scores
    criterion_a1: CriterionScore  # Social-emotional reciprocity
    criterion_a2: CriterionScore  # Nonverbal communication
    criterion_a3: CriterionScore  # Relationships/Imitation
    criterion_b1: CriterionScore  # Stereotyped movements
    criterion_b2: CriterionScore  # Insistence on sameness
    criterion_b3: CriterionScore  # Restricted/fixated interests
    criterion_b4: CriterionScore  # Sensory reactivity

    # Metadata
    divergence_flag: bool
    divergence_detail: Optional[str]
    confidence: float
    is_low_confidence: bool
    active_flags: List[str]     # which binary flags were triggered
    recommended_action: str

    # Differential pattern — motor delay vs ASD vs mixed
    differential_pattern: str       # MOTOR_DELAY_PATTERN | ASD_PROFILE | MIXED_PATTERN | TYPICAL_PATTERN
    motor_delay_flag: bool          # True when motor domain dominant, social intact
    differential_note: str          # Plain-language clinical interpretation

    disclaimer: str = (
        "Screening tool only. Not a diagnostic instrument. "
        "Clinical confirmation required."
    )

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        return d


def _weighted(scores: List[float], weights: List[float]) -> float:
    """Compute weighted average, returns 0.0 if all weights zero."""
    total_weight = sum(weights)
    if total_weight <= 0:
        return 0.0
    return sum(s * w for s, w in zip(scores, weights)) / total_weight


def _recommended_action(risk_tier: str, divergence_flag: bool, confidence: float) -> str:
    if risk_tier == "INSUFFICIENT_DATA":
        return (
            "Insufficient data for scoring. Please ensure the video is well-lit "
            "and the child's face is visible, and complete all four game modules."
        )
    if risk_tier == "ELEVATED":
        return (
            "Prompt clinical evaluation recommended. Please contact your "
            "assigned clinician to schedule a comprehensive developmental assessment."
        )
    if risk_tier == "INDETERMINATE":
        if divergence_flag:
            return (
                "Results are inconclusive with divergence between parent report "
                "and behavioral data. Clinician review is required before any "
                "interpretation is made."
            )
        return (
            "Results are inconclusive. A follow-up screening in 4–6 weeks or "
            "clinical consultation is recommended."
        )
    # MONITOR_CLOSELY
    return (
        "Continue monitoring development. Routine re-screening recommended "
        "at next developmental milestone check (typically 3–6 months)."
    )


class Scorer:
    """
    Computes DSM-5-structured criterion scores and risk tier
    from a FeatureVector.
    """

    def score(
        self,
        features: FeatureVector,
        mchat_score: Optional[float] = None,
    ) -> ScorerResult:
        """
        Args:
            features: FeatureVector from FeatureEngineer
            mchat_score: Raw M-CHAT-R/F score (0-20). None if not administered.
        """
        # ── Confidence gate ────────────────────────────────────────────
        if features.is_low_confidence:
            logger.warning(
                f"Low confidence ({features.confidence:.2f}) — "
                "issuing INSUFFICIENT_DATA rather than a risk tier"
            )
            return self._insufficient_data_result(features)

        # ── Criterion A — Social Communication ─────────────────────────

        # A1: Social-emotional reciprocity
        # gaze (60%) + latency (40%)
        a1_score = _weighted(
            [features.gaze_score, features.reaction_score],
            [0.6, 0.4],
        )
        criterion_a1 = CriterionScore(
            name="A1 Social-emotional reciprocity",
            raw_score=a1_score,
            max_score=10.0,
            components={
                "gaze_score × 0.6": features.gaze_score * 0.6,
                "reaction_score × 0.4": features.reaction_score * 0.4,
            },
        )

        # A2: Nonverbal communication behaviors
        # gaze (70%) + engagement (30%)
        a2_score = _weighted(
            [features.gaze_score, features.engagement_score],
            [0.7, 0.3],
        )
        criterion_a2 = CriterionScore(
            name="A2 Nonverbal communication",
            raw_score=a2_score,
            max_score=10.0,
            components={
                "gaze_score × 0.7": features.gaze_score * 0.7,
                "engagement_score × 0.3": features.engagement_score * 0.3,
            },
        )

        # A3: Developing/maintaining relationships / Imitation
        # imitation (80%) + precision (20%)
        a3_score = _weighted(
            [features.imitation_score, features.touch_score],
            [0.8, 0.2],
        )
        criterion_a3 = CriterionScore(
            name="A3 Relationships / Imitation",
            raw_score=a3_score,
            max_score=10.0,
            components={
                "imitation_score × 0.8": features.imitation_score * 0.8,
                "touch_score × 0.2": features.touch_score * 0.2,
            },
        )

        criterion_a_total = a1_score + a2_score + a3_score  # max 30

        # ── Criterion B — Restricted/Repetitive Behaviours ─────────────

        # B1: Stereotyped/repetitive movements
        # motor_consistency is a SPREAD measure — high spread = inconsistent, LOW spread = stereotypy
        # B1 high score means HIGH stereotypy = INVERSE of motor_consistency score
        b1_score = max(0.0, 10.0 - features.motor_consistency_score)
        criterion_b1 = CriterionScore(
            name="B1 Stereotyped movements",
            raw_score=b1_score,
            max_score=10.0,
            components={
                "10 - motor_consistency_score": b1_score,
            },
        )

        # B2: Insistence on sameness / inflexible adherence
        # latency_cv (high CV = inconsistent, not rigid) is NOT sameness
        # Instead: social_ratio_score captures inflexibility toward social stimuli
        # Combined with latency_cv_score (inverse — low CV = rigid repetitive)
        b2_rigidity = max(0.0, 10.0 - features.latency_cv_score)   # low CV = more rigid
        b2_score = _weighted(
            [b2_rigidity, features.social_ratio_score],
            [0.5, 0.5],
        )
        criterion_b2 = CriterionScore(
            name="B2 Insistence on sameness",
            raw_score=b2_score,
            max_score=10.0,
            components={
                "rigidity (inverse latency_cv) × 0.5": b2_rigidity * 0.5,
                "social_ratio_score × 0.5": features.social_ratio_score * 0.5,
            },
        )

        # B3: Restricted/fixated interests
        # High sustained gaze on one stimulus + low gaze variability = restricted fixation
        # sustained_gaze_score here measures EXCESS fixation vs norm
        b3_score = _weighted(
            [features.sustained_gaze_score, features.gaze_variability_score],
            [0.6, 0.4],
        )
        criterion_b3 = CriterionScore(
            name="B3 Restricted / fixated interests",
            raw_score=b3_score,
            max_score=10.0,
            components={
                "sustained_gaze_score × 0.6": features.sustained_gaze_score * 0.6,
                "gaze_variability_score × 0.4": features.gaze_variability_score * 0.4,
            },
        )

        # B4: Hyper/hypo reactivity to sensory input
        # Disengagement (hyper) + recovery_time (prolonged = hyper)
        b4_score = _weighted(
            [features.disengagement_score, features.recovery_time_score],
            [0.5, 0.5],
        )
        criterion_b4 = CriterionScore(
            name="B4 Sensory reactivity",
            raw_score=b4_score,
            max_score=10.0,
            components={
                "disengagement_score × 0.5": features.disengagement_score * 0.5,
                "recovery_time_score × 0.5": features.recovery_time_score * 0.5,
            },
        )

        criterion_b_total = b1_score + b2_score + b3_score + b4_score  # max 40

        # ── Composite score ────────────────────────────────────────────
        composite = criterion_a_total + criterion_b_total
        composite = float(np.clip(composite, 0.0, MAX_COMPOSITE))
        composite_normalized = composite / MAX_COMPOSITE

        # ── Divergence detection ───────────────────────────────────────
        divergence_flag = False
        divergence_detail: Optional[str] = None

        if mchat_score is not None:
            # M-CHAT-R/F: 0-20 scale (Robins et al. 2014)
            # ≥3 = elevated concern (normalized: 3/20 = 0.15 threshold)
            mchat_normalized = float(np.clip(mchat_score / 20.0, 0.0, 1.0))
            diff = abs(mchat_normalized - composite_normalized)

            if diff > DIVERGENCE_THRESHOLD:
                divergence_flag = True
                direction = (
                    "Parent-reported concerns exceed behavioral data"
                    if mchat_normalized > composite_normalized
                    else "Behavioral data shows more concern than parent-reported"
                )
                divergence_detail = (
                    f"{direction}. "
                    f"M-CHAT normalized={mchat_normalized:.2f}, "
                    f"CV composite normalized={composite_normalized:.2f}, "
                    f"difference={diff:.2f} (threshold={DIVERGENCE_THRESHOLD}). "
                    "Mandatory clinical review triggered."
                )
                logger.warning(f"Divergence detected: {divergence_detail}")

        # ── Risk tier assignment ───────────────────────────────────────
        if composite < MONITOR_THRESHOLD:
            risk_tier = "MONITOR_CLOSELY"
        elif composite < INDETERMINATE_THRESHOLD:
            risk_tier = "INDETERMINATE"
        else:
            risk_tier = "ELEVATED"

        # Divergence override: push to INDETERMINATE minimum
        # The system never definitively clears a child when data disagrees
        if divergence_flag and risk_tier == "MONITOR_CLOSELY":
            logger.info(
                f"Divergence override: MONITOR_CLOSELY → INDETERMINATE "
                f"(composite={composite:.1f}, diff exceeds {DIVERGENCE_THRESHOLD})"
            )
            risk_tier = "INDETERMINATE"

        # ── Active flags ───────────────────────────────────────────────
        active_flags: List[str] = []
        if features.gaze_flag:
            active_flags.append("GAZE: joint attention ratio below threshold (< 0.40)")
        if features.latency_flag:
            active_flags.append("LATENCY: social response time > 2 SD above norm")
        if features.precision_flag:
            active_flags.append("PRECISION: touch accuracy below threshold (< 0.55)")
        if features.imitation_flag:
            active_flags.append("IMITATION: imitation accuracy below threshold (< 0.60)")
        if features.engagement_flag:
            active_flags.append("ENGAGEMENT: disengagement events exceed threshold (> 3)")
        if divergence_flag:
            active_flags.append("DIVERGENCE: parent-report / behavioral data mismatch > 0.30")

        # ── Differential pattern (motor delay vs ASD) ──────────────────
        differential_pattern, motor_delay_flag, differential_note = assess_differential_pattern(features)
        if motor_delay_flag:
            active_flags.append(f"MOTOR_DELAY_PATTERN: {differential_pattern}")

        recommended = _recommended_action(risk_tier, divergence_flag, features.confidence)

        return ScorerResult(
            risk_tier=risk_tier,
            composite_score=composite,
            composite_normalized=composite_normalized,
            criterion_a_total=float(np.clip(criterion_a_total, 0.0, 30.0)),
            criterion_b_total=float(np.clip(criterion_b_total, 0.0, 40.0)),
            criterion_a1=criterion_a1,
            criterion_a2=criterion_a2,
            criterion_a3=criterion_a3,
            criterion_b1=criterion_b1,
            criterion_b2=criterion_b2,
            criterion_b3=criterion_b3,
            criterion_b4=criterion_b4,
            divergence_flag=divergence_flag,
            divergence_detail=divergence_detail,
            confidence=features.confidence,
            is_low_confidence=features.is_low_confidence,
            active_flags=active_flags,
            recommended_action=recommended,
            differential_pattern=differential_pattern,
            motor_delay_flag=motor_delay_flag,
            differential_note=differential_note,
        )

    def _insufficient_data_result(self, features: FeatureVector) -> ScorerResult:
        """Return a structured result when confidence is below threshold."""
        empty_criterion = CriterionScore(
            name="", raw_score=0.0, max_score=10.0, components={}
        )
        return ScorerResult(
            risk_tier="INSUFFICIENT_DATA",
            composite_score=0.0,
            composite_normalized=0.0,
            criterion_a_total=0.0,
            criterion_b_total=0.0,
            criterion_a1=empty_criterion,
            criterion_a2=empty_criterion,
            criterion_a3=empty_criterion,
            criterion_b1=empty_criterion,
            criterion_b2=empty_criterion,
            criterion_b3=empty_criterion,
            criterion_b4=empty_criterion,
            divergence_flag=False,
            divergence_detail=None,
            confidence=features.confidence,
            is_low_confidence=True,
            active_flags=[f"LOW_CONFIDENCE: {features.confidence:.2f} below {MIN_CONFIDENCE_FOR_TIER}"],
            recommended_action=_recommended_action("INSUFFICIENT_DATA", False, features.confidence),
            differential_pattern="TYPICAL_PATTERN",
            motor_delay_flag=False,
            differential_note="Insufficient data — differential pattern assessment not available.",
        )
