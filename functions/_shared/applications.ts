import { getAgencyBucket } from './buckets'
import type { Env } from './auth'

export const APPS_KEY = 'admin/platform/applications.json'
export const NOTIFICATIONS_KEY = 'admin/platform/notifications.json'

export type ApplicationStorageFormat = 'server-readable-v1' | 'legacy-encrypted-v1'

export interface StoredApplication {
  id: string
  userId: string
  status: string
  destinationCountry: string
  visaType: string
  submittedAt: string
  reviewedAt?: string
  paidAt?: string
  expiresAt?: string
  rejectionCode?: string
  rejectionOther?: string
  rejectionDetails?: string
  acceptanceNote?: string
  /** New submissions store answers/files without client-side encryption. */
  storageFormat?: ApplicationStorageFormat
  encrypted?: boolean
  encryptedPayloadRef?: string
  answers?: Record<string, string>
  orgId?: string
  keyId?: string
  passportCountry?: string
  passportType?: string
  hasAdditionalDocs?: boolean
  clientName?: string
  clientEmail?: string
  documents?: Array<{
    id: string
    name: string
    uploadedAt: string
    documentTypeId?: string
  }>
  reviewedByUid?: string
  /** Prior rejected application this submission replaces. */
  resubmissionOf?: string
  [key: string]: unknown
}

export interface StoredNotification {
  id: string
  userId: string
  type: 'decision'
  applicationId: string
  status: string
  rejectionCode?: string
  rejectionOther?: string
  rejectionDetails?: string
  acceptanceNote?: string
  message: string
  createdAt: string
  read: boolean
}

export async function readApplications(env: Env): Promise<StoredApplication[]> {
  const bucket = getAgencyBucket(env)
  const object = await bucket.get(APPS_KEY)
  if (!object) return []
  const data = (await object.json()) as { applications?: StoredApplication[] }
  return Array.isArray(data.applications) ? data.applications : []
}

export async function writeApplications(
  env: Env,
  applications: StoredApplication[],
): Promise<void> {
  const bucket = getAgencyBucket(env)
  await bucket.put(APPS_KEY, JSON.stringify({ applications }), {
    httpMetadata: { contentType: 'application/json' },
  })
}

export async function upsertApplication(
  env: Env,
  application: StoredApplication,
): Promise<StoredApplication> {
  const apps = await readApplications(env)
  const idx = apps.findIndex((a) => a.id === application.id)
  if (idx >= 0) apps[idx] = application
  else apps.push(application)
  await writeApplications(env, apps)
  return application
}

export async function readNotifications(env: Env): Promise<StoredNotification[]> {
  const bucket = getAgencyBucket(env)
  const object = await bucket.get(NOTIFICATIONS_KEY)
  if (!object) return []
  const data = (await object.json()) as { notifications?: StoredNotification[] }
  return Array.isArray(data.notifications) ? data.notifications : []
}

export async function writeNotifications(
  env: Env,
  notifications: StoredNotification[],
): Promise<void> {
  const bucket = getAgencyBucket(env)
  await bucket.put(NOTIFICATIONS_KEY, JSON.stringify({ notifications }), {
    httpMetadata: { contentType: 'application/json' },
  })
}

export async function appendNotification(
  env: Env,
  notification: StoredNotification,
): Promise<void> {
  const items = await readNotifications(env)
  items.unshift(notification)
  await writeNotifications(env, items.slice(0, 500))
}

export async function copyVerified(
  source: R2Bucket,
  dest: R2Bucket,
  sourceKey: string,
  destKey: string,
  meta?: Record<string, string>,
): Promise<void> {
  const object = await source.get(sourceKey)
  if (!object) throw new Error(`Source object missing: ${sourceKey}`)
  const body = await object.arrayBuffer()
  await dest.put(destKey, body, {
    httpMetadata: object.httpMetadata,
    customMetadata: {
      ...(object.customMetadata ?? {}),
      ...(meta ?? {}),
    },
  })
  const verified = await dest.head(destKey)
  if (!verified || verified.size !== body.byteLength) {
    throw new Error(`Copy verification failed for ${destKey}`)
  }
}
