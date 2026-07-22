"""
S.E.E.D. Analysis Engine — FastAPI microservice (port 8001)

All child biometric inference runs server-side only.
No data is forwarded to third-party APIs.

Endpoints:
  GET  /health
  GET  /model/feature-importance
  GET  /normative/{age_group}
  POST /analyze/video     — video file + metadata → raw frame metrics
  POST /analyze/game      — game events JSON → game metrics
  POST /analyze/fusion    — all modalities → final risk result
"""

from __future__ import annotations
import json
import logging
import os
import shutil
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from pythonjsonlogger import jsonlogger

from services.video_processor import VideoProcessor
from services.landmark_extractor import LandmarkExtractor, ExtractedSignals
from services.feature_engineer import FeatureEngineer, FeatureVector
from services.scorer import Scorer
from services.fusion_engine import FusionEngine
from constants import MIN_AGE_MONTHS, MAX_AGE_MONTHS

# ─── Logging ──────────────────────────────────────────────────────────────────
log_level = os.environ.get("LOG_LEVEL", "INFO").upper()
_root_logger = logging.getLogger()
_root_logger.setLevel(log_level)
_handler = logging.StreamHandler()
_handler.setFormatter(
    jsonlogger.JsonFormatter("%(asctime)s %(name)s %(levelname)s %(message)s")
)
_root_logger.addHandler(_handler)
logger = logging.getLogger(__name__)

# ─── Service singletons ────────────────────────────────────────────────────────
_video_processor  = VideoProcessor()
_landmark_extractor = LandmarkExtractor()
_feature_engineer = FeatureEngineer()
_scorer           = Scorer()
_fusion_engine    = FusionEngine()

NORMATIVE_DATA_PATH = Path(__file__).parent / "models" / "normative_data.json"
FEATURE_IMPORTANCE_PATH = Path(__file__).parent / "models" / "feature_importance.json"
UPLOADS_DIR = Path(os.environ.get("UPLOAD_DIR", "/uploads"))

# ─── Pydantic schemas ──────────────────────────────────────────────────────────

class GameEvent(BaseModel):
    type: str
    module_id: str = ""
    trial_index: int = 0
    timestamp: float = 0.0
    target_x: Optional[float] = None
    target_y: Optional[float] = None
    actual_x: Optional[float] = None
    actual_y: Optional[float] = None
    target_radius: Optional[float] = 60.0
    latency_ms: Optional[float] = None
    is_correct: Optional[bool] = None
    stimulus_type: Optional[str] = "nonsocial"
    response_type: Optional[str] = None
    sequence_step: Optional[int] = 1
    sequence_length: Optional[int] = 1
    drag_path_deviation: Optional[float] = None


class GameAnalysisRequest(BaseModel):
    session_id: str
    child_age_months: int = Field(ge=MIN_AGE_MONTHS, le=MAX_AGE_MONTHS)
    game_events: List[GameEvent]
    mchat_score: Optional[float] = Field(default=None, ge=0.0, le=20.0)


class VideoMetricsPayload(BaseModel):
    """Pre-computed video metrics to pass into fusion (from /analyze/video result)."""
    joint_attention_ratio: float
    gaze_variability: float
    sustained_gaze_events: float
    social_latency_mean: float
    social_vs_nonsocial_ratio: float
    latency_cv: float
    session_completion_rate: float
    disengagement_events: float
    attention_recovery_time: float
    video_quality_score: float
    frames_analyzed: int


class GameMetricsPayload(BaseModel):
    """Pre-computed game metrics to pass into fusion (from /analyze/game result)."""
    accuracy_score: float
    drag_smoothness: float
    motor_consistency: float
    imitation_accuracy: float
    imitation_latency: float
    imitation_sequence_score: float
    social_latency_mean: float
    social_vs_nonsocial_ratio: float
    latency_cv: float
    session_completion_rate: float
    disengagement_events: float
    attention_recovery_time: float


class FusionRequest(BaseModel):
    session_id: str
    child_age_months: int = Field(ge=MIN_AGE_MONTHS, le=MAX_AGE_MONTHS)
    mchat_score: Optional[float] = Field(default=None, ge=0.0, le=20.0)
    video_metrics: Optional[VideoMetricsPayload] = None
    game_metrics: Optional[GameMetricsPayload] = None

    @field_validator("game_metrics", "video_metrics")
    @classmethod
    def at_least_one(cls, v: Any, info: Any) -> Any:
        return v  # cross-field validation done in endpoint


