"""
S.E.E.D. Video Processor

Extracts per-frame facial landmark data from child video recordings.
Uses MediaPipe Face Mesh with iris refinement (extended model, 478 landmarks)
for 3D gaze vector estimation.

Key design constraints:
  - 10fps extraction (NOT 30fps) — mobile CPU budget
  - MediaPipe Face Mesh lite model — NOT Holistic
  - Iris landmarks 468-477 for gaze vector (extended model)
  - Gaze via 3D landmark vectors — NOT OpenCV pupil detection
  - Head pose from 6 canonical points via solvePnP
  - Frames with landmark_confidence < 0.6 are dropped
  - All processing server-side, nothing forwarded to third-party APIs

Canonical head pose points (MediaPipe Face Mesh indices):
  Nose tip:     4
  Chin:         152
  Left eye L:   263
  Right eye R:  33
  Left mouth:   287
  Right mouth:  57
"""

from __future__ import annotations
import cv2
import mediapipe as mp
import numpy as np
import logging
from dataclasses import dataclass, field, asdict
from typing import List, Optional, Tuple, Dict, Any
from pathlib import Path

logger = logging.getLogger(__name__)

# ─── MediaPipe setup ──────────────────────────────────────────────────────────
mp_face_mesh = mp.solutions.face_mesh

# Canonical landmark indices for head pose estimation (solvePnP)
POSE_POINT_INDICES = [4, 152, 263, 33, 287, 57]

# 3D model points corresponding to the 6 canonical landmarks
# Approximate face model in mm (generic human face)
FACE_3D_MODEL_POINTS = np.array([
    [0.0,    0.0,    0.0],    # Nose tip (4)
    [0.0,   -63.6, -12.5],   # Chin (152)
    [-43.3,  32.7, -26.0],   # Left eye left corner (263)
    [43.3,   32.7, -26.0],   # Right eye right corner (33)
    [-28.9, -28.9, -24.1],   # Left mouth corner (287)
    [28.9,  -28.9, -24.1],   # Right mouth corner (57)
], dtype=np.float64)

# Iris landmark indices in MediaPipe extended Face Mesh (478 landmarks)
# Right iris center: 468; Left iris center: 473
# Right iris: 468-472; Left iris: 473-477
RIGHT_IRIS_CENTER = 468
LEFT_IRIS_CENTER = 473

# Eye landmarks for openness calculation
LEFT_EYE_TOP = 159
LEFT_EYE_BOTTOM = 145
RIGHT_EYE_TOP = 386
RIGHT_EYE_BOTTOM = 374
LEFT_EYE_OUTER = 33
LEFT_EYE_INNER = 133
RIGHT_EYE_OUTER = 362
RIGHT_EYE_INNER = 263

MOUTH_TOP = 13
MOUTH_BOTTOM = 14

# Target processing frame rate (10fps for CPU budget)
TARGET_FPS = 10
MIN_LANDMARK_CONFIDENCE = 0.6


@dataclass
class FrameData:
    frame_id: int
    timestamp_ms: float
    gaze_vector_x: float
    gaze_vector_y: float
    gaze_vector_z: float
    head_yaw: float     # degrees, positive = looking right
    head_pitch: float   # degrees, positive = looking down
    head_roll: float    # degrees, positive = tilting right
    left_eye_openness: float   # 0-1
    right_eye_openness: float  # 0-1
    mouth_openness: float      # 0-1
    landmark_confidence: float

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class VideoProcessingResult:
    frames: List[FrameData]
    total_frames_read: int
    usable_frames: int
    quality_score: float     # proportion of usable frames
    video_duration_ms: float
    processing_fps: float
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "frames": [f.to_dict() for f in self.frames],
            "total_frames_read": self.total_frames_read,
            "usable_frames": self.usable_frames,
            "quality_score": self.quality_score,
            "video_duration_ms": self.video_duration_ms,
            "processing_fps": self.processing_fps,
            "error": self.error,
        }


def _get_camera_matrix(frame_w: int, frame_h: int) -> np.ndarray:
    """Approximate camera intrinsics from frame dimensions."""
    focal_length = frame_w
    center = (frame_w / 2, frame_h / 2)
    return np.array([
        [focal_length, 0,            center[0]],
        [0,            focal_length, center[1]],
        [0,            0,            1        ],
    ], dtype=np.float64)


