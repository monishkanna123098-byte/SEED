# S.E.E.D. — Complete Build Inventory
# Generated: Stage 5C complete (bugs fixed: authRoutes double-mount, root route ROLE_HOME, AuthEvent model, inventory)
# Screening tool only. Not a medical diagnosis.
# Clinical confirmation required.

═══════════════════════════════════════════════════════════════
SECTION 1 — PROJECT STRUCTURE
═══════════════════════════════════════════════════════════════

seed-platform/
├── docker-compose.yml
├── README.md
├── SEED_BUILD_INVENTORY.md
├── analysis-engine/
│   ├── Dockerfile
│   ├── main.py
│   ├── requirements.txt
│   ├── train.py
│   ├── models/
│   │   └── normative_data.json
│   └── services/
│       ├── __init__.py
│       ├── feature_engineer.py
│       ├── fusion_engine.py
│       ├── landmark_extractor.py
│       ├── scorer.py
│       └── video_processor.py
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── src/
│       ├── app.ts
│       ├── index.ts
│       ├── middleware/
│       │   ├── auth.middleware.ts
│       │   └── validate.middleware.ts
│       ├── routes/
│       │   ├── auth.routes.ts
│       │   ├── children.routes.ts
│       │   ├── clinician.routes.ts
│       │   ├── notification.routes.ts
│       │   └── screening.routes.ts
│       ├── services/
│       │   └── analysisService.ts
│       └── utils/
│           ├── email.ts
│           ├── jwt.ts
│           ├── logger.ts
│           ├── prisma.ts
│           └── redis.ts
└── frontend/
    ├── .gitignore
    ├── Dockerfile
    ├── index.html
    ├── package.json
    ├── postcss.config.js
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── tsconfig.node.json
    ├── vite.config.ts
    └── src/
        ├── App.tsx
        ├── index.css
        ├── main.tsx
        ├── vite-env.d.ts
        ├── components/
        │   ├── Disclaimer.tsx
        │   ├── MChatQuestionnaire.tsx
        │   ├── NotificationBell.tsx
        │   ├── RouteGuards.tsx
        │   ├── SEEDLogo.tsx
        │   └── parent/
        │       ├── RiskTierBadge.tsx
        │       ├── SessionCard.tsx
        │       └── TrajectoryChart.tsx
        ├── game/
        │   ├── BuddysWorld.tsx
        │   ├── PhaserGame.ts
        │   ├── analytics/
        │   │   └── EventCollector.ts
        │   ├── scenes/
        │   │   ├── BaseGameScene.ts
        │   │   ├── LoadScene.ts
        │   │   ├── MenuScene.ts
        │   │   ├── Module1_Gaze.ts
        │   │   ├── Module2_Imitate.ts
        │   │   ├── Module3_Sort.ts
        │   │   ├── Module4_Follow.ts
        │   │   └── ResultScene.ts
        │   └── utils/
        │       ├── AgeAdapter.ts
        │       ├── BuddySprite.ts
        │       ├── ProgressBar.ts
        │       └── SoundManager.ts
        ├── pages/
        │   ├── admin/
        │   │   ├── AdminAnalyticsPage.tsx
        │   │   ├── AdminDashboard.tsx
        │   │   ├── AdminLayout.tsx
        │   │   ├── ClinicianDetailPage.tsx
        │   │   ├── CliniciansPage.tsx
        │   │   ├── ExportPage.tsx
        │   │   ├── SystemHealthPage.tsx
        │   │   ├── UsersPage.tsx
        │   │   ├── mockClinicians.ts
        │   │   └── mockUsers.ts
        │   ├── auth/
        │   │   ├── LoginPage.tsx
        │   │   ├── RegisterPage.tsx
        │   │   └── VerifyEmailPage.tsx
        │   ├── clinician/
        │   │   ├── AnalyticsPage.tsx
        │   │   ├── ClinicianLayout.tsx
        │   │   ├── DashboardPage.tsx
        │   │   ├── InviteCodesPage.tsx
        │   │   ├── PatientDetailPage.tsx
        │   │   ├── PatientsPage.tsx
        │   │   ├── ReviewPanel.tsx
        │   │   ├── SessionDetailPage.tsx
        │   │   ├── mockPatients.ts
        │   │   └── tabs/
        │   │       ├── AISummary.tsx
        │   │       ├── BehavioralAnalysis.tsx
        │   │       ├── GameData.tsx
        │   │       ├── MChatDetails.tsx
        │   │       ├── TabPlaceholder.tsx
        │   │       └── TrajectoryTab.tsx
        │   ├── dashboard/
        │   │   └── DashboardPage.tsx
        │   ├── errors/
        │   │   └── ErrorPages.tsx
        │   ├── landing/
        │   │   ├── LandingPage.tsx
        │   │   ├── LandingSections.tsx
        │   │   ├── LandingSections2.tsx
        │   │   ├── PrivacyPage.tsx
        │   │   └── TermsPage.tsx
        │   └── parent/
        │       ├── DashboardPage.tsx
        │       ├── HistoryPage.tsx
        │       ├── ParentLayout.tsx
        │       ├── children/
        │       │   ├── AddChildPage.tsx
        │       │   └── ChildSelectorPage.tsx
        │       └── screening/
        │           ├── NewScreeningPage.tsx
        │           ├── Step1_SelectChild.tsx
        │           ├── Step2_MChatWrapper.tsx
        │           ├── Step3_Modality.tsx
        │           ├── Step4a_VideoUpload.tsx
        │           ├── Step4b_Game.tsx
        │           ├── Step5_Processing.tsx
        │           ├── Step6_Results.tsx
        │           └── StepIndicator.tsx
        ├── stores/
        │   ├── authStore.ts         (useAuthStore)
        │   ├── clinicianStore.ts    (useClinicianStore)
        │   └── parentStore.ts       (useParentStore)
        ├── types/
        │   └── index.ts
        └── utils/
            ├── age.ts
            └── api.ts