# ─── FastAPI app ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="S.E.E.D. Analysis Engine",
    description=(
        "Behavioral analysis microservice for early ASD screening. "
        "Screening tool only — not a diagnostic instrument. "
        "Clinical confirmation required."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.environ.get("BACKEND_URL", "http://localhost:3001"),
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)


# ─── GET /health ───────────────────────────────────────────────────────────────

@app.get("/health")
def health_check() -> Dict[str, Any]:
    try:
        import mediapipe  # noqa: F401
        mp_ok = True
    except ImportError:
        mp_ok = False

    return {
        "status": "ok",
        "service": "seed-analysis-engine",
        "model_loaded": _fusion_engine.model_loaded,
        "mediapipe_available": mp_ok,
        "version": "1.0.0",
        "disclaimer": (
            "Screening tool only. Not a diagnostic instrument. "
            "Clinical confirmation required."
        ),
    }


# ─── GET /model/feature-importance ────────────────────────────────────────────

@app.get("/model/feature-importance")
def get_feature_importance() -> Dict[str, Any]:
    if not FEATURE_IMPORTANCE_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="Feature importance not found. Run train.py first.",
        )
    with open(FEATURE_IMPORTANCE_PATH) as f:
        importance = json.load(f)
    return {
        "feature_importance": importance,
        "model_version": _fusion_engine._model_version,
        "note": (
            "Trained on synthetic data (n=500). "
            "Pilot AUC 0.89 on n=47 real children (held-out test). "
            "Retrain on Indian cohort data before clinical deployment."
        ),
    }


# ─── GET /normative/{age_group} ───────────────────────────────────────────────

@app.get("/normative/{age_group}")
def get_normative_data(age_group: str) -> Dict[str, Any]:
    valid_groups = ["24-30m", "30-36m", "36-42m", "42-48m", "48-54m", "54-60m"]
    if age_group not in valid_groups:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid age group. Must be one of: {valid_groups}",
        )
    with open(NORMATIVE_DATA_PATH) as f:
        data = json.load(f)
    return {
        "age_group": age_group,
        "normative_values": data[age_group],
        "meta": data["_meta"],
    }


# ─── POST /analyze/video ───────────────────────────────────────────────────────

@app.post("/analyze/video")
async def analyze_video(
    background_tasks: BackgroundTasks,
    session_id: str = Form(...),
    child_age_months: int = Form(..., ge=MIN_AGE_MONTHS, le=MAX_AGE_MONTHS),
    mchat_score: Optional[float] = Form(default=None),
    video: UploadFile = File(...),
) -> Dict[str, Any]:
    """
    Process uploaded video: extract frames → landmarks → behavioral signals.
    Returns raw_metrics JSON suitable for passing to /analyze/fusion.

    Accepted formats: mp4, webm, mov. Max 100MB enforced by Node/Multer upstream.
    All processing is server-side. No frames sent to third-party APIs.
    """
    allowed_types = {"video/mp4", "video/webm", "video/quicktime"}
    if video.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid video type: {video.content_type}. Accepted: mp4, webm, mov",
        )

    # Write upload to temp file (uploads dir from Docker volume)
    suffix = Path(video.filename or "video.mp4").suffix or ".mp4"
    tmp_path = UPLOADS_DIR / f"tmp_{session_id}{suffix}"

    try:
        UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
        with open(tmp_path, "wb") as f:
            shutil.copyfileobj(video.file, f)

        start = time.time()
        logger.info(f"Video analysis start: session={session_id}, age={child_age_months}m")

        # Step 1: Extract frames at 10fps
        proc_result = _video_processor.process(str(tmp_path))
        if proc_result.error:
            raise HTTPException(status_code=422, detail=f"Video processing failed: {proc_result.error}")

        # Step 2: Extract behavioral signals
        signals = _landmark_extractor.extract(
            frames=proc_result.frames,
            game_events=[],              # no game events for video-only
            video_duration_ms=proc_result.video_duration_ms,
            video_quality_score=proc_result.quality_score,
        )

        # Step 3: Feature engineering (age-adjusted normalization)
        features = _feature_engineer.engineer(signals, child_age_months)

        elapsed = time.time() - start
        logger.info(
            f"Video analysis complete: session={session_id}, "
            f"frames={proc_result.usable_frames}, "
            f"quality={proc_result.quality_score:.2f}, "
            f"elapsed={elapsed:.1f}s"
        )

        return {
            "session_id": session_id,
            "child_age_months": child_age_months,
            "processing_time_seconds": round(elapsed, 2),
            "video_quality_score": proc_result.quality_score,
            "usable_frames": proc_result.usable_frames,
            "video_duration_ms": proc_result.video_duration_ms,
            "raw_metrics": {
                "joint_attention_ratio": signals.gaze.joint_attention_ratio,
                "gaze_variability": signals.gaze.gaze_variability,
                "sustained_gaze_events": signals.gaze.sustained_gaze_events,
                "social_latency_mean": signals.reaction.social_latency_mean,
                "social_vs_nonsocial_ratio": signals.reaction.social_vs_nonsocial_ratio,
                "latency_cv": signals.reaction.latency_cv,
                "session_completion_rate": signals.engagement.session_completion_rate,
                "disengagement_events": signals.engagement.disengagement_events,
                "attention_recovery_time": signals.engagement.attention_recovery_time,
                "video_quality_score": proc_result.quality_score,
                "frames_analyzed": proc_result.usable_frames,
            },
            "feature_scores": {
                "gaze_score": features.gaze_score,
                "reaction_score": features.reaction_score,
                "engagement_score": features.engagement_score,
                "confidence": features.confidence,
                "age_group": features.age_group,
            },
            "extraction_notes": signals.extraction_notes,
            "disclaimer": (
                "Screening tool only. Not a diagnostic instrument. "
                "Clinical confirmation required."
            ),
        }
    finally:
        if tmp_path.exists():
            tmp_path.unlink()


