/**
 * S.E.E.D. Database Seed
 * 
 * Normative baseline sources:
 * - IAP (Indian Academy of Pediatrics) developmental milestones guide 2015
 * - WHO Multicentre Growth Reference Study (MGRS) motor development 2006
 * - Nair MKC et al., "Development and standardization of Trivandrum 
 *   Development Screening Chart", Indian Pediatrics 1991
 * - Juneja M et al., "Ages of attainment of developmental milestones in 
 *   children from a low socioeconomic status community", Indian Pediatrics 2012
 * - Where Indian-specific peer-reviewed data for gaze/attention/touch 
 *   precision metrics is unavailable, values are approximated from 
 *   Western normative literature (Swanson et al. 2012, Chawarska et al. 2013) 
 *   with conservative wider stdDev. These are marked [APPROXIMATE].
 *   They MUST be replaced with India-collected data before any clinical deployment.
 */

import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcrypt'
// Inline date helpers — date-fns is not a backend dependency
function addDaysToDate(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}
function subtractMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() - months)
  return d
}

const prisma = new PrismaClient()

const BCRYPT_ROUNDS = 12

async function main() {
  console.log('🌱 Seeding S.E.E.D. database...')

  // ─── Clean slate ───────────────────────────────────────────────
  await prisma.behavioralMetric.deleteMany()
  await prisma.gameSession.deleteMany()
  await prisma.screeningSession.deleteMany()
  await prisma.child.deleteMany()
  await prisma.inviteCode.deleteMany()
  await prisma.user.deleteMany()
  await prisma.normativeBaseline.deleteMany()

  // ─── Admin ─────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin@SEED2024', BCRYPT_ROUNDS)
  const admin = await prisma.user.create({
    data: {
      email: 'admin@seed-platform.in',
      passwordHash: adminHash,
      role: UserRole.ADMIN,
      name: 'Platform Administrator',
      isEmailVerified: true,
    },
  })
  console.log(`✅ Admin created: ${admin.email}`)

  // ─── Clinicians ─────────────────────────────────────────────────
  const clinician1Hash = await bcrypt.hash('Clinician@SEED2024', BCRYPT_ROUNDS)
  const clinician1 = await prisma.user.create({
    data: {
      email: 'dr.priya.rajan@seed-platform.in',
      passwordHash: clinician1Hash,
      role: UserRole.CLINICIAN,
      name: 'Dr. Priya Rajan',
      isEmailVerified: true,
    },
  })

  const clinician2Hash = await bcrypt.hash('Clinician2@SEED2024', BCRYPT_ROUNDS)
  const clinician2 = await prisma.user.create({
    data: {
      email: 'dr.arjun.mehta@seed-platform.in',
      passwordHash: clinician2Hash,
      role: UserRole.CLINICIAN,
      name: 'Dr. Arjun Mehta',
      isEmailVerified: true,
    },
  })
  console.log(`✅ Clinicians created: ${clinician1.email}, ${clinician2.email}`)

  // ─── Invite Codes ───────────────────────────────────────────────
  // Each clinician gets 4 invite codes (2 already used in seed, 2 available)
  const now = new Date()
  const expiryDate = addDaysToDate(now, 30)

  const inviteCodes = await Promise.all([
    prisma.inviteCode.create({
      data: {
        code: 'PRIYA1',
        clinicianId: clinician1.id,
        expiresAt: expiryDate,
      },
    }),
    prisma.inviteCode.create({
      data: {
        code: 'PRIYA2',
        clinicianId: clinician1.id,
        expiresAt: expiryDate,
      },
    }),
    prisma.inviteCode.create({
      data: {
        code: 'PRIYA3',
        clinicianId: clinician1.id,
        expiresAt: addDaysToDate(now, 60),
      },
    }),
    prisma.inviteCode.create({
      data: {
        code: 'PRIYA4',
        clinicianId: clinician1.id,
        expiresAt: addDaysToDate(now, 60),
      },
    }),
    prisma.inviteCode.create({
      data: {
        code: 'ARJUN1',
        clinicianId: clinician2.id,
        expiresAt: expiryDate,
      },
    }),
    prisma.inviteCode.create({
      data: {
        code: 'ARJUN2',
        clinicianId: clinician2.id,
        expiresAt: expiryDate,
      },
    }),
    prisma.inviteCode.create({
      data: {
        code: 'ARJUN3',
        clinicianId: clinician2.id,
        expiresAt: addDaysToDate(now, 60),
      },
    }),
    prisma.inviteCode.create({
      data: {
        code: 'ARJUN4',
        clinicianId: clinician2.id,
        expiresAt: addDaysToDate(now, 60),
      },
    }),
  ])
  console.log(`✅ ${inviteCodes.length} invite codes created`)

  // ─── Parents ────────────────────────────────────────────────────
  const parentHash = await bcrypt.hash('Parent@SEED2024', BCRYPT_ROUNDS)

  const parent1 = await prisma.user.create({
    data: {
      email: 'kavithasuresh@gmail.com',
      passwordHash: parentHash,
      role: UserRole.PARENT,
      name: 'Kavitha Suresh',
      isEmailVerified: true,
      clinicianId: clinician1.id,
    },
  })
  // Mark invite code PRIYA1 as used
  await prisma.inviteCode.update({
    where: { code: 'PRIYA1' },
    data: { usedBy: parent1.id, usedAt: now },
  })

  const parent2 = await prisma.user.create({
    data: {
      email: 'rameshkrishnan@gmail.com',
      passwordHash: parentHash,
      role: UserRole.PARENT,
      name: 'Ramesh Krishnan',
      isEmailVerified: true,
      clinicianId: clinician1.id,
    },
  })
  await prisma.inviteCode.update({
    where: { code: 'PRIYA2' },
    data: { usedBy: parent2.id, usedAt: now },
  })

  const parent3 = await prisma.user.create({
    data: {
      email: 'meeranair@gmail.com',
      passwordHash: parentHash,
      role: UserRole.PARENT,
      name: 'Meera Nair',
      isEmailVerified: true,
      clinicianId: clinician2.id,
    },
  })
  await prisma.inviteCode.update({
    where: { code: 'ARJUN1' },
    data: { usedBy: parent3.id, usedAt: now },
  })

  const parent4 = await prisma.user.create({
    data: {
      email: 'vijaypatel@gmail.com',
      passwordHash: parentHash,
      role: UserRole.PARENT,
      name: 'Vijay Patel',
      isEmailVerified: true,
      clinicianId: clinician2.id,
    },
  })
  await prisma.inviteCode.update({
    where: { code: 'ARJUN2' },
    data: { usedBy: parent4.id, usedAt: now },
  })

  console.log(`✅ 4 parents created and invite codes consumed`)

  // ─── Children (2 per parent) ─────────────────────────────────────
  const children = await Promise.all([
    // Kavitha's children
    prisma.child.create({
      data: {
        name: 'Aryan Suresh',
        dateOfBirth: subtractMonths(now, 36), // 3 years old
        gender: 'male',
        parentId: parent1.id,
        clinicianId: clinician1.id,
      },
    }),
    prisma.child.create({
      data: {
        name: 'Ananya Suresh',
        dateOfBirth: subtractMonths(now, 28), // 28 months
        gender: 'female',
        parentId: parent1.id,
        clinicianId: clinician1.id,
      },
    }),
    // Ramesh's children
    prisma.child.create({
      data: {
        name: 'Dev Krishnan',
        dateOfBirth: subtractMonths(now, 48), // 4 years
        gender: 'male',
        parentId: parent2.id,
        clinicianId: clinician1.id,
      },
    }),
    prisma.child.create({
      data: {
        name: 'Diya Krishnan',
        dateOfBirth: subtractMonths(now, 30), // 30 months
        gender: 'female',
        parentId: parent2.id,
        clinicianId: clinician1.id,
      },
    }),
    // Meera's children
    prisma.child.create({
      data: {
        name: 'Kiran Nair',
        dateOfBirth: subtractMonths(now, 54), // 54 months
        gender: 'male',
        parentId: parent3.id,
        clinicianId: clinician2.id,
      },
    }),
    prisma.child.create({
      data: {
        name: 'Shreya Nair',
        dateOfBirth: subtractMonths(now, 42), // 42 months
        gender: 'female',
        parentId: parent3.id,
        clinicianId: clinician2.id,
      },
    }),
    // Vijay's children
    prisma.child.create({
      data: {
        name: 'Rohan Patel',
        dateOfBirth: subtractMonths(now, 60), // 5 years
        gender: 'male',
        parentId: parent4.id,
        clinicianId: clinician2.id,
      },
    }),
    prisma.child.create({
      data: {
        name: 'Riya Patel',
        dateOfBirth: subtractMonths(now, 26), // 26 months
        gender: 'female',
        parentId: parent4.id,
        clinicianId: clinician2.id,
      },
    }),
  ])
  console.log(`✅ ${children.length} child profiles created`)

  // ─── Normative Baselines ─────────────────────────────────────────
  // Age groups: 24, 30, 36, 42, 48, 54, 60 months
  // 
  // GAZE (proportion of time maintaining joint attention gaze, 0-1 scale)
  // Source: Swanson MR et al., "Development of preferential looking in 
  // siblings of children with autism" (2013) — [APPROXIMATE for Indian cohort]
  // Typical: ~0.65-0.80 joint attention ratio. Lower values flag divergence.
  //
  // REACTION (mean reaction latency to social stimulus, milliseconds)
  // Source: Chawarska K et al., "Automatic attention cueing through eye 
  // contact in toddlers" (2013) — [APPROXIMATE for Indian cohort]
  // Typical: 450-700ms. Longer latencies flag divergence.
  //
  // TOUCH (touch precision score, 0-1; distance from target centroid)
  // Source: Approximated from typical fine motor development milestones,
  // IAP guidelines 2015. Values are conservative. [APPROXIMATE]
  //
  // IMITATION (proportion of correct imitation responses in 10-trial paradigm)
  // Source: Ingersoll B paradigm adapted; values approximated from 
  // typically developing controls in Charman T et al. 1997. [APPROXIMATE]
  // NOTE: paradigm is experimental, correlation with ASD risk under testing.
  //
  // ENGAGEMENT (overall session engagement rate, 0-1)
  // Source: Derived from game session completion rates in similar platforms.
  // [APPROXIMATE — replace with SEED pilot data post-collection]

  type NormativeEntry = {
    ageGroupMonths: number
    metricType: string
    meanValue: number
    stdDev: number
    source: string
  }

  const normativeData: NormativeEntry[] = [
    // ── 24 months ──────────────────────────────────────────────
    { ageGroupMonths: 24, metricType: 'GAZE', meanValue: 0.62, stdDev: 0.12, source: 'Swanson 2013 [APPROXIMATE]' },
    { ageGroupMonths: 24, metricType: 'REACTION', meanValue: 620, stdDev: 110, source: 'Chawarska 2013 [APPROXIMATE]' },
    { ageGroupMonths: 24, metricType: 'TOUCH', meanValue: 0.58, stdDev: 0.14, source: 'IAP Milestones 2015 [APPROXIMATE]' },
    { ageGroupMonths: 24, metricType: 'IMITATION', meanValue: 0.60, stdDev: 0.15, source: 'Charman 1997 [APPROXIMATE]' },
    { ageGroupMonths: 24, metricType: 'ENGAGEMENT', meanValue: 0.65, stdDev: 0.13, source: 'SEED pilot estimate [APPROXIMATE]' },

    // ── 30 months ──────────────────────────────────────────────
    { ageGroupMonths: 30, metricType: 'GAZE', meanValue: 0.67, stdDev: 0.11, source: 'Swanson 2013 [APPROXIMATE]' },
    { ageGroupMonths: 30, metricType: 'REACTION', meanValue: 580, stdDev: 105, source: 'Chawarska 2013 [APPROXIMATE]' },
    { ageGroupMonths: 30, metricType: 'TOUCH', meanValue: 0.64, stdDev: 0.13, source: 'IAP Milestones 2015 [APPROXIMATE]' },
    { ageGroupMonths: 30, metricType: 'IMITATION', meanValue: 0.65, stdDev: 0.14, source: 'Charman 1997 [APPROXIMATE]' },
    { ageGroupMonths: 30, metricType: 'ENGAGEMENT', meanValue: 0.70, stdDev: 0.12, source: 'SEED pilot estimate [APPROXIMATE]' },

    // ── 36 months ──────────────────────────────────────────────
    { ageGroupMonths: 36, metricType: 'GAZE', meanValue: 0.71, stdDev: 0.10, source: 'Swanson 2013 [APPROXIMATE]' },
    { ageGroupMonths: 36, metricType: 'REACTION', meanValue: 530, stdDev: 95, source: 'Chawarska 2013 [APPROXIMATE]' },
    { ageGroupMonths: 36, metricType: 'TOUCH', meanValue: 0.70, stdDev: 0.11, source: 'IAP Milestones 2015 [APPROXIMATE]' },
    { ageGroupMonths: 36, metricType: 'IMITATION', meanValue: 0.70, stdDev: 0.13, source: 'Charman 1997 [APPROXIMATE]' },
    { ageGroupMonths: 36, metricType: 'ENGAGEMENT', meanValue: 0.74, stdDev: 0.11, source: 'SEED pilot estimate [APPROXIMATE]' },

    // ── 42 months ──────────────────────────────────────────────
    { ageGroupMonths: 42, metricType: 'GAZE', meanValue: 0.74, stdDev: 0.10, source: 'Swanson 2013 [APPROXIMATE]' },
    { ageGroupMonths: 42, metricType: 'REACTION', meanValue: 500, stdDev: 90, source: 'Chawarska 2013 [APPROXIMATE]' },
    { ageGroupMonths: 42, metricType: 'TOUCH', meanValue: 0.74, stdDev: 0.11, source: 'IAP Milestones 2015 [APPROXIMATE]' },
    { ageGroupMonths: 42, metricType: 'IMITATION', meanValue: 0.73, stdDev: 0.12, source: 'Charman 1997 [APPROXIMATE]' },
    { ageGroupMonths: 42, metricType: 'ENGAGEMENT', meanValue: 0.77, stdDev: 0.10, source: 'SEED pilot estimate [APPROXIMATE]' },

    // ── 48 months ──────────────────────────────────────────────
    { ageGroupMonths: 48, metricType: 'GAZE', meanValue: 0.76, stdDev: 0.09, source: 'Swanson 2013 [APPROXIMATE]' },
    { ageGroupMonths: 48, metricType: 'REACTION', meanValue: 475, stdDev: 85, source: 'Chawarska 2013 [APPROXIMATE]' },
    { ageGroupMonths: 48, metricType: 'TOUCH', meanValue: 0.78, stdDev: 0.10, source: 'IAP Milestones 2015 [APPROXIMATE]' },
    { ageGroupMonths: 48, metricType: 'IMITATION', meanValue: 0.76, stdDev: 0.11, source: 'Charman 1997 [APPROXIMATE]' },
    { ageGroupMonths: 48, metricType: 'ENGAGEMENT', meanValue: 0.80, stdDev: 0.10, source: 'SEED pilot estimate [APPROXIMATE]' },

    // ── 54 months ──────────────────────────────────────────────
    { ageGroupMonths: 54, metricType: 'GAZE', meanValue: 0.78, stdDev: 0.09, source: 'Swanson 2013 [APPROXIMATE]' },
    { ageGroupMonths: 54, metricType: 'REACTION', meanValue: 455, stdDev: 80, source: 'Chawarska 2013 [APPROXIMATE]' },
    { ageGroupMonths: 54, metricType: 'TOUCH', meanValue: 0.81, stdDev: 0.09, source: 'IAP Milestones 2015 [APPROXIMATE]' },
    { ageGroupMonths: 54, metricType: 'IMITATION', meanValue: 0.78, stdDev: 0.10, source: 'Charman 1997 [APPROXIMATE]' },
    { ageGroupMonths: 54, metricType: 'ENGAGEMENT', meanValue: 0.82, stdDev: 0.09, source: 'SEED pilot estimate [APPROXIMATE]' },

    // ── 60 months ──────────────────────────────────────────────
    { ageGroupMonths: 60, metricType: 'GAZE', meanValue: 0.80, stdDev: 0.08, source: 'Swanson 2013 [APPROXIMATE]' },
    { ageGroupMonths: 60, metricType: 'REACTION', meanValue: 435, stdDev: 75, source: 'Chawarska 2013 [APPROXIMATE]' },
    { ageGroupMonths: 60, metricType: 'TOUCH', meanValue: 0.83, stdDev: 0.09, source: 'IAP Milestones 2015 [APPROXIMATE]' },
    { ageGroupMonths: 60, metricType: 'IMITATION', meanValue: 0.80, stdDev: 0.10, source: 'Charman 1997 [APPROXIMATE]' },
    { ageGroupMonths: 60, metricType: 'ENGAGEMENT', meanValue: 0.84, stdDev: 0.08, source: 'SEED pilot estimate [APPROXIMATE]' },
  ]

  for (const entry of normativeData) {
    await prisma.normativeBaseline.create({ data: entry })
  }
  console.log(`✅ ${normativeData.length} normative baseline entries seeded`)

  console.log('\n════════════════════════════════════════')
  console.log('S.E.E.D. seed complete.')
  console.log('════════════════════════════════════════')
  console.log('Admin:      admin@seed-platform.in / Admin@SEED2024')
  console.log('Clinician1: dr.priya.rajan@seed-platform.in / Clinician@SEED2024')
  console.log('Clinician2: dr.arjun.mehta@seed-platform.in / Clinician2@SEED2024')
  console.log('Parents:    kavithasuresh@gmail.com / Parent@SEED2024 (and 3 others)')
  console.log('Available invite codes: PRIYA3, PRIYA4, ARJUN3, ARJUN4')
  console.log('⚠️  All normative values marked [APPROXIMATE] must be replaced')
  console.log('    with India-collected clinical data before deployment.')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
