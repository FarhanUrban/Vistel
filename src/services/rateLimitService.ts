import type { VisaApplication } from '@/types'
import {
  MAX_OPEN_APPLICATIONS,
  MAX_SUBMISSIONS_PER_DAY,
  SUBMISSION_WINDOW_MS,
} from './platformConfig'
import { appendSubmissionLog, loadSubmissionLog } from './platformStorage'
import { isDestinationAvailable } from './agencyOrgService'

const OPEN_STATUSES = new Set<VisaApplication['status']>([
  'submitted',
  'reviewing',
  'awaiting_payment',
])

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RateLimitError'
  }
}

export class CountryNotAvailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CountryNotAvailableError'
  }
}

export function assertCanSubmit(
  userId: string,
  destinationCountry: string,
  applications: VisaApplication[],
): void {
  const iso2 = destinationCountry.toUpperCase()

  if (!isDestinationAvailable(iso2)) {
    throw new CountryNotAvailableError(
      'This destination is not available yet. We are onboarding agencies — check back soon.',
    )
  }

  const openCount = applications.filter(
    (app) => app.userId === userId && OPEN_STATUSES.has(app.status),
  ).length
  if (openCount >= MAX_OPEN_APPLICATIONS) {
    throw new RateLimitError(
      `You can have at most ${MAX_OPEN_APPLICATIONS} open applications. Finish or wait for a decision before submitting another.`,
    )
  }

  const since = Date.now() - SUBMISSION_WINDOW_MS
  const recent = loadSubmissionLog().filter(
    (entry) => entry.userId === userId && new Date(entry.submittedAt).getTime() >= since,
  )
  if (recent.length >= MAX_SUBMISSIONS_PER_DAY) {
    throw new RateLimitError(
      `You can submit at most ${MAX_SUBMISSIONS_PER_DAY} applications per 24 hours.`,
    )
  }
}

export function recordSubmission(userId: string, applicationId: string): void {
  appendSubmissionLog({
    userId,
    applicationId,
    submittedAt: new Date().toISOString(),
  })
}

export function getSubmissionLimits(): {
  maxOpen: number
  maxPerDay: number
} {
  return { maxOpen: MAX_OPEN_APPLICATIONS, maxPerDay: MAX_SUBMISSIONS_PER_DAY }
}
