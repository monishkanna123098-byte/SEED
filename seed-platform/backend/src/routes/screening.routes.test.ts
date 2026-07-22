import { describe, it, expect } from 'vitest'
import { validationResult } from 'express-validator'
import type { Request } from 'express'
import { uploadVideoValidators, gameCompleteValidators } from './screening.routes'
import { MIN_AGE_MONTHS, MAX_AGE_MONTHS } from '../utils/ageConstants'

// These run the ACTUAL exported validator chains used by the live routes
// (not a duplicate/reimplementation), via the same chain.run(req) call
// validate.middleware.ts uses internally — no live app or DB required.
// Per design spec §5: boundary values 17, 18, 60, 61 for both checks.

function mockReq(body: Record<string, unknown>): Request {
  return { body, query: {}, params: {}, headers: {}, cookies: {} } as unknown as Request
}

const validUploadVideoBody = (childAgeMonths: number) => ({
  sessionId: '123e4567-e89b-12d3-a456-426614174000',
  childAgeMonths,
})

const validGameCompleteBody = (childAgeMonths: number) => ({
  sessionId: '123e4567-e89b-12d3-a456-426614174000',
  gameModuleId: 'module1_gaze',
  events: [{ type: 'tap' }],
  childAgeMonths,
  ageGroup: '24-30m',
  completionRate: 1,
  touchPrecisionScore: 0.5,
  reactionLatencyMean: 300,
  imitationAccuracy: 0.5,
  rigidityScore: 0.5,
  disengagementCount: 0,
})

async function runChain(chains: typeof uploadVideoValidators, body: Record<string, unknown>) {
  const req = mockReq(body)
  await Promise.all(chains.map((chain) => chain.run(req)))
  return validationResult(req)
}

describe('uploadVideoValidators — childAgeMonths boundary', () => {
  it('rejects 17 months (below MIN_AGE_MONTHS)', async () => {
    const result = await runChain(uploadVideoValidators, validUploadVideoBody(17))
    expect(result.isEmpty()).toBe(false)
    expect(result.array().some((e) => 'path' in e && e.path === 'childAgeMonths')).toBe(true)
  })

  it('accepts 18 months (the floor) — this is the age range sub-project 1 exists to support', async () => {
    const result = await runChain(uploadVideoValidators, validUploadVideoBody(18))
    expect(result.isEmpty()).toBe(true)
  })

  it('accepts 60 months (the ceiling)', async () => {
    const result = await runChain(uploadVideoValidators, validUploadVideoBody(60))
    expect(result.isEmpty()).toBe(true)
  })

  it('rejects 61 months (above the ceiling)', async () => {
    const result = await runChain(uploadVideoValidators, validUploadVideoBody(61))
    expect(result.isEmpty()).toBe(false)
  })
})

describe('gameCompleteValidators — childAgeMonths boundary', () => {
  it('rejects 17 months', async () => {
    const result = await runChain(gameCompleteValidators, validGameCompleteBody(17))
    expect(result.isEmpty()).toBe(false)
    expect(result.array().some((e) => 'path' in e && e.path === 'childAgeMonths')).toBe(true)
  })

  it('accepts 18 months (the floor) — previously rejected before this sub-project\'s fix', async () => {
    const result = await runChain(gameCompleteValidators, validGameCompleteBody(18))
    expect(result.isEmpty()).toBe(true)
  })

  it('accepts 60 months', async () => {
    const result = await runChain(gameCompleteValidators, validGameCompleteBody(60))
    expect(result.isEmpty()).toBe(true)
  })

  it('rejects 61 months', async () => {
    const result = await runChain(gameCompleteValidators, validGameCompleteBody(61))
    expect(result.isEmpty()).toBe(false)
  })
})

describe('sanity check: constants actually imported into screening.routes.ts match canonical values', () => {
  it('MIN_AGE_MONTHS is 18, MAX_AGE_MONTHS is 60', () => {
    expect(MIN_AGE_MONTHS).toBe(18)
    expect(MAX_AGE_MONTHS).toBe(60)
  })
})