═══════════════════════════════════════════════════════════════
SECTION 2 — FRONTEND ROUTES  (App.tsx)
═══════════════════════════════════════════════════════════════

PUBLIC
  /                               LandingPage (unauthenticated) | ROLE_HOME[role] (authenticated)
  /login                          LoginPage
  /register                       RegisterPage
  /verify-email                   VerifyEmailPage
  /privacy                        PrivacyPage
  /terms                          TermsPage

PARENT  (ProtectedRoute → ParentLayout)
  /parent                         → redirect /parent/dashboard
  /parent/dashboard               DashboardPage
  /parent/history                 HistoryPage
  /parent/children                ChildSelectorPage
  /parent/children/add            AddChildPage
  /parent/screening/new           NewScreeningPage

CLINICIAN  (ProtectedRoute → ClinicianLayout)
  /clinician                      → redirect /clinician/dashboard
  /clinician/dashboard            ClinicianDashboard
  /clinician/session/:sessionId   SessionDetailPage
  /clinician/patients             PatientsPage
  /clinician/patients/:childId    PatientDetailPage
  /clinician/analytics            AnalyticsPage
  /clinician/invite-codes         InviteCodesPage

ADMIN  (ProtectedRoute → AdminLayout)
  /admin                          → redirect /admin/dashboard
  /admin/dashboard                AdminDashboard
  /admin/users                    UsersPage
  /admin/clinicians               CliniciansPage
  /admin/clinicians/:clinicianId  ClinicianDetailPage
  /admin/analytics                AdminAnalyticsPage
  /admin/system                   SystemHealthPage
  /admin/export                   ExportPage

LEGACY
  /dashboard                      old DashboardPage placeholder

ROOT REDIRECT LOGIC
  ROLE_HOME = { PARENT: '/parent/dashboard', CLINICIAN: '/clinician/dashboard', ADMIN: '/admin/dashboard' }
  Authenticated user → ROLE_HOME[user.role]   (single source of truth, used in App.tsx + LoginPage)
  Unauthenticated    → LandingPage

CATCH-ALL
  *                               NotFoundPage (ErrorPages.tsx)


═══════════════════════════════════════════════════════════════
SECTION 3 — BACKEND API ROUTES
═══════════════════════════════════════════════════════════════

AUTH  (prefix: /api/auth)
  POST /register                  create parent account
  POST /login                     returns accessToken + refreshToken
  POST /refresh                   rotate refresh token
  POST /logout                    invalidate refresh token
  GET  /verify-email/:token       verify email address
  GET  /me                        current user profile
  POST /validate-invite           validate clinician invite code
  POST /clinician/invite-code     create invite code (clinician only)
  GET  /clinician/invite-codes    list invite codes (clinician only)

CHILDREN  (prefix: /api/children)
  GET  /                          list children for authenticated parent
  POST /                          create child → { child }

SCREENING  (prefix: /api/screening)
  POST /start                     create session → { session }
  POST /mchat                     save M-CHAT-R answers + score
  POST /upload-video              Multer 100MB mp4/webm/mov → Bull queue
  POST /game-complete             save GameCompletionPayload
  GET  /:id/status                { session: { status } }
  GET  /:id/results               full session results
  GET  /history/:childId          all sessions for a child

CLINICIAN  (prefix: /api/clinician)
  GET  /dashboard                 stats + pending + activity
  GET  /patients                  all children under this clinician
  POST /sessions/:id/notes        save clinical notes
  POST /sessions/:id/override     override risk tier with note
  PATCH /sessions/:id/referral    update referral status

