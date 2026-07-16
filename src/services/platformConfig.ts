/** Destination countries with active agency review (ISO2). */
export const DEFAULT_LIVE_COUNTRIES = ['US', 'GB', 'CA', 'AU', 'DE'] as const

export const MAX_OPEN_APPLICATIONS = 3
export const MAX_SUBMISSIONS_PER_DAY = 2
export const SUBMISSION_WINDOW_MS = 24 * 60 * 60 * 1000
export const DEFAULT_MAX_PENDING_APPLICATIONS = 25

export function isDefaultLiveCountry(iso2: string): boolean {
  return (DEFAULT_LIVE_COUNTRIES as readonly string[]).includes(iso2.toUpperCase())
}
