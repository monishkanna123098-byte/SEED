"""
S.E.E.D. Landmark Extractor

Extracts 5 behavioral signals from raw frame data (video) and game events (JSON).

Signal definitions and clinical rationale:
  GAZE_TRACKING:      joint attention, gaze variability, sustained gaze
                      → social orienting capacity (NRC 2001, Jones & Klin 2013)
  REACTION_LATENCY:   social vs non-social stimulus latency differential
                      → social processing speed asymmetry (Chawarska 2013)
  TOUCH_PRECISION:    accuracy, smoothness, motor consistency
                      → fine motor development (IAP 2015)
  PEER_IMITATION:     accuracy, latency, sequence completion
                      → social learning and mirroring (NOTE: experimental paradigm)
  ENGAGEMENT:         completion rate, disengagements, recovery time
                      → sustained attention and regulatory capacity
"""

from __future__ import annotations
import numpy as np
import logging
from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional

from services.video_processor import FrameData

logger = logging.getLogger(__name__)

# Gaze is "forward/social" if within ±15° of screen centre
SOCIAL_GAZE_ANGLE_THRESHOLD = 15.0   # degrees

# Sustained gaze requires consecutive on-screen time > this value
SUSTAINED_GAZE_MIN_DURATION_MS = 1500.0

# Disengagement = off-screen gaze for longer than this
DISENGAGEMENT_MIN_DURATION_MS = 3000.0

# Imitation window: child must respond within this time to count
IMITATION_WINDOW_MS = 3000.0


@dataclass
class GazeSignals:
    joint_attention_ratio: float       # proportion 0-1 frames with gaze ≤15° from center
    gaze_variability: float            # std dev of gaze_vector_x (high = scanning)
    sustained_gaze_events: float       # count of gaze sequences >1.5s on-screen per minute
    frames_analyzed: int

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ReactionLatencySignals:
    social_latency_mean: float         # mean ms, social stimulus → first touch
    social_vs_nonsocial_ratio: float   # ratio; >1.0 = slower to social (ASD indicator)
    latency_cv: float                  # coefficient of variation (std/mean)
    n_social_trials: int
    n_nonsocial_trials: int

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class TouchPrecisionSignals:
    accuracy_score: float              # proportion taps within target_radius
    drag_smoothness: float             # mean deviation px from ideal path (lower = smoother)
    motor_consistency: float           # std dev of per-trial accuracy (lower = more consistent)
    n_tap_trials: int
    n_drag_trials: int

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ImitationSignals:
    imitation_accuracy: float          # proportion gestures correctly reproduced within window
    imitation_latency: float           # mean ms from avatar action to child response
    imitation_sequence_score: float    # weighted score for multi-step completion
    n_trials: int

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class EngagementSignals:
    session_completion_rate: float     # proportion of game modules completed
    disengagement_events: float        # count of >3s off-screen gaze periods
    attention_recovery_time: float     # mean ms to re-engage after disengagement
    total_modules: int
    completed_modules: int

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ExtractedSignals:
    gaze: GazeSignals
    reaction: ReactionLatencySignals
    touch: TouchPrecisionSignals
    imitation: ImitationSignals
    engagement: EngagementSignals
    video_quality_score: float
    extraction_notes: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "gaze": self.gaze.to_dict(),
            "reaction": self.reaction.to_dict(),
            "touch": self.touch.to_dict(),
            "imitation": self.imitation.to_dict(),
            "engagement": self.engagement.to_dict(),
            "video_quality_score": self.video_quality_score,
            "extraction_notes": self.extraction_notes,
        }


# ─── Gaze extraction ──────────────────────────────────────────────────────────