NOTIFICATIONS  (prefix: /api/notifications)
  GET  /                          list notifications for current user
  PATCH /:id/read                 mark single notification read
  PATCH /read-all                 mark all notifications read

NOTE: /api/clinician mounts clinicianRoutes only.
      The prior double-mount of authRoutes on /api/clinician was removed (bug fix, Stage 5C).


═══════════════════════════════════════════════════════════════
SECTION 4 — ANALYSIS ENGINE ENDPOINTS  (FastAPI :8001)
═══════════════════════════════════════════════════════════════

GET  /health                       { status, model_loaded }
GET  /model/feature-importance     XGBoost feature weights
GET  /normative/{age_group}        normative baselines for age group
POST /analyze/video                multipart → video scoring
POST /analyze/game                 GameCompletionPayload → game scoring
POST /analyze/fusion               combines video+game+mchat → FusionResult


═══════════════════════════════════════════════════════════════
SECTION 5 — SOCKET.IO EVENTS
═══════════════════════════════════════════════════════════════

CLIENT → SERVER
  join-session        (sessionId)     join analysis progress room (maps to job:{jobId} via DB lookup)
  subscribe:job       (jobId)         legacy direct job subscription (internal/testing only)

SERVER → CLIENT
  analysis:progress   { sessionId, stage, progress }
  analysis:complete   { sessionId }
  analysis:error      { sessionId, error }

ROOM NAMING
  job:{analysisJobId}     primary room — analysisService emits here
  session:{sessionId}     fallback room — used when job not yet assigned (race condition)


═══════════════════════════════════════════════════════════════
SECTION 6 — PRISMA SCHEMA  (PostgreSQL)
═══════════════════════════════════════════════════════════════

ENUMS
  UserRole            ADMIN | CLINICIAN | PARENT
  SessionType         VIDEO | GAME | COMBINED
  SessionStatus       PENDING | PROCESSING | COMPLETE | FAILED | PARTIAL_ANALYSIS
  RiskTier            MONITOR | INDETERMINATE | ELEVATED
                      (LOW excluded by design — system never clears a child)
  MetricType          GAZE | REACTION | TOUCH | IMITATION | ENGAGEMENT
  ReferralStatus      NONE | PENDING | SCHEDULED | COMPLETE

MODEL User
  id                  String @id
  email               String @unique
  name                String
  passwordHash        String
  role                UserRole
  isEmailVerified     Boolean
  emailVerifyToken    String?
  passwordResetToken  String?
  passwordResetExpiry DateTime?
  clinicianId         String?         → User (self-ref: parent → clinician)
  inviteCodes         InviteCode[]
  children            Child[]         (ParentChildren)
  assignedChildren    Child[]         (ClinicianChildren)
  notifications       Notification[]
  authEvents          AuthEvent[]
  createdAt           DateTime
  updatedAt           DateTime

MODEL InviteCode
  id          String @id
  code        String @unique
  clinicianId String          → User
  usedBy      String?         (parentId once consumed)
  usedAt      DateTime?
  expiresAt   DateTime
  createdAt   DateTime

MODEL Child
  id           String @id
  name         String
  dateOfBirth  DateTime
  gender       String          'male' | 'female' | 'other'
  parentId     String          → User (ParentChildren)
  clinicianId  String?         → User (ClinicianChildren)
  sessions     ScreeningSession[]
  gameSessions GameSession[]
  createdAt    DateTime

MODEL ScreeningSession
  id               String @id
  childId          String          → Child
  sessionType      SessionType
  status           SessionStatus
  mChatScore       Float?
  mChatRawAnswers  Json?
  videoPath        String?
  analysisJobId    String?
  riskTier         RiskTier?
  compositeScore   Float?
  criterionAScore  Float?
  criterionBScore  Float?
  rawMetrics       Json?
  clinicianNotes   String?
  clinicianOverride String?
  referralStatus   ReferralStatus
  behavioralMetrics BehavioralMetric[]
  gameSessions     GameSession[]
  createdAt        DateTime
  completedAt      DateTime?

MODEL BehavioralMetric
  id              String @id
  sessionId       String          → ScreeningSession
  metricType      MetricType
  rawValue        Float
  normalizedScore Float
  riskFlagged     Boolean
  timestamp       DateTime
  details         Json?

MODEL GameSession
  id                   String @id
  sessionId            String?         → ScreeningSession
  childId              String          → Child
  gameModuleId         String          'attention' | 'imitation' | 'social' | 'sensory'
  ageGroup             String          '24-36m' | '36-48m' | '48-60m'
  events               Json            (all raw Phaser 3 events)
  completionRate       Float
  disengagementCount   Int
  touchPrecisionScore  Float
  reactionLatencyMean  Float
  imitationAccuracy    Float
  rigidityScore        Float
  createdAt            DateTime