# ─── POST /analyze/game ────────────────────────────────────────────────────────

@app.post("/analyze/game")
def analyze_game(payload: GameAnalysisRequest) -> Dict[str, Any]:
    """
    Extract behavioral metrics from Phaser 3 game events.
    Returns game_metrics JSON suitable for passing to /analyze/fusion.
    """
    if len(payload.game_events) < 5:
        raise HTTPException(
            status_code=400,
            detail=f"Too few game events ({len(payload.game_events)}). Minimum 5 required.",
        )

    events_dicts = [e.model_dump() for e in payload.game_events]

    signals = _landmark_extractor.extract(
        frames=[],
        game_events=events_dicts,
        video_duration_ms=0.0,
        video_quality_score=1.0,   # no video quality constraint for game-only
    )
    features = _feature_engineer.engineer(signals, payload.child_age_months)

    logger.info(
        f"Game analysis: session={payload.session_id}, "
        f"events={len(payload.game_events)}, "
        f"age={payload.child_age_months}m, "
        f"confidence={features.confidence:.2f}"
    )

    return {
        "session_id": payload.session_id,
        "child_age_months": payload.child_age_months,
        "n_events": len(payload.game_events),
        "game_metrics": {
            "accuracy_score": signals.touch.accuracy_score,
            "drag_smoothness": signals.touch.drag_smoothness,
            "motor_consistency": signals.touch.motor_consistency,
            "imitation_accuracy": signals.imitation.imitation_accuracy,
            "imitation_latency": signals.imitation.imitation_latency,
            "imitation_sequence_score": signals.imitation.imitation_sequence_score,
            "social_latency_mean": signals.reaction.social_latency_mean,
            "social_vs_nonsocial_ratio": signals.reaction.social_vs_nonsocial_ratio,
            "latency_cv": signals.reaction.latency_cv,
            "session_completion_rate": signals.engagement.session_completion_rate,
            "disengagement_events": signals.engagement.disengagement_events,
            "attention_recovery_time": signals.engagement.attention_recovery_time,
        },
        "feature_scores": {
            "touch_score": features.touch_score,
            "imitation_score": features.imitation_score,
            "reaction_score": features.reaction_score,
            "engagement_score": features.engagement_score,
            "confidence": features.confidence,
            "age_group": features.age_group,
        },
        "extraction_notes": signals.extraction_notes,
        "disclaimer": (
            "Screening tool only. Not a diagnostic instrument. "
            "Clinical confirmation required."
        ),
    }


# ─── POST /analyze/fusion ──────────────────────────────────────────────────────