def extract_gaze_signals(
    frames: List[FrameData], video_duration_ms: float
) -> GazeSignals:
    """Extract SIGNAL 1 — GAZE_TRACKING from frame data."""
    if not frames:
        return GazeSignals(
            joint_attention_ratio=0.0,
            gaze_variability=0.5,
            sustained_gaze_events=0.0,
            frames_analyzed=0,
        )

    gaze_xs = np.array([f.gaze_vector_x for f in frames])
    gaze_ys = np.array([f.gaze_vector_y for f in frames])

    # Joint attention ratio: gaze angle within ±15° of screen center
    # Convert gaze vector to angle from forward (0,0,1)
    gaze_angles = np.degrees(np.arctan2(
        np.sqrt(gaze_xs**2 + gaze_ys**2),
        np.abs(np.array([f.gaze_vector_z for f in frames])),
    ))
    on_screen_mask = gaze_angles <= SOCIAL_GAZE_ANGLE_THRESHOLD
    joint_attention_ratio = float(np.mean(on_screen_mask))

    # Gaze variability: std of gaze_vector_x across session
    gaze_variability = float(np.std(gaze_xs))

    # Sustained gaze events: sequences of consecutive on-screen frames > 1.5s
    # At 10fps, 15 frames = 1.5s
    sustained_gaze_events = _count_sustained_sequences(
        on_screen_mask,
        frames,
        SUSTAINED_GAZE_MIN_DURATION_MS,
    )

    # Normalize to events per minute
    duration_minutes = max(video_duration_ms / 60000.0, 1.0 / 60.0)
    sustained_gaze_per_min = sustained_gaze_events / duration_minutes

    return GazeSignals(
        joint_attention_ratio=float(np.clip(joint_attention_ratio, 0.0, 1.0)),
        gaze_variability=float(np.clip(gaze_variability, 0.0, 1.0)),
        sustained_gaze_events=float(sustained_gaze_per_min),
        frames_analyzed=len(frames),
    )


def _count_sustained_sequences(
    on_screen_mask: np.ndarray,
    frames: List[FrameData],
    min_duration_ms: float,
) -> int:
    """Count runs of consecutive on-screen frames exceeding min_duration_ms."""
    count = 0
    in_sequence = False
    seq_start_ts = 0.0

    for i, on_screen in enumerate(on_screen_mask):
        ts = frames[i].timestamp_ms
        if on_screen and not in_sequence:
            in_sequence = True
            seq_start_ts = ts
        elif not on_screen and in_sequence:
            duration = ts - seq_start_ts
            if duration >= min_duration_ms:
                count += 1
            in_sequence = False

    # Close final sequence if still open at end
    if in_sequence and frames:
        duration = frames[-1].timestamp_ms - seq_start_ts
        if duration >= min_duration_ms:
            count += 1

    return count


# ─── Reaction latency extraction ─────────────────────────────────────────────

def extract_reaction_signals(game_events: List[Dict[str, Any]]) -> ReactionLatencySignals:
    """
    Extract SIGNAL 2 — REACTION_LATENCY from game events JSON.
    Expects events with fields: type, stimulus_type, latency_ms.
    stimulus_type is either 'social' (avatar/face) or 'nonsocial' (object/shape).
    """
    social_latencies: List[float] = []
    nonsocial_latencies: List[float] = []

    for evt in game_events:
        if evt.get("type") not in ("tap", "response"):
            continue
        latency = evt.get("latency_ms")
        if latency is None or latency <= 0:
            continue
        # Cap extreme outliers at 5000ms (effectively no response)
        latency = min(float(latency), 5000.0)

        stimulus = evt.get("stimulus_type", "nonsocial")
        if stimulus == "social":
            social_latencies.append(latency)
        else:
            nonsocial_latencies.append(latency)

    if not social_latencies:
        return ReactionLatencySignals(
            social_latency_mean=1500.0,
            social_vs_nonsocial_ratio=1.0,
            latency_cv=0.5,
            n_social_trials=0,
            n_nonsocial_trials=len(nonsocial_latencies),
        )

    social_mean = float(np.mean(social_latencies))
    social_std = float(np.std(social_latencies))

    if nonsocial_latencies:
        nonsocial_mean = float(np.mean(nonsocial_latencies))
        ratio = social_mean / max(nonsocial_mean, 1.0)
    else:
        ratio = 1.0

    # Coefficient of variation: std/mean (high = inconsistent processing)
    cv = social_std / max(social_mean, 1.0)

    return ReactionLatencySignals(
        social_latency_mean=social_mean,
        social_vs_nonsocial_ratio=float(np.clip(ratio, 0.1, 10.0)),
        latency_cv=float(np.clip(cv, 0.0, 2.0)),
        n_social_trials=len(social_latencies),
        n_nonsocial_trials=len(nonsocial_latencies),
    )


# ─── Touch precision extraction ──────────────────────────────────────────────