MODEL Notification
  id        String @id
  userId    String          → User (cascade delete)
  type      String          'RESULT_READY' | 'REVIEW_REQUIRED' | 'REFERRAL_SCHEDULED'
  title     String
  body      String
  sessionId String?
  isRead    Boolean
  readAt    DateTime?
  createdAt DateTime

MODEL NormativeBaseline
  id              String @id
  ageGroupMonths  Int             24 | 30 | 36 | 42 | 48 | 54 | 60
  metricType      String
  meanValue       Float
  stdDev          Float
  source          String
  updatedAt       DateTime
  @@unique([ageGroupMonths, metricType])

MODEL AuthEvent
  id          String @id
  userId      String?         → User (nullable: pre-auth failures have no userId)
  event       String          AuthEventType: LOGIN_SUCCESS | LOGIN_FAILURE | LOGOUT |
                              TOKEN_REFRESH | TOKEN_REFRESH_FAILURE | EMAIL_VERIFIED |
                              PASSWORD_RESET_REQUEST | PASSWORD_RESET_COMPLETE
  ipAddress   String?
  userAgent   String?
  detail      String?
  createdAt   DateTime


═══════════════════════════════════════════════════════════════
SECTION 7 — ANALYSIS ENGINE DATA STRUCTURES  (Python)
═══════════════════════════════════════════════════════════════

FeatureVector  (feature_engineer.py)  — 15 fields
  gaze_score             float   0–10
  reaction_score         float   0–10
  touch_score            float   0–10
  drag_smoothness_score  float   0–10
  motor_consistency_score float  0–10
  imitation_score        float   0–10
  engagement_score       float   0–10
  gaze_flag              bool
  latency_flag           bool
  precision_flag         bool
  imitation_flag         bool
  engagement_flag        bool
  confidence             float   0–1
  is_low_confidence      bool
  age_group              str

CriterionScore  (scorer.py)
  name          str
  raw_score     float
  max_score     float
  components    Dict[str, float]

ScorerResult  (scorer.py)
  risk_tier              str     MONITOR_CLOSELY | INDETERMINATE | ELEVATED | INSUFFICIENT_DATA
  composite_score        float   0–70
  composite_normalized   float   0–1
  criterion_a_total      float   0–30
  criterion_b_total      float   0–40
  criterion_a1–a3        CriterionScore
  criterion_b1–b4        CriterionScore
  divergence_flag        bool
  divergence_detail      str?
  confidence             float
  is_low_confidence      bool
  active_flags           List[str]
  recommended_action     str
  differential_pattern   str     MOTOR_DELAY_PATTERN | ASD_PROFILE | MIXED_PATTERN | TYPICAL_PATTERN
  motor_delay_flag       bool
  differential_note      str
  disclaimer             str     (always present)

FusionResult  (fusion_engine.py)
  session_id             str
  child_age_months       int
  final_risk_tier        str
  composite_score        float
  composite_normalized   float
  criterion_a            float
  criterion_b            float
  confidence             float
  xgb_elevated_probability float
  divergence_flag        bool
  divergence_detail      str?
  active_flags           List[str]
  recommended_action     str
  per_metric_breakdown   Dict   (includes differential_pattern section)
  has_video              bool
  has_game               bool
  has_mchat              bool
  model_version          str
  differential_pattern   str
  motor_delay_flag       bool
  differential_note      str
  disclaimer             str

SCORING CONSTANTS  (scorer.py)
  MIN_CONFIDENCE_FOR_TIER       = 0.60
  DIVERGENCE_THRESHOLD          = 0.30
  MAX_COMPOSITE                 = 70.0
  MOTOR_DOMAIN_ELEVATED_THRESHOLD = 3.5
  SOCIAL_DOMAIN_INTACT_THRESHOLD  = 3.0
  MOTOR_SOCIAL_RATIO_THRESHOLD    = 1.8

COMPOSITE BANDS
  < 20    → MONITOR_CLOSELY
  20–35   → INDETERMINATE
  ≥ 35    → ELEVATED
  < 0.60 confidence → INSUFFICIENT_DATA

FUSION MODALITY WEIGHTS
  Video only:  Video 80% / MChatR 20%
  Game only:   Game 80%  / MChatR 20%
  Both:        Video 45% / Game 35% / MChatR 20%
  XGBoost blend: 60% rule-based / 40% XGBoost probability

DIFFERENTIAL PATTERN ROUTING
  primary_scorer      = video preferred → DSM-5 criterion scores
  differential_scorer = game preferred  → motor domain pattern
  (game features have real touch/drag metrics; video has neutral motor defaults)

