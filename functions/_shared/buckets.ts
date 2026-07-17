import type { Env } from './auth'
import { json } from './auth'

/** Platform / agency objects live in AGENCY_LOGINS (fallback CLIENT_DATA during cutover). */
export function getAgencyBucket(env: Env): R2Bucket {
  const bucket = env.AGENCY_LOGINS ?? env.CLIENT_DATA
  if (!bucket) {
    throw json({ error: 'R2 bucket AGENCY_LOGINS (or CLIENT_DATA) is not bound' }, 500)
  }
  return bucket
}

/** User-owned encrypted files remain only under CLIENT_DATA/users/. */
export function getClientBucket(env: Env): R2Bucket {
  if (!env.CLIENT_DATA) {
    throw json({ error: 'R2 bucket CLIENT_DATA is not bound' }, 500)
  }
  return env.CLIENT_DATA
}

export function getArchiveBucket(env: Env): R2Bucket {
  if (!env.OLD_CLIENT_DATA) {
    throw json({ error: 'R2 bucket OLD_CLIENT_DATA is not bound' }, 500)
  }
  return env.OLD_CLIENT_DATA
}