def extract_touch_signals(game_events: List[Dict[str, Any]]) -> TouchPrecisionSignals:
    """
    Extract SIGNAL 3 — TOUCH_PRECISION from game events.
    Expects tap events with target_x/y, actual_x/y and target_radius.
    Drag events include drag_path_deviation (mean px from ideal line).
    """
    tap_hits: List[float] = []    # 1 = hit, 0 = miss
    per_trial_accuracy: List[float] = []
    drag_deviations: List[float] = []

    for evt in game_events:
        etype = evt.get("type")

        if etype == "tap":
            tx, ty = evt.get("target_x") or 0, evt.get("target_y") or 0
            ax, ay = evt.get("actual_x") or 0, evt.get("actual_y") or 0
            radius = evt.get("target_radius", 60)
            dist = np.sqrt((ax - tx)**2 + (ay - ty)**2)
            hit = 1.0 if dist <= radius else 0.0
            # Precision score per tap: 1 - normalized_distance (clipped at radius*2)
            precision = float(np.clip(1.0 - dist / (radius * 2), 0.0, 1.0))
            tap_hits.append(hit)
            per_trial_accuracy.append(precision)

        elif etype == "drag":
            deviation = evt.get("drag_path_deviation")
            if deviation is not None:
                drag_deviations.append(float(deviation))

    accuracy_score = float(np.mean(tap_hits)) if tap_hits else 0.6
    motor_consistency = float(np.std(per_trial_accuracy)) if len(per_trial_accuracy) >= 3 else 0.15
    drag_smoothness = float(np.mean(drag_deviations)) if drag_deviations else 12.0

    return TouchPrecisionSignals(
        accuracy_score=float(np.clip(accuracy_score, 0.0, 1.0)),
        drag_smoothness=float(np.clip(drag_smoothness, 0.0, 100.0)),
        motor_consistency=float(np.clip(motor_consistency, 0.0, 1.0)),
        n_tap_trials=len(tap_hits),
        n_drag_trials=len(drag_deviations),
    )


# ─── Imitation extraction ─────────────────────────────────────────────────────

def extract_imitation_signals(game_events: List[Dict[str, Any]]) -> ImitationSignals:
    """
    Extract SIGNAL 4 — PEER_IMITATION from game events.
    Expects imitation_attempt events with: is_correct, latency_ms,
    sequence_step (1-indexed), sequence_length.
    """
    correct_count = 0
    total_count = 0
    latencies: List[float] = []
    sequence_scores: List[float] = []

    for evt in game_events:
        if evt.get("type") != "imitation_attempt":
            continue

        total_count += 1
        is_correct = evt.get("is_correct", False)
        latency = evt.get("latency_ms")

        if is_correct:
            correct_count += 1

        if latency is not None and 0 < latency <= IMITATION_WINDOW_MS:
            latencies.append(float(latency))

        # Sequence scoring: later steps in multi-step sequences weighted more
        step = evt.get("sequence_step", 1)
        seq_len = evt.get("sequence_length", 1)
        if is_correct and seq_len > 1:
            # Weight: step/seq_len, normalized. Final step worth most.
            weight = step / seq_len
            sequence_scores.append(float(weight))
        elif is_correct:
            sequence_scores.append(1.0)
        else:
            sequence_scores.append(0.0)

    imitation_accuracy = correct_count / max(total_count, 1)
    imitation_latency = float(np.mean(latencies)) if latencies else 1800.0
    sequence_score = float(np.mean(sequence_scores)) if sequence_scores else 0.5

    return ImitationSignals(
        imitation_accuracy=float(np.clip(imitation_accuracy, 0.0, 1.0)),
        imitation_latency=float(np.clip(imitation_latency, 0.0, 5000.0)),
        imitation_sequence_score=float(np.clip(sequence_score, 0.0, 1.0)),
        n_trials=total_count,
    )


# ─── Engagement extraction ────────────────────────────────────────────────────