DSM-5 CRITERION MAPPINGS  (scorer.py)
  A1 = gaze×0.6  + reaction×0.4          max ~10
  A2 = gaze×0.7  + engagement×0.3        max ~10
  A3 = imitation×0.8 + touch×0.2         max ~10
  B1 = 10 − motor_consistency             max ~10
  B2 = rigidity(inv latency_cv)×0.5
       + social_ratio×0.5                 max ~10
  B3 = sustained_gaze×0.6
       + gaze_variability×0.4             max ~10
  B4 = disengagement×0.5
       + recovery×0.5                     max ~10


═══════════════════════════════════════════════════════════════
SECTION 8 — FRONTEND TYPE SYSTEM  (types/index.ts)
═══════════════════════════════════════════════════════════════

PRIMITIVE TYPES
  UserRole            'ADMIN' | 'CLINICIAN' | 'PARENT'
  SessionType         'VIDEO' | 'GAME' | 'COMBINED'
  SessionStatus       'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED' | 'PARTIAL_ANALYSIS'
  RiskTier            'MONITOR' | 'INDETERMINATE' | 'ELEVATED'
  ReferralStatus      'NONE' | 'PENDING' | 'SCHEDULED' | 'COMPLETE'
  MetricType          'GAZE' | 'REACTION' | 'TOUCH' | 'IMITATION' | 'ENGAGEMENT'
  DifferentialPattern 'MOTOR_DELAY_PATTERN' | 'ASD_PROFILE' | 'MIXED_PATTERN' | 'TYPICAL_PATTERN'

INTERFACES
  User                { id, email, name, role, isEmailVerified, clinicianId?, createdAt }
  Child               { id, name, dateOfBirth, gender, parentId, clinicianId?, createdAt }
  ScreeningSession    { id, childId, child?, sessionType, status, mChatScore?,
                        mChatRawAnswers?, videoPath?, analysisJobId?,
                        riskTier?, compositeScore?, criterionAScore?,
                        criterionBScore?, rawMetrics?, clinicianNotes?,
                        clinicianOverride?, referralStatus,
                        differentialPattern?, motorDelayFlag?,
                        differentialNote?, createdAt, completedAt? }

CONFIG OBJECTS
  RISK_TIER_CONFIG     Record<RiskTier, { label, description, colorClass, bgClass, ... }>
  DIFFERENTIAL_PATTERN_CONFIG  Record<DifferentialPattern, { label, description,
                                colorClass, bgClass, borderClass, referralSuggestion }>

ROLE_HOME  (RouteGuards.tsx — single source of truth)
  { PARENT: '/parent/dashboard', CLINICIAN: '/clinician/dashboard', ADMIN: '/admin/dashboard' }


═══════════════════════════════════════════════════════════════
SECTION 9 — GAME EVENT COLLECTOR  (EventCollector.ts)
═══════════════════════════════════════════════════════════════

INTERFACES
  GazeEvent           { type:'tap', trial_id, stimulus_onset_ms, response_ms,
                        target_card, tapped_card, correct, reaction_time_ms,
                        tap_x, tap_y, stimulus_type:'social' }

  ImitateEvent        { type:'imitation_attempt', trial_id, timestamp_ms,
                        sequence_shown, sequence_tapped, sequence_step,
                        sequence_length, is_correct, latency_ms,
                        stimulus_type:'social' }

  SortEvent           { type:'tap'|'drag', object_id, timestamp_ms, color, shape,
                        target_bin, drop_bin, correct, target_x, target_y,
                        target_radius, actual_x, actual_y, tap_x, tap_y,
                        drag_path:DragPoint[], drag_path_deviation,
                        reaction_time_ms, precision_error_px,
                        stimulus_type:'nonsocial' }

  DragPoint           { x, y, t }

  FollowEvent         { type:'response', trial_id, timestamp_ms,
                        original_sequence, shown_sequence, tapped_sequence,
                        was_modified, followed_modification,
                        response_time_ms, accuracy, stimulus_type:'nonsocial' }

  DisengagementEvent  { timestamp, duration_ms, module }

  GameMetrics         { reaction_latency_mean, touch_precision_mean,
                        imitation_accuracy, rigidity_score,
                        social_following_ratio, flexibility_score }

  GameCompletionPayload  { sessionId, childAgeMonths, totalDurationMs,
                           completionRate, modulesCompleted,
                           disengagementEvents, disengagementCount,
                           gameMetrics, reactionLatencyMean,
                           touchPrecisionScore, imitationAccuracy,
                           rigidityScore, completionRate2,
                           events:Record<string,unknown>[],
                           ageGroup, gameModuleId }