def _estimate_head_pose(
    landmarks: Any, frame_w: int, frame_h: int
) -> Tuple[float, float, float]:
    """
    Estimate head pose (yaw, pitch, roll) using solvePnP with 6 canonical points.

    Returns:
        (yaw_degrees, pitch_degrees, roll_degrees)
    """
    image_points = np.array([
        [landmarks[i].x * frame_w, landmarks[i].y * frame_h]
        for i in POSE_POINT_INDICES
    ], dtype=np.float64)

    camera_matrix = _get_camera_matrix(frame_w, frame_h)
    dist_coeffs = np.zeros((4, 1), dtype=np.float64)

    success, rotation_vec, _ = cv2.solvePnP(
        FACE_3D_MODEL_POINTS,
        image_points,
        camera_matrix,
        dist_coeffs,
        flags=cv2.SOLVEPNP_ITERATIVE,
    )

    if not success:
        return 0.0, 0.0, 0.0

    rotation_matrix, _ = cv2.Rodrigues(rotation_vec)
    # Decompose rotation matrix to Euler angles
    sy = np.sqrt(rotation_matrix[0, 0]**2 + rotation_matrix[1, 0]**2)
    singular = sy < 1e-6

    if not singular:
        pitch = np.arctan2(rotation_matrix[2, 1], rotation_matrix[2, 2])
        yaw   = np.arctan2(-rotation_matrix[2, 0], sy)
        roll  = np.arctan2(rotation_matrix[1, 0], rotation_matrix[0, 0])
    else:
        pitch = np.arctan2(-rotation_matrix[1, 2], rotation_matrix[1, 1])
        yaw   = np.arctan2(-rotation_matrix[2, 0], sy)
        roll  = 0.0

    return (
        float(np.degrees(yaw)),
        float(np.degrees(pitch)),
        float(np.degrees(roll)),
    )


def _compute_iris_gaze_vector(
    landmarks: Any, frame_w: int, frame_h: int
) -> Tuple[float, float, float]:
    """
    Compute normalized 3D gaze vector from iris center landmarks.
    Uses the iris center relative to the eye corner landmarks to
    estimate gaze direction as a unit vector.

    Returns:
        (gaze_x, gaze_y, gaze_z) — unit vector, z is depth component
    """
    # Right iris and eye corners
    r_iris = np.array([
        landmarks[RIGHT_IRIS_CENTER].x * frame_w,
        landmarks[RIGHT_IRIS_CENTER].y * frame_h,
        landmarks[RIGHT_IRIS_CENTER].z * frame_w,
    ])
    r_outer = np.array([landmarks[RIGHT_EYE_OUTER].x * frame_w,
                        landmarks[RIGHT_EYE_OUTER].y * frame_h,
                        landmarks[RIGHT_EYE_OUTER].z * frame_w])
    r_inner = np.array([landmarks[RIGHT_EYE_INNER].x * frame_w,
                        landmarks[RIGHT_EYE_INNER].y * frame_h,
                        landmarks[RIGHT_EYE_INNER].z * frame_w])

    # Left iris and eye corners
    l_iris = np.array([
        landmarks[LEFT_IRIS_CENTER].x * frame_w,
        landmarks[LEFT_IRIS_CENTER].y * frame_h,
        landmarks[LEFT_IRIS_CENTER].z * frame_w,
    ])
    l_outer = np.array([landmarks[LEFT_EYE_OUTER].x * frame_w,
                        landmarks[LEFT_EYE_OUTER].y * frame_h,
                        landmarks[LEFT_EYE_OUTER].z * frame_w])
    l_inner = np.array([landmarks[LEFT_EYE_INNER].x * frame_w,
                        landmarks[LEFT_EYE_INNER].y * frame_h,
                        landmarks[LEFT_EYE_INNER].z * frame_w])

    # Eye center as midpoint of inner/outer corners
    r_eye_center = (r_outer + r_inner) / 2.0
    l_eye_center = (l_outer + l_inner) / 2.0

    # Iris offset from eye center (normalized by eye width)
    r_eye_width = max(np.linalg.norm(r_outer - r_inner), 1e-6)
    l_eye_width = max(np.linalg.norm(l_outer - l_inner), 1e-6)

    r_offset = (r_iris - r_eye_center) / r_eye_width
    l_offset = (l_iris - l_eye_center) / l_eye_width

    # Average both eyes for more robust estimate
    gaze_raw = (r_offset + l_offset) / 2.0

    # Normalize to unit vector
    magnitude = np.linalg.norm(gaze_raw)
    if magnitude < 1e-6:
        return 0.0, 0.0, 1.0

    gaze_unit = gaze_raw / magnitude
    return float(gaze_unit[0]), float(gaze_unit[1]), float(gaze_unit[2])


def _compute_eye_openness(landmarks: Any, frame_h: int) -> Tuple[float, float]:
    """
    Compute eye openness ratio for each eye.
    Uses vertical distance between eyelid landmarks normalized by face height.

    Returns:
        (left_openness, right_openness) — 0-1 scale
    """
    l_vertical = abs(landmarks[LEFT_EYE_TOP].y - landmarks[LEFT_EYE_BOTTOM].y)
    r_vertical = abs(landmarks[RIGHT_EYE_TOP].y - landmarks[RIGHT_EYE_BOTTOM].y)

    # Normalize by face height proxy (landmark 10 to 152: forehead to chin)
    face_height = abs(landmarks[10].y - landmarks[152].y)
    if face_height < 1e-6:
        return 0.3, 0.3

    l_openness = float(np.clip(l_vertical / face_height * 8.0, 0.0, 1.0))
    r_openness = float(np.clip(r_vertical / face_height * 8.0, 0.0, 1.0))
    return l_openness, r_openness


