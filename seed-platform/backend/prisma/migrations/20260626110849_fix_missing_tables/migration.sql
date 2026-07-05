-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PARENT', 'CLINICIAN', 'ADMIN');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('VIDEO', 'GAME', 'COMBINED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETE', 'FAILED', 'PARTIAL_ANALYSIS');

-- CreateEnum
CREATE TYPE "RiskTier" AS ENUM ('MONITOR', 'INDETERMINATE', 'ELEVATED');

-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('GAZE', 'REACTION', 'TOUCH', 'IMITATION', 'ENGAGEMENT');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('NONE', 'PENDING', 'SCHEDULED', 'COMPLETE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "name" TEXT NOT NULL,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifyToken" TEXT,
    "passwordResetToken" TEXT,
    "passwordResetExpiry" TIMESTAMP(3),
    "clinicianId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "usedBy" TEXT,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Child" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "clinicianId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Child_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningSession" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "sessionType" "SessionType" NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'PENDING',
    "mChatScore" DOUBLE PRECISION,
    "mChatRawAnswers" JSONB,
    "videoPath" TEXT,
    "analysisJobId" TEXT,
    "riskTier" "RiskTier",
    "compositeScore" DOUBLE PRECISION,
    "criterionAScore" DOUBLE PRECISION,
    "criterionBScore" DOUBLE PRECISION,
    "rawMetrics" JSONB,
    "clinicianNotes" TEXT,
    "clinicianOverride" TEXT,
    "referralStatus" "ReferralStatus" NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ScreeningSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BehavioralMetric" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "metricType" "MetricType" NOT NULL,
    "rawValue" DOUBLE PRECISION NOT NULL,
    "normalizedScore" DOUBLE PRECISION NOT NULL,
    "riskFlagged" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB,

    CONSTRAINT "BehavioralMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "childId" TEXT NOT NULL,
    "gameModuleId" TEXT NOT NULL,
    "ageGroup" TEXT NOT NULL,
    "events" JSONB NOT NULL,
    "completionRate" DOUBLE PRECISION NOT NULL,
    "disengagementCount" INTEGER NOT NULL DEFAULT 0,
    "touchPrecisionScore" DOUBLE PRECISION NOT NULL,
    "reactionLatencyMean" DOUBLE PRECISION NOT NULL,
    "imitationAccuracy" DOUBLE PRECISION NOT NULL,
    "rigidityScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "event" TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sessionId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NormativeBaseline" (
    "id" TEXT NOT NULL,
    "ageGroupMonths" INTEGER NOT NULL,
    "metricType" TEXT NOT NULL,
    "meanValue" DOUBLE PRECISION NOT NULL,
    "stdDev" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NormativeBaseline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_emailVerifyToken_key" ON "User"("emailVerifyToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_passwordResetToken_key" ON "User"("passwordResetToken");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "InviteCode_code_key" ON "InviteCode"("code");

-- CreateIndex
CREATE INDEX "InviteCode_code_idx" ON "InviteCode"("code");

-- CreateIndex
CREATE INDEX "InviteCode_clinicianId_idx" ON "InviteCode"("clinicianId");

-- CreateIndex
CREATE INDEX "Child_parentId_idx" ON "Child"("parentId");

-- CreateIndex
CREATE INDEX "Child_clinicianId_idx" ON "Child"("clinicianId");

-- CreateIndex
CREATE INDEX "ScreeningSession_childId_idx" ON "ScreeningSession"("childId");

-- CreateIndex
CREATE INDEX "ScreeningSession_status_idx" ON "ScreeningSession"("status");

-- CreateIndex
CREATE INDEX "ScreeningSession_riskTier_idx" ON "ScreeningSession"("riskTier");

-- CreateIndex
CREATE INDEX "BehavioralMetric_sessionId_idx" ON "BehavioralMetric"("sessionId");

-- CreateIndex
CREATE INDEX "BehavioralMetric_metricType_idx" ON "BehavioralMetric"("metricType");

-- CreateIndex
CREATE INDEX "GameSession_childId_idx" ON "GameSession"("childId");

-- CreateIndex
CREATE INDEX "GameSession_sessionId_idx" ON "GameSession"("sessionId");

-- CreateIndex
CREATE INDEX "GameSession_gameModuleId_idx" ON "GameSession"("gameModuleId");

-- CreateIndex
CREATE INDEX "AuthEvent_userId_idx" ON "AuthEvent"("userId");

-- CreateIndex
CREATE INDEX "AuthEvent_event_idx" ON "AuthEvent"("event");

-- CreateIndex
CREATE INDEX "AuthEvent_createdAt_idx" ON "AuthEvent"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "NormativeBaseline_ageGroupMonths_idx" ON "NormativeBaseline"("ageGroupMonths");

-- CreateIndex
CREATE UNIQUE INDEX "NormativeBaseline_ageGroupMonths_metricType_key" ON "NormativeBaseline"("ageGroupMonths", "metricType");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Child" ADD CONSTRAINT "Child_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Child" ADD CONSTRAINT "Child_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningSession" ADD CONSTRAINT "ScreeningSession_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehavioralMetric" ADD CONSTRAINT "BehavioralMetric_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ScreeningSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ScreeningSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthEvent" ADD CONSTRAINT "AuthEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