ANALYSIS ENGINE GameEvent SCHEMA (normalized by EventCollector.mapEvents())
  type              'tap' | 'drag' | 'imitation_attempt' | 'response' | 'disengage'
  module_id         'module1_gaze' | 'module2_imitate' | 'module3_sort' | 'module4_follow'
  trial_index       number
  timestamp         number (ms from session start)
  latency_ms        number
  is_correct        bool
  stimulus_type     'social' | 'nonsocial'
  (+ module-specific extra fields per type)


═══════════════════════════════════════════════════════════════
SECTION 10 — GAME ARCHITECTURE  (Phaser 3)
═══════════════════════════════════════════════════════════════

SCENES (key → class)
  LoadScene       generates textures (sky-bg, hills, cloud, particle-dot, particle-star)
  MenuScene       animated start, Buddy greeting, play button
  Module1_Gaze    joint attention — 8 trials, 3 cards, Buddy gaze cue
  Module2_Imitate peer imitation — 6 trials, 5 gesture buttons, sequence length 1–3
  Module3_Sort    object sorting — 9/12 objects, 3 colored bins, drag+drop
  Module4_Follow  Simon-says — 6/8 trials, 4 circles, modified replay design
  ResultScene     celebration, fires onGameComplete callback

BASE CLASSES
  BaseGameScene       abstract — background, progress bar, Buddy, inactivity timers,
                      fadeToScene(), playCompletionBurst()
  BuddySprite         Container hierarchy: body/arms/legs/face
                      Methods: lookAt(), setMouth(), playGesture(),
                               playCheer(), playEncourage(), playCall(),
                               startIdle(), scheduleBlink()

GAME UTILITIES
  AgeAdapter          getConfig() → { gaze, imitate, sort, follow,
                                      inactivityCallMs, inactivityAdvanceMs }
                      Younger (<48m): more time, larger targets, shorter sequences
                      Older (≥48m):   faster pacing, simultaneous cues

  SoundManager        Web Audio API tones (no files):
                      play('success'|'try_again'|'buddy_call'|'completion'|'tap'|'flash')
                      playCircleFlash(circleIndex: 0–3)

  ProgressBar         4-segment top bar: completed=mint, active=pulsing-amber, pending=white

CANVAS: 800×600, Scale.FIT + CENTER_BOTH
BUDDY PALETTE: body #FFB347, limb #F2A23E, pupil #1A2B3C, cheek #FFC1CC, brow #8A5A1E
GAME PALETTE: mint #02C39A, amber #F4A261, navy #065A82, red #E63946, sky #E0F4FF

REGISTRY KEYS (Phaser game.registry)
  sessionId       string
  ageMonths       number
  ageAdapter      AgeAdapter instance
  soundManager    SoundManager instance
  eventCollector  EventCollector instance
  onGameComplete  (payload: GameCompletionPayload) => void

INACTIVITY TIMERS (both age groups)
  10s  → Buddy plays buddy_call sound + playCall() animation
  30s  → addDisengagement() + forceAdvance()


═══════════════════════════════════════════════════════════════
SECTION 11 — M-CHAT-R/F IMPLEMENTATION
═══════════════════════════════════════════════════════════════

SOURCE: Robins, Fein & Barton 2009. mchatscreen.com
⚠ LICENSE REQUIRED for software distribution — contact mchatscreen2009@gmail.com

REVERSE-SCORED ITEMS (YES = at-risk)
  Item 2    "Have you ever wondered if your child might be deaf?"
  Item 5    "Does your child make unusual finger movements near his or her eyes?"
  Item 12   "Does your child get upset by everyday noises?"

ALL OTHER ITEMS (NO = at-risk): items 1,3,4,6,7,8,9,10,11,13,14,15,16,17,18,19,20

SCORE BANDS (official M-CHAT-R/F)
  0–2    LOW likelihood       no follow-up needed
  3–7    MEDIUM likelihood    administer follow-up interview
  8–20   HIGH likelihood      bypass follow-up, refer immediately

SCORING ENGINE  (MChatQuestionnaire.tsx: computeMChatScore)
  risk_flags[i] = reverseScored ? answers[i] : !answers[i]
  total_score   = risk_flags.filter(true).length
  NO critical items, NO double-weighting in M-CHAT-R/F
  (critical items were in original 23-item M-CHAT, not the R/F revision)

OUTPUT OBJECT
  { answers:boolean[20], risk_flags:boolean[20],
    total_score, risk_band:'LOW'|'MEDIUM'|'HIGH',
    completion_time_ms, started_at, completed_at }

LOCAL STORAGE KEY: 'seed:mchat:progress'   (resume mid-questionnaire)


═══════════════════════════════════════════════════════════════
SECTION 12 — ZUSTAND STORES
═══════════════════════════════════════════════════════════════