def _compute_mouth_openness(landmarks: Any) -> float:
    """Compute mouth openness ratio."""
    vertical = abs(landmarks[MOUTH_TOP].y - landmarks[MOUTH_BOTTOM].y)
    face_height = abs(landmarks[10].y - landmarks[152].y)
    if face_height < 1e-6:
        return 0.0
    return float(np.clip(vertical / face_height * 5.0, 0.0, 1.0))


def _compute_landmark_confidence(face_landmarks: Any, frame_w: int, frame_h: int) -> float:
    """
    Estimate landmark detection confidence based on the proportion of
    landmarks that are within the frame bounds with reasonable z-depth.
    MediaPipe doesn't expose per-detection confidence in Face Mesh,
    so we use this proxy heuristic.
    """
    in_frame = 0
    total = len(face_landmarks.landmark)
    for lm in face_landmarks.landmark:
        if 0.0 <= lm.x <= 1.0 and 0.0 <= lm.y <= 1.0:
            in_frame += 1
    return float(in_frame / max(total, 1))


class VideoProcessor:
    """
    Processes a video file and extracts per-frame facial landmark data
    at TARGET_FPS using MediaPipe Face Mesh with iris refinement.
    """

    def process(self, video_path: str) -> VideoProcessingResult:
        """
        Main entry point. Opens video, extracts frames at TARGET_FPS,
        runs Face Mesh on each, returns list of FrameData.
        """
        path = Path(video_path)
        if not path.exists():
            return VideoProcessingResult(
                frames=[], total_frames_read=0, usable_frames=0,
                quality_score=0.0, video_duration_ms=0.0, processing_fps=0.0,
                error=f"Video not found: {video_path}",
            )

        cap = cv2.VideoCapture(str(path))
        if not cap.isOpened():
            return VideoProcessingResult(
                frames=[], total_frames_read=0, usable_frames=0,
                quality_score=0.0, video_duration_ms=0.0, processing_fps=0.0,
                error="Could not open video file",
            )

        try:
            return self._run_extraction(cap)
        finally:
            cap.release()

    def _run_extraction(self, cap: cv2.VideoCapture) -> VideoProcessingResult:
        video_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total_video_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        video_duration_ms = (total_video_frames / video_fps) * 1000.0

        # How many source frames to skip per extracted frame
        frame_skip = max(1, round(video_fps / TARGET_FPS))

        frames_read = 0
        frame_index = 0
        all_frames: List[FrameData] = []
        dropped_low_confidence = 0

        with mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,      # enables iris landmarks 468-477
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
            model_complexity=0,         # lite model
        ) as face_mesh:

            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                frames_read += 1
                if frames_read % frame_skip != 0:
                    continue

                frame_h, frame_w = frame.shape[:2]
                timestamp_ms = (frames_read / (cap.get(cv2.CAP_PROP_FPS) or 25.0)) * 1000.0

                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frame_rgb.flags.writeable = False
                results = face_mesh.process(frame_rgb)

                if not results.multi_face_landmarks:
                    dropped_low_confidence += 1
                    continue

                face_lm = results.multi_face_landmarks[0]
                landmarks = face_lm.landmark

                # Confidence proxy
                confidence = _compute_landmark_confidence(face_lm, frame_w, frame_h)
                if confidence < MIN_LANDMARK_CONFIDENCE:
                    dropped_low_confidence += 1
                    continue

                # Head pose via solvePnP
                yaw, pitch, roll = _estimate_head_pose(landmarks, frame_w, frame_h)

                # Iris gaze vector (requires refine_landmarks=True)
                try:
                    gaze_x, gaze_y, gaze_z = _compute_iris_gaze_vector(
                        landmarks, frame_w, frame_h
                    )
                except IndexError:
                    # Extended model not available — fallback to head-pose-only gaze
                    gaze_x = float(np.sin(np.radians(yaw)))
                    gaze_y = float(np.sin(np.radians(pitch)))
                    gaze_z = float(np.cos(np.radians(yaw)))

                l_open, r_open = _compute_eye_openness(landmarks, frame_h)
                mouth_open = _compute_mouth_openness(landmarks)

                all_frames.append(FrameData(
                    frame_id=frame_index,
                    timestamp_ms=timestamp_ms,
                    gaze_vector_x=gaze_x,
                    gaze_vector_y=gaze_y,
                    gaze_vector_z=gaze_z,
                    head_yaw=yaw,
                    head_pitch=pitch,
                    head_roll=roll,
                    left_eye_openness=l_open,
                    right_eye_openness=r_open,
                    mouth_openness=mouth_open,
                    landmark_confidence=confidence,
                ))
                frame_index += 1

        total_extracted = frame_index + dropped_low_confidence
        usable = len(all_frames)
        quality = usable / max(total_extracted, 1)

        logger.info(
            f"Video processed: {frames_read} source frames, "
            f"{usable} usable @ {TARGET_FPS}fps target, "
            f"quality={quality:.2f}, "
            f"dropped={dropped_low_confidence}"
        )

        return VideoProcessingResult(
            frames=all_frames,
            total_frames_read=frames_read,
            usable_frames=usable,
            quality_score=float(quality),
            video_duration_ms=video_duration_ms,
            processing_fps=float(TARGET_FPS),
            error=None,
        )
