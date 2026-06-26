# S.E.E.D. — Social Emotional Early Detection

> **Screening tool only. Not a medical diagnosis. Clinical confirmation required.**

S.E.E.D. is a digital developmental screening platform for children aged 18 months to 5 years, designed for the Indian market. It assists qualified clinicians in identifying children who may benefit from further developmental evaluation. It does not diagnose any condition.

**Current status:** Pilot phase. Clinical validation is in planning; accuracy metrics (AUC 0.89) are derived from a pilot cohort of n=47 and should be interpreted accordingly.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Setup — Docker Compose](#2-setup--docker-compose)
3. [Setup — Manual (No Docker)](#3-setup--manual-no-docker)
4. [Environment Variables](#4-environment-variables)
5. [API Documentation](#5-api-documentation)
6. [Analysis Engine Architecture](#6-analysis-engine-architecture)
7. [ML Model Training](#7-ml-model-training)
8. [Known Limitations and Disclaimers](#8-known-limitations-and-disclaimers)

---

## 1. Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  Frontend       │────▶│  Backend API    │────▶│  Analysis Engine │
│  React/Vite     │     │  Node/Express   │     │  FastAPI/Python   │
│  :5173          │     │  :3001          │     │  :8001            │
└─────────────────┘     └────────┬────────┘     └──────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
             ┌──────────┐ ┌──────────┐ ┌──────────┐
             │PostgreSQL│ │  Redis   │ │  Uploads │
             │   :5432  │ │  :6379   │ │  /uploads│
             └──────────┘ └──────────┘ └──────────┘
```

**Frontend** — React 18 + TypeScript + Vite. Tailwind CSS, Framer Motion, Recharts, Zustand. Three role-based interfaces: Parent, Clinician, Admin. Phaser 3 clinical game ("Buddy's World") runs entirely in-browser.

**Backend API** — Node.js + Express + TypeScript. Prisma ORM on PostgreSQL. Bull/Redis queue for async video analysis jobs. Socket.io for real-time analysis progress. JWT access tokens (in-memory) + httpOnly refresh cookie rotation.

**Analysis Engine** — FastAPI + Python. MediaPipe Face Mesh for video landmark extraction. XGBoost for fusion scoring. Exposes REST endpoints consumed by the backend queue worker.

---

## 2. Setup — Docker Compose

### Prerequisites
- Docker Desktop ≥ 4.x
- Docker Compose v2

### Steps

```bash
# Clone the repository
git clone https://github.com/monishkanna123098-byte/SEED.git
cd SEED/seed-platform

# Copy and configure environment variables
cp .env.example .env
# Edit .env — see Section 4 for required variables

# Build and start all services
docker compose up --build

# In a separate terminal, run database migrations and seed
docker compose exec backend npx prisma migrate dev
docker compose exec backend npx prisma db seed
```

Services will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Analysis Engine: http://localhost:8001

### Seeded accounts

After running `prisma db seed`:

| Email | Password | Role |
|---|---|---|
| `admin@seed-platform.in` | `Admin@SEED2024` | Admin |
| `dr.priya.rajan@seed-platform.in` | `Clinician@SEED2024` | Clinician |
| `dr.arjun.mehta@seed-platform.in` | `Clinician@SEED2024` | Clinician |
| `kavithasuresh@gmail.com` | `Parent@SEED2024` | Parent |
| `rameshkrishnan@gmail.com` | `Parent@SEED2024` | Parent |

> **Gmail dot normalisation:** express-validator's `normalizeEmail()` strips dots from Gmail local parts on login. Seeded parent emails have already had dots removed to match.

### Pending migrations after feature branches

If you have applied Stage 5A or 5B output files, run:

```bash
docker compose exec backend npx prisma migrate dev --name add_auth_event_notification_partial
```

This creates the `AuthEvent` table, `Notification` table, and `PARTIAL_ANALYSIS` enum value.

---

## 3. Setup — Manual (No Docker)

### Prerequisites
- Node.js ≥ 20
- Python ≥ 3.10
- PostgreSQL ≥ 15 running locally
- Redis ≥ 7 running locally

### Backend

```bash
cd seed-platform/backend
npm install
cp .env.example .env   # configure DATABASE_URL and REDIS_URL
npx prisma migrate dev
npx prisma db seed
npm run dev            # starts on :3001
```

### Frontend

```bash
cd seed-platform/frontend
npm install
cp .env.example .env   # set VITE_API_URL=http://localhost:3001
npm run dev            # starts on :5173
```

### Analysis Engine

```bash
cd seed-platform/analysis-engine
pip install -r requirements.txt --break-system-packages
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

---

## 4. Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✓ | PostgreSQL connection string. Format: `postgresql://user:pass@host:5432/seed` |
| `REDIS_URL` | ✓ | Redis connection string. Format: `redis://host:6379`. Used by Bull queue and session cache. |
| `JWT_ACCESS_SECRET` | ✓ | Secret for signing 15-minute access tokens. Min 32 chars. |
| `JWT_REFRESH_SECRET` | ✓ | Secret for signing 7-day refresh tokens. Must differ from access secret. |
| `ANALYSIS_ENGINE_URL` | ✓ | Base URL of the FastAPI analysis engine. Default: `http://analysis-engine:8001` |
| `FRONTEND_URL` | ✓ | Frontend origin for CORS. Default: `http://localhost:5173` |
| `SMTP_HOST` | ✓ | SMTP server for email verification. |
| `SMTP_PORT` | ✓ | SMTP port (typically 587 for TLS). |
| `SMTP_USER` | ✓ | SMTP authentication username. |
| `SMTP_PASS` | ✓ | SMTP authentication password. |
| `SMTP_FROM` | ✓ | Sender address for verification emails. E.g. `noreply@seed-platform.in` |
| `UPLOADS_DIR` | | Absolute path for video upload storage. Default: `./uploads` |
| `NODE_ENV` | | Set to `production` to enable secure cookies and production logging. |
| `PORT` | | HTTP port. Default: `3001` |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | | Backend API base URL. Omit for same-origin. Default: empty (uses relative `/api`) |

### Analysis Engine (`analysis-engine/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✓ | Same PostgreSQL connection string as backend (for normative baseline reads). |
| `MODEL_PATH` | | Path to trained XGBoost model file. Default: `./models/seed_xgb.json` |
| `NORMATIVE_DATA_PATH` | | Path to normative baselines JSON. Default: `./models/normative_data.json` |

---

## 5. API Documentation

All endpoints except `/api/auth/*` and `GET /` require `Authorization: Bearer <accessToken>`.

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | None | Register parent or clinician. Parents require a valid `inviteCode`. |
| POST | `/login` | None | Returns `accessToken` + sets `seed_refresh` httpOnly cookie. |
| POST | `/refresh` | Cookie | Rotates refresh token. Returns new `accessToken`. |
| POST | `/logout` | Bearer | Revokes refresh token, blacklists access token. |
| POST | `/verify-email/:token` | None | Marks email as verified. Token is UUID sent by email. |
| GET | `/me` | Bearer | Returns current user profile. |
| POST | `/validate-invite` | None | Preview invite code validity before registration. |
| POST | `/clinician/invite-code` | Clinician | Generate a new 6-char parent invite code. |
| GET | `/clinician/invite-codes` | Clinician | List all generated invite codes. |

**Login request:**
```json
{ "email": "kavithasuresh@gmail.com", "password": "Parent@SEED2024" }
```
**Login response:**
```json
{
  "accessToken": "eyJ...",
  "user": { "id": "uuid", "email": "...", "name": "...", "role": "PARENT", "isEmailVerified": true }
}
```

### Children — `/api/children`

Requires PARENT role.

| Method | Path | Description |
|---|---|---|
| GET | `/` | List all children belonging to the authenticated parent. |
| POST | `/` | Create a new child profile. `clinicianId` auto-assigned from parent's account. |

**POST `/api/children` request:**
```json
{
  "name": "Aryan",
  "dateOfBirth": "2022-06-15",
  "gender": "MALE"
}
```

### Screening — `/api/screening`

Requires Bearer auth. Ownership enforced on every route.

| Method | Path | Description |
|---|---|---|
| POST | `/start` | Create a screening session. Returns `{ sessionId }`. |
| POST | `/mchat` | Save M-CHAT-R/F answers and score. |
| POST | `/upload-video` | Upload video (multipart, max 100MB). Queues analysis job asynchronously. Returns `{ sessionId, jobId }`. |
| POST | `/game-complete` | Submit Buddy's World game completion payload. |
| GET | `/:id/status` | Poll session status. |
| GET | `/:id/results` | Fetch full results (only populated when `status === COMPLETE` or `PARTIAL_ANALYSIS`). |
| GET | `/history/:childId` | All sessions for a child. |

**POST `/screening/start` response:**
```json
{ "sessionId": "uuid", "status": "PENDING", "sessionType": "COMBINED", "createdAt": "..." }
```

**GET `/screening/:id/results` response (COMPLETE):**
```json
{
  "sessionId": "uuid",
  "status": "COMPLETE",
  "riskTier": "ELEVATED",
  "compositeScore": 41.2,
  "criterionAScore": 22,
  "criterionBScore": 19,
  "mChatScore": 12,
  "referralStatus": "NONE",
  "disclaimer": "Screening tool only. Not a diagnostic instrument. Clinical confirmation required."
}
```

### Clinician — `/api/clinician`

Requires CLINICIAN or ADMIN role.

| Method | Path | Description |
|---|---|---|
| GET | `/dashboard` | Sessions pending review, stats summary. |
| GET | `/patients` | All children assigned to this clinician. |
| POST | `/sessions/:id/notes` | Save clinical notes. |
| POST | `/sessions/:id/override` | Override risk tier with documented reason. |
| PATCH | `/sessions/:id/referral` | Update referral status. Triggers REFERRAL_SCHEDULED notification. |

### Notifications — `/api/notifications`

Requires Bearer auth.

| Method | Path | Description |
|---|---|---|
| GET | `/` | Returns `{ notifications[], unreadCount }`. Max 50 items. |
| PATCH | `/:id/read` | Mark a single notification as read. |
| PATCH | `/read-all` | Mark all notifications as read. |

### Socket.io Events

Connect with `withCredentials: true`. After connecting, emit `join-session` with the `sessionId` to receive progress events for that analysis job.

**Client → Server:**
```
join-session   { sessionId: string }
```

**Server → Client:**
```
analysis:started   { sessionId, jobId }
analysis:progress  { sessionId, stage, percent }
  stage: 'extracting_frames' | 'computing_gaze' | 'analyzing_game' | 'running_model' | 'generating_report'
analysis:complete  { sessionId, riskTier, score }
analysis:failed    { sessionId, error }
```

---

## 6. Analysis Engine Architecture

### Pipeline Overview

```
Video file ──────────────────────────────────┐
                                             ▼
                                   landmark_extractor.py
                                   (MediaPipe Face Mesh)
                                         │
                                         ▼
Game events (JSON) ─────────────▶  feature_engineer.py
                                   (15-feature vector)
                                         │
M-CHAT-R/F score ─────────────────▶  fusion_engine.py
                                         │
                              ┌──────────┴──────────┐
                              ▼                     ▼
                          scorer.py            XGBoost model
                       (rule-based)           (seed_xgb.json)
                              │                     │
                              └──────────┬──────────┘
                                         ▼
                                   FusionResult
                              (60% rule / 40% XGB)
```

### Feature Vector (15 fields)

Computed by `feature_engineer.py` from video landmarks and game events:

| Feature | Range | Source |
|---|---|---|
| `gaze_score` | 0–10 | Video: eye tracking via Face Mesh |
| `reaction_score` | 0–10 | Video: response latency to social stimuli |
| `touch_score` | 0–10 | Game: tap precision on Module 3 (Sort) |
| `drag_smoothness_score` | 0–10 | Game: drag path deviation |
| `motor_consistency_score` | 0–10 | Game: inter-trial motor variance |
| `imitation_score` | 0–10 | Game: Module 2 (Imitate) accuracy |
| `engagement_score` | 0–10 | Combined: completion rate + disengagements |
| `gaze_flag` | bool | Score exceeds age-norm threshold |
| `latency_flag` | bool | Reaction score exceeds threshold |
| `precision_flag` | bool | Touch score exceeds threshold |
| `imitation_flag` | bool | Imitation score exceeds threshold |
| `engagement_flag` | bool | Engagement score exceeds threshold |
| `confidence` | 0–1 | Proportion of features from real data vs. defaults |
| `is_low_confidence` | bool | `confidence < 0.60` |
| `age_group` | str | E.g. `'36-42m'` |

### DSM-5 Criterion Scoring

`scorer.py` maps features to DSM-5 criterion scores:

| Criterion | Formula | Max |
|---|---|---|
| A1 — Social reciprocity | `gaze×0.6 + reaction×0.4` | ~10 |
| A2 — Nonverbal communication | `gaze×0.7 + engagement×0.3` | ~10 |
| A3 — Relationships | `imitation×0.8 + touch×0.2` | ~10 |
| B1 — Stereotyped movements | `10 − motor_consistency` | ~10 |
| B2 — Insistence on sameness | `rigidity×0.5 + social_ratio×0.5` | ~10 |
| B3 — Restricted interests | `sustained_gaze×0.6 + gaze_variability×0.4` | ~10 |
| B4 — Sensory reactivity | `disengagement×0.5 + recovery×0.5` | ~10 |

**Composite score:** sum of all 7 criteria (max 70).

### Risk Tier Thresholds

| Composite Score | Tier |
|---|---|
| < 20 | `MONITOR_CLOSELY` (mapped to `MONITOR` in Prisma) |
| 20–35 | `INDETERMINATE` |
| ≥ 35 | `ELEVATED` |
| Confidence < 0.60 | `INSUFFICIENT_DATA` (mapped to `INDETERMINATE`) |

### Fusion Modality Weights

| Modality | Video | Game | M-CHAT-R |
|---|---|---|---|
| Video only | 80% | — | 20% |
| Game only | — | 80% | 20% |
| Both | 45% | 35% | 20% |

Final score = 60% rule-based composite + 40% XGBoost probability blend.

### Differential Pattern (Motor vs. ASD)

The differential scorer uses **game features only** (not video) for motor domain analysis. This is intentional: video analysis uses neutral motor defaults where real motor data is unavailable, which would permanently suppress `MOTOR_DELAY_PATTERN` detection. Game features (tap coordinates, drag paths, precision) provide real motor data for differential scoring.

| Pattern | Condition |
|---|---|
| `MOTOR_DELAY_PATTERN` | Motor domain elevated; social communication intact |
| `ASD_PROFILE` | Social communication domain primarily elevated |
| `MIXED_PATTERN` | Both domains elevated |
| `TYPICAL_PATTERN` | All scores within normative range |

### Graceful Degradation

If video analysis fails (engine timeout, corrupt file, MediaPipe error), the pipeline does **not** fail the session. The worker continues with game + M-CHAT data only and sets `SessionStatus.PARTIAL_ANALYSIS`. The result is reviewable by the clinician, flagged as incomplete video pipeline.

---

## 7. ML Model Training

A training script exists at `analysis-engine/train.py`.

```bash
cd seed-platform/analysis-engine

# Install dependencies
pip install -r requirements.txt --break-system-packages

# Run training
# Expects a CSV of labelled feature vectors at data/training_data.csv
# Outputs seed_xgb.json to models/
python train.py --data data/training_data.csv --output models/seed_xgb.json
```

**Current model status:** The model shipped in `models/seed_xgb.json` was trained on a pilot cohort of n=47 children. This is insufficient for clinical validation. The model should be retrained on a larger, India-collected dataset before any clinical deployment.

**Feature format for training data:** The CSV should contain one row per session with the 15 features listed in Section 6, plus a `label` column (`0` = no concern, `1` = concern flagged by clinician).

---

## 8. Known Limitations and Disclaimers

### Clinical

- **S.E.E.D. is a screening support tool, not a diagnostic instrument.** A result, including an ELEVATED risk tier, is not a diagnosis of autism spectrum disorder or any other condition. All results require review by a qualified healthcare professional.
- **Accuracy metrics are preliminary.** The AUC of 0.89 was derived from a pilot cohort of 47 children. This has not been validated in a large-scale clinical trial. Screening carries inherent false-positive and false-negative rates.
- **Normative baseline data is approximate.** All 35 normative baseline entries (7 age groups × 5 metrics) are derived from Western and Indian literature with conservative standard deviation adjustments. They are marked `[APPROXIMATE]` in the seed data. These must be replaced with India-collected normative data before clinical deployment.
- **The M-CHAT-R/F questionnaire is used under licence.** The instrument is the intellectual property of Robins, Fein & Barton. A distribution licence must be obtained from `mchatscreen2009@gmail.com` before any public distribution of this platform.

### Technical

- **Video analysis is server-side, not on-device.** Video is uploaded to the backend and processed by the FastAPI analysis engine. It is not processed in the browser.
- **Encryption at rest is not yet implemented.** Transport encryption (TLS) is in place. AES-256 at-rest encryption is planned but not implemented in the current build.
- **Admin contact email must be active before public launch.** `admin@seed-platform.in` is referenced in the Privacy Policy and Terms of Use as the single point of contact for data rights requests, legal enquiries, and security disclosures. This mailbox must be live before any public access.
- **Legal documents require professional review.** The Privacy Policy and Terms of Use were drafted by the engineering team. They must be reviewed by qualified Indian legal counsel before public launch.
- **The legal pages (`/privacy`, `/terms`) and several other features from later build stages may not yet be committed to the main branch.** See the build inventory (`SEED_BUILD_INVENTORY.md`) for the full list of files produced in each stage that need to be committed.

### Regulatory

- S.E.E.D. is designed for compliance with the **Digital Personal Data Protection Act 2023 (India)** and **ABDM** guidelines. It is not designed for HIPAA compliance.
- All child developmental data is treated as sensitive personal data under Schedule II of DPDPA-2023.
- Data is stored within India only.

---

*S.E.E.D. is currently in pilot phase. Not for clinical deployment without further validation.*