useAuthStore  (authStore.ts)
  user: User | null
  isInitialized: bool
  initialize()    hydrate from stored token
  login(email, password)
  logout()

useParentStore  (parentStore.ts)
  children: Child[]                   (seeded: 1 mock child "Aryan")
  selectedChildId: string | null
  sessions: ScreeningSession[]        (seeded: 12 mock sessions Mar24–Mar25)
  isLoadingChildren, isLoadingSessions: bool
  childrenFetched: bool
  unreadNotifications: number
  setChildren(), setSelectedChildId(), setSessions()
  setLoadingChildren(), setLoadingSessions(), setChildrenFetched()

  SELECTORS
    selectChild(state) → Child | null
    selectRecentSessions(state, limit?) → ScreeningSession[]

useClinicianStore  (clinicianStore.ts)
  stats: ClinicianStats               (seeded: 12 children, 6 pending, 3 elevated, 2 referrals)
  pending: PendingReview[]            (seeded: 6 reviews — 3 ELEVATED, 2 INDETERM, 1 MONITOR)
  activity: ActivityEntry[]           (seeded: 10 entries mixed types)
  isLoadingPending, isLoadingStats: bool
  setStats(), setPending(), setActivity()
  setLoadingPending(), setLoadingStats()


═══════════════════════════════════════════════════════════════
SECTION 13 — WIZARD STATE  (NewScreeningPage.tsx)
═══════════════════════════════════════════════════════════════

WizardState
  step: 1–6
  selectedChildId: string | null
  sessionId: string | null           (created at Step 1→2 transition)
  modality: 'VIDEO' | 'GAME' | 'BOTH' | null
  mchatCompleted: bool
  mchatScore: MChatScore | null
  videoUploaded: bool
  gameCompleted: bool

SESSION STORAGE KEY: 'seed:wizard:screening'

STEP ROUTING LOGIC (onNext)
  videoUploaded=true + BOTH  → stay at step 4 (render Step4b next)
  videoUploaded=true + VIDEO → step 5
  gameCompleted=true         → step 5 (always)
  explicit step in updates   → use that value
  otherwise                  → increment by 1

STEP → COMPONENT MAP
  1  Step1_SelectChild     child cards, Continue gates on selection
  2  Step2_MChatWrapper    creates session, renders MChatQuestionnaire
  3  Step3_Modality        Video / Game / Both cards, age-based default
  4  Step4a_VideoUpload    drag-drop, quality check, upload (if VIDEO or BOTH+!video)
  4  Step4b_Game           BuddysWorld launch (if GAME or BOTH+video)
  5  Step5_Processing      Socket.io primary, polling fallback, back nav blocked
  6  Step6_Results         risk card, animated score bar, 5-metric breakdown, print


═══════════════════════════════════════════════════════════════
SECTION 14 — CLINICIAN SESSION DETAIL  (SessionDetailPage.tsx)
═══════════════════════════════════════════════════════════════

EXPORTED TYPES
  MetricData              { score, zscore, flag, norm }
  GazeMetric              extends MetricData + { gazePct }
  ReactionMetric          extends MetricData + { latencyMs, sigma }
  PrecisionMetric         extends MetricData + { accuracyPct }
  ImitationMetric         extends MetricData + { accuracyPct, trials }
  EngagementMetric        extends MetricData + { disengageCount, completionPct }
  CriterionSub            { name, score, max }
  MChatData               { answers:bool[20], risk_flags:bool[20],
                            total_score, critical_flagged }
  GameTrialPoint          { trial, value }
  DisengagementEvent      { timestamp_ms, module, duration_ms }
  GameData                { module1, module2, module3, module4, overall }
  SessionDetail           { sessionId, child, session, metrics,
                            criterionA, criterionB, mchatData?, gameData? }

TABS (6 — AISummary and TrajectoryTab now implemented)
  behavioral   BehavioralAnalysis  — 5 metric cards (A), Criterion A (B), Criterion B (C)
  mchat        MChatDetails        — 20-item table, critical item borders, summary band
  game         GameData            — 4 module panels with Recharts charts + disengagement log
  summary      AISummary           — AI-generated clinical summary
  trajectory   TrajectoryTab       — Trajectory chart over time

MOCK DATA SCENARIO: ELEVATED
  child:         Arjun K., 38 months, Male
  session:       COMBINED, 2025-06-10, ELEVATED, score 41, confidence 0.88
  divergence:    true, 34%
  metric scores: gaze 7.2 / reaction 6.8 / precision 4.1 / imitation 8.1 / engagement 7.5
  criterion A:   22/30 (A1=8, A2=7, A3=7)
  criterion B:   19/40 (B1=5, B2=4, B3=4, B4=6)
  mchat:         12 flagged / 20, 2 critical flagged → HIGH RISK
  game:          37.5% gaze acc, 16.7% imitation acc, 25% sequence acc, 3 disengagements


