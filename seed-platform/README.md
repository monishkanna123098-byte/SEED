# S.E.E.D. — Social Emotional Early Detection

**AI-powered early ASD screening platform for Indian children aged 2–5.**

> ⚠️ **Screening tool only. Not a diagnostic instrument. Clinical confirmation required.**

---

## Stage 1 — What's Built

| Module | Status |
|---|---|
| Docker Compose (postgres, redis, backend, frontend, analysis-engine) | ✅ |
| Prisma schema — full SEED data model | ✅ |
| Auth: register, login, refresh, logout, verify-email, me | ✅ |
| Clinician invite-code generation + parent validation (DPDPA-2023) | ✅ |
| JWT + refresh token with Redis blacklisting + rotation | ✅ |
| Database seed — admin, 2 clinicians, 4 parents, 8 children | ✅ |
| Indian normative baselines — 7 age groups × 5 metrics | ✅ |
| Frontend auth pages — login, register, verify-email | ✅ |
| FastAPI analysis engine — feature_engineer, scorer, video_analyzer | ✅ |
| Risk tier system — MONITOR / INDETERMINATE / ELEVATED (LOW absent) | ✅ |

---

## Quick Start

```bash
# Start all services
docker compose up --build

# In a second terminal — run migrations and seed
docker compose exec backend npm run db:migrate
docker compose exec backend npm run db:seed
```

### Access

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| Analysis Engine | http://localhost:8001 |
| API docs (FastAPI) | http://localhost:8001/docs |

### Seed credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@seed-platform.in | Admin@SEED2024 |
| Clinician 1 | dr.priya.rajan@seed-platform.in | Clinician@SEED2024 |
| Clinician 2 | dr.arjun.mehta@seed-platform.in | Clinician2@SEED2024 |
| Parent (any) | kavitha.suresh@gmail.com | Parent@SEED2024 |

**Available invite codes:** `PRIYA3`, `PRIYA4`, `ARJUN3`, `ARJUN4`

---

## Architecture

```
seed-platform/
├── frontend/          React 18 + TypeScript + Tailwind + Phaser 3
├── backend/           Node/Express + TypeScript + Prisma + Redis
├── analysis-engine/   FastAPI + XGBoost + MediaPipe Face Mesh
└── docker-compose.yml
```

### Data flow

```
Parent registers (with clinician invite code)
  → Child profile created
  → Screening session initiated
  → Game (Phaser 3) events streamed
  → Bull queue job dispatched to FastAPI (port 8001)
  → Feature extraction → XGBoost scoring → Risk tier
  → Socket.io progress → Results displayed with disclaimer
  → Clinician review + optional override
```

---

## Key Design Decisions

### Risk tiers
`MONITOR` / `INDETERMINATE` / `ELEVATED` — **`LOW` is deliberately absent.**
The system never definitively clears a child. Single-metric divergence (>2 SD below norm)
overrides the composite score to `INDETERMINATE` minimum.

### DPDPA-2023 compliance
Children's health data requires clinician prescription gating under Schedule IV.
Implemented via clinician-generated invite codes that parents must use to register.

### Model honesty
AUC 0.89 is reported on a pilot of n=47 children (80/20 held-out test set).
This is a proof-of-concept figure. The model requires substantially more Indian
cohort data before clinical use. All normative baselines are marked `[APPROXIMATE]`
and must be replaced with India-collected data pre-deployment.

### Citations
- NRC 2001: National Research Council, *Educating Children with Autism*
- Eldevik et al. 2009: Meta-analysis of early behavioural intervention
- Normative baselines: IAP 2015, WHO MGRS 2006, Nair 1991, Juneja 2012 (see seed.ts)

---

## Stage 2 (next)
- Role-specific dashboards (parent / clinician / admin)
- M-CHAT-R/F questionnaire UI
- Video upload + Bull queue integration
- Buddy's World — all 4 Phaser 3 game modules (fully playable)
- Results page with all metrics and disclaimer
- Clinician review workflow + override