def extract_engagement_signals(
    game_events: List[Dict[str, Any]],
    frames: List[FrameData],
    video_duration_ms: float,
) -> EngagementSignals:
    """
    Extract SIGNAL 5 — ENGAGEMENT from game events and video frames.

    Game events contribute: module completion rates.
    Video frames contribute: disengagement event count and recovery times.
    """
    # Module completion from game events
    modules_started: set = set()
    modules_completed: set = set()

    for evt in game_events:
        module_id = evt.get("module_id", "")
        if not module_id:
            continue
        if evt.get("type") == "module_start":
            modules_started.add(module_id)
        elif evt.get("type") == "module_complete":
            modules_completed.add(module_id)

    # Fallback: infer from tap/response events if no explicit module events
    if not modules_started:
        for evt in game_events:
            mid = evt.get("module_id", "")
            if mid:
                modules_started.add(mid)

    total_modules = max(len(modules_started), 4)  # SEED has 4 modules
    completed = len(modules_completed)
    completion_rate = completed / total_modules

    # Disengagements from video frame gaze analysis
    disengagement_events = 0
    recovery_times: List[float] = []

    if frames:
        gaze_angles = np.degrees(np.arctan2(
            np.sqrt(np.array([f.gaze_vector_x for f in frames])**2 +
                    np.array([f.gaze_vector_y for f in frames])**2),
            np.abs(np.array([f.gaze_vector_z for f in frames])),
        ))
        off_screen = gaze_angles > SOCIAL_GAZE_ANGLE_THRESHOLD

        in_disengage = False
        disengage_start_ts = 0.0
        prev_off_ts = 0.0

        for i, off in enumerate(off_screen):
            ts = frames[i].timestamp_ms
            if off and not in_disengage:
                in_disengage = True
                disengage_start_ts = ts
            elif not off and in_disengage:
                duration = ts - disengage_start_ts
                if duration >= DISENGAGEMENT_MIN_DURATION_MS:
                    disengagement_events += 1
                    # Recovery time = time from disengage_start to re-engage
                    recovery_times.append(float(ts - disengage_start_ts))
                in_disengage = False

        if in_disengage and frames:
            final_duration = frames[-1].timestamp_ms - disengage_start_ts
            if final_duration >= DISENGAGEMENT_MIN_DURATION_MS:
                disengagement_events += 1

    # Fallback disengagement from game events if no video
    if not frames:
        for evt in game_events:
            if evt.get("type") == "disengage":
                disengagement_events += 1

    mean_recovery = float(np.mean(recovery_times)) if recovery_times else 2000.0

    return EngagementSignals(
        session_completion_rate=float(np.clip(completion_rate, 0.0, 1.0)),
        disengagement_events=float(disengagement_events),
        attention_recovery_time=float(np.clip(mean_recovery, 0.0, 30000.0)),
        total_modules=total_modules,
        completed_modules=completed,
    )


# ─── Main extractor ───────────────────────────────────────────────────────────

class LandmarkExtractor:
    """
    Orchestrates extraction of all 5 behavioral signals from
    frame data (from VideoProcessor) and game events (from Phaser 3).
    """

    def extract(
        self,
        frames: List[FrameData],
        game_events: List[Dict[str, Any]],
        video_duration_ms: float,
        video_quality_score: float,
    ) -> ExtractedSignals:
        notes: List[str] = []

        if not frames:
            notes.append("No video frames available — gaze signals set to neutral defaults")
        if not game_events:
            notes.append("No game events available — game signals set to neutral defaults")

        gaze = extract_gaze_signals(frames, video_duration_ms)
        reaction = extract_reaction_signals(game_events)
        touch = extract_touch_signals(game_events)
        imitation = extract_imitation_signals(game_events)
        engagement = extract_engagement_signals(game_events, frames, video_duration_ms)

        if reaction.n_social_trials < 3:
            notes.append(
                f"Only {reaction.n_social_trials} social latency trials — "
                "reaction signal has low reliability"
            )
        if imitation.n_trials < 5:
            notes.append(
                f"Only {imitation.n_trials} imitation trials — "
                "imitation signal has low reliability"
            )
        if gaze.frames_analyzed < 30:
            notes.append(
                f"Only {gaze.frames_analyzed} usable frames — "
                "gaze signal has low reliability"
            )

        logger.info(
            f"Signal extraction complete: "
            f"frames={gaze.frames_analyzed}, "
            f"gaze_ratio={gaze.joint_attention_ratio:.2f}, "
            f"social_trials={reaction.n_social_trials}, "
            f"imitation_trials={imitation.n_trials}"
        )

        return ExtractedSignals(
            gaze=gaze,
            reaction=reaction,
            touch=touch,
            imitation=imitation,
            engagement=engagement,
            video_quality_score=video_quality_score,
            extraction_notes=notes,
        )