═══════════════════════════════════════════════════════════════
SECTION 15 — TAILWIND DESIGN TOKENS
═══════════════════════════════════════════════════════════════

seed.navy    #065A82    sidebar, primary buttons, headings
seed.teal    #028090    secondary UI, links, progress
seed.mint    #02C39A    success states, positive indicators
seed.ice     #EAF4F8    page backgrounds
seed.dark    #1A2B3C    body text
seed.muted   #64748B    secondary text, labels
seed.amber   #F4A261    warnings, INDETERMINATE tier
seed.alert   #E63946    errors, ELEVATED tier

CSS COMPONENT CLASSES  (index.css)
  .seed-card              white card, rounded-2xl, shadow-sm, p-5
  .seed-btn-primary       teal filled button
  .seed-btn-secondary     outline/ghost button


═══════════════════════════════════════════════════════════════
SECTION 16 — DOCKER SERVICES  (docker-compose.yml)
═══════════════════════════════════════════════════════════════

postgres        PostgreSQL 15, port 5432, volume: postgres_data
redis           Redis 7, port 6379, volume: redis_data
backend         Node/Express :3001, depends on postgres+redis
frontend        Vite :3000, depends on backend         ← port 3000 (vite.config.ts sets server.port=3000)
analysis-engine FastAPI :8001, depends on postgres

VOLUMES: postgres_data, redis_data, uploads_data

NOTE: Frontend runs on port 3000 — both vite.config.ts and docker-compose.yml are consistent.
      Vite default (5173) is not used; port is explicitly overridden.


═══════════════════════════════════════════════════════════════
SECTION 17 — SEED DATA  (backend/prisma/seed.ts)
═══════════════════════════════════════════════════════════════

USERS
  admin@seed-platform.in                role ADMIN
  dr.priya.rajan@seed-platform.in       role CLINICIAN
  dr.arjun.mehta@seed-platform.in       role CLINICIAN

INVITE CODES
  PRIYA1, PRIYA2, PRIYA3, PRIYA4       (1+2 consumed in seed)
  ARJUN1, ARJUN2, ARJUN3, ARJUN4       (1+2 consumed in seed)

PARENTS (seeded via consumed invite codes)
  kavitha.suresh@gmail.com              → code PRIYA1
  ramesh.krishnan@gmail.com             → code PRIYA2
  (4 total parents in seed)

CHILDREN: 8 mock children with varied ages
SESSIONS: 4 seeded sessions per child in seed.ts
           (expanded to 12 in parentStore mock for UI demonstration)

NORMATIVE BASELINES: 7 age groups × 5 metrics
  age groups: 24m, 30m, 36m, 42m, 48m, 54m, 60m  (stored as ageGroupMonths Int)
  metrics:    gaze, reaction, touch, imitation, engagement
  source:     Swanson 2013, Chawarska 2013, IAP 2015, Charman 1997, SEED pilot
  all marked [APPROXIMATE]


═══════════════════════════════════════════════════════════════
SECTION 18 — LOCKED ARCHITECTURAL DECISIONS
═══════════════════════════════════════════════════════════════

NEVER CHANGE WITHOUT EXPLICIT DECISION
  Risk tier LOW               EXCLUDED — system never definitively clears a child
  Critical items              NOT in M-CHAT-R/F (were in original 23-item M-CHAT)
  Double weighting            NOT implemented in M-CHAT-R/F scoring
  Motor differential          Game features preferred over video for motor domain
                              (video has neutral motor defaults → would suppress MOTOR_DELAY)
  HIPAA                       NOT applicable — DPDPA-2023 + ABDM only
  Clinical citations          NRC2001, Eldevik2009 (NOT Lovaas)
  Biometric inference         Server-side only — never in client browser
  Phaser assets               Graphics API only — no external image files
  Buddy's World               Canvas 800×600, Scale.FIT+CENTER_BOTH
  Confidence gate             < 0.60 → INSUFFICIENT_DATA (not scored)
  Divergence threshold        > 0.30 normalized difference → divergence_flag
  Min Confidence for Tier     0.60
  XGBoost blend               60/40 rule-based/XGBoost
  Primary scorer              Video preferred for DSM-5 breakdown
  Differential scorer         Game preferred for motor pattern detection
  ROLE_HOME                   Single source of truth in RouteGuards.tsx — never hardcode
                              role-specific paths anywhere else in the codebase
  authRoutes                  Mounted on /api/auth only — never duplicate-mount on other prefixes
  Every results screen        must show disclaimer:
                              "Screening tool only. Not a diagnostic instrument.
                               Clinical confirmation required."