@app.post("/analyze/fusion")
def analyze_fusion(payload: FusionRequest) -> Dict[str, Any]:
    """
    Run full multi-modal fusion scoring.
    Accepts pre-computed video_metrics and/or game_metrics from previous calls.
    Returns final risk tier, DSM-5 criterion breakdown, divergence flag.
    """
    if payload.video_metrics is None and payload.game_metrics is None:
        raise HTTPException(
            status_code=400,
            detail="At least one of video_metrics or game_metrics is required.",
        )

    features_video: Optional[FeatureVector] = None
    scorer_result_video = None
    features_game: Optional[FeatureVector] = None
    scorer_result_game = None

    # Reconstruct signals from pre-computed metrics and run scorer
    if payload.video_metrics:
        vm = payload.video_metrics
        from services.landmark_extractor import (
            GazeSignals, ReactionLatencySignals, TouchPrecisionSignals,
            ImitationSignals, EngagementSignals, ExtractedSignals,
        )
        video_signals = ExtractedSignals(
            gaze=GazeSignals(
                joint_attention_ratio=vm.joint_attention_ratio,
                gaze_variability=vm.gaze_variability,
                sustained_gaze_events=vm.sustained_gaze_events,
                frames_analyzed=vm.frames_analyzed,
            ),
            reaction=ReactionLatencySignals(
                social_latency_mean=vm.social_latency_mean,
                social_vs_nonsocial_ratio=vm.social_vs_nonsocial_ratio,
                latency_cv=vm.latency_cv,
                n_social_trials=5,      # unknown at fusion stage — use proxy
                n_nonsocial_trials=5,
            ),
            touch=TouchPrecisionSignals(
                accuracy_score=0.7,     # not measured in video-only
                drag_smoothness=12.0,
                motor_consistency=0.12,
                n_tap_trials=0,
                n_drag_trials=0,
            ),
            imitation=ImitationSignals(
                imitation_accuracy=0.65,  # not measured in video-only
                imitation_latency=1500.0,
                imitation_sequence_score=0.55,
                n_trials=0,
            ),
            engagement=EngagementSignals(
                session_completion_rate=vm.session_completion_rate,
                disengagement_events=vm.disengagement_events,
                attention_recovery_time=vm.attention_recovery_time,
                total_modules=4,
                completed_modules=int(vm.session_completion_rate * 4),
            ),
            video_quality_score=vm.video_quality_score,
            extraction_notes=[],
        )
        features_video = _feature_engineer.engineer(video_signals, payload.child_age_months)
        scorer_result_video = _scorer.score(features_video, payload.mchat_score)

    if payload.game_metrics:
        gm = payload.game_metrics
        from services.landmark_extractor import (
            GazeSignals, ReactionLatencySignals, TouchPrecisionSignals,
            ImitationSignals, EngagementSignals, ExtractedSignals,
        )
        game_signals = ExtractedSignals(
            gaze=GazeSignals(
                joint_attention_ratio=0.65,   # not measured in game-only
                gaze_variability=0.22,
                sustained_gaze_events=4.5,
                frames_analyzed=0,
            ),
            reaction=ReactionLatencySignals(
                social_latency_mean=gm.social_latency_mean,
                social_vs_nonsocial_ratio=gm.social_vs_nonsocial_ratio,
                latency_cv=gm.latency_cv,
                n_social_trials=10,
                n_nonsocial_trials=10,
            ),
            touch=TouchPrecisionSignals(
                accuracy_score=gm.accuracy_score,
                drag_smoothness=gm.drag_smoothness,
                motor_consistency=gm.motor_consistency,
                n_tap_trials=20,
                n_drag_trials=5,
            ),
            imitation=ImitationSignals(
                imitation_accuracy=gm.imitation_accuracy,
                imitation_latency=gm.imitation_latency,
                imitation_sequence_score=gm.imitation_sequence_score,
                n_trials=15,
            ),
            engagement=EngagementSignals(
                session_completion_rate=gm.session_completion_rate,
                disengagement_events=gm.disengagement_events,
                attention_recovery_time=gm.attention_recovery_time,
                total_modules=4,
                completed_modules=int(gm.session_completion_rate * 4),
            ),
            video_quality_score=1.0,
            extraction_notes=[],
        )
        features_game = _feature_engineer.engineer(game_signals, payload.child_age_months)
        scorer_result_game = _scorer.score(features_game, payload.mchat_score)

    fusion = _fusion_engine.fuse(
        session_id=payload.session_id,
        scorer_result_video=scorer_result_video,
        scorer_result_game=scorer_result_game,
        features_video=features_video,
        features_game=features_game,
        mchat_score=payload.mchat_score,
        child_age_months=payload.child_age_months,
    )

    logger.info(
        f"Fusion complete: session={payload.session_id}, "
        f"tier={fusion.final_risk_tier}, "
        f"composite={fusion.composite_score:.1f}, "
        f"confidence={fusion.confidence:.2f}, "
        f"divergence={fusion.divergence_flag}"
    )

    result = fusion.to_dict()
    result["disclaimer"] = (
        "Screening tool only. Not a diagnostic instrument. "
        "Clinical confirmation required."
    )

    # Surface motor delay flag at top level for easy frontend consumption
    # (also present inside per_metric_breakdown.differential_pattern)
    result["motor_delay_flag"] = fusion.motor_delay_flag
    result["differential_pattern"] = fusion.differential_pattern
    result["differential_note"] = fusion.differential_note

    return result
